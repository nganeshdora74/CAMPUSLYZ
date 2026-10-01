import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { auth, db } from "../firebase/config";

type ReportType = "Bug" | "Problem" | "Feedback";

type ReportStatus =
  | "Pending"
  | "In Progress"
  | "Resolved";

type Report = {
  id: string;
  userId: string;
  userEmail?: string;
  type: ReportType;
  title: string;
  message: string;
  status: ReportStatus;
  createdAt?: any;
};

const REPORT_TYPES: ReportType[] = [
  "Bug",
  "Problem",
  "Feedback",
];

export default function DebuggerScreen() {
  const [selectedType, setSelectedType] =
    useState<ReportType>("Bug");

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");

  const [submitting, setSubmitting] =
    useState(false);

  const [loadingReports, setLoadingReports] =
    useState(true);

  const [myReports, setMyReports] =
    useState<Report[]>([]);

  // ==================================================
  // LOAD CURRENT USER REPORTS
  // ==================================================

  useEffect(() => {
    const user = auth.currentUser;

    if (!user) {
      setMyReports([]);
      setLoadingReports(false);
      return;
    }

    const reportsQuery = query(
      collection(db, "debugReports"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      reportsQuery,
      (snapshot) => {
        const reports = snapshot.docs.map(
          (item) => ({
            id: item.id,
            ...item.data(),
          })
        ) as Report[];

        setMyReports(reports);
        setLoadingReports(false);
      },
      (error) => {
        console.log(
          "Error loading reports:",
          error
        );

        setLoadingReports(false);
      }
    );

    return unsubscribe;
  }, []);

  // ==================================================
  // SUBMIT REPORT
  // ==================================================

  const submitReport = async () => {
    const user = auth.currentUser;

    if (!user) {
      Alert.alert(
        "Login Required",
        "Please login before submitting a report."
      );
      return;
    }

    if (!title.trim()) {
      Alert.alert(
        "Missing Title",
        "Please enter a title."
      );
      return;
    }

    if (!message.trim()) {
      Alert.alert(
        "Missing Description",
        "Please describe the problem or feedback."
      );
      return;
    }

    try {
      setSubmitting(true);

      await addDoc(
        collection(db, "debugReports"),
        {
          userId: user.uid,

          userEmail:
            user.email || "Unknown",

          type: selectedType,

          title: title.trim(),

          message: message.trim(),

          status: "Pending",

          createdAt: serverTimestamp(),
        }
      );

      setTitle("");
      setMessage("");

      Alert.alert(
        "Success",
        "Your report has been submitted successfully."
      );
    } catch (error) {
      console.log(
        "Submit report error:",
        error
      );

      Alert.alert(
        "Error",
        "Unable to submit your report. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ==================================================
  // REPORT ICON
  // ==================================================

  const getIcon = (type: ReportType) => {
    if (type === "Bug") {
      return "bug-outline";
    }

    if (type === "Problem") {
      return "warning-outline";
    }

    return "chatbox-outline";
  };

  // ==================================================
  // STATUS COLOR
  // ==================================================

  const getStatusColor = (
    status: ReportStatus
  ) => {
    if (status === "Resolved") {
      return "#1B8A4B";
    }

    if (status === "In Progress") {
      return "#D88A00";
    }

    return "#6B5AA6";
  };

  // ==================================================
  // DATE
  // ==================================================

  const formatDate = (timestamp: any) => {
    if (!timestamp) {
      return "Just now";
    }

    try {
      return timestamp
        .toDate()
        .toLocaleString();
    } catch {
      return "Unknown date";
    }
  };

  // ==================================================
  // REPORT CARD
  // ==================================================

  const renderReport = ({
    item,
  }: {
    item: Report;
  }) => {
    return (
      <View style={styles.reportCard}>
        <View style={styles.reportHeader}>
          <View style={styles.reportType}>
            <Ionicons
              name={getIcon(item.type)}
              size={20}
              color="#4B2E91"
            />

            <Text style={styles.reportTypeText}>
              {item.type}
            </Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor:
                  getStatusColor(item.status),
              },
            ]}
          >
            <Text style={styles.statusText}>
              {item.status}
            </Text>
          </View>
        </View>

        <Text style={styles.reportTitle}>
          {item.title}
        </Text>

        <Text style={styles.reportMessage}>
          {item.message}
        </Text>

        <Text style={styles.reportDate}>
          {formatDate(item.createdAt)}
        </Text>
      </View>
    );
  };

  // ==================================================
  // SCREEN
  // ==================================================

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={
        Platform.OS === "ios"
          ? "padding"
          : undefined
      }
    >
      <FlatList
        data={myReports}
        keyExtractor={(item) => item.id}
        renderItem={renderReport}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <>
            {/* HEADER */}

            <Text style={styles.title}>
              Help & Support
            </Text>

            <Text style={styles.subtitle}>
              Report bugs, problems or send feedback
            </Text>

            {/* DIAGNOSTICS */}

            <View style={styles.diagnostics}>
              <View style={styles.diagnosticIcon}>
                <Ionicons
                  name="pulse-outline"
                  size={26}
                  color="#4B2E91"
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text
                  style={styles.diagnosticTitle}
                >
                  App Diagnostics
                </Text>

                <Text
                  style={styles.diagnosticText}
                >
                  Authentication:{" "}
                  {auth.currentUser
                    ? "Connected"
                    : "Not Logged In"}
                </Text>

                <Text
                  style={styles.diagnosticText}
                >
                  Firestore: Connected
                </Text>
              </View>

              <View style={styles.onlineDot} />
            </View>

            {/* REPORT TYPE */}

            <Text style={styles.sectionTitle}>
              Select Report Type
            </Text>

            <View style={styles.typeRow}>
              {REPORT_TYPES.map((type) => {
                const selected =
                  selectedType === type;

                return (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeButton,
                      selected &&
                        styles.typeButtonSelected,
                    ]}
                    onPress={() =>
                      setSelectedType(type)
                    }
                    disabled={submitting}
                  >
                    <Ionicons
                      name={getIcon(type)}
                      size={19}
                      color={
                        selected
                          ? "#FFFFFF"
                          : "#4B2E91"
                      }
                    />

                    <Text
                      style={[
                        styles.typeButtonText,
                        selected &&
                          styles.typeButtonTextSelected,
                      ]}
                    >
                      {type}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* TITLE */}

            <Text style={styles.label}>
              Title
            </Text>

            <TextInput
              style={styles.input}
              placeholder={
                selectedType === "Bug"
                  ? "Hostel complaint is not submitting"
                  : selectedType === "Problem"
                  ? "Button is not working"
                  : "Suggestion for Campusly"
              }
              placeholderTextColor="#999"
              value={title}
              onChangeText={setTitle}
              editable={!submitting}
              maxLength={100}
            />

            {/* DESCRIPTION */}

            <Text style={styles.label}>
              Description
            </Text>

            <TextInput
              style={[
                styles.input,
                styles.messageInput,
              ]}
              placeholder={
                selectedType === "Feedback"
                  ? "Enter your feedback or suggestion..."
                  : "Describe the problem in detail..."
              }
              placeholderTextColor="#999"
              value={message}
              onChangeText={setMessage}
              editable={!submitting}
              multiline
              textAlignVertical="top"
              maxLength={1000}
            />

            {/* SUBMIT */}

            <TouchableOpacity
              style={[
                styles.submitButton,
                submitting &&
                  styles.submitDisabled,
              ]}
              onPress={submitReport}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <ActivityIndicator
                    size="small"
                    color="#FFFFFF"
                  />

                  <Text style={styles.submitText}>
                    Submitting...
                  </Text>
                </>
              ) : (
                <>
                  <Ionicons
                    name="send-outline"
                    size={20}
                    color="#FFFFFF"
                  />

                  <Text style={styles.submitText}>
                    Submit Report
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* MY REPORTS */}

            <Text style={styles.sectionTitle}>
              My Reports
            </Text>

            {loadingReports && (
              <View
                style={styles.loadingContainer}
              >
                <ActivityIndicator
                  color="#4B2E91"
                />

                <Text
                  style={styles.loadingText}
                >
                  Loading reports...
                </Text>
              </View>
            )}

            {!loadingReports &&
              myReports.length === 0 && (
                <View style={styles.emptyCard}>
                  <Ionicons
                    name="document-text-outline"
                    size={42}
                    color="#999"
                  />

                  <Text
                    style={styles.emptyTitle}
                  >
                    No Reports Yet
                  </Text>

                  <Text
                    style={styles.emptyText}
                  >
                    Your submitted reports will
                    appear here.
                  </Text>
                </View>
              )}
          </>
        }
        ListFooterComponent={
          myReports.length > 0 ? (
            <Text style={styles.footer}>
              Reports are reviewed by the
              administration.
            </Text>
          ) : null
        }
      />
    </KeyboardAvoidingView>
  );
}

// ==================================================
// STYLES
// ==================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F7FC",
  },

  content: {
    padding: 20,
    paddingBottom: 40,
  },

  title: {
    fontSize: 29,
    fontWeight: "900",
    color: "#292052",
  },

  subtitle: {
    color: "#777",
    marginTop: 4,
    marginBottom: 20,
  },

  diagnostics: {
    backgroundColor: "#EEEAFB",
    borderRadius: 17,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 23,
  },

  diagnosticIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  diagnosticTitle: {
    color: "#292052",
    fontSize: 16,
    fontWeight: "800",
  },

  diagnosticText: {
    color: "#6F6980",
    fontSize: 12,
    marginTop: 3,
  },

  onlineDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: "#24A148",
  },

  sectionTitle: {
    color: "#292052",
    fontSize: 19,
    fontWeight: "800",
    marginTop: 8,
    marginBottom: 12,
  },

  typeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },

  typeButton: {
    flex: 1,
    height: 47,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#D8D2E6",
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
  },

  typeButtonSelected: {
    backgroundColor: "#4B2E91",
    borderColor: "#4B2E91",
  },

  typeButtonText: {
    color: "#4B2E91",
    fontSize: 13,
    fontWeight: "700",
  },

  typeButtonTextSelected: {
    color: "#FFFFFF",
  },

  label: {
    color: "#292052",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 7,
  },

  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2DDEA",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: "#292052",
    fontSize: 14,
    marginBottom: 15,
  },

  messageInput: {
    minHeight: 120,
    paddingTop: 14,
  },

  submitButton: {
    height: 52,
    backgroundColor: "#4B2E91",
    borderRadius: 15,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginBottom: 20,
  },

  submitDisabled: {
    opacity: 0.6,
  },

  submitText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 15,
  },

  reportCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#ECE8F2",
  },

  reportHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },

  reportType: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  reportTypeText: {
    color: "#4B2E91",
    fontWeight: "800",
  },

  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },

  statusText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },

  reportTitle: {
    color: "#292052",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 6,
  },

  reportMessage: {
    color: "#666",
    fontSize: 14,
    lineHeight: 20,
  },

  reportDate: {
    color: "#999",
    fontSize: 11,
    marginTop: 10,
  },

  loadingContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingVertical: 15,
  },

  loadingText: {
    color: "#777",
  },

  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 28,
    alignItems: "center",
  },

  emptyTitle: {
    color: "#292052",
    fontSize: 17,
    fontWeight: "800",
    marginTop: 9,
  },

  emptyText: {
    color: "#888",
    textAlign: "center",
    marginTop: 6,
  },

  footer: {
    color: "#999",
    textAlign: "center",
    fontSize: 12,
    marginTop: 5,
  },
});