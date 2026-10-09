import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import HostelLayout from "../../components/hostel/HostelLayout";
import { useLanguage, SUPPORTED_LANGUAGES } from "../../context/LanguageContext";

export default function HostelSettingsScreen() {
  const { width } = useWindowDimensions();
  const [curfewTime, setCurfewTime] = useState("08:30 PM");
  const [visitorEndTime, setVisitorEndTime] = useState("07:00 PM");
  const [wardenPhone, setWardenPhone] = useState("+91 98765 43210");
  const [autoApproveMedical, setAutoApproveMedical] = useState(false);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [gatePassSms, setGatePassSms] = useState(true);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const { languageCode, setLanguage, t } = useLanguage();

  const handleSelectLanguage = (code: string, name: string) => {
    setLanguage(code);
    setActionNotice(`Language switched to ${name}!`);
    setTimeout(() => setActionNotice(null), 3000);
  };

  const handleSaveSettings = () => {
    setActionNotice("Hostel configuration & curfew rules updated successfully!");
    setTimeout(() => setActionNotice(null), 3500);
  };

  return (
    <HostelLayout
      activeNav="settings"
      pageTitle="Hostel Policy & Settings"
      pageSubtitle="Configure curfew timings, entry rules, language preferences, and warden contact credentials"
      actionNotice={actionNotice}
      rightAction={
        <TouchableOpacity style={styles.saveBtn} onPress={handleSaveSettings}>
          <Ionicons name="save-outline" size={16} color="#FFFFFF" />
          <Text style={styles.saveBtnText}>Save Policy</Text>
        </TouchableOpacity>
      }
    >
      <View style={styles.formContainer}>
        {/* Language Preferences Section */}
        <View style={styles.sectionCard}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <Ionicons name="globe-outline" size={20} color="#2563EB" />
            <Text style={styles.sectionTitle}>Language Preferences</Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            Select your preferred display language for the hostel management portal
          </Text>

          <View style={styles.langGrid}>
            {SUPPORTED_LANGUAGES.map((lang) => {
              const isSelected = languageCode === lang.code;
              return (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    styles.langCard,
                    isSelected && styles.langCardActive,
                  ]}
                  onPress={() => handleSelectLanguage(lang.code, lang.name)}
                  activeOpacity={0.7}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.langNative, isSelected && styles.langNativeActive]}>
                      {lang.nativeName}
                    </Text>
                    <Text style={[styles.langEnglish, isSelected && styles.langEnglishActive]}>
                      {lang.name}
                    </Text>
                  </View>
                  {isSelected && (
                    <View style={styles.langCheckBadge}>
                      <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Curfew & Timing Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Curfew & Access Timings</Text>
          <Text style={styles.sectionSubtitle}>
            Mandatory gate close and visitor allowance schedules
          </Text>

          <View style={styles.rowTwo}>
            <View style={styles.fieldBox}>
              <Text style={styles.label}>Hostel Gate Curfew Time</Text>
              <TextInput
                value={curfewTime}
                onChangeText={setCurfewTime}
                placeholder="08:30 PM"
                style={styles.input}
              />
              <Text style={styles.hint}>Students returning after curfew are logged late</Text>
            </View>

            <View style={styles.fieldBox}>
              <Text style={styles.label}>Visitor Entry Closing Hour</Text>
              <TextInput
                value={visitorEndTime}
                onChangeText={setVisitorEndTime}
                placeholder="07:00 PM"
                style={styles.input}
              />
              <Text style={styles.hint}>Guests are prohibited in hostel blocks post this hour</Text>
            </View>
          </View>
        </View>

        {/* Warden Emergency Helpline */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Emergency Warden Hotline</Text>
          <Text style={styles.sectionSubtitle}>
            Displayed in student hostel dashboard and emergency dialers
          </Text>

          <View style={styles.fieldBox}>
            <Text style={styles.label}>Warden 24x7 Helpline Number</Text>
            <TextInput
              value={wardenPhone}
              onChangeText={setWardenPhone}
              placeholder="+91 98765 43210"
              keyboardType="phone-pad"
              style={styles.input}
            />
          </View>
        </View>

        {/* Automation & Notification Toggles */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Notification & Gate Pass Policies</Text>
          <Text style={styles.sectionSubtitle}>
            Automated alerts and approval workflows
          </Text>

          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleTitle}>Auto-Approve Medical Gate Passes</Text>
              <Text style={styles.toggleDesc}>
                Instantly sanction emergency medical passes with notification to parents
              </Text>
            </View>
            <Switch
              value={autoApproveMedical}
              onValueChange={setAutoApproveMedical}
              trackColor={{ false: "#CBD5E1", true: "#2563EB" }}
            />
          </View>

          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleTitle}>Real-time Gate Pass SMS Alerts to Parents</Text>
              <Text style={styles.toggleDesc}>
                Send departure and arrival timestamps via SMS to emergency contacts
              </Text>
            </View>
            <Switch
              value={gatePassSms}
              onValueChange={setGatePassSms}
              trackColor={{ false: "#CBD5E1", true: "#2563EB" }}
            />
          </View>

          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleTitle}>Email Digest on Unresolved Maintenance</Text>
              <Text style={styles.toggleDesc}>
                Daily morning reminder of complaints exceeding 24 hours
              </Text>
            </View>
            <Switch
              value={emailAlerts}
              onValueChange={setEmailAlerts}
              trackColor={{ false: "#CBD5E1", true: "#2563EB" }}
            />
          </View>
        </View>
      </View>
    </HostelLayout>
  );
}

const styles = StyleSheet.create({
  saveBtn: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  saveBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  formContainer: {
    gap: 16,
    maxWidth: 800,
  },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  sectionSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
    marginBottom: 16,
  },
  rowTwo: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },
  fieldBox: {
    flex: 1,
    minWidth: 260,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: "#0F172A",
  },
  hint: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 4,
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  toggleTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E293B",
  },
  toggleDesc: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
    paddingRight: 12,
  },
  langGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 8,
  },
  langCard: {
    width: "48%",
    minWidth: 160,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  langCardActive: {
    backgroundColor: "#EFF6FF",
    borderColor: "#2563EB",
  },
  langNative: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E293B",
  },
  langNativeActive: {
    color: "#1D4ED8",
  },
  langEnglish: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  langEnglishActive: {
    color: "#3B82F6",
  },
  langCheckBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
});