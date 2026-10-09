import React, { useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useTheme } from "../../context/ThemeContext";

export default function ProfileScreen() {
  const { isDark } = useTheme();
  const [name, setName] = useState("Anita Verma");
  const [email, setEmail] = useState("anita@college.edu");
  const [role, setRole] = useState("Notice Manager");
  const [memberSince] = useState("01 Jan 2024");
  const [avatar, setAvatar] = useState(
    "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80"
  );
  const [isEditing, setIsEditing] = useState(false);

  const handlePickAvatar = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, quality: 0.8 });
    if (!res.canceled && res.assets?.[0]?.uri) {
      setAvatar(res.assets[0].uri);
    }
  };

  const bg = isDark ? "#0F172A" : "#F4F7FB";
  const cardBg = isDark ? "#1E293B" : "#FFFFFF";
  const textColor = isDark ? "#F8FAFC" : "#0F172A";
  const subTextColor = isDark ? "#94A3B8" : "#64748B";
  const borderColor = isDark ? "#334155" : "#E2E8F0";

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <View style={[styles.topBar, { backgroundColor: cardBg, borderBottomColor: borderColor }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
          <Ionicons name="arrow-back" size={22} color={textColor} />
        </TouchableOpacity>
        <Text style={[styles.screenTitle, { color: textColor }]}>👤 Profile</Text>
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => {
            if (isEditing) {
              Alert.alert("Profile Saved", "Notice Manager profile updated successfully.");
            }
            setIsEditing(!isEditing);
          }}
        >
          <Text style={styles.editBtnText}>{isEditing ? "Save" : "Edit Profile"}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          {/* Avatar and Main Header */}
          <View style={{ alignItems: "center", marginBottom: 24 }}>
            <View style={{ position: "relative" }}>
              <Image source={{ uri: avatar }} style={styles.avatarImg} />
              {isEditing && (
                <TouchableOpacity style={styles.cameraIconBox} onPress={handlePickAvatar}>
                  <Ionicons name="camera" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              )}
            </View>
            <Text style={[styles.nameText, { color: textColor }]}>{name}</Text>
            <Text style={[styles.roleText, { color: subTextColor }]}>Notice Manager</Text>
          </View>

          {/* Form Fields */}
          <View style={{ gap: 14 }}>
            <View>
              <Text style={[styles.label, { color: textColor }]}>Name</Text>
              <TextInput
                style={[styles.input, { color: textColor, backgroundColor: isDark ? "#0F172A" : "#F8FAFC", borderColor }]}
                value={name}
                onChangeText={setName}
                editable={isEditing}
              />
            </View>

            <View>
              <Text style={[styles.label, { color: textColor }]}>Email</Text>
              <TextInput
                style={[styles.input, { color: textColor, backgroundColor: isDark ? "#0F172A" : "#F8FAFC", borderColor }]}
                value={email}
                onChangeText={setEmail}
                editable={isEditing}
              />
            </View>

            <View>
              <Text style={[styles.label, { color: textColor }]}>Role</Text>
              <TextInput
                style={[styles.input, { color: subTextColor, backgroundColor: isDark ? "#0F172A" : "#F8FAFC", borderColor }]}
                value={role}
                editable={false}
              />
            </View>

            <View>
              <Text style={[styles.label, { color: textColor }]}>Member Since</Text>
              <TextInput
                style={[styles.input, { color: subTextColor, backgroundColor: isDark ? "#0F172A" : "#F8FAFC", borderColor }]}
                value={memberSince}
                editable={false}
              />
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  screenTitle: { fontSize: 20, fontWeight: "800" },
  editBtn: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  editBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 12 },
  card: {
    maxWidth: 500,
    width: "100%",
    alignSelf: "center",
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  avatarImg: { width: 90, height: 90, borderRadius: 45 },
  cameraIconBox: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#2563EB",
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  nameText: { fontSize: 18, fontWeight: "800", marginTop: 10 },
  roleText: { fontSize: 13, marginTop: 2 },
  label: { fontSize: 12, fontWeight: "700", marginBottom: 5 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13 },
});