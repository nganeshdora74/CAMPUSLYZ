import React, { useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

// COLORS
const BLUE = "#1976E8";
const DARK_BLUE = "#082D78";
const TEXT = "#10245A";
const MUTED = "#68758B";
const WHITE = "#FFFFFF";
const GREEN = "#11A875";
const RED = "#E84B58";
const PURPLE = "#7545D8";

// TYPES
type Subject = {
  id: number;
  name: string;
  credits: string;
  grade: string;
};

// GRADE POINTS
const gradePoints: Record<string, number> = {
  O: 10,
  "A+": 9,
  A: 8,
  "B+": 7,
  B: 6,
  C: 5,
  P: 4,
  F: 0,
};

const gradeOptions = [
  "O",
  "A+",
  "A",
  "B+",
  "B",
  "C",
  "P",
  "F",
];

// MAIN SCREEN
export default function CgpaCalculator() {
  const [subjects, setSubjects] = useState<Subject[]>([
    {
      id: 1,
      name: "",
      credits: "4",
      grade: "",
    },
    {
      id: 2,
      name: "",
      credits: "4",
      grade: "",
    },
    {
      id: 3,
      name: "",
      credits: "3",
      grade: "",
    },
  ]);

  const [showGrades, setShowGrades] = useState<number | null>(null);

  // ADD SUBJECT
  const addSubject = () => {
    const newSubject: Subject = {
      id: Date.now(),
      name: "",
      credits: "3",
      grade: "",
    };

    setSubjects((current) => [...current, newSubject]);
  };

  // REMOVE SUBJECT
  const removeSubject = (id: number) => {
    if (subjects.length === 1) {
      Alert.alert(
        "Cannot remove",
        "You need at least one subject."
      );
      return;
    }

    if (showGrades === id) {
      setShowGrades(null);
    }

    setSubjects((current) =>
      current.filter((subject) => subject.id !== id)
    );
  };

  // UPDATE SUBJECT
  const updateSubject = (
    id: number,
    field: keyof Subject,
    value: string
  ) => {
    setSubjects((current) =>
      current.map((subject) =>
        subject.id === id
          ? {
              ...subject,
              [field]: value,
            }
          : subject
      )
    );
  };

  // CALCULATION
  const result = useMemo(() => {
    let totalCredits = 0;
    let totalPoints = 0;
    let completedSubjects = 0;
    let failedSubjects = 0;

    subjects.forEach((subject) => {
      const credits = Number(subject.credits);
      const grade = subject.grade.toUpperCase();

      if (
        Number.isFinite(credits) &&
        credits > 0 &&
        gradePoints[grade] !== undefined
      ) {
        totalCredits += credits;
        totalPoints += credits * gradePoints[grade];
        completedSubjects++;

        if (grade === "F") {
          failedSubjects++;
        }
      }
    });

    const cgpa =
      totalCredits > 0
        ? totalPoints / totalCredits
        : 0;

    return {
      cgpa,
      totalCredits,
      totalPoints,
      completedSubjects,
      failedSubjects,
    };
  }, [subjects]);

  // CLEAR ALL
  const clearAll = () => {
    Alert.alert(
      "Clear calculator?",
      "This will remove all entered subjects and grades.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Clear",
          style: "destructive",
          onPress: () => {
            setShowGrades(null);

            setSubjects([
              {
                id: Date.now(),
                name: "",
                credits: "4",
                grade: "",
              },
            ]);
          },
        },
      ]
    );
  };

  // CGPA MESSAGE
  const getResultMessage = () => {
    if (result.completedSubjects === 0) {
      return "Enter your subjects and grades to calculate CGPA.";
    }

    if (result.cgpa >= 9) {
      return "Excellent academic performance!";
    }

    if (result.cgpa >= 8) {
      return "Great work! Keep maintaining your performance.";
    }

    if (result.cgpa >= 7) {
      return "Good performance. Keep pushing higher.";
    }

    if (result.cgpa >= 6) {
      return "You're doing well. A little more effort can improve your CGPA.";
    }

    return "Keep working consistently and focus on your weaker subjects.";
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* HEADER */}
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons
              name="arrow-back"
              size={22}
              color={DARK_BLUE}
            />
          </Pressable>

          <View style={styles.headerTitleBox}>
            <Text style={styles.headerTitle}>
              CGPA Calculator
            </Text>

            <Text style={styles.headerSubtitle}>
              Calculate your semester CGPA
            </Text>
          </View>

          <View style={styles.headerIcon}>
            <Ionicons
              name="calculator"
              size={22}
              color={BLUE}
            />
          </View>
        </View>

        {/* RESULT CARD */}
        <View style={styles.resultCard}>
          <View style={styles.resultTop}>
            <View style={styles.resultMain}>
              <Text style={styles.resultLabel}>
                YOUR CGPA
              </Text>

              <Text style={styles.cgpa}>
                {result.cgpa.toFixed(2)}
              </Text>

              <Text style={styles.resultMessage}>
                {getResultMessage()}
              </Text>
            </View>

            <View style={styles.resultIcon}>
              <Ionicons
                name="school"
                size={32}
                color={PURPLE}
              />
            </View>
          </View>

          <View style={styles.resultStats}>
            <View style={styles.resultStat}>
              <Text style={styles.resultStatNumber}>
                {result.totalCredits}
              </Text>

              <Text style={styles.resultStatLabel}>
                Credits
              </Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.resultStat}>
              <Text style={styles.resultStatNumber}>
                {result.completedSubjects}
              </Text>

              <Text style={styles.resultStatLabel}>
                Subjects
              </Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.resultStat}>
              <Text
                style={[
                  styles.resultStatNumber,
                  result.failedSubjects > 0 && {
                    color: RED,
                  },
                ]}
              >
                {result.failedSubjects}
              </Text>

              <Text style={styles.resultStatLabel}>
                Failed
              </Text>
            </View>
          </View>
        </View>

        {/* SECTION HEADER */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>
              Subjects
            </Text>

            <Text style={styles.sectionSubtitle}>
              Enter credits and grade for each subject
            </Text>
          </View>

          <Pressable
            style={styles.addSmallButton}
            onPress={addSubject}
          >
            <Ionicons
              name="add"
              size={18}
              color={WHITE}
            />
          </Pressable>
        </View>

        {/* SUBJECTS */}
        {subjects.map((subject, index) => (
          <View
            key={subject.id}
            style={styles.subjectCard}
          >
            {/* SUBJECT HEADER */}
            <View style={styles.subjectHeader}>
              <View style={styles.subjectNumber}>
                <Text style={styles.subjectNumberText}>
                  {index + 1}
                </Text>
              </View>

              <Text style={styles.subjectTitle}>
                Subject {index + 1}
              </Text>

              <Pressable
                style={styles.removeButton}
                onPress={() =>
                  removeSubject(subject.id)
                }
              >
                <Ionicons
                  name="trash-outline"
                  size={17}
                  color={RED}
                />
              </Pressable>
            </View>

            {/* SUBJECT NAME */}
            <Text style={styles.inputLabel}>
              Subject Name
            </Text>

            <TextInput
              style={styles.input}
              placeholder="e.g. Data Structures"
              placeholderTextColor="#9AA5B5"
              value={subject.name}
              onChangeText={(value) =>
                updateSubject(
                  subject.id,
                  "name",
                  value
                )
              }
            />

            {/* CREDITS + GRADE */}
            <View style={styles.inputRow}>
              {/* CREDITS */}
              <View style={styles.halfColumn}>
                <Text style={styles.inputLabel}>
                  Credits
                </Text>

                <TextInput
                  style={styles.input}
                  placeholder="3"
                  placeholderTextColor="#9AA5B5"
                  value={subject.credits}
                  onChangeText={(value) =>
                    updateSubject(
                      subject.id,
                      "credits",
                      value.replace(
                        /[^0-9.]/g,
                        ""
                      )
                    )
                  }
                  keyboardType="decimal-pad"
                />
              </View>

              {/* GRADE */}
              <View style={styles.halfColumn}>
                <Text style={styles.inputLabel}>
                  Grade
                </Text>

                <Pressable
                  style={styles.gradeSelector}
                  onPress={() =>
                    setShowGrades(
                      showGrades === subject.id
                        ? null
                        : subject.id
                    )
                  }
                >
                  <Text
                    style={[
                      styles.gradeValue,
                      !subject.grade &&
                        styles.gradePlaceholder,
                    ]}
                  >
                    {subject.grade ||
                      "Select grade"}
                  </Text>

                  <Ionicons
                    name={
                      showGrades === subject.id
                        ? "chevron-up"
                        : "chevron-down"
                    }
                    size={17}
                    color={MUTED}
                  />
                </Pressable>

                {/* FIXED DROPDOWN
                    It is now part of the normal layout
                    instead of absolute positioning. */}
                {showGrades === subject.id ? (
                  <View style={styles.gradeDropdown}>
                    {gradeOptions.map((grade) => (
                      <Pressable
                        key={grade}
                        style={[
                          styles.gradeOption,
                          subject.grade ===
                            grade &&
                            styles.selectedGrade,
                        ]}
                        onPress={() => {
                          updateSubject(
                            subject.id,
                            "grade",
                            grade
                          );

                          setShowGrades(null);
                        }}
                      >
                        <View>
                          <Text
                            style={[
                              styles.gradeOptionText,
                              subject.grade ===
                                grade &&
                                styles.selectedGradeText,
                            ]}
                          >
                            {grade}
                          </Text>

                          <Text
                            style={
                              styles.gradePointText
                            }
                          >
                            {
                              gradePoints[
                                grade
                              ]
                            }{" "}
                            points
                          </Text>
                        </View>

                        {subject.grade ===
                        grade ? (
                          <Ionicons
                            name="checkmark-circle"
                            size={19}
                            color={BLUE}
                          />
                        ) : null}
                      </Pressable>
                    ))}
                  </View>
                ) : null}
              </View>
            </View>

            {/* GRADE POINT */}
            {subject.grade &&
            gradePoints[subject.grade] !==
              undefined ? (
              <View style={styles.pointsBox}>
                <Ionicons
                  name="star"
                  size={14}
                  color={PURPLE}
                />

                <Text style={styles.pointsText}>
                  Grade Point:{" "}
                  <Text style={styles.pointsBold}>
                    {
                      gradePoints[
                        subject.grade
                      ]
                    }
                  </Text>
                </Text>

                <Text style={styles.weightedText}>
                  Weighted:{" "}
                  {(
                    Number(
                      subject.credits || 0
                    ) *
                    gradePoints[
                      subject.grade
                    ]
                  ).toFixed(1)}
                </Text>
              </View>
            ) : null}
          </View>
        ))}

        {/* ADD SUBJECT */}
        <Pressable
          style={styles.addSubjectButton}
          onPress={addSubject}
        >
          <Ionicons
            name="add-circle-outline"
            size={20}
            color={BLUE}
          />

          <Text style={styles.addSubjectText}>
            Add Another Subject
          </Text>
        </Pressable>

        {/* GRADE SCALE */}
        <View style={styles.scaleCard}>
          <View style={styles.scaleHeader}>
            <Ionicons
              name="information-circle"
              size={19}
              color={BLUE}
            />

            <Text style={styles.scaleTitle}>
              Grade Scale
            </Text>
          </View>

          <View style={styles.scaleGrid}>
            {gradeOptions.map((grade) => (
              <View
                key={grade}
                style={styles.scaleItem}
              >
                <Text style={styles.scaleGrade}>
                  {grade}
                </Text>

                <Text style={styles.scalePoint}>
                  {gradePoints[grade]}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* FORMULA */}
        <View style={styles.formulaCard}>
          <View style={styles.formulaIcon}>
            <Ionicons
              name="analytics-outline"
              size={21}
              color={GREEN}
            />
          </View>

          <View style={styles.formulaText}>
            <Text style={styles.formulaTitle}>
              How CGPA is calculated
            </Text>

            <Text style={styles.formulaDescription}>
              CGPA = Σ (Credit × Grade Point) ÷ Σ
              Credits
            </Text>
          </View>
        </View>

        {/* CLEAR */}
        <Pressable
          style={styles.clearButton}
          onPress={clearAll}
        >
          <Ionicons
            name="refresh-outline"
            size={17}
            color={RED}
          />

          <Text style={styles.clearText}>
            Clear Calculator
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

// STYLES
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F7FAFF",
  },

  content: {
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 30,
  },

  // HEADER
  header: {
    height: 58,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 11,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: WHITE,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5EAF2",
  },

  headerTitleBox: {
    flex: 1,
    marginLeft: 10,
  },

  headerTitle: {
    color: DARK_BLUE,
    fontSize: 20,
    fontWeight: "800",
  },

  headerSubtitle: {
    color: MUTED,
    fontSize: 9,
    marginTop: 2,
  },

  headerIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: "#E5EEFF",
    alignItems: "center",
    justifyContent: "center",
  },

  // RESULT CARD
  resultCard: {
    backgroundColor: "#EDE4FF",
    borderRadius: 21,
    padding: 16,
    marginBottom: 15,
  },

  resultTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  resultMain: {
    flex: 1,
  },

  resultLabel: {
    color: PURPLE,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
  },

  cgpa: {
    color: DARK_BLUE,
    fontSize: 42,
    fontWeight: "900",
    marginTop: 1,
  },

  resultMessage: {
    color: "#66728A",
    fontSize: 9,
    maxWidth: 250,
    lineHeight: 13,
  },

  resultIcon: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: "#E1D2FF",
    alignItems: "center",
    justifyContent: "center",
  },

  resultStats: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
    backgroundColor: "rgba(255,255,255,0.55)",
    borderRadius: 14,
    paddingVertical: 10,
  },

  resultStat: {
    flex: 1,
    alignItems: "center",
  },

  resultStatNumber: {
    color: DARK_BLUE,
    fontSize: 16,
    fontWeight: "800",
  },

  resultStatLabel: {
    color: MUTED,
    fontSize: 8,
    marginTop: 2,
  },

  statDivider: {
    width: 1,
    height: 25,
    backgroundColor: "#D3C6ED",
  },

  // SECTION
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 9,
  },

  sectionTitle: {
    color: DARK_BLUE,
    fontSize: 17,
    fontWeight: "800",
  },

  sectionSubtitle: {
    color: MUTED,
    fontSize: 8,
    marginTop: 2,
  },

  addSmallButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: BLUE,
    alignItems: "center",
    justifyContent: "center",
  },

  // SUBJECT CARD
  subjectCard: {
    backgroundColor: WHITE,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#E5EAF2",
    padding: 12,
    marginBottom: 9,

    // IMPORTANT:
    // Allows the dropdown to remain visible
    // without clipping.
    overflow: "visible",
  },

  subjectHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },

  subjectNumber: {
    width: 31,
    height: 31,
    borderRadius: 10,
    backgroundColor: "#E5EEFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },

  subjectNumberText: {
    color: BLUE,
    fontSize: 12,
    fontWeight: "800",
  },

  subjectTitle: {
    flex: 1,
    color: DARK_BLUE,
    fontSize: 13,
    fontWeight: "800",
  },

  removeButton: {
    width: 31,
    height: 31,
    borderRadius: 10,
    backgroundColor: "#FFF0F1",
    alignItems: "center",
    justifyContent: "center",
  },

  inputLabel: {
    color: TEXT,
    fontSize: 9,
    fontWeight: "700",
    marginBottom: 5,
  },

  input: {
    height: 43,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#DCE3ED",
    backgroundColor: "#FAFCFF",
    paddingHorizontal: 11,
    color: TEXT,
    fontSize: 11,
    marginBottom: 9,
  },

  inputRow: {
    flexDirection: "row",
    gap: 9,
  },

  halfColumn: {
    flex: 1,
  },

  // GRADE SELECTOR
  gradeSelector: {
    height: 43,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#DCE3ED",
    backgroundColor: "#FAFCFF",
    paddingHorizontal: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  gradeValue: {
    color: TEXT,
    fontSize: 11,
    fontWeight: "700",
  },

  gradePlaceholder: {
    color: "#9AA5B5",
    fontWeight: "400",
  },

  // FIXED DROPDOWN
  //
  // No position:absolute.
  // It now takes up real layout space,
  // pushing the content below it down.
  gradeDropdown: {
    marginTop: 5,
    backgroundColor: WHITE,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#DCE3ED",
    overflow: "hidden",

    elevation: 5,

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 5,
  },

  gradeOption: {
    minHeight: 45,
    paddingHorizontal: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#EEF1F5",
  },

  selectedGrade: {
    backgroundColor: "#EAF2FF",
  },

  gradeOptionText: {
    color: TEXT,
    fontSize: 11,
    fontWeight: "800",
  },

  selectedGradeText: {
    color: BLUE,
  },

  gradePointText: {
    color: MUTED,
    fontSize: 7,
    marginTop: 1,
  },

  // POINTS
  pointsBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F1FF",
    borderRadius: 9,
    paddingHorizontal: 9,
    paddingVertical: 7,
    marginTop: 1,
  },

  pointsText: {
    color: MUTED,
    fontSize: 8,
    marginLeft: 5,
  },

  pointsBold: {
    color: PURPLE,
    fontWeight: "800",
  },

  weightedText: {
    marginLeft: "auto",
    color: MUTED,
    fontSize: 8,
    fontWeight: "700",
  },

  // ADD SUBJECT
  addSubjectButton: {
    height: 45,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#BDD3F4",
    borderStyle: "dashed",
    backgroundColor: "#F5F9FF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 13,
  },

  addSubjectText: {
    color: BLUE,
    fontSize: 10,
    fontWeight: "800",
    marginLeft: 6,
  },

  // GRADE SCALE
  scaleCard: {
    backgroundColor: WHITE,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#E5EAF2",
    padding: 12,
    marginBottom: 10,
  },

  scaleHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },

  scaleTitle: {
    color: DARK_BLUE,
    fontSize: 12,
    fontWeight: "800",
    marginLeft: 6,
  },

  scaleGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },

  scaleItem: {
    width: "22.5%",
    backgroundColor: "#F6F9FE",
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: "center",
  },

  scaleGrade: {
    color: TEXT,
    fontSize: 10,
    fontWeight: "800",
  },

  scalePoint: {
    color: BLUE,
    fontSize: 9,
    fontWeight: "700",
    marginTop: 2,
  },

  // FORMULA
  formulaCard: {
    backgroundColor: "#E3F8EF",
    borderRadius: 16,
    padding: 11,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 11,
  },

  formulaIcon: {
    width: 41,
    height: 41,
    borderRadius: 12,
    backgroundColor: "#CFF1E3",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },

  formulaText: {
    flex: 1,
  },

  formulaTitle: {
    color: "#087A56",
    fontSize: 10,
    fontWeight: "800",
  },

  formulaDescription: {
    color: "#537767",
    fontSize: 9,
    marginTop: 3,
    lineHeight: 13,
  },

  // CLEAR
  clearButton: {
    height: 43,
    borderRadius: 12,
    backgroundColor: "#FFF0F1",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },

  clearText: {
    color: RED,
    fontSize: 10,
    fontWeight: "800",
    marginLeft: 5,
  },
});