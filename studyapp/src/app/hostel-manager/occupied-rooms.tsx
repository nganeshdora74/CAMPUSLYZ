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

export default function OccupiedRoomsScreen() {
  const { width } = useWindowDimensions();
  const [rooms, setRooms] = useState<HostelRoom[]>(
    hostelDataService.getRooms().filter((r) => r.status === "Occupied")
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"All" | "Single" | "Double" | "Triple">("All");
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const refreshRooms = () => {
    setRooms(hostelDataService.getRooms().filter((r) => r.status === "Occupied"));
  };

  const filtered = rooms.filter((r) => {
    const matchesType = typeFilter === "All" || r.type === typeFilter;
    const matchesSearch =
      r.roomNo.includes(searchQuery) ||
      (r.residentNames && r.residentNames.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.floor && r.floor.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesType && matchesSearch;
  });

  const handleVacateRoom = (room: HostelRoom) => {
    Alert.alert(
      "Vacate Room",
      `Are you sure you want to vacate Room ${room.roomNo}? This will remove current residents and mark the room Available.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Vacate",
          style: "destructive",
          onPress: () => {
            hostelDataService.updateRoom(room.id, {
              status: "Available",
              residents: [],
              residentNames: "-",
            });
            refreshRooms();
            setActionNotice(`Room ${room.roomNo} is now vacant and available for booking.`);
            setTimeout(() => setActionNotice(null), 3500);
          },
        },
      ]
    );
  };

  return (
    <HostelLayout
      activeNav="rooms"
      pageTitle="Occupied Rooms"
      pageSubtitle={`${rooms.length} occupied rooms • Active student residents housed`}
      actionNotice={actionNotice}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder="Search room number, resident, floor..."
      rightAction={
        <TouchableOpacity
          style={styles.allRoomsBtn}
          onPress={() => router.push("/hostel-manager/rooms")}
        >
          <Ionicons name="grid-outline" size={16} color="#FFFFFF" />
          <Text style={styles.allRoomsBtnText}>All Rooms Grid</Text>
        </TouchableOpacity>
      }
    >
      {/* Type Filter Pills */}
      <View style={styles.pillRow}>
        {(["All", "Single", "Double", "Triple"] as const).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.pill, typeFilter === t && styles.pillActive]}
            onPress={() => setTypeFilter(t)}
          >
            <Text style={[styles.pillText, typeFilter === t && styles.pillTextActive]}>
              {t === "All" ? `All Occupied (${rooms.length})` : `${t} Rooms`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Grid of Occupied Rooms */}
      <View style={styles.gridContainer}>
        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="information-circle-outline" size={40} color="#94A3B8" />
            <Text style={styles.emptyText}>No occupied rooms match your search</Text>
          </View>
        ) : (
          filtered.map((room) => (
            <View key={room.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.roomNoBadge}>
                  <Ionicons name="business" size={16} color="#DC2626" />
                  <Text style={styles.roomNoText}>Room {room.roomNo}</Text>
                </View>
                <View style={styles.occBadge}>
                  <Text style={styles.occBadgeText}>Occupied</Text>
                </View>
              </View>

              <View style={styles.cardDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Type:</Text>
                  <Text style={styles.detailValue}>{room.type} (Cap: {room.capacity})</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Floor:</Text>
                  <Text style={styles.detailValue}>{room.floor || "1st Floor"}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Residents:</Text>
                  <Text style={styles.detailResidents} numberOfLines={2}>
                    {room.residentNames || "Assigned"}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Monthly Rent:</Text>
                  <Text style={styles.detailRent}>₹{room.rent || 4500} / mo</Text>
                </View>
              </View>

              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={styles.vacateBtn}
                  onPress={() => handleVacateRoom(room)}
                >
                  <Ionicons name="log-out-outline" size={15} color="#DC2626" />
                  <Text style={styles.vacateBtnText}>Vacate Room</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.viewResidentsBtn}
                  onPress={() => router.push("/hostel-manager/residents")}
                >
                  <Ionicons name="people-outline" size={15} color="#2563EB" />
                  <Text style={styles.viewResidentsBtnText}>View Student</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>
    </HostelLayout>
  );
}

const styles = StyleSheet.create({
  allRoomsBtn: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  allRoomsBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  pillRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
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
    backgroundColor: "#DC2626",
    borderColor: "#DC2626",
  },
  pillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  pillTextActive: {
    color: "#FFFFFF",
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },
  card: {
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
  roomNoBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  roomNoText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  occBadge: {
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  occBadgeText: {
    color: "#DC2626",
    fontSize: 11,
    fontWeight: "700",
  },
  cardDetails: {
    gap: 6,
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  detailLabel: {
    fontSize: 12,
    color: "#64748B",
  },
  detailValue: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1E293B",
  },
  detailResidents: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
    maxWidth: "60%",
    textAlign: "right",
  },
  detailRent: {
    fontSize: 13,
    fontWeight: "800",
    color: "#2563EB",
  },
  cardActions: {
    flexDirection: "row",
    gap: 8,
  },
  vacateBtn: {
    flex: 1,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    paddingVertical: 7,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  vacateBtnText: {
    color: "#DC2626",
    fontSize: 12,
    fontWeight: "700",
  },
  viewResidentsBtn: {
    flex: 1,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingVertical: 7,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  viewResidentsBtnText: {
    color: "#2563EB",
    fontSize: 12,
    fontWeight: "700",
  },
  emptyState: {
    width: "100%",
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    color: "#64748B",
    fontSize: 14,
    marginTop: 8,
  },
});