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
import NotificationBellModal from "../../components/NotificationBellModal";
import hostelDataService, { HostelRoom } from "../../services/hostelDataService";

export default function RoomsManagementScreen() {
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
      Alert.alert("Required", "Please enter a valid room number");
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
    setActionNotice(`Room ${newRoomNo} added successfully`);
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
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.push("/hostel-manager")}
          >
            <Ionicons name="arrow-back" size={20} color="#0F172A" />
          </TouchableOpacity>
          <View>
            <Text style={styles.pageTitle}>Rooms</Text>
            <Text style={styles.pageSubtitle}>Manage and view all hostel rooms</Text>
          </View>
        </View>

        <View style={styles.topBarRight}>
          <TouchableOpacity
            style={styles.addRoomBtn}
            onPress={() => setAddModal(true)}
          >
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text style={styles.addRoomBtnText}>+ Add Room</Text>
          </TouchableOpacity>
          <NotificationBellModal />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {actionNotice && (
          <View style={styles.toastBanner}>
            <Ionicons name="checkmark-circle" size={20} color="#059669" />
            <Text style={styles.toastText}>{actionNotice}</Text>
          </View>
        )}

        {/* Filter Bar & Controls */}
        <View style={styles.controlsRow}>
          <View style={styles.tabsRow}>
            <TouchableOpacity
              style={[styles.filterChip, filterTab === "All" && styles.filterChipActive]}
              onPress={() => setFilterTab("All")}
            >
              <Text style={[styles.filterChipText, filterTab === "All" && styles.filterChipTextActive]}>
                All Rooms ({rooms.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterChip, filterTab === "Available" && styles.filterChipActive]}
              onPress={() => setFilterTab("Available")}
            >
              <Text style={[styles.filterChipText, filterTab === "Available" && styles.filterChipTextActive]}>
                Available ({rooms.filter((r) => r.status === "Available").length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterChip, filterTab === "Occupied" && styles.filterChipActive]}
              onPress={() => setFilterTab("Occupied")}
            >
              <Text style={[styles.filterChipText, filterTab === "Occupied" && styles.filterChipTextActive]}>
                Occupied ({rooms.filter((r) => r.status === "Occupied").length})
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.searchAndToggleRow}>
            <View style={styles.searchWrap}>
              <Ionicons name="search-outline" size={16} color="#94A3B8" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search room number or resident..."
                placeholderTextColor="#94A3B8"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            <View style={styles.viewToggleGroup}>
              <TouchableOpacity
                style={[styles.viewToggleBtn, viewMode === "cards" && styles.viewToggleBtnActive]}
                onPress={() => setViewMode("cards")}
              >
                <Ionicons name="grid" size={16} color={viewMode === "cards" ? "#2563EB" : "#64748B"} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.viewToggleBtn, viewMode === "table" && styles.viewToggleBtnActive]}
                onPress={() => setViewMode("table")}
              >
                <Ionicons name="list" size={16} color={viewMode === "table" ? "#2563EB" : "#64748B"} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ROOMS GRID (SCREEN 2) */}
        {viewMode === "cards" ? (
          <View style={styles.roomsGrid}>
            {filteredRooms.map((room) => {
              const isOccupied = room.status === "Occupied";
              return (
                <View key={room.id} style={styles.roomCard}>
                  <View style={styles.roomCardTop}>
                    <View style={styles.roomBadgeHeader}>
                      <Ionicons name="bed-outline" size={18} color="#2563EB" />
                      <Text style={styles.roomNoText}>Room {room.roomNo}</Text>
                    </View>
                    <View
                      style={[
                        styles.statusTag,
                        isOccupied ? styles.statusTagOccupied : styles.statusTagAvailable,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusTagText,
                          isOccupied ? styles.statusTextOccupied : styles.statusTextAvailable,
                        ]}
                      >
                        {room.status}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.roomDetailMeta}>
                    <Text style={styles.roomMetaText}>Type: {room.type} ({room.capacity} Bed)</Text>
                    <Text style={styles.roomMetaText}>Floor: {room.floor || "1st Floor"}</Text>
                    <Text style={styles.roomMetaText}>Rent: ₹{room.rent || 4000}/month</Text>
                  </View>

                  <View style={styles.roomResidentsRow}>
                    <Ionicons name="person-circle-outline" size={16} color="#64748B" />
                    <Text style={styles.residentNames} numberOfLines={1}>
                      {room.residentNames || (isOccupied ? "Residents Allocated" : "No Residents (Vacant)")}
                    </Text>
                  </View>

                  <View style={styles.roomCardActions}>
                    {isOccupied ? (
                      <TouchableOpacity
                        style={styles.vacateBtn}
                        onPress={() => handleToggleStatus(room)}
                      >
                        <Text style={styles.vacateBtnText}>Mark Vacant</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={styles.assignBtn}
                        onPress={() => {
                          setSelectedRoom(room);
                          setAllocModal(true);
                        }}
                      >
                        <Ionicons name="key" size={14} color="#FFFFFF" />
                        <Text style={styles.assignBtnText}>Assign / Book</Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={styles.detailsBtn}
                      onPress={() =>
                        Alert.alert(
                          `Room ${room.roomNo} Details`,
                          `Type: ${room.type}\nCapacity: ${room.capacity}\nStatus: ${room.status}\nResidents: ${room.residentNames}\nFloor: ${room.floor || "1st Floor"}\nMonthly Rent: ₹${room.rent || 4000}`
                        )
                      }
                    >
                      <Text style={styles.detailsBtnText}>View</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          /* TABLE VIEW (SCREEN 3) */
          <View style={styles.tableCard}>
            <View style={styles.tableHeader}>
              <Text style={[styles.th, { flex: 1 }]}>Room No.</Text>
              <Text style={[styles.th, { flex: 1 }]}>Type</Text>
              <Text style={[styles.th, { flex: 0.8 }]}>Capacity</Text>
              <Text style={[styles.th, { flex: 1 }]}>Status</Text>
              <Text style={[styles.th, { flex: 1.8 }]}>Resident(s)</Text>
              <Text style={[styles.th, { flex: 1.2, textAlign: "right" }]}>Action</Text>
            </View>

            {filteredRooms.map((room) => {
              const isOccupied = room.status === "Occupied";
              return (
                <View key={room.id} style={styles.tableRow}>
                  <Text style={[styles.tdBold, { flex: 1 }]}>Room {room.roomNo}</Text>
                  <Text style={[styles.td, { flex: 1 }]}>{room.type}</Text>
                  <Text style={[styles.td, { flex: 0.8 }]}>{room.capacity}</Text>
                  <View style={{ flex: 1 }}>
                    <View
                      style={[
                        styles.tableStatusPill,
                        isOccupied ? styles.statusTagOccupied : styles.statusTagAvailable,
                      ]}
                    >
                      <Text
                        style={[
                          styles.tableStatusText,
                          isOccupied ? styles.statusTextOccupied : styles.statusTextAvailable,
                        ]}
                      >
                        {room.status}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.td, { flex: 1.8 }]} numberOfLines={1}>
                    {room.residentNames || "-"}
                  </Text>
                  <View style={[styles.tableActionCol, { flex: 1.2 }]}>
                    {isOccupied ? (
                      <TouchableOpacity
                        style={styles.tableMiniBtn}
                        onPress={() => handleToggleStatus(room)}
                      >
                        <Text style={styles.tableMiniBtnText}>Vacate</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={[styles.tableMiniBtn, { backgroundColor: "#059669" }]}
                        onPress={() => {
                          setSelectedRoom(room);
                          setAllocModal(true);
                        }}
                      >
                        <Text style={[styles.tableMiniBtnText, { color: "#FFFFFF" }]}>Assign</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* ADD ROOM MODAL */}
      <Modal visible={addModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add New Hostel Room</Text>

            <Text style={styles.inputLabel}>Room Number</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. 201"
              value={newRoomNo}
              onChangeText={setNewRoomNo}
            />

            <Text style={styles.inputLabel}>Room Type</Text>
            <View style={styles.typeSelectorRow}>
              {(["Single", "Double", "Triple"] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeSelectBtn, newRoomType === t && styles.typeSelectBtnActive]}
                  onPress={() => setNewRoomType(t)}
                >
                  <Text style={[styles.typeSelectText, newRoomType === t && styles.typeSelectTextActive]}>
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Floor Location</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. 2nd Floor, Block A"
              value={newFloor}
              onChangeText={setNewFloor}
            />

            <Text style={styles.inputLabel}>Monthly Rent (₹)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. 5000"
              keyboardType="numeric"
              value={newRent}
              onChangeText={setNewRent}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setAddModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleAddRoom}>
                <Text style={styles.saveBtnText}>Save Room</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ALLOCATE ROOM MODAL */}
      <Modal visible={allocModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              Assign Room {selectedRoom ? selectedRoom.roomNo : ""}
            </Text>
            <Text style={styles.modalSub}>
              Type: {selectedRoom?.type} • Capacity: {selectedRoom?.capacity} Bed
            </Text>

            <Text style={styles.inputLabel}>Student / Resident Name</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Rohan Sharma"
              value={studentNameInput}
              onChangeText={setStudentNameInput}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setAllocModal(false);
                  setSelectedRoom(null);
                }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleAllocate}>
                <Text style={styles.saveBtnText}>Confirm Allocation</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  topBar: {
    height: 62,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  topBarLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  pageSubtitle: {
    fontSize: 11.5,
    color: "#64748B",
  },
  topBarRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  addRoomBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#2563EB",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addRoomBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  scrollContent: {
    padding: 20,
    gap: 16,
  },
  toastBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    borderRadius: 10,
    padding: 12,
  },
  toastText: {
    color: "#065F46",
    fontSize: 13.5,
    fontWeight: "600",
  },
  controlsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  tabsRow: {
    flexDirection: "row",
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  filterChipActive: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  filterChipText: {
    fontSize: 12.5,
    color: "#64748B",
    fontWeight: "600",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
  },
  searchAndToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 240,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#0F172A",
    padding: 0,
  },
  viewToggleGroup: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 8,
    padding: 2,
  },
  viewToggleBtn: {
    padding: 6,
    borderRadius: 6,
  },
  viewToggleBtnActive: {
    backgroundColor: "#FFFFFF",
  },
  roomsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },
  roomCard: {
    flex: 1,
    minWidth: 260,
    maxWidth: 360,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 10,
  },
  roomCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  roomBadgeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  roomNoText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusTagOccupied: {
    backgroundColor: "#FEE2E2",
  },
  statusTagAvailable: {
    backgroundColor: "#DCFCE7",
  },
  statusTagText: {
    fontSize: 11,
    fontWeight: "700",
  },
  statusTextOccupied: {
    color: "#DC2626",
  },
  statusTextAvailable: {
    color: "#059669",
  },
  roomDetailMeta: {
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    padding: 8,
    gap: 3,
  },
  roomMetaText: {
    fontSize: 11.5,
    color: "#475569",
  },
  roomResidentsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  residentNames: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
  },
  roomCardActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  assignBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#059669",
    paddingVertical: 7,
    borderRadius: 6,
  },
  assignBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  vacateBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    paddingVertical: 7,
    borderRadius: 6,
  },
  vacateBtnText: {
    color: "#DC2626",
    fontSize: 12,
    fontWeight: "600",
  },
  detailsBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
  },
  detailsBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  tableCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  th: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  td: {
    fontSize: 12.5,
    color: "#334155",
  },
  tdBold: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  tableStatusPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tableStatusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  tableActionCol: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  tableMiniBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "#F1F5F9",
  },
  tableMiniBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    gap: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  modalSub: {
    fontSize: 12,
    color: "#64748B",
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
    marginTop: 4,
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: "#0F172A",
  },
  typeSelectorRow: {
    flexDirection: "row",
    gap: 8,
  },
  typeSelectBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
  },
  typeSelectBtnActive: {
    borderColor: "#2563EB",
    backgroundColor: "#EFF6FF",
  },
  typeSelectText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: "#64748B",
  },
  typeSelectTextActive: {
    color: "#2563EB",
    fontWeight: "700",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 12,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
  },
  cancelBtnText: {
    fontSize: 12.5,
    color: "#64748B",
    fontWeight: "600",
  },
  saveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#2563EB",
  },
  saveBtnText: {
    fontSize: 12.5,
    color: "#FFFFFF",
    fontWeight: "700",
  },
});