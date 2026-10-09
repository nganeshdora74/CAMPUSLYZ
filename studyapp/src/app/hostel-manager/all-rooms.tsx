import React, { useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import HostelLayout from "../../components/hostel/HostelLayout";
import hostelDataService, { HostelRoom } from "../../services/hostelDataService";

export default function AllRoomsScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;

  const [rooms, setRooms] = useState<HostelRoom[]>(hostelDataService.getRooms());
  const [filterTab, setFilterTab] = useState<"All" | "Available" | "Occupied">("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Add Room Modal
  const [addModal, setAddModal] = useState(false);
  const [newRoomNo, setNewRoomNo] = useState("");
  const [newRoomType, setNewRoomType] = useState<"Single" | "Double" | "Triple">("Single");
  const [newFloor, setNewFloor] = useState("1st Floor");
  const [newRent, setNewRent] = useState("5000");

  // Allocate Modal
  const [allocModal, setAllocModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<HostelRoom | null>(null);
  const [studentNameInput, setStudentNameInput] = useState("");

  const refreshRooms = () => {
    setRooms(hostelDataService.getRooms());
  };

  const filteredRooms = rooms.filter((r) => {
    const matchesFilter =
      filterTab === "All" ? true : filterTab === "Available" ? r.status === "Available" : r.status === "Occupied";
    const matchesSearch =
      r.roomNo.includes(searchQuery) ||
      (r.residentNames && r.residentNames.toLowerCase().includes(searchQuery.toLowerCase())) ||
      r.type.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleAddRoom = () => {
    if (!newRoomNo.trim()) {
      Alert.alert("Required", "Please enter a room number");
      return;
    }
    const cap = newRoomType === "Single" ? 1 : newRoomType === "Double" ? 2 : 3;
    hostelDataService.addRoom({
      roomNo: newRoomNo.trim(),
      type: newRoomType,
      capacity: cap,
      status: "Available",
      residents: [],
      residentNames: "-",
      floor: newFloor,
      rent: Number(newRent) || 4500,
    });
    setNewRoomNo("");
    setAddModal(false);
    refreshRooms();
    setActionNotice(`Room ${newRoomNo} created successfully`);
    setTimeout(() => setActionNotice(null), 3000);
  };

  const handleAllocate = () => {
    if (!studentNameInput.trim() || !selectedRoom) {
      Alert.alert("Required", "Please enter the resident name");
      return;
    }
    hostelDataService.allocateRoom(studentNameInput.trim(), selectedRoom.roomNo);
    setStudentNameInput("");
    setAllocModal(false);
    setSelectedRoom(null);
    refreshRooms();
    setActionNotice(`Room ${selectedRoom.roomNo} allocated to ${studentNameInput}`);
    setTimeout(() => setActionNotice(null), 3500);
  };

  const handleToggleStatus = (room: HostelRoom) => {
    const nextStatus = room.status === "Available" ? "Occupied" : "Available";
    hostelDataService.updateRoom(room.id, {
      status: nextStatus,
      residents: nextStatus === "Available" ? [] : room.residents,
      residentNames: nextStatus === "Available" ? "-" : room.residentNames,
    });
    refreshRooms();
    setActionNotice(`Room ${room.roomNo} marked as ${nextStatus}`);
    setTimeout(() => setActionNotice(null), 3000);
  };

  const availableCount = rooms.filter((r) => r.status === "Available").length;
  const occupiedCount = rooms.filter((r) => r.status === "Occupied").length;

  return (
    <HostelLayout
      activeNav="rooms"
      pageTitle="All Rooms"
      pageSubtitle={`Total ${rooms.length} rooms • ${availableCount} Available • ${occupiedCount} Occupied`}
      actionNotice={actionNotice}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder="Search room number or resident..."
      rightAction={
        <TouchableOpacity
          style={styles.primaryAddBtn}
          onPress={() => setAddModal(true)}
        >
          <Ionicons name="add" size={18} color="#FFFFFF" />
          <Text style={styles.primaryAddBtnText}>+ Add Room</Text>
        </TouchableOpacity>
      }
    >
      {/* Sub-nav chips & view switcher */}
      <View style={styles.headerControls}>
        <View style={styles.filterPills}>
          {(["All", "Available", "Occupied"] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.pill, filterTab === tab && styles.pillActive]}
              onPress={() => setFilterTab(tab)}
            >
              <Text
                style={[
                  styles.pillText,
                  filterTab === tab && styles.pillTextActive,
                ]}
              >
                {tab === "All"
                  ? `All Rooms (${rooms.length})`
                  : tab === "Available"
                  ? `Available (${availableCount})`
                  : `Occupied (${occupiedCount})`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.viewModeToggle}>
          <TouchableOpacity
            style={[
              styles.viewModeBtn,
              viewMode === "cards" && styles.viewModeBtnActive,
            ]}
            onPress={() => setViewMode("cards")}
          >
            <Ionicons
              name="grid-outline"
              size={16}
              color={viewMode === "cards" ? "#2563EB" : "#64748B"}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.viewModeBtn,
              viewMode === "table" && styles.viewModeBtnActive,
            ]}
            onPress={() => setViewMode("table")}
          >
            <Ionicons
              name="list-outline"
              size={16}
              color={viewMode === "table" ? "#2563EB" : "#64748B"}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Cards View */}
      {viewMode === "cards" && (
        <View style={styles.gridContainer}>
          {filteredRooms.map((room) => {
            const isAvailable = room.status === "Available";
            return (
              <View key={room.id} style={styles.roomCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.roomBadge}>
                    <Ionicons name="bed" size={16} color="#2563EB" />
                    <Text style={styles.roomTitle}>Room {room.roomNo}</Text>
                  </View>
                  <View
                    style={[
                      styles.statusTag,
                      isAvailable ? styles.statusAvail : styles.statusOcc,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusTagText,
                        isAvailable ? styles.statusAvailText : styles.statusOccText,
                      ]}
                    >
                      {room.status}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardBody}>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Type:</Text>
                    <Text style={styles.metaVal}>{room.type} (Cap: {room.capacity})</Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Floor:</Text>
                    <Text style={styles.metaVal}>{room.floor || "1st Floor"}</Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Rent:</Text>
                    <Text style={styles.metaVal}>₹{room.rent || 5000} / mo</Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Residents:</Text>
                    <Text style={styles.metaVal} numberOfLines={1}>
                      {room.residentNames && room.residentNames !== "-"
                        ? room.residentNames
                        : "None"}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardActions}>
                  {isAvailable ? (
                    <TouchableOpacity
                      style={styles.actionAllocateBtn}
                      onPress={() => {
                        setSelectedRoom(room);
                        setAllocModal(true);
                      }}
                    >
                      <Ionicons name="person-add-outline" size={14} color="#FFFFFF" />
                      <Text style={styles.actionAllocateBtnText}>Allocate</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={styles.actionVacantBtn}
                      onPress={() => handleToggleStatus(room)}
                    >
                      <Ionicons name="checkmark-done" size={14} color="#059669" />
                      <Text style={styles.actionVacantBtnText}>Mark Vacant</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={styles.actionToggleBtn}
                    onPress={() => handleToggleStatus(room)}
                  >
                    <Ionicons
                      name={isAvailable ? "lock-closed-outline" : "lock-open-outline"}
                      size={14}
                      color="#475569"
                    />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Table View */}
      {viewMode === "table" && (
        <View style={styles.tableCard}>
          <View style={styles.tableHeadRow}>
            <Text style={[styles.th, { width: 90 }]}>Room No</Text>
            <Text style={[styles.th, { width: 110 }]}>Type</Text>
            <Text style={[styles.th, { width: 100 }]}>Status</Text>
            <Text style={[styles.th, { flex: 1 }]}>Residents</Text>
            <Text style={[styles.th, { width: 90 }]}>Rent</Text>
            <Text style={[styles.th, { width: 130, textAlign: "right" }]}>Actions</Text>
          </View>

          {filteredRooms.map((room) => {
            const isAvail = room.status === "Available";
            return (
              <View key={room.id} style={styles.tableRow}>
                <Text style={[styles.tdBold, { width: 90 }]}>{room.roomNo}</Text>
                <Text style={[styles.td, { width: 110 }]}>{room.type} ({room.capacity})</Text>
                <View style={{ width: 100 }}>
                  <View
                    style={[
                      styles.statusTag,
                      isAvail ? styles.statusAvail : styles.statusOcc,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusTagText,
                        isAvail ? styles.statusAvailText : styles.statusOccText,
                      ]}
                    >
                      {room.status}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.td, { flex: 1 }]} numberOfLines={1}>
                  {room.residentNames || "-"}
                </Text>
                <Text style={[styles.td, { width: 90 }]}>₹{room.rent || 5000}</Text>
                <View style={[styles.tableActionGroup, { width: 130 }]}>
                  {isAvail ? (
                    <TouchableOpacity
                      style={styles.tblBtnSmall}
                      onPress={() => {
                        setSelectedRoom(room);
                        setAllocModal(true);
                      }}
                    >
                      <Text style={styles.tblBtnSmallText}>Allocate</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[styles.tblBtnSmall, { backgroundColor: "#DEF7EC" }]}
                      onPress={() => handleToggleStatus(room)}
                    >
                      <Text style={[styles.tblBtnSmallText, { color: "#03543F" }]}>Vacate</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Add Room Modal */}
      <Modal visible={addModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Room</Text>
              <TouchableOpacity onPress={() => setAddModal(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.formLabel}>Room Number</Text>
            <TextInput
              value={newRoomNo}
              onChangeText={setNewRoomNo}
              placeholder="e.g. 119, 204"
              style={styles.formInput}
            />

            <Text style={styles.formLabel}>Room Type</Text>
            <View style={styles.typeSelector}>
              {(["Single", "Double", "Triple"] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.typeOption,
                    newRoomType === t && styles.typeOptionActive,
                  ]}
                  onPress={() => setNewRoomType(t)}
                >
                  <Text
                    style={[
                      styles.typeOptionText,
                      newRoomType === t && styles.typeOptionTextActive,
                    ]}
                  >
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.formLabel}>Floor</Text>
            <TextInput
              value={newFloor}
              onChangeText={setNewFloor}
              placeholder="e.g. 1st Floor, 2nd Floor"
              style={styles.formInput}
            />

            <Text style={styles.formLabel}>Monthly Rent (₹)</Text>
            <TextInput
              value={newRent}
              onChangeText={setNewRent}
              placeholder="5000"
              keyboardType="numeric"
              style={styles.formInput}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setAddModal(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleAddRoom}
              >
                <Text style={styles.submitBtnText}>Save Room</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Allocate Room Modal */}
      <Modal visible={allocModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Allocate Room {selectedRoom?.roomNo}
              </Text>
              <TouchableOpacity onPress={() => setAllocModal(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.formLabel}>Student Full Name</Text>
            <TextInput
              value={studentNameInput}
              onChangeText={setStudentNameInput}
              placeholder="Enter student name..."
              style={styles.formInput}
            />

            <View style={styles.allocInfoBox}>
              <Text style={styles.allocInfoText}>
                Room Type: {selectedRoom?.type} (Capacity {selectedRoom?.capacity})
              </Text>
              <Text style={styles.allocInfoText}>
                Rent: ₹{selectedRoom?.rent || 5000}/month
              </Text>
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setAllocModal(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleAllocate}
              >
                <Text style={styles.submitBtnText}>Confirm Allocation</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </HostelLayout>
  );
}

const styles = StyleSheet.create({
  primaryAddBtn: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  primaryAddBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  headerControls: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
    flexWrap: "wrap",
    gap: 12,
  },
  filterPills: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  pill: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  pillActive: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  pillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  pillTextActive: {
    color: "#FFFFFF",
  },
  viewModeToggle: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
  },
  viewModeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  viewModeBtnActive: {
    backgroundColor: "#EFF6FF",
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },
  roomCard: {
    width: "31.5%",
    minWidth: 260,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  roomBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  roomTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusAvail: {
    backgroundColor: "#ECFDF5",
  },
  statusOcc: {
    backgroundColor: "#FEF2F2",
  },
  statusTagText: {
    fontSize: 11,
    fontWeight: "700",
  },
  statusAvailText: {
    color: "#059669",
  },
  statusOccText: {
    color: "#DC2626",
  },
  cardBody: {
    gap: 6,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  metaLabel: {
    fontSize: 12,
    color: "#64748B",
  },
  metaVal: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1E293B",
  },
  cardActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  actionAllocateBtn: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flex: 1,
    justifyContent: "center",
    marginRight: 8,
  },
  actionAllocateBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  actionVacantBtn: {
    backgroundColor: "#DEF7EC",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flex: 1,
    justifyContent: "center",
    marginRight: 8,
  },
  actionVacantBtnText: {
    color: "#03543F",
    fontSize: 12,
    fontWeight: "700",
  },
  actionToggleBtn: {
    backgroundColor: "#F1F5F9",
    padding: 6,
    borderRadius: 6,
  },
  tableCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
  },
  tableHeadRow: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  th: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  td: {
    fontSize: 12,
    color: "#334155",
  },
  tdBold: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  tableActionGroup: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  tblBtnSmall: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  tblBtnSmallText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 440,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
  },
  formLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 6,
    marginTop: 10,
  },
  formInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: "#0F172A",
  },
  typeSelector: {
    flexDirection: "row",
    gap: 8,
  },
  typeOption: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  typeOptionActive: {
    backgroundColor: "#EFF6FF",
    borderColor: "#2563EB",
  },
  typeOptionText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  typeOptionTextActive: {
    color: "#2563EB",
    fontWeight: "700",
  },
  allocInfoBox: {
    backgroundColor: "#F1F5F9",
    padding: 12,
    borderRadius: 8,
    marginTop: 14,
    gap: 4,
  },
  allocInfoText: {
    fontSize: 12,
    color: "#334155",
    fontWeight: "500",
  },
  modalBtnRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 20,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  cancelBtnText: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "600",
  },
  submitBtn: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  submitBtnText: {
    fontSize: 13,
    color: "#FFFFFF",
    fontWeight: "700",
  },
});