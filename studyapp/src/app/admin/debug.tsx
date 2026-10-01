import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Clipboard,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import { onAuthStateChanged, User } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
} from "firebase/firestore";

import { auth, db } from "../../firebase/config";
import { useAdminTheme } from "../../hooks/useAdminTheme";
import AdminThemeToggle from "../../components/admin/AdminThemeToggle";

type CheckStatus = "checking" | "success" | "error" | "warning";

type CheckItem = {
  id: string;
  title: string;
  description: string;
  status: CheckStatus;
  detail: string;
};

type CollectionCount = {
  name: string;
  count: number;
  status: CheckStatus;
};

type DebugProfile = {
  fullName?: string;
  email?: string;
  role?: string;
  department?: string;
  college?: string;
  employeeId?: string;
};

const BACKEND_URL =
  Platform.OS === "web"
    ? "http://localhost:5000"
    : "http://10.190.12.129:5000";

const COLLECTIONS = [
  "users",
  "faculty",
  "subjects",
  "departments",
  "attendance",
  "hostelStudents",
  "hostelRooms",
  "messHalls",
  "messMenus",
  "messMealRecords",
  "messComplaints",
  "feeStructures",
  "studentFees",
  "feePayments",
  "notices",
  "requests",
];

export default function AdminDebugScreen() {
  const { colors, isDark } = useAdminTheme();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [profile, setProfile] =
    useState<DebugProfile | null>(null);

  const [checks, setChecks] = useState<CheckItem[]>([]);
  const [collectionCounts, setCollectionCounts] =
    useState<CollectionCount[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const updateCheck = (
    id: string,
    update: Partial<CheckItem>
  ) => {
    setChecks((previous) =>
      previous.map((item) =>
        item.id === id
          ? {
              ...item,
              ...update,
            }
          : item
      )
    );
  };

  const runDiagnostics = useCallback(
    async (showRefreshing = false) => {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const initialChecks: CheckItem[] = [
        {
          id: "auth",
          title: "Firebase Authentication",
          description:
            "Checks whether a Firebase user is currently signed in.",
          status: "checking",
          detail: "Checking...",
        },
        {
          id: "profile",
          title: "Admin Firestore Profile",
          description:
            "Checks users/{uid} and verifies the admin profile.",
          status: "checking",
          detail: "Checking...",
        },
        {
          id: "role",
          title: "Admin Role",
          description:
            "Checks whether the current user has role = admin.",
          status: "checking",
          detail: "Checking...",
        },
        {
          id: "firestore",
          title: "Firestore Connection",
          description:
            "Checks whether Firestore can be read successfully.",
          status: "checking",
          detail: "Checking...",
        },
        {
          id: "backend",
          title: "Backend Health",
          description:
            "Checks the Campusly Node.js backend.",
          status: "checking",
          detail: "Checking...",
        },
        {
          id: "ai",
          title: "Admin AI Endpoint",
          description:
            "Checks whether the admin AI endpoint exists.",
          status: "checking",
          detail: "Checking...",
        },
      ];

      setChecks(initialChecks);
      setCollectionCounts([]);
      setProfile(null);

      try {
        const firebaseUser = auth.currentUser;

        if (!firebaseUser) {
          setCurrentUser(null);

          updateCheck("auth", {
            status: "error",
            detail: "No Firebase user is currently signed in.",
          });

          updateCheck("profile", {
            status: "error",
            detail: "Cannot load profile without a signed-in user.",
          });

          updateCheck("role", {
            status: "error",
            detail: "Cannot verify role without a signed-in user.",
          });
        } else {
          setCurrentUser(firebaseUser);

          updateCheck("auth", {
            status: "success",
            detail:
              `${firebaseUser.email || "No email"}\nUID: ${firebaseUser.uid}`,
          });

          try {
            const userRef = doc(
              db,
              "users",
              firebaseUser.uid
            );

            const userSnapshot = await getDoc(userRef);

            if (!userSnapshot.exists()) {
              updateCheck("profile", {
                status: "error",
                detail:
                  "users/{uid} does not exist in Firestore.",
              });

              updateCheck("role", {
                status: "error",
                detail:
                  "Cannot verify admin role because the profile does not exist.",
              });
            } else {
              const userData =
                userSnapshot.data() as DebugProfile;

              setProfile(userData);

              updateCheck("profile", {
                status: "success",
                detail:
                  `Profile found.\nName: ${
                    userData.fullName || "Not set"
                  }\nEmail: ${
                    userData.email ||
                    firebaseUser.email ||
                    "Not set"
                  }`,
              });

              if (userData.role === "admin") {
                updateCheck("role", {
                  status: "success",
                  detail:
                    "role = admin. Admin access is enabled.",
                });
              } else {
                updateCheck("role", {
                  status: "error",
                  detail:
                    `Current role is "${
                      userData.role || "missing"
                    }", not "admin".`,
                });
              }
            }
          } catch (error: any) {
            updateCheck("profile", {
              status: "error",
              detail:
                error?.message ||
                "Unable to read the Firestore profile.",
            });

            updateCheck("role", {
              status: "error",
              detail:
                "Role verification failed because the profile could not be read.",
            });
          }
        }

        // FIRESTORE CONNECTION
        try {
          const usersSnapshot = await getDocs(
            collection(db, "users")
          );

          updateCheck("firestore", {
            status: "success",
            detail:
              `Firestore read successful. Users collection contains ${usersSnapshot.size} document(s) visible to this account.`,
          });
        } catch (error: any) {
          updateCheck("firestore", {
            status: "error",
            detail:
              error?.message ||
              "Firestore read failed.",
          });
        }

        // BACKEND
        try {
          const controller =
            new AbortController();

          const timeout = setTimeout(() => {
            controller.abort();
          }, 8000);

          const response = await fetch(
            `${BACKEND_URL}/api/health`,
            {
              method: "GET",
              signal: controller.signal,
            }
          );

          clearTimeout(timeout);

          if (response.ok) {
            let bodyText = "";

            try {
              bodyText = await response.text();
            } catch {
              bodyText = "";
            }

            updateCheck("backend", {
              status: "success",
              detail:
                `Backend responded successfully.\nURL: ${BACKEND_URL}/api/health${
                  bodyText
                    ? `\nResponse: ${bodyText.substring(
                        0,
                        300
                      )}`
                    : ""
                }`,
            });
          } else {
            updateCheck("backend", {
              status: "error",
              detail:
                `Backend returned HTTP ${response.status}.\nURL: ${BACKEND_URL}/api/health`,
            });
          }
        } catch (error: any) {
          updateCheck("backend", {
            status: "error",
            detail:
              `Cannot connect to backend.\nURL: ${BACKEND_URL}/api/health\n${
                error?.message || "Network request failed."
              }`,
          });
        }

        // ADMIN AI ENDPOINT
        try {
          const controller =
            new AbortController();

          const timeout = setTimeout(() => {
            controller.abort();
          }, 8000);

          const response = await fetch(
            `${BACKEND_URL}/api/ai/admin`,
            {
              method: "OPTIONS",
              signal: controller.signal,
            }
          );

          clearTimeout(timeout);

          if (
            response.ok ||
            response.status === 400 ||
            response.status === 401 ||
            response.status === 403 ||
            response.status === 405
          ) {
            updateCheck("ai", {
              status: "success",
              detail:
                `Admin AI route is reachable.\nHTTP ${response.status}\nURL: ${BACKEND_URL}/api/ai/admin`,
            });
          } else if (response.status === 404) {
            updateCheck("ai", {
              status: "error",
              detail:
                "Backend returned 404. Add /api/ai/admin to backend/server.js.",
            });
          } else {
            updateCheck("ai", {
              status: "warning",
              detail:
                `Admin AI route responded with HTTP ${response.status}.`,
            });
          }
        } catch (error: any) {
          updateCheck("ai", {
            status: "error",
            detail:
              `Cannot reach admin AI endpoint.\nURL: ${BACKEND_URL}/api/ai/admin\n${
                error?.message || "Network request failed."
              }`,
          });
        }

        // COLLECTION COUNTS
        const counts: CollectionCount[] = [];

        for (const collectionName of COLLECTIONS) {
          try {
            const snapshot = await getDocs(
              collection(db, collectionName)
            );

            counts.push({
              name: collectionName,
              count: snapshot.size,
              status: "success",
            });
          } catch (error) {
            counts.push({
              name: collectionName,
              count: 0,
              status: "error",
            });
          }
        }

        setCollectionCounts(counts);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (firebaseUser) => {
        setCurrentUser(firebaseUser);
      }
    );

    runDiagnostics();

    return unsubscribe;
  }, [runDiagnostics]);

  const copyDiagnostics = () => {
    const lines: string[] = [];

    lines.push("Campusly Admin Diagnostics");
    lines.push("==========================");
    lines.push("");

    lines.push(
      `Platform: ${Platform.OS}`
    );

    lines.push(
      `Backend URL: ${BACKEND_URL}`
    );

    lines.push(
      `Firebase User: ${
        currentUser?.email || "Not signed in"
      }`
    );

    lines.push(
      `UID: ${currentUser?.uid || "None"}`
    );

    lines.push(
      `Role: ${profile?.role || "Unknown"}`
    );

    lines.push("");

    checks.forEach((check) => {
      lines.push(
        `[${check.status.toUpperCase()}] ${check.title}`
      );

      lines.push(check.detail);
      lines.push("");
    });

    lines.push("Collection Counts");
    lines.push("-----------------");

    collectionCounts.forEach((item) => {
      lines.push(
        `${item.name}: ${
          item.status === "success"
            ? item.count
            : "ERROR"
        }`
      );
    });

    Clipboard.setString(lines.join("\n"));

    Alert.alert(
      "Copied",
      "Diagnostic information has been copied to the clipboard."
    );
  };

  const statusColor = (status: CheckStatus) => {
    if (status === "success") {
      return "#16A34A";
    }

    if (status === "error") {
      return "#DC2626";
    }

    if (status === "warning") {
      return "#D97706";
    }

    return "#6246E5";
  };

  const statusBackground = (status: CheckStatus) => {
    if (status === "success") {
      return "#ECFDF5";
    }

    if (status === "error") {
      return "#FEF2F2";
    }

    if (status === "warning") {
      return "#FFFBEB";
    }

    return "#F5F3FF";
  };

  const statusIcon = (
    status: CheckStatus
  ): keyof typeof Ionicons.glyphMap => {
    if (status === "success") {
      return "checkmark-circle";
    }

    if (status === "error") {
      return "close-circle";
    }

    if (status === "warning") {
      return "warning";
    }

    return "time-outline";
  };

  const successfulChecks = checks.filter(
    (item) => item.status === "success"
  ).length;

  const errorChecks = checks.filter(
    (item) => item.status === "error"
  ).length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.adminBg }]}>
      {/* HEADER */}
      <View style={[styles.header, { backgroundColor: colors.adminTopBar, borderBottomColor: colors.adminTopBarBorder }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons
            name="arrow-back"
            size={23}
            color={colors.adminText}
          />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.adminText }]}>
            Admin Debug
          </Text>

          <Text style={[styles.headerSubtitle, { color: colors.adminTextSecondary }]}>
            System diagnostics
          </Text>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <AdminThemeToggle />
          <TouchableOpacity
            style={[styles.refreshButton, { backgroundColor: colors.adminSurfaceAlt, borderColor: colors.adminCardBorder }]}
            onPress={() => runDiagnostics(true)}
            disabled={loading || refreshing}
          >
            {refreshing ? (
              <ActivityIndicator
                size="small"
                color="#6246E5"
              />
            ) : (
              <Ionicons
                name="refresh"
                size={21}
                color="#6246E5"
              />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => runDiagnostics(true)}
            tintColor="#6246E5"
          />
        }
      >
        {/* SUMMARY */}
        <View style={[styles.summaryCard, { backgroundColor: isDark ? "#312E81" : "#6246E5" }]}>
          <View style={styles.summaryIcon}>
            <Ionicons
              name="bug-outline"
              size={28}
              color="#FFFFFF"
            />
          </View>

          <View style={styles.summaryContent}>
            <Text style={styles.summaryTitle}>
              System Diagnostics
            </Text>

            <Text style={styles.summaryText}>
              Check Firebase, backend, authentication
              and Campusly data connections.
            </Text>
          </View>
        </View>

        {/* CHECK SUMMARY */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}>
            <View
              style={[
                styles.statIcon,
                {
                  backgroundColor: "#ECFDF5",
                },
              ]}
            >
              <Ionicons
                name="checkmark-circle"
                size={21}
                color="#16A34A"
              />
            </View>

            <Text style={[styles.statNumber, { color: colors.adminText }]}>
              {successfulChecks}
            </Text>

            <Text style={[styles.statLabel, { color: colors.adminTextSecondary }]}>
              Passed
            </Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}>
            <View
              style={[
                styles.statIcon,
                {
                  backgroundColor: "#FEF2F2",
                },
              ]}
            >
              <Ionicons
                name="close-circle"
                size={21}
                color="#DC2626"
              />
            </View>

            <Text style={[styles.statNumber, { color: colors.adminText }]}>
              {errorChecks}
            </Text>

            <Text style={[styles.statLabel, { color: colors.adminTextSecondary }]}>
              Errors
            </Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}>
            <View
              style={[
                styles.statIcon,
                {
                  backgroundColor: isDark ? "rgba(98,70,229,0.2)" : "#F0EDFF",
                },
              ]}
            >
              <Ionicons
                name="server-outline"
                size={21}
                color="#6246E5"
              />
            </View>

            <Text style={[styles.statNumber, { color: colors.adminText }]}>
              {collectionCounts.length}
            </Text>

            <Text style={[styles.statLabel, { color: colors.adminTextSecondary }]}>
              Collections
            </Text>
          </View>
        </View>

        {/* CURRENT ACCOUNT */}
        <Text style={[styles.sectionTitle, { color: colors.adminText }]}>
          Current Account
        </Text>

        <View style={[styles.accountCard, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}>
          <View style={styles.accountAvatar}>
            <Text style={styles.accountAvatarText}>
              {(profile?.fullName ||
                currentUser?.email ||
                "A")
                .charAt(0)
                .toUpperCase()}
            </Text>
          </View>

          <View style={styles.accountInfo}>
            <Text style={[styles.accountName, { color: colors.adminText }]}>
              {profile?.fullName ||
                "Unknown Admin"}
            </Text>

            <Text style={[styles.accountEmail, { color: colors.adminTextSecondary }]}>
              {currentUser?.email ||
                profile?.email ||
                "Not signed in"}
            </Text>

            <Text style={[styles.accountUid, { color: colors.adminTextSecondary }]}>
              UID:{" "}
              {currentUser?.uid
                ? `${currentUser.uid.substring(
                    0,
                    18
                  )}...`
                : "None"}
            </Text>
          </View>

          <View
            style={[
              styles.roleBadge,
              {
                backgroundColor:
                  profile?.role === "admin"
                    ? "#ECFDF5"
                    : "#FEF2F2",
              },
            ]}
          >
            <Text
              style={[
                styles.roleBadgeText,
                {
                  color:
                    profile?.role === "admin"
                      ? "#16A34A"
                      : "#DC2626",
                },
              ]}
            >
              {profile?.role || "Unknown"}
            </Text>
          </View>
        </View>

        {/* DIAGNOSTIC CHECKS */}
        <Text style={[styles.sectionTitle, { color: colors.adminText }]}>
          Connection Checks
        </Text>

        {checks.map((check) => (
          <View
            key={check.id}
            style={[styles.checkCard, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}
          >
            <View
              style={[
                styles.checkIcon,
                {
                  backgroundColor:
                    statusBackground(check.status),
                },
              ]}
            >
              {check.status === "checking" ? (
                <ActivityIndicator
                  size="small"
                  color={statusColor(
                    check.status
                  )}
                />
              ) : (
                <Ionicons
                  name={statusIcon(
                    check.status
                  )}
                  size={22}
                  color={statusColor(
                    check.status
                  )}
                />
              )}
            </View>

            <View style={styles.checkContent}>
              <View style={styles.checkTitleRow}>
                <Text style={[styles.checkTitle, { color: colors.adminText }]}>
                  {check.title}
                </Text>

                <View
                  style={[
                    styles.statusPill,
                    {
                      backgroundColor:
                        statusBackground(
                          check.status
                        ),
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      {
                        color: statusColor(
                          check.status
                        ),
                      },
                    ]}
                  >
                    {check.status}
                  </Text>
                </View>
              </View>

              <Text
                style={[styles.checkDescription, { color: colors.adminTextSecondary }]}
              >
                {check.description}
              </Text>

              <Text style={[styles.checkDetail, { backgroundColor: isDark ? "#0F172A" : "#F9FAFB", borderColor: colors.adminCardBorder, color: isDark ? "#CBD5E1" : "#374151" }]}>
                {check.detail}
              </Text>
            </View>
          </View>
        ))}

        {/* BACKEND CONFIG */}
        <Text style={[styles.sectionTitle, { color: colors.adminText }]}>
          Backend Configuration
        </Text>

        <View style={[styles.configCard, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}>
          <View style={styles.configRow}>
            <Text style={[styles.configLabel, { color: colors.adminTextSecondary }]}>
              Platform
            </Text>

            <Text style={[styles.configValue, { color: colors.adminText }]}>
              {Platform.OS}
            </Text>
          </View>

          <View style={styles.configRow}>
            <Text style={[styles.configLabel, { color: colors.adminTextSecondary }]}>
              Backend
            </Text>

            <Text
              style={[
                styles.configValue,
                styles.monoText,
                { color: colors.adminText },
              ]}
            >
              {BACKEND_URL}
            </Text>
          </View>

          <View style={styles.configRow}>
            <Text style={[styles.configLabel, { color: colors.adminTextSecondary }]}>
              Health Endpoint
            </Text>

            <Text
              style={[
                styles.configValue,
                styles.monoText,
                { color: colors.adminText },
              ]}
            >
              /api/health
            </Text>
          </View>

          <View style={styles.configRow}>
            <Text style={[styles.configLabel, { color: colors.adminTextSecondary }]}>
              Admin AI
            </Text>

            <Text
              style={[
                styles.configValue,
                styles.monoText,
                { color: colors.adminText },
              ]}
            >
              /api/ai/admin
            </Text>
          </View>
        </View>

        {/* FIREBASE COLLECTIONS */}
        <View style={styles.collectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.adminText }]}>
            Firebase Collections
          </Text>

          <Text style={[styles.collectionSubtitle, { color: colors.adminTextSecondary }]}>
            Top-level collections visible to admin
          </Text>
        </View>

        <View style={styles.collectionGrid}>
          {collectionCounts.map((item) => (
            <View
              key={item.name}
              style={[styles.collectionCard, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}
            >
              <View style={[styles.collectionIcon, { backgroundColor: isDark ? "rgba(98,70,229,0.2)" : "#F0EDFF" }]}>
                <Ionicons
                  name="folder-outline"
                  size={19}
                  color="#6246E5"
                />
              </View>

              <View style={styles.collectionInfo}>
                <Text
                  style={[styles.collectionName, { color: colors.adminText }]}
                  numberOfLines={1}
                >
                  {item.name}
                </Text>

                <Text
                  style={[
                    styles.collectionCount,
                    item.status === "error" ? {
                      color: "#DC2626",
                    } : {
                      color: colors.adminTextSecondary,
                    },
                  ]}
                >
                  {item.status === "error"
                    ? "Read error"
                    : `${item.count} document${
                        item.count === 1
                          ? ""
                          : "s"
                      }`}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* ACTIONS */}
        <Text style={[styles.sectionTitle, { color: colors.adminText }]}>
          Debug Actions
        </Text>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}
          onPress={copyDiagnostics}
        >
          <View style={[styles.actionIcon, { backgroundColor: isDark ? "rgba(98,70,229,0.2)" : "#F0EDFF" }]}>
            <Ionicons
              name="copy-outline"
              size={21}
              color="#6246E5"
            />
          </View>

          <View style={styles.actionContent}>
            <Text style={[styles.actionTitle, { color: colors.adminText }]}>
              Copy Diagnostics
            </Text>

            <Text style={[styles.actionText, { color: colors.adminTextSecondary }]}>
              Copy all system information for
              troubleshooting.
            </Text>
          </View>

          <Ionicons
            name="chevron-forward"
            size={20}
            color={colors.adminTextSecondary}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}
          onPress={() => runDiagnostics(true)}
        >
          <View style={[styles.actionIcon, { backgroundColor: isDark ? "rgba(98,70,229,0.2)" : "#F0EDFF" }]}>
            <Ionicons
              name="refresh-outline"
              size={21}
              color="#6246E5"
            />
          </View>

          <View style={styles.actionContent}>
            <Text style={[styles.actionTitle, { color: colors.adminText }]}>
              Run Diagnostics Again
            </Text>

            <Text style={[styles.actionText, { color: colors.adminTextSecondary }]}>
              Recheck Firebase, backend and all
              configured collections.
            </Text>
          </View>

          <Ionicons
            name="chevron-forward"
            size={20}
            color={colors.adminTextSecondary}
          />
        </TouchableOpacity>

        {/* WARNING */}
        <View style={[styles.warningCard, { backgroundColor: isDark ? "rgba(217,119,6,0.15)" : "#FFFBEB", borderColor: isDark ? "rgba(217,119,6,0.3)" : "#FDE68A" }]}>
          <Ionicons
            name="information-circle-outline"
            size={22}
            color="#D97706"
          />

          <Text style={[styles.warningText, { color: isDark ? "#FCD34D" : "#92400E" }]}>
            This page is intended for administrators
            and troubleshooting. Do not share diagnostic
            information publicly because it contains
            account and configuration details.
          </Text>
        </View>

        <Text style={[styles.footerText, { color: colors.adminTextSecondary }]}>
          Campusly Admin Debug • Firebase + Backend
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F6F7FB",
  },

  header: {
    height: 72,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },

  headerCenter: {
    flex: 1,
    marginLeft: 12,
  },

  headerTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#111827",
  },

  headerSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },

  refreshButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#F0EDFF",
    alignItems: "center",
    justifyContent: "center",
  },

  content: {
    padding: 16,
    paddingBottom: 45,
  },

  summaryCard: {
    backgroundColor: "#6246E5",
    borderRadius: 20,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },

  summaryIcon: {
    width: 55,
    height: 55,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },

  summaryContent: {
    flex: 1,
  },

  summaryTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },

  summaryText: {
    color: "#EDE9FE",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },

  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24,
  },

  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 13,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },

  statNumber: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
  },

  statLabel: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 10,
    marginTop: 3,
  },

  accountCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 15,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 22,
  },

  accountAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#6246E5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  accountAvatarText: {
    color: "#FFFFFF",
    fontSize: 21,
    fontWeight: "800",
  },

  accountInfo: {
    flex: 1,
  },

  accountName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },

  accountEmail: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },

  accountUid: {
    fontSize: 10,
    color: "#9CA3AF",
    marginTop: 4,
  },

  roleBadge: {
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 10,
    marginLeft: 6,
  },

  roleBadgeText: {
    fontSize: 10,
    fontWeight: "800",
  },

  checkCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    flexDirection: "row",
    marginBottom: 10,
  },

  checkIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  checkContent: {
    flex: 1,
  },

  checkTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },

  checkTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },

  statusPill: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 8,
  },

  statusPillText: {
    fontSize: 9,
    fontWeight: "800",
    textTransform: "uppercase",
  },

  checkDescription: {
    fontSize: 11,
    color: "#6B7280",
    lineHeight: 16,
    marginTop: 4,
  },

  checkDetail: {
    fontSize: 11,
    color: "#374151",
    lineHeight: 17,
    marginTop: 8,
  },

  configCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 15,
    marginBottom: 22,
  },

  configRow: {
    minHeight: 49,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F1F4",
    gap: 12,
  },

  configLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "600",
  },

  configValue: {
    flex: 1,
    textAlign: "right",
    fontSize: 12,
    color: "#111827",
    fontWeight: "700",
  },

  monoText: {
    fontFamily:
      Platform.OS === "ios"
        ? "Menlo"
        : "monospace",
    fontSize: 10,
  },

  collectionHeader: {
    marginBottom: 10,
  },

  collectionSubtitle: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: -6,
    marginBottom: 10,
  },

  collectionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 23,
  },

  collectionCard: {
    width: "48%",
    flexGrow: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
  },

  collectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F0EDFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 9,
  },

  collectionInfo: {
    flex: 1,
  },

  collectionName: {
    fontSize: 11,
    fontWeight: "700",
    color: "#374151",
  },

  collectionCount: {
    fontSize: 10,
    color: "#16A34A",
    fontWeight: "700",
    marginTop: 2,
  },

  actionButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },

  actionIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#F0EDFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 11,
  },

  actionContent: {
    flex: 1,
  },

  actionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },

  actionText: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 3,
    lineHeight: 16,
  },

  warningCard: {
    marginTop: 13,
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 15,
    padding: 13,
    flexDirection: "row",
    gap: 10,
  },

  warningText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 17,
    color: "#92400E",
  },

  footerText: {
    textAlign: "center",
    fontSize: 10,
    color: "#9CA3AF",
    marginTop: 22,
  },
});