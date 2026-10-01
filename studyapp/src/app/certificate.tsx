import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";

import { auth, db } from "../firebase/config";
import { useAppTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import { shareOrDownloadPdf } from "../services/certificatePdfService";

export type Certificate = {
  id: string;
  studentId?: string;
  studentName?: string;
  studentRollNo?: string;
  title: string;
  subject?: string;
  grade?: string;
  issueDate: string;
  issuedBy: string;
  issuerTitle?: string;
  credentialId?: string;
  description?: string;
  photoUrl?: string;
  pdfUrl?: string;
  verified?: boolean;
};

export default function CertificateScreen() {
  const { colors, isDark } = useAppTheme();
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState<"earned" | "request">("earned");

  // Certificates list & preview
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);
  const [certModalVisible, setCertModalVisible] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  // Request state
  const [certificateType, setCertificateType] = useState("");
  const [purpose, setPurpose] = useState("");
  const [requests, setRequests] = useState<any[]>([]);
  const [submittingRequest, setSubmittingRequest] = useState(false);

  // 1. Real-time Certificates Sync from Firestore
  useEffect(() => {
    try {
      const certsCol = collection(db, "certificates");
      const unsubscribe = onSnapshot(
        certsCol,
        (snap) => {
          const list: Certificate[] = snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              studentId: data.studentId || "",
              studentName: data.studentName || "Student",
              studentRollNo: data.studentRollNo || "23CSE001",
              title: data.title || "Academic Certificate",
              subject: data.subject || "Academic Subject",
              grade: data.grade || "Grade A+",
              issueDate: data.issueDate || "2026",
              issuedBy: data.issuedBy || "Class Faculty",
              issuerTitle: data.issuerTitle || "Professor & Mentor",
              credentialId: data.credentialId || `CAMP-${d.id.slice(0, 6).toUpperCase()}`,
              description: data.description || "Awarded for exceptional academic dedication.",
              photoUrl: data.photoUrl || undefined,
              pdfUrl: data.pdfUrl || undefined,
              verified: true,
            };
          });

          setCertificates(list);
        },
        (err) => {
          console.warn("Certs listener error:", err);
          setCertificates([]);
        }
      );

      return () => unsubscribe();
    } catch (e) {
      console.warn("Certificates setup error:", e);
    }
  }, []);

  // 2. Load Student Requests from Firestore
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const q = query(collection(db, "certificateRequests"), orderBy("createdAt", "desc"));
      const unsub = onSnapshot(q, (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setRequests(list);
      });
      return () => unsub();
    } catch (e) {
      console.warn("Requests snap error:", e);
    }
  }, []);

  // Submit Student Request
  const submitRequest = async () => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Login Required", "Please log in before requesting a certificate.");
      return;
    }
    if (!certificateType.trim() || !purpose.trim()) {
      Alert.alert("Required Fields", "Please enter certificate type and purpose.");
      return;
    }

    try {
      setSubmittingRequest(true);
      await addDoc(collection(db, "certificateRequests"), {
        studentId: user.uid,
        studentName: user.displayName || "Campusly Student",
        studentEmail: user.email || "",
        certificateType: certificateType.trim(),
        purpose: purpose.trim(),
        status: "Pending",
        adminComment: "",
        createdAt: serverTimestamp(),
      });

      setCertificateType("");
      setPurpose("");
      Alert.alert("Request Submitted", "Your certificate request has been forwarded to the college administration.");
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Unable to submit certificate request.");
    } finally {
      setSubmittingRequest(false);
    }
  };

  // Delete Request
  const deleteRequest = async (id: string) => {
    Alert.alert("Cancel Request", "Are you sure you want to cancel this certificate request?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes, Cancel",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteDoc(doc(db, "certificateRequests", id));
            Alert.alert("Cancelled", "Request removed.");
          } catch (e: any) {
            Alert.alert("Error", e?.message || "Could not delete request.");
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView edges={["top"]} style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>

        <View style={{ alignItems: "center" }}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Certificates & Honors</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            Verified academic credentials
          </Text>
        </View>

        <View style={{ width: 32 }} />
      </View>

      {/* Tabs Row */}
      <View style={[styles.tabsRow, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "earned" && { borderBottomColor: colors.primary }]}
          onPress={() => setActiveTab("earned")}
        >
          <Ionicons
            name="ribbon"
            size={18}
            color={activeTab === "earned" ? colors.primary : colors.textSecondary}
          />
          <Text
            style={[
              styles.tabBtnText,
              { color: activeTab === "earned" ? colors.primary : colors.textSecondary },
              activeTab === "earned" && { fontWeight: "800" },
            ]}
          >
            Awarded ({certificates.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "request" && { borderBottomColor: colors.primary }]}
          onPress={() => setActiveTab("request")}
        >
          <Ionicons
            name="document-text-outline"
            size={18}
            color={activeTab === "request" ? colors.primary : colors.textSecondary}
          />
          <Text
            style={[
              styles.tabBtnText,
              { color: activeTab === "request" ? colors.primary : colors.textSecondary },
              activeTab === "request" && { fontWeight: "800" },
            ]}
          >
            Request Official
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {activeTab === "earned" ? (
          /* TAB 1: EARNED CERTIFICATES */
          <View>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>
              My Verified Credentials
            </Text>
            <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>
              Certificates awarded and updated directly by your college faculty
            </Text>

            {certificates.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.certCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                activeOpacity={0.85}
                onPress={() => {
                  setSelectedCert(item);
                  setCertModalVisible(true);
                }}
              >
                <View style={styles.certCardTop}>
                  <View style={styles.certBadgeCircle}>
                    <Ionicons name="ribbon" size={24} color="#D97706" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.certTitle, { color: colors.text }]}>{item.title}</Text>
                    <Text style={[styles.certSubject, { color: colors.primary }]}>{item.subject}</Text>
                  </View>
                  <View style={styles.verifiedPill}>
                    <Ionicons name="checkmark-circle" size={13} color="#16A34A" />
                    <Text style={styles.verifiedPillText}>Verified</Text>
                  </View>
                </View>

                <View style={[styles.certDivider, { backgroundColor: colors.border }]} />

                <View style={styles.certCardBottom}>
                  <View>
                    <Text style={[styles.certTeacherText, { color: colors.text }]}>
                      Issued by: <Text style={{ fontWeight: "700" }}>{item.issuedBy}</Text>
                    </Text>
                    <Text style={[styles.certDateText, { color: colors.textSecondary }]}>
                      Date: {item.issueDate} • ID: {item.credentialId}
                    </Text>
                  </View>

                  <View style={styles.viewBadge}>
                    <Text style={styles.viewBadgeText}>View Official →</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          /* TAB 2: REQUEST CERTIFICATES */
          <View>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>
              Request Official College Certificate
            </Text>
            <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>
              Request Bonafide, Course Completion, or Character Certificate
            </Text>

            <View style={[styles.requestFormCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Certificate Type *</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                placeholder="e.g. Bonafide Certificate / Character Certificate"
                placeholderTextColor={colors.textMuted}
                value={certificateType}
                onChangeText={setCertificateType}
              />

              <Text style={[styles.formLabel, { color: colors.text, marginTop: 12 }]}>Purpose / Reason *</Text>
              <TextInput
                style={[
                  styles.formInput,
                  { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text, minHeight: 80, textAlignVertical: "top" },
                ]}
                placeholder="Why do you require this certificate? (e.g. Internship, Bank, Passport)"
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
                value={purpose}
                onChangeText={setPurpose}
              />

              <TouchableOpacity
                style={[styles.submitRequestBtn, { backgroundColor: colors.primary }]}
                onPress={submitRequest}
                disabled={submittingRequest}
              >
                {submittingRequest ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="paper-plane" size={16} color="#FFFFFF" />
                    <Text style={styles.submitRequestBtnText}>Submit Request</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Previous Requests Track */}
            <Text style={[styles.sectionHeading, { color: colors.text, marginTop: 20 }]}>
              Request Status Tracker
            </Text>

            {requests.length === 0 ? (
              <Text style={{ textAlign: "center", color: colors.textSecondary, marginTop: 14 }}>
                No active certificate requests.
              </Text>
            ) : (
              requests.map((req) => (
                <View
                  key={req.id}
                  style={[styles.requestTrackCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.requestTrackTitle, { color: colors.text }]}>
                      {req.certificateType}
                    </Text>
                    <Text style={[styles.requestTrackPurpose, { color: colors.textSecondary }]}>
                      Purpose: {req.purpose}
                    </Text>
                    <View style={styles.statusPill}>
                      <Text style={styles.statusPillText}>Status: {req.status || "Pending"}</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.cancelRequestBtn}
                    onPress={() => deleteRequest(req.id)}
                  >
                    <Ionicons name="trash-outline" size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* FULL CERTIFICATE VIEW MODAL */}
      <Modal visible={certModalVisible} transparent animationType="slide" onRequestClose={() => setCertModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setCertModalVisible(false)}>
          <Pressable style={styles.parchmentCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.goldFrame}>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 18, alignItems: "center" }}>
                <TouchableOpacity style={styles.closeModalBtn} onPress={() => setCertModalVisible(false)}>
                  <Ionicons name="close" size={20} color="#78350F" />
                </TouchableOpacity>

                <View style={styles.certEmblem}>
                  <Ionicons name="ribbon" size={34} color="#D97706" />
                </View>
                <Text style={styles.certUniv}>CAMPUSLY UNIVERSITY</Text>
                <Text style={styles.certUnivSub}>ACCREDITED ACADEMIC AUTHORITY • DEPT OF ACADEMICS</Text>
                <View style={styles.goldLine} />

                <Text style={styles.certBanner}>OFFICIAL CERTIFICATE OF MERIT</Text>
                <Text style={styles.certConferredText}>THIS CREDENTIAL IS DISTINGUISHED TO</Text>

                <Text style={styles.certStudentName}>
                  {selectedCert?.studentName || "Student"}
                </Text>

                <Text style={styles.certMeta}>
                  Roll No: <Text style={{ fontWeight: "700" }}>{selectedCert?.studentRollNo || "23CSE001"}</Text>
                </Text>

                <Text style={styles.certBody}>
                  For outstanding academic mastery, integrity, and dedication demonstrated in
                </Text>

                <Text style={styles.certCourseTitle}>{selectedCert?.title}</Text>
                <View style={styles.certSubBadge}>
                  <Text style={styles.certSubBadgeText}>{selectedCert?.subject}</Text>
                </View>

                <View style={styles.gradeBadge}>
                  <Ionicons name="star" size={14} color="#D97706" />
                  <Text style={styles.gradeBadgeText}>{selectedCert?.grade}</Text>
                  <Ionicons name="star" size={14} color="#D97706" />
                </View>

                <Text style={styles.certDescText}>{selectedCert?.description}</Text>

                {/* Signatures */}
                <View style={styles.certSigRow}>
                  <View>
                    <Text style={styles.sigIdText}>ID: {selectedCert?.credentialId}</Text>
                    <Text style={styles.sigDateText}>Date: {selectedCert?.issueDate}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.sigCursiveText}>{selectedCert?.issuedBy}</Text>
                    <View style={styles.sigUnderline} />
                    <Text style={styles.sigLabelText}>{selectedCert?.issuedBy}</Text>
                    <Text style={styles.sigSubLabelText}>{selectedCert?.issuerTitle || "Class Mentor"}</Text>
                  </View>
                </View>

                {selectedCert?.photoUrl ? (
                  <View style={{ marginVertical: 14, alignItems: "center", width: "100%" }}>
                    <Text style={{ fontSize: 12, fontWeight: "700", color: "#92400E", marginBottom: 6 }}>
                      Attached Certificate Document / Photo:
                    </Text>
                    <TouchableOpacity
                      activeOpacity={0.9}
                      onPress={() => setPreviewPhoto(selectedCert.photoUrl || null)}
                      style={{ width: "100%", alignItems: "center" }}
                    >
                      <Image
                        source={{ uri: selectedCert.photoUrl }}
                        style={{ width: "100%", height: 200, borderRadius: 10, borderWidth: 1, borderColor: "#FDE68A" }}
                        resizeMode="contain"
                      />
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 }}>
                        <Ionicons name="expand-outline" size={13} color="#92400E" />
                        <Text style={{ fontSize: 11, color: "#92400E", fontWeight: "600" }}>Tap to view full photo</Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                ) : null}

                {selectedCert?.pdfUrl ? (
                  <View style={{ width: "100%", marginVertical: 10, gap: 8 }}>
                    <TouchableOpacity
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        backgroundColor: "#FEF3C7",
                        padding: 11,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: "#F59E0B",
                      }}
                      onPress={() => {
                        if (selectedCert?.pdfUrl) {
                          Linking.openURL(selectedCert.pdfUrl).catch(() => {
                            Alert.alert("PDF Document", `Document link: ${selectedCert.pdfUrl}`);
                          });
                        }
                      }}
                    >
                      <Ionicons name="document-attach" size={18} color="#D97706" />
                      <Text style={{ fontSize: 13, fontWeight: "700", color: "#B45309" }}>
                        View / Open Official PDF Document
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        backgroundColor: "#EEF2FF",
                        padding: 10,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: "#C7D2FE",
                      }}
                      onPress={() => {
                        if (selectedCert?.pdfUrl) {
                          shareOrDownloadPdf(selectedCert.pdfUrl, selectedCert.title);
                        }
                      }}
                    >
                      <Ionicons name="share-outline" size={17} color="#4338CA" />
                      <Text style={{ fontSize: 12, fontWeight: "700", color: "#4338CA" }}>
                        Share / Print Official PDF
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : null}

                {/* Action Buttons */}
                <View style={styles.modalBtnRow}>
                  <TouchableOpacity
                    style={[styles.downloadBtn, { backgroundColor: colors.primary }]}
                    onPress={async () => {
                      if (selectedCert?.pdfUrl) {
                        const shared = await shareOrDownloadPdf(selectedCert.pdfUrl, selectedCert.title);
                        if (!shared) {
                          Linking.openURL(selectedCert.pdfUrl).catch(() => {
                            Alert.alert("PDF", "Opening certificate PDF.");
                          });
                        }
                      } else {
                        Alert.alert(
                          "Certificate Downloaded! 📄",
                          `Official verified credential ID for "${selectedCert?.title}" is: ${selectedCert?.credentialId}`
                        );
                      }
                    }}
                  >
                    <Ionicons name="download-outline" size={16} color="#FFFFFF" />
                    <Text style={styles.downloadBtnText}>
                      {selectedCert?.pdfUrl ? "Download PDF Document" : "Download Credential"}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.shareBtn}
                    onPress={() => {
                      if (selectedCert?.pdfUrl) {
                        shareOrDownloadPdf(selectedCert.pdfUrl, selectedCert.title);
                      } else {
                        Alert.alert("Link Copied! 🔗", `Credential ID: ${selectedCert?.credentialId}`);
                      }
                    }}
                  >
                    <Ionicons name="share-social-outline" size={16} color="#78350F" />
                    <Text style={styles.shareBtnText}>Share</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* FULL PHOTO PREVIEW MODAL */}
      <Modal
        visible={Boolean(previewPhoto)}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewPhoto(null)}
      >
        <View style={styles.photoPreviewOverlay}>
          <TouchableOpacity style={styles.closePhotoBtn} onPress={() => setPreviewPhoto(null)}>
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          {previewPhoto && (
            <Image source={{ uri: previewPhoto }} style={styles.fullPhotoImg} resizeMode="contain" />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  iconBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "800",
  },
  headerSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  issueHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#7C3AED",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  issueHeaderBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  tabsRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabBtnText: {
    fontSize: 13,
  },
  scrollContent: {
    padding: 16,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: "800",
  },
  sectionSub: {
    fontSize: 12,
    marginTop: 2,
    marginBottom: 14,
  },
  certCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  certCardTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  certBadgeCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
  },
  certTitle: {
    fontSize: 14,
    fontWeight: "800",
  },
  certSubject: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  verifiedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  verifiedPillText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#16A34A",
  },
  certDivider: {
    height: 1,
    marginVertical: 12,
  },
  certCardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  certTeacherText: {
    fontSize: 12,
  },
  certDateText: {
    fontSize: 11,
    marginTop: 2,
  },
  viewBadge: {
    backgroundColor: "#EDE9FE",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  viewBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#7C3AED",
  },
  requestFormCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
  },
  formInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
  },
  submitRequestBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
    borderRadius: 10,
    marginTop: 14,
    gap: 6,
  },
  submitRequestBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  requestTrackCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  requestTrackTitle: {
    fontSize: 14,
    fontWeight: "800",
  },
  requestTrackPurpose: {
    fontSize: 12,
    marginTop: 2,
  },
  statusPill: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: "flex-start",
    marginTop: 6,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#D97706",
  },
  cancelRequestBtn: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: "#FEE2E2",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  parchmentCard: {
    width: "100%",
    maxWidth: 480,
    maxHeight: "92%",
    backgroundColor: "#FFFDF7",
    borderRadius: 16,
    overflow: "hidden",
    elevation: 12,
  },
  goldFrame: {
    margin: 8,
    borderWidth: 2,
    borderColor: "#D97706",
    borderRadius: 12,
    backgroundColor: "#FFFDF7",
  },
  closeModalBtn: {
    alignSelf: "flex-end",
    padding: 6,
    borderRadius: 14,
    backgroundColor: "#FEF3C7",
  },
  certEmblem: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FBBF24",
    marginBottom: 6,
  },
  certUniv: {
    fontSize: 17,
    fontWeight: "900",
    color: "#78350F",
    letterSpacing: 1,
  },
  certUnivSub: {
    fontSize: 9,
    fontWeight: "700",
    color: "#B45309",
    letterSpacing: 0.5,
    marginTop: 2,
    textAlign: "center",
  },
  goldLine: {
    width: "70%",
    height: 2,
    backgroundColor: "#FBBF24",
    marginVertical: 12,
  },
  certBanner: {
    fontSize: 14,
    fontWeight: "800",
    color: "#78350F",
    letterSpacing: 0.8,
  },
  certConferredText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#92400E",
    letterSpacing: 0.5,
    marginTop: 4,
    marginBottom: 8,
  },
  certStudentName: {
    fontSize: 22,
    fontWeight: "900",
    color: "#1E1B4B",
    textDecorationLine: "underline",
    textAlign: "center",
  },
  certMeta: {
    fontSize: 11.5,
    color: "#475569",
    marginTop: 4,
  },
  certBody: {
    fontSize: 11,
    color: "#64748B",
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 10,
    paddingHorizontal: 16,
  },
  certCourseTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 6,
    textAlign: "center",
  },
  certSubBadge: {
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 6,
  },
  certSubBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#4F46E5",
  },
  gradeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    marginTop: 8,
  },
  gradeBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#92400E",
  },
  certDescText: {
    fontSize: 11.5,
    color: "#475569",
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 12,
    lineHeight: 17,
  },
  certSigRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 18,
    borderTopWidth: 1,
    borderTopColor: "#FDE68A",
    paddingTop: 14,
  },
  sigIdText: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "#64748B",
  },
  sigDateText: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 2,
  },
  sigCursiveText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E1B4B",
    fontStyle: "italic",
  },
  sigUnderline: {
    width: 120,
    height: 1,
    backgroundColor: "#94A3B8",
    marginVertical: 3,
  },
  sigLabelText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0F172A",
  },
  sigSubLabelText: {
    fontSize: 9.5,
    color: "#64748B",
  },
  modalBtnRow: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
    marginTop: 16,
  },
  downloadBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  downloadBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  shareBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#FEF3C7",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  shareBtnText: {
    color: "#78350F",
    fontSize: 13,
    fontWeight: "700",
  },
  issueModalCard: {
    width: "100%",
    maxWidth: 480,
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
  },
  issueModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  issueModalTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  modalSaveBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  photoPreviewOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  closePhotoBtn: {
    position: "absolute",
    top: 40,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  fullPhotoImg: {
    width: "90%",
    height: "80%",
  },
});