import React, { useState, useEffect } from "react";
import {
  Alert,
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
import MessLayout from "../../components/mess/MessLayout";
import messDataService, { MealItem } from "../../services/messDataService";

export default function EditMenuScreen() {
  const [meals, setMeals] = useState<MealItem[]>(messDataService.getTodayMeals());
  const [breakfast, setBreakfast] = useState("");
  const [lunch, setLunch] = useState("");
  const [snacks, setSnacks] = useState("");
  const [dinner, setDinner] = useState("");
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  useEffect(() => {
    const b = meals.find((m) => m.type === "Breakfast");
    const l = meals.find((m) => m.type === "Lunch");
    const s = meals.find((m) => m.type === "Snacks");
    const d = meals.find((m) => m.type === "Dinner");

    if (b) setBreakfast(b.items);
    if (l) setLunch(l.items);
    if (s) setSnacks(s.items);
    if (d) setDinner(d.items);
  }, []);

  const handleSaveAll = () => {
    const b = meals.find((m) => m.type === "Breakfast");
    const l = meals.find((m) => m.type === "Lunch");
    const s = meals.find((m) => m.type === "Snacks");
    const d = meals.find((m) => m.type === "Dinner");

    if (b && breakfast.trim()) messDataService.updateMeal(b.id, { items: breakfast.trim() });
    if (l && lunch.trim()) messDataService.updateMeal(l.id, { items: lunch.trim() });
    if (s && snacks.trim()) messDataService.updateMeal(s.id, { items: snacks.trim() });
    if (d && dinner.trim()) messDataService.updateMeal(d.id, { items: dinner.trim() });

    setActionNotice("Today's entire meal menu updated successfully!");
    setTimeout(() => {
      router.push("/mess-manager/menu");
    }, 1500);
  };

  return (
    <MessLayout
      activeNav="menu"
      pageTitle="Edit Full Day Menu"
      pageSubtitle="Update recipes, dish names, and meal schedules for today"
      actionNotice={actionNotice}
      rightAction={
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.push("/mess-manager/menu")}
        >
          <Ionicons name="arrow-back" size={16} color="#FFFFFF" />
          <Text style={styles.backBtnText}>Menu View</Text>
        </TouchableOpacity>
      }
    >
      <View style={styles.formCard}>
        <View style={styles.mealSection}>
          <View style={styles.sectionHeader}>
            <Ionicons name="sunny-outline" size={18} color="#EA580C" />
            <Text style={styles.sectionTitle}>Breakfast Dishes</Text>
            <Text style={styles.sectionTiming}>07:30 AM – 09:30 AM</Text>
          </View>
          <TextInput
            value={breakfast}
            onChangeText={setBreakfast}
            placeholder="e.g. Masala Dosa + Sambar + Coconut Chutney + Tea"
            style={styles.input}
          />
        </View>

        <View style={styles.mealSection}>
          <View style={styles.sectionHeader}>
            <Ionicons name="restaurant-outline" size={18} color="#2563EB" />
            <Text style={styles.sectionTitle}>Lunch Dishes</Text>
            <Text style={styles.sectionTiming}>12:30 PM – 02:30 PM</Text>
          </View>
          <TextInput
            value={lunch}
            onChangeText={setLunch}
            placeholder="e.g. Rice + Rajma + Aloo Gobhi + Roti + Curd"
            style={styles.input}
          />
        </View>

        <View style={styles.mealSection}>
          <View style={styles.sectionHeader}>
            <Ionicons name="cafe-outline" size={18} color="#D97706" />
            <Text style={styles.sectionTitle}>Snacks & Refreshment</Text>
            <Text style={styles.sectionTiming}>05:00 PM – 06:00 PM</Text>
          </View>
          <TextInput
            value={snacks}
            onChangeText={setSnacks}
            placeholder="e.g. Vegetable Samosa + Green Mint Chutney + Hot Masala Chai"
            style={styles.input}
          />
        </View>

        <View style={styles.mealSection}>
          <View style={styles.sectionHeader}>
            <Ionicons name="moon-outline" size={18} color="#7C3AED" />
            <Text style={styles.sectionTitle}>Dinner Dishes</Text>
            <Text style={styles.sectionTiming}>08:00 PM – 10:00 PM</Text>
          </View>
          <TextInput
            value={dinner}
            onChangeText={setDinner}
            placeholder="e.g. Chapati + Dal Tadka + Paneer Butter Masala + Gulab Jamun"
            style={styles.input}
          />
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSaveAll}>
          <Ionicons name="save-outline" size={18} color="#FFFFFF" />
          <Text style={styles.saveBtnText}>Save All Menu Changes</Text>
        </TouchableOpacity>
      </View>
    </MessLayout>
  );
}

const styles = StyleSheet.create({
  backBtn: {
    backgroundColor: "#EA580C",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  backBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 24,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    maxWidth: 720,
    gap: 20,
  },
  mealSection: {
    gap: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  sectionTiming: {
    fontSize: 11,
    color: "#94A3B8",
    marginLeft: "auto",
  },
  input: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: "#0F172A",
  },
  saveBtn: {
    backgroundColor: "#EA580C",
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 10,
  },
  saveBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});