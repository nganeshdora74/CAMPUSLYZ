import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
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

import DateTimePicker from "@react-native-community/datetimepicker";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { auth, db } from "../firebase/config";

const BLUE = "#1976E8";
const DARK_BLUE = "#082D78";
const TEXT = "#10245A";
const MUTED = "#68758B";
const WHITE = "#FFFFFF";
const PURPLE = "#7545D8";
const GREEN = "#11A875";
const ORANGE = "#F3A426";
const RED = "#E84B58";

type Subject = {
  id: string;
  name: string;
  teacherName?: string;
};

type Exam = {
  id: string;
  subject: string;
  subjectId?: string;
  teacherName?: string;
  date: string;
  time: string;
  room: string;
  syllabus: string;
  color?: string;
  completed?: boolean;
};

type PickerEvent = {
  type: string;
};

function getToday() {
  const now = new Date();

  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
}

function parseExamDate(dateString: string) {
  if (!dateString) return null;

  const parts = dateString.split("-");

  if (parts.length !== 3) return null;

  const year = Number(parts[0]);
  const month = Number(parts[1]) - 1;
  const day = Number(parts[2]);

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day)
  ) {
    return null;
  }

  return new Date(year, month, day);
}

function formatDate(dateString: string) {
  const date = parseExamDate(dateString);

  if (!date) return dateString;

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function daysRemaining(dateString: string) {
  const examDate = parseExamDate(dateString);

  if (!examDate) return null;

  const today = getToday();

  const difference =
    examDate.getTime() - today.getTime();

  return Math.ceil(
    difference / (1000 * 60 * 60 * 24)
  );
}

function formatDateForFirebase(date: Date) {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatTimeForFirebase(date: Date) {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function parseTimeString(timeString: string) {
  const date = new Date();

  if (!timeString) {
    return date;
  }

  const match = timeString
    .trim()
    .match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);

  if (!match) {
    return date;
  }

  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const period = match[3].toUpperCase();

  if (period === "PM" && hour !== 12) {
    hour += 12;
  }

  if (period === "AM" && hour === 12) {
    hour = 0;
  }

  date.setHours(hour);
  date.setMinutes(minute);
  date.setSeconds(0);
  date.setMilliseconds(0);

  return date;
}

export default function ExamScreen() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const [loading, setLoading] = useState(true);
  const [subjectsLoading, setSubjectsLoading] =
    useState(true);

  const [showAddForm, setShowAddForm] =
    useState(false);

  const [editingExamId, setEditingExamId] =
    useState<string | null>(null);

  const [selectedSubjectId, setSelectedSubjectId] =
    useState("");

  const [selectedSubjectName, setSelectedSubjectName] =
    useState("");

  const [teacherName, setTeacherName] =
    useState("");

  const [selectedDate, setSelectedDate] =
    useState(getToday());

  const [selectedTime, setSelectedTime] =
    useState(new Date());

  const [room, setRoom] = useState("");

  const [syllabus, setSyllabus] = useState("");

  const [showDatePicker, setShowDatePicker] =
    useState(false);

  const [showTimePicker, setShowTimePicker] =
    useState(false);

  const [showSubjectModal, setShowSubjectModal] =
    useState(false);

  const [showRoomModal, setShowRoomModal] =
    useState(false);

  const [showSyllabusModal, setShowSyllabusModal] =
    useState(false);

  const [saving, setSaving] = useState(false);

  const user = auth.currentUser;

  useEffect(() => {
    if (!user) {
      setLoading(false);
      setSubjectsLoading(false);
      return;
    }

    const examsRef = collection(
      db,
      "users",
      user.uid,
      "exams"
    );

    const examsQuery = query(
      examsRef,
      orderBy("date", "asc")
    );

    const unsubscribeExams = onSnapshot(
      examsQuery,
      (snapshot) => {
        const data: Exam[] = snapshot.docs.map(
          (item) => ({
            id: item.id,
            ...(item.data() as Omit<Exam, "id">),
          })
        );

        setExams(data);
        setLoading(false);
      },
      (error) => {
        console.log(
          "Exam listener error:",
          error
        );

        setLoading(false);
      }
    );

    const subjectsRef = collection(
      db,
      "users",
      user.uid,
      "subjects"
    );

    const unsubscribeSubjects = onSnapshot(
      subjectsRef,
      (snapshot) => {
        const data: Subject[] = snapshot.docs
          .map((item) => {
            const itemData = item.data();

            return {
              id: item.id,
              name:
                itemData.name ||
                itemData.subjectName ||
                "",
              teacherName:
                itemData.teacherName ||
                itemData.teacher ||
                "",
            };
          })
          .filter(
            (subject) =>
              subject.name.trim().length > 0
          )
          .sort((a, b) =>
            a.name.localeCompare(b.name)
          );

        setSubjects(data);
        setSubjectsLoading(false);
      },
      (error) => {
        console.log(
          "Subject listener error:",
          error
        );

        setSubjectsLoading(false);
      }
    );

    return () => {
      unsubscribeExams();
      unsubscribeSubjects();
    };
  }, []);

  const upcomingExams = useMemo(() => {
    return exams
      .filter((exam) => !exam.completed)
      .sort((a, b) =>
        a.date.localeCompare(b.date)
      );
  }, [exams]);

  const completedExams = useMemo(() => {
    return exams
      .filter((exam) => exam.completed)
      .sort((a, b) =>
        b.date.localeCompare(a.date)
      );
  }, [exams]);

  const nextExam = upcomingExams[0];

  const totalExams = exams.length;

  const completedCount = exams.filter(
    (exam) => exam.completed
  ).length;

  const remainingCount =
    totalExams - completedCount;

  const resetForm = () => {
    setEditingExamId(null);
    setSelectedSubjectId("");
    setSelectedSubjectName("");
    setTeacherName("");
    setSelectedDate(getToday());
    setSelectedTime(new Date());
    setRoom("");
    setSyllabus("");
  };

  const openAddForm = () => {
    resetForm();
    setShowAddForm(true);
  };

  const closeForm = () => {
    if (saving) return;

    setShowAddForm(false);
    resetForm();
  };

  const selectSubject = (subject: Subject) => {
    setSelectedSubjectId(subject.id);
    setSelectedSubjectName(subject.name);
    setTeacherName(subject.teacherName || "");
    setShowSubjectModal(false);
  };

  const openEditExam = (exam: Exam) => {
    setEditingExamId(exam.id);

    setSelectedSubjectId(
      exam.subjectId || ""
    );

    setSelectedSubjectName(
      exam.subject || ""
    );

    setTeacherName(
      exam.teacherName || ""
    );

    const parsedDate = parseExamDate(
      exam.date
    );

    if (parsedDate) {
      setSelectedDate(parsedDate);
    }

    setSelectedTime(
      parseTimeString(exam.time)
    );

    setRoom(exam.room || "");
    setSyllabus(exam.syllabus || "");

    setShowAddForm(true);
  };

  const handleDateChange = (
    event: PickerEvent,
    date?: Date
  ) => {
    setShowDatePicker(false);

    if (
      event.type === "dismissed" ||
      !date
    ) {
      return;
    }

    setSelectedDate(date);
  };

  const handleTimeChange = (
    event: PickerEvent,
    date?: Date
  ) => {
    setShowTimePicker(false);

    if (
      event.type === "dismissed" ||
      !date
    ) {
      return;
    }

    setSelectedTime(date);
  };

  const saveExam = async () => {
    if (!user) {
      Alert.alert(
        "Login required",
        "Please login again."
      );
      return;
    }

    if (!selectedSubjectName.trim()) {
      Alert.alert(
        "Select Subject",
        "Please select a subject."
      );
      return;
    }

    setSaving(true);

    try {
      const examData = {
        subject:
          selectedSubjectName.trim(),

        subjectId:
          selectedSubjectId || "",

        teacherName:
          teacherName.trim(),

        date:
          formatDateForFirebase(
            selectedDate
          ),

        time:
          formatTimeForFirebase(
            selectedTime
          ),

        room: room.trim(),

        syllabus: syllabus.trim(),

        color: BLUE,

        updatedAt:
          serverTimestamp(),
      };

      const examsRef = collection(
        db,
        "users",
        user.uid,
        "exams"
      );

      if (editingExamId) {
        const examRef = doc(
          db,
          "users",
          user.uid,
          "exams",
          editingExamId
        );

        await updateDoc(
          examRef,
          examData
        );

        Alert.alert(
          "Updated",
          "Exam updated successfully."
        );
      } else {
        await addDoc(examsRef, {
          ...examData,
          completed: false,
          createdAt:
            serverTimestamp(),
        });

        Alert.alert(
          "Added",
          "Exam added successfully."
        );
      }

      closeForm();
    } catch (error) {
      console.log(
        "Save exam error:",
        error
      );

      Alert.alert(
        "Error",
        "Could not save the exam. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const completeExam = async (
    exam: Exam
  ) => {
    if (!user) return;

    try {
      const examRef = doc(
        db,
        "users",
        user.uid,
        "exams",
        exam.id
      );

      await updateDoc(examRef, {
        completed: true,
        completedAt:
          serverTimestamp(),
        updatedAt:
          serverTimestamp(),
      });
    } catch (error) {
      console.log(
        "Complete exam error:",
        error
      );

      Alert.alert(
        "Error",
        "Could not mark exam as completed."
      );
    }
  };

  const deleteExam = (
    exam: Exam
  ) => {
    Alert.alert(
      "Delete Exam",
      `Are you sure you want to delete the ${exam.subject} exam?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (!user) return;

            try {
              const examRef = doc(
                db,
                "users",
                user.uid,
                "exams",
                exam.id
              );

              await deleteDoc(examRef);
            } catch (error) {
              console.log(
                "Delete exam error:",
                error
              );

              Alert.alert(
                "Error",
                "Could not delete the exam."
              );
            }
          },
        },
      ]
    );
  };

  const renderExamCard = (
    exam: Exam,
    completed = false
  ) => {
    const remaining =
      daysRemaining(exam.date);

    return (
      <View
        key={exam.id}
        style={[
          styles.examCard,
          completed &&
            styles.completedExamCard,
        ]}
      >
        <View style={styles.examCardTop}>
          <View
            style={[
              styles.examIcon,
              {
                backgroundColor:
                  completed
                    ? "#E8F8F1"
                    : "#EAF2FF",
              },
            ]}
          >
            <Ionicons
              name={
                completed
                  ? "checkmark-circle"
                  : "school"
              }
              size={22}
              color={
                completed
                  ? GREEN
                  : BLUE
              }
            />
          </View>

          <View style={styles.examInfo}>
            <Text
              style={styles.examSubject}
              numberOfLines={1}
            >
              {exam.subject}
            </Text>

            {exam.teacherName ? (
              <View
                style={
                  styles.teacherRow
                }
              >
                <Ionicons
                  name="person-outline"
                  size={11}
                  color={MUTED}
                />

                <Text
                  style={
                    styles.teacherText
                  }
                  numberOfLines={1}
                >
                  {exam.teacherName}
                </Text>
              </View>
            ) : null}
          </View>

          <View
            style={
              styles.examActionRight
            }
          >
            {!completed && (
              <Pressable
                onPress={() =>
                  completeExam(exam)
                }
                style={
                  styles.completeButton
                }
              >
                <Ionicons
                  name="checkmark"
                  size={17}
                  color={GREEN}
                />
              </Pressable>
            )}

            <Pressable
              onPress={() =>
                openEditExam(exam)
              }
              style={
                styles.editButton
              }
            >
              <Ionicons
                name="create-outline"
                size={17}
                color={BLUE}
              />
            </Pressable>

            <Pressable
              onPress={() =>
                deleteExam(exam)
              }
              style={
                styles.deleteButton
              }
            >
              <Ionicons
                name="trash-outline"
                size={17}
                color={RED}
              />
            </Pressable>
          </View>
        </View>

        <View
          style={
            styles.examDetailsRow
          }
        >
          <View
            style={
              styles.examDetailItem
            }
          >
            <Ionicons
              name="calendar-outline"
              size={14}
              color={BLUE}
            />

            <Text
              style={
                styles.examDetailText
              }
            >
              {formatDate(exam.date)}
            </Text>
          </View>

          <View
            style={
              styles.examDetailItem
            }
          >
            <Ionicons
              name="time-outline"
              size={14}
              color={PURPLE}
            />

            <Text
              style={
                styles.examDetailText
              }
            >
              {exam.time || "Not set"}
            </Text>
          </View>

          {exam.room ? (
            <View
              style={
                styles.examDetailItem
              }
            >
              <Ionicons
                name="location-outline"
                size={14}
                color={ORANGE}
              />

              <Text
                style={
                  styles.examDetailText
                }
                numberOfLines={1}
              >
                {exam.room}
              </Text>
            </View>
          ) : null}
        </View>

        {!completed &&
        remaining !== null ? (
          <View
            style={[
              styles.remainingBadge,
              remaining <= 3 &&
                styles.urgentBadge,
            ]}
          >
            <Ionicons
              name="hourglass-outline"
              size={12}
              color={
                remaining <= 3
                  ? RED
                  : BLUE
              }
            />

            <Text
              style={[
                styles.remainingText,
                remaining <= 3 &&
                  styles.urgentText,
              ]}
            >
              {remaining < 0
                ? "Exam passed"
                : remaining === 0
                ? "Today"
                : remaining === 1
                ? "Tomorrow"
                : `${remaining} days remaining`}
            </Text>
          </View>
        ) : null}

        {exam.syllabus ? (
          <View
            style={
              styles.syllabusPreview
            }
          >
            <Ionicons
              name="book-outline"
              size={13}
              color={MUTED}
            />

            <Text
              style={
                styles.syllabusPreviewText
              }
              numberOfLines={2}
            >
              {exam.syllabus}
            </Text>
          </View>
        ) : null}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView
        style={styles.container}
      >
        <View
          style={styles.loadingScreen}
        >
          <ActivityIndicator
            size="large"
            color={BLUE}
          />

          <Text
            style={styles.loadingText}
          >
            Loading exams...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.container}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          styles.scrollContent
        }
      >
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons
              name="arrow-back"
              size={21}
              color={DARK_BLUE}
            />
          </Pressable>

          <View style={styles.headerCenter}>
            <Text
              style={styles.headerTitle}
            >
              Exams
            </Text>

            <Text
              style={styles.headerSubtitle}
            >
              Plan and manage your exams
            </Text>
          </View>

          <Pressable
            onPress={openAddForm}
            style={styles.addHeaderButton}
          >
            <Ionicons
              name="add"
              size={25}
              color={WHITE}
            />
          </Pressable>
        </View>

        {nextExam ? (
          <View
            style={styles.nextExamCard}
          >
            <View
              style={
                styles.nextExamHeader
              }
            >
              <View
                style={
                  styles.nextExamLabel
                }
              >
                <Ionicons
                  name="flash"
                  size={14}
                  color={WHITE}
                />

                <Text
                  style={
                    styles.nextExamLabelText
                  }
                >
                  NEXT EXAM
                </Text>
              </View>

              <Text
                style={
                  styles.nextExamDays
                }
              >
                {daysRemaining(
                  nextExam.date
                ) === 0
                  ? "Today"
                  : daysRemaining(
                      nextExam.date
                    ) === 1
                  ? "Tomorrow"
                  : `${daysRemaining(
                      nextExam.date
                    )} days`}
              </Text>
            </View>

            <Text
              style={
                styles.nextExamSubject
              }
            >
              {nextExam.subject}
            </Text>

            {nextExam.teacherName ? (
              <Text
                style={
                  styles.nextExamTeacher
                }
              >
                {nextExam.teacherName}
              </Text>
            ) : null}

            <View
              style={
                styles.nextExamDetails
              }
            >
              <View
                style={
                  styles.nextExamDetail
                }
              >
                <Ionicons
                  name="calendar"
                  size={15}
                  color={WHITE}
                />

                <Text
                  style={
                    styles.nextExamDetailText
                  }
                >
                  {formatDate(
                    nextExam.date
                  )}
                </Text>
              </View>

              <View
                style={
                  styles.nextExamDetail
                }
              >
                <Ionicons
                  name="time"
                  size={15}
                  color={WHITE}
                />

                <Text
                  style={
                    styles.nextExamDetailText
                  }
                >
                  {nextExam.time}
                </Text>
              </View>

              {nextExam.room ? (
                <View
                  style={
                    styles.nextExamDetail
                  }
                >
                  <Ionicons
                    name="location"
                    size={15}
                    color={WHITE}
                  />

                  <Text
                    style={
                      styles.nextExamDetailText
                    }
                  >
                    {nextExam.room}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        ) : (
          <View
            style={styles.emptyNextCard}
          >
            <View
              style={
                styles.emptyNextIcon
              }
            >
              <Ionicons
                name="school-outline"
                size={30}
                color={BLUE}
              />
            </View>

            <Text
              style={
                styles.emptyNextTitle
              }
            >
              No upcoming exams
            </Text>

            <Text
              style={
                styles.emptyNextText
              }
            >
              Add your next exam to start
              planning your preparation.
            </Text>

            <Pressable
              onPress={openAddForm}
              style={
                styles.emptyAddButton
              }
            >
              <Ionicons
                name="add"
                size={17}
                color={WHITE}
              />

              <Text
                style={
                  styles.emptyAddButtonText
                }
              >
                Add Exam
              </Text>
            </Pressable>
          </View>
        )}

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View
              style={[
                styles.statIcon,
                {
                  backgroundColor:
                    "#EAF2FF",
                },
              ]}
            >
              <Ionicons
                name="calendar-outline"
                size={19}
                color={BLUE}
              />
            </View>

            <Text
              style={styles.statNumber}
            >
              {totalExams}
            </Text>

            <Text
              style={styles.statLabel}
            >
              Total
            </Text>
          </View>

          <View style={styles.statCard}>
            <View
              style={[
                styles.statIcon,
                {
                  backgroundColor:
                    "#FFF4E1",
                },
              ]}
            >
              <Ionicons
                name="time-outline"
                size={19}
                color={ORANGE}
              />
            </View>

            <Text
              style={styles.statNumber}
            >
              {remainingCount}
            </Text>

            <Text
              style={styles.statLabel}
            >
              Upcoming
            </Text>
          </View>

          <View style={styles.statCard}>
            <View
              style={[
                styles.statIcon,
                {
                  backgroundColor:
                    "#E8F8F1",
                },
              ]}
            >
              <Ionicons
                name="checkmark-circle-outline"
                size={19}
                color={GREEN}
              />
            </View>

            <Text
              style={styles.statNumber}
            >
              {completedCount}
            </Text>

            <Text
              style={styles.statLabel}
            >
              Completed
            </Text>
          </View>
        </View>

        {showAddForm ? (
          <View
            style={styles.formCard}
          >
            <View
              style={styles.formHeader}
            >
              <View>
                <Text
                  style={
                    styles.formTitle
                  }
                >
                  {editingExamId
                    ? "Edit Exam"
                    : "Add New Exam"}
                </Text>

                <Text
                  style={
                    styles.formSubtitle
                  }
                >
                  Fill in your exam details
                </Text>
              </View>

              <Pressable
                onPress={closeForm}
                style={
                  styles.formCloseButton
                }
              >
                <Ionicons
                  name="close"
                  size={20}
                  color={MUTED}
                />
              </Pressable>
            </View>

            <Text
              style={styles.inputLabel}
            >
              SUBJECT
            </Text>

            <Pressable
              onPress={() =>
                setShowSubjectModal(true)
              }
              style={styles.selectInput}
            >
              <View
                style={
                  styles.selectInputLeft
                }
              >
                <Ionicons
                  name="book-outline"
                  size={19}
                  color={BLUE}
                />

                <View
                  style={
                    styles.selectTextContainer
                  }
                >
                  <Text
                    style={[
                      styles.selectText,
                      !selectedSubjectName &&
                        styles.placeholderText,
                    ]}
                    numberOfLines={1}
                  >
                    {selectedSubjectName ||
                      "Select subject"}
                  </Text>

                  {teacherName ? (
                    <Text
                      style={
                        styles.selectTeacher
                      }
                      numberOfLines={1}
                    >
                      {teacherName}
                    </Text>
                  ) : null}
                </View>
              </View>

              <Ionicons
                name="chevron-down"
                size={18}
                color={MUTED}
              />
            </Pressable>

            <Text
              style={styles.inputLabel}
            >
              EXAM DATE
            </Text>

            <Pressable
              onPress={() =>
                setShowDatePicker(true)
              }
              style={styles.selectInput}
            >
              <View
                style={
                  styles.selectInputLeft
                }
              >
                <Ionicons
                  name="calendar-outline"
                  size={19}
                  color={BLUE}
                />

                <Text
                  style={styles.selectText}
                >
                  {formatDate(
                    formatDateForFirebase(
                      selectedDate
                    )
                  )}
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={17}
                color={MUTED}
              />
            </Pressable>

            <Text
              style={styles.inputLabel}
            >
              EXAM TIME
            </Text>

            <Pressable
              onPress={() =>
                setShowTimePicker(true)
              }
              style={styles.selectInput}
            >
              <View
                style={
                  styles.selectInputLeft
                }
              >
                <Ionicons
                  name="time-outline"
                  size={19}
                  color={PURPLE}
                />

                <Text
                  style={styles.selectText}
                >
                  {formatTimeForFirebase(
                    selectedTime
                  )}
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={17}
                color={MUTED}
              />
            </Pressable>

            <Text
              style={styles.inputLabel}
            >
              ROOM / LOCATION
            </Text>

            <Pressable
              onPress={() =>
                setShowRoomModal(true)
              }
              style={styles.selectInput}
            >
              <View
                style={
                  styles.selectInputLeft
                }
              >
                <Ionicons
                  name="location-outline"
                  size={19}
                  color={ORANGE}
                />

                <Text
                  style={[
                    styles.selectText,
                    !room &&
                      styles.placeholderText,
                  ]}
                  numberOfLines={1}
                >
                  {room ||
                    "Enter room or location"}
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={17}
                color={MUTED}
              />
            </Pressable>

            <Text
              style={styles.inputLabel}
            >
              SYLLABUS
            </Text>

            <Pressable
              onPress={() =>
                setShowSyllabusModal(true)
              }
              style={[
                styles.selectInput,
                styles.syllabusInput,
              ]}
            >
              <View
                style={
                  styles.selectInputLeft
                }
              >
                <Ionicons
                  name="document-text-outline"
                  size={19}
                  color={GREEN}
                />

                <Text
                  style={[
                    styles.selectText,
                    !syllabus &&
                      styles.placeholderText,
                  ]}
                  numberOfLines={2}
                >
                  {syllabus ||
                    "Add syllabus or topics"}
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={17}
                color={MUTED}
              />
            </Pressable>

            <Pressable
              disabled={saving}
              onPress={saveExam}
              style={[
                styles.saveButton,
                saving &&
                  styles.disabledButton,
              ]}
            >
              {saving ? (
                <ActivityIndicator
                  color={WHITE}
                />
              ) : (
                <>
                  <Ionicons
                    name={
                      editingExamId
                        ? "checkmark"
                        : "add"
                    }
                    size={19}
                    color={WHITE}
                  />

                  <Text
                    style={
                      styles.saveButtonText
                    }
                  >
                    {editingExamId
                      ? "Update Exam"
                      : "Save Exam"}
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        ) : null}

        {upcomingExams.length > 0 ? (
          <View
            style={styles.section}
          >
            <View
              style={
                styles.sectionHeader
              }
            >
              <View>
                <Text
                  style={
                    styles.sectionTitle
                  }
                >
                  Upcoming Exams
                </Text>

                <Text
                  style={
                    styles.sectionSubtitle
                  }
                >
                  Stay prepared and organized
                </Text>
              </View>

              <View
                style={
                  styles.countBadge
                }
              >
                <Text
                  style={
                    styles.countBadgeText
                  }
                >
                  {upcomingExams.length}
                </Text>
              </View>
            </View>

            {upcomingExams.map(
              (exam) =>
                renderExamCard(exam)
            )}
          </View>
        ) : null}

        {completedExams.length > 0 ? (
          <View
            style={styles.section}
          >
            <View
              style={
                styles.sectionHeader
              }
            >
              <View>
                <Text
                  style={
                    styles.sectionTitle
                  }
                >
                  Completed Exams
                </Text>

                <Text
                  style={
                    styles.sectionSubtitle
                  }
                >
                  Your finished exams
                </Text>
              </View>

              <View
                style={[
                  styles.countBadge,
                  styles.completedCountBadge,
                ]}
              >
                <Text
                  style={
                    styles.completedCountBadgeText
                  }
                >
                  {completedExams.length}
                </Text>
              </View>
            </View>

            {completedExams.map(
              (exam) =>
                renderExamCard(
                  exam,
                  true
                )
            )}
          </View>
        ) : null}

        <View
          style={styles.studyTip}
        >
          <View
            style={styles.studyTipIcon}
          >
            <Ionicons
              name="bulb-outline"
              size={22}
              color={ORANGE}
            />
          </View>

          <View
            style={styles.studyTipContent}
          >
            <Text
              style={styles.studyTipTitle}
            >
              Study Tip
            </Text>

            <Text
              style={styles.studyTipText}
            >
              Start preparing at least 7 days
              before your exam. Break the
              syllabus into small daily goals.
            </Text>
          </View>
        </View>

        <View
          style={styles.bottomSpace}
        />
      </ScrollView>

      {/* DATE PICKER */}
      {showDatePicker ? (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display={
            Platform.OS === "ios"
              ? "spinner"
              : "default"
          }
          minimumDate={getToday()}
          onChange={handleDateChange}
        />
      ) : null}

      {/* TIME PICKER */}
      {showTimePicker ? (
        <DateTimePicker
          value={selectedTime}
          mode="time"
          display={
            Platform.OS === "ios"
              ? "spinner"
              : "default"
          }
          onChange={handleTimeChange}
        />
      ) : null}

      {/* SUBJECT MODAL */}
      <Modal
        visible={showSubjectModal}
        transparent
        animationType="slide"
        onRequestClose={() =>
          setShowSubjectModal(false)
        }
      >
        <View
          style={
            styles.examSubjectModalOverlay
          }
        >
          <Pressable
            style={
              styles.examSubjectModalShade
            }
            onPress={() =>
              setShowSubjectModal(false)
            }
          />

          <View
            style={
              styles.examSubjectModal
            }
          >
            <View
              style={
                styles.examSubjectModalHeader
              }
            >
              <View
                style={{ flex: 1 }}
              >
                <Text
                  style={
                    styles.examSubjectModalTitle
                  }
                >
                  Select Subject
                </Text>

                <Text
                  style={
                    styles.examSubjectModalSubtitle
                  }
                >
                  Choose from your saved subjects
                </Text>
              </View>

              <Pressable
                onPress={() =>
                  setShowSubjectModal(false)
                }
                style={
                  styles.examSubjectCloseButton
                }
              >
                <Ionicons
                  name="close"
                  size={20}
                  color={MUTED}
                />
              </Pressable>
            </View>

            {subjectsLoading ? (
              <View
                style={
                  styles.examSubjectLoading
                }
              >
                <ActivityIndicator
                  color={BLUE}
                />

                <Text
                  style={
                    styles.examSubjectLoadingText
                  }
                >
                  Loading subjects...
                </Text>
              </View>
            ) : subjects.length === 0 ? (
              <View
                style={
                  styles.examNoSubjects
                }
              >
                <View
                  style={
                    styles.examNoSubjectsIcon
                  }
                >
                  <Ionicons
                    name="book-outline"
                    size={29}
                    color={BLUE}
                  />
                </View>

                <Text
                  style={
                    styles.examNoSubjectsTitle
                  }
                >
                  No Subjects Found
                </Text>

                <Text
                  style={
                    styles.examNoSubjectsText
                  }
                >
                  Add subjects first. Your
                  saved subject and teacher
                  name will automatically appear
                  here.
                </Text>

                <Pressable
                  onPress={() => {
                    setShowSubjectModal(
                      false
                    );

                    router.push(
                      "/subjects"
                    );
                  }}
                  style={
                    styles.examManageSubjectsButton
                  }
                >
                  <Ionicons
                    name="settings-outline"
                    size={16}
                    color={WHITE}
                  />

                  <Text
                    style={
                      styles.examManageSubjectsText
                    }
                  >
                    Manage Subjects
                  </Text>
                </Pressable>
              </View>
            ) : (
              <ScrollView
                style={
                  styles.examSubjectList
                }
                showsVerticalScrollIndicator={
                  false
                }
              >
                {subjects.map(
                  (subject) => {
                    const selected =
                      selectedSubjectId ===
                      subject.id;

                    return (
                      <Pressable
                        key={subject.id}
                        onPress={() =>
                          selectSubject(
                            subject
                          )
                        }
                        style={[
                          styles.examSubjectOption,
                          selected &&
                            styles.examSelectedSubjectOption,
                        ]}
                      >
                        <View
                          style={[
                            styles.examSubjectOptionIcon,
                            selected &&
                              styles.examSelectedOptionIcon,
                          ]}
                        >
                          <Ionicons
                            name="book"
                            size={19}
                            color={
                              selected
                                ? WHITE
                                : BLUE
                            }
                          />
                        </View>

                        <View
                          style={
                            styles.examSubjectOptionInfo
                          }
                        >
                          <Text
                            style={
                              styles.examSubjectOptionName
                            }
                            numberOfLines={1}
                          >
                            {subject.name}
                          </Text>

                          {subject.teacherName ? (
                            <View
                              style={
                                styles.examSubjectOptionTeacher
                              }
                            >
                              <Ionicons
                                name="person-outline"
                                size={10}
                                color={MUTED}
                              />

                              <Text
                                style={
                                  styles.examSubjectOptionTeacherText
                                }
                                numberOfLines={
                                  1
                                }
                              >
                                {
                                  subject.teacherName
                                }
                              </Text>
                            </View>
                          ) : null}
                        </View>

                        {selected ? (
                          <Ionicons
                            name="checkmark-circle"
                            size={22}
                            color={BLUE}
                          />
                        ) : (
                          <Ionicons
                            name="chevron-forward"
                            size={17}
                            color="#A8B1C0"
                          />
                        )}
                      </Pressable>
                    );
                  }
                )}

                <View
                  style={{
                    height: 20,
                  }}
                />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ROOM MODAL */}
      <Modal
        visible={showRoomModal}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setShowRoomModal(false)
        }
      >
        <KeyboardAvoidingView
          style={
            styles.examTextModalOverlay
          }
          behavior={
            Platform.OS === "ios"
              ? "padding"
              : undefined
          }
        >
          <Pressable
            style={
              styles.examTextModalShade
            }
            onPress={() =>
              setShowRoomModal(false)
            }
          />

          <View
            style={styles.textModalCard}
          >
            <View
              style={
                styles.textModalHeader
              }
            >
              <Text
                style={
                  styles.textModalTitle
                }
              >
                Room / Location
              </Text>

              <Pressable
                onPress={() =>
                  setShowRoomModal(false)
                }
                style={
                  styles.textModalClose
                }
              >
                <Ionicons
                  name="close"
                  size={19}
                  color={MUTED}
                />
              </Pressable>
            </View>

            <TextInput
              value={room}
              onChangeText={setRoom}
              placeholder="Example: Room 204"
              placeholderTextColor="#A5AFBF"
              style={
                styles.textModalInput
              }
              autoFocus
            />

            <Pressable
              onPress={() =>
                setShowRoomModal(false)
              }
              style={
                styles.textModalSave
              }
            >
              <Text
                style={
                  styles.textModalSaveText
                }
              >
                Save
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* SYLLABUS MODAL */}
      <Modal
        visible={showSyllabusModal}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setShowSyllabusModal(false)
        }
      >
        <KeyboardAvoidingView
          style={
            styles.examTextModalOverlay
          }
          behavior={
            Platform.OS === "ios"
              ? "padding"
              : undefined
          }
        >
          <Pressable
            style={
              styles.examTextModalShade
            }
            onPress={() =>
              setShowSyllabusModal(false)
            }
          />

          <View
            style={styles.textModalCard}
          >
            <View
              style={
                styles.textModalHeader
              }
            >
              <Text
                style={
                  styles.textModalTitle
                }
              >
                Syllabus
              </Text>

              <Pressable
                onPress={() =>
                  setShowSyllabusModal(false)
                }
                style={
                  styles.textModalClose
                }
              >
                <Ionicons
                  name="close"
                  size={19}
                  color={MUTED}
                />
              </Pressable>
            </View>

            <TextInput
              value={syllabus}
              onChangeText={setSyllabus}
              placeholder="Example: Unit 1, Unit 2, Chapter 5..."
              placeholderTextColor="#A5AFBF"
              style={[
                styles.textModalInput,
                styles.multilineInput,
              ]}
              multiline
              textAlignVertical="top"
              autoFocus
            />

            <Pressable
              onPress={() =>
                setShowSyllabusModal(false)
              }
              style={
                styles.textModalSave
              }
            >
              <Text
                style={
                  styles.textModalSaveText
                }
              >
                Save
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F9FC",
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },

  loadingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    color: MUTED,
    fontSize: 12,
    marginTop: 10,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: WHITE,
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
  },

  headerCenter: {
    flex: 1,
    marginLeft: 12,
  },

  headerTitle: {
    color: DARK_BLUE,
    fontSize: 22,
    fontWeight: "900",
  },

  headerSubtitle: {
    color: MUTED,
    fontSize: 9,
    marginTop: 2,
  },

  addHeaderButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: BLUE,
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
  },

  nextExamCard: {
    backgroundColor: BLUE,
    borderRadius: 23,
    padding: 19,
    marginBottom: 14,
    elevation: 4,
  },

  nextExamHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  nextExamLabel: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor:
      "rgba(255,255,255,0.18)",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 9,
  },

  nextExamLabelText: {
    color: WHITE,
    fontSize: 8,
    fontWeight: "900",
    marginLeft: 5,
    letterSpacing: 0.5,
  },

  nextExamDays: {
    color: WHITE,
    fontSize: 10,
    fontWeight: "800",
  },

  nextExamSubject: {
    color: WHITE,
    fontSize: 23,
    fontWeight: "900",
    marginTop: 17,
  },

  nextExamTeacher: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 10,
    marginTop: 3,
  },

  nextExamDetails: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 17,
    gap: 10,
  },

  nextExamDetail: {
    flexDirection: "row",
    alignItems: "center",
  },

  nextExamDetailText: {
    color: WHITE,
    fontSize: 9,
    fontWeight: "700",
    marginLeft: 5,
  },

  emptyNextCard: {
    backgroundColor: WHITE,
    borderRadius: 23,
    padding: 25,
    alignItems: "center",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E8EDF4",
  },

  emptyNextIcon: {
    width: 62,
    height: 62,
    borderRadius: 20,
    backgroundColor: "#EAF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 11,
  },

  emptyNextTitle: {
    color: DARK_BLUE,
    fontSize: 17,
    fontWeight: "900",
  },

  emptyNextText: {
    color: MUTED,
    fontSize: 9,
    textAlign: "center",
    marginTop: 5,
    lineHeight: 14,
    maxWidth: 270,
  },

  emptyAddButton: {
    height: 40,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: BLUE,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 15,
  },

  emptyAddButtonText: {
    color: WHITE,
    fontSize: 10,
    fontWeight: "800",
    marginLeft: 5,
  },

  statsRow: {
    flexDirection: "row",
    gap: 9,
    marginBottom: 18,
  },

  statCard: {
    flex: 1,
    backgroundColor: WHITE,
    borderRadius: 17,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E9EDF4",
  },

  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 7,
  },

  statNumber: {
    color: DARK_BLUE,
    fontSize: 19,
    fontWeight: "900",
  },

  statLabel: {
    color: MUTED,
    fontSize: 8,
    marginTop: 2,
  },

  formCard: {
    backgroundColor: WHITE,
    borderRadius: 21,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E7ECF3",
  },

  formHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },

  formTitle: {
    color: DARK_BLUE,
    fontSize: 18,
    fontWeight: "900",
  },

  formSubtitle: {
    color: MUTED,
    fontSize: 9,
    marginTop: 3,
  },

  formCloseButton: {
    marginLeft: "auto",
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: "#F4F6FA",
    alignItems: "center",
    justifyContent: "center",
  },

  inputLabel: {
    color: DARK_BLUE,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.6,
    marginTop: 10,
    marginBottom: 6,
  },

  selectInput: {
    minHeight: 53,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E7EF",
    backgroundColor: "#FBFCFE",
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  selectInputLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  selectTextContainer: {
    flex: 1,
    marginLeft: 10,
  },

  selectText: {
    color: DARK_BLUE,
    fontSize: 11,
    fontWeight: "700",
    flexShrink: 1,
  },

  selectTeacher: {
    color: MUTED,
    fontSize: 8,
    marginTop: 2,
  },

  placeholderText: {
    color: "#A5AFBF",
    fontWeight: "600",
  },

  syllabusInput: {
    minHeight: 58,
  },

  saveButton: {
    height: 48,
    borderRadius: 14,
    backgroundColor: BLUE,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginTop: 20,
  },

  disabledButton: {
    opacity: 0.6,
  },

  saveButtonText: {
    color: WHITE,
    fontSize: 11,
    fontWeight: "900",
    marginLeft: 7,
  },

  section: {
    marginBottom: 18,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },

  sectionTitle: {
    color: DARK_BLUE,
    fontSize: 17,
    fontWeight: "900",
  },

  sectionSubtitle: {
    color: MUTED,
    fontSize: 8,
    marginTop: 2,
  },

  countBadge: {
    marginLeft: "auto",
    minWidth: 27,
    height: 27,
    paddingHorizontal: 8,
    borderRadius: 9,
    backgroundColor: "#EAF2FF",
    alignItems: "center",
    justifyContent: "center",
  },

  countBadgeText: {
    color: BLUE,
    fontSize: 10,
    fontWeight: "900",
  },

  completedCountBadge: {
    backgroundColor: "#E8F8F1",
  },

  completedCountBadgeText: {
    color: GREEN,
    fontSize: 10,
    fontWeight: "900",
  },

  examCard: {
    backgroundColor: WHITE,
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E8EDF4",
  },

  completedExamCard: {
    opacity: 0.78,
  },

  examCardTop: {
    flexDirection: "row",
    alignItems: "center",
  },

  examIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },

  examInfo: {
    flex: 1,
    marginLeft: 10,
    marginRight: 6,
  },

  examSubject: {
    color: DARK_BLUE,
    fontSize: 13,
    fontWeight: "900",
  },

  teacherRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },

  teacherText: {
    color: MUTED,
    fontSize: 8,
    marginLeft: 4,
    flexShrink: 1,
  },

  examActionRight: {
    flexDirection: "row",
    alignItems: "center",
  },

  completeButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#E8F8F1",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
  },

  editButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#EAF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
  },

  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#FFF0F1",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
  },

  examDetailsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 13,
  },

  examDetailItem: {
    flexDirection: "row",
    alignItems: "center",
  },

  examDetailText: {
    color: TEXT,
    fontSize: 8,
    fontWeight: "700",
    marginLeft: 5,
  },

  remainingBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EAF2FF",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginTop: 11,
  },

  remainingText: {
    color: BLUE,
    fontSize: 8,
    fontWeight: "800",
    marginLeft: 4,
  },

  urgentBadge: {
    backgroundColor: "#FFF0F1",
  },

  urgentText: {
    color: RED,
  },

  syllabusPreview: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 10,
    paddingTop: 9,
    borderTopWidth: 1,
    borderTopColor: "#F0F2F6",
  },

  syllabusPreviewText: {
    flex: 1,
    color: MUTED,
    fontSize: 8,
    lineHeight: 13,
    marginLeft: 6,
  },

  studyTip: {
    backgroundColor: "#FFF9EA",
    borderRadius: 18,
    padding: 14,
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#F7E9C0",
  },

  studyTipIcon: {
    width: 39,
    height: 39,
    borderRadius: 12,
    backgroundColor: "#FFF0C7",
    alignItems: "center",
    justifyContent: "center",
  },

  studyTipContent: {
    flex: 1,
    marginLeft: 10,
  },

  studyTipTitle: {
    color: DARK_BLUE,
    fontSize: 11,
    fontWeight: "900",
  },

  studyTipText: {
    color: MUTED,
    fontSize: 8,
    lineHeight: 13,
    marginTop: 3,
  },

  bottomSpace: {
    height: 20,
  },

  examSubjectModalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },

  examSubjectModalShade: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#000000",
    opacity: 0.35,
  },

  examSubjectModal: {
    backgroundColor: WHITE,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    maxHeight: "75%",
    paddingTop: 18,
    paddingBottom: 25,
  },

  examSubjectModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#EDF0F5",
  },

  examSubjectModalTitle: {
    color: DARK_BLUE,
    fontSize: 18,
    fontWeight: "800",
  },

  examSubjectModalSubtitle: {
    color: MUTED,
    fontSize: 9,
    marginTop: 3,
  },

  examSubjectCloseButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#F4F6FA",
    alignItems: "center",
    justifyContent: "center",
  },

  examSubjectList: {
    paddingHorizontal: 14,
    paddingTop: 10,
  },

  examSubjectOption: {
    minHeight: 68,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#E5EAF2",
    backgroundColor: "#FAFCFF",
    marginBottom: 8,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
  },

  examSelectedSubjectOption: {
    borderColor: "#BFD7FF",
    backgroundColor: "#F0F6FF",
  },

  examSubjectOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#EAF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  examSelectedOptionIcon: {
    backgroundColor: BLUE,
  },

  examSubjectOptionInfo: {
    flex: 1,
    marginRight: 8,
  },

  examSubjectOptionName: {
    color: DARK_BLUE,
    fontSize: 12,
    fontWeight: "800",
  },

  examSubjectOptionTeacher: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },

  examSubjectOptionTeacherText: {
    color: MUTED,
    fontSize: 8,
    flexShrink: 1,
    marginLeft: 4,
  },

  examNoSubjects: {
    alignItems: "center",
    paddingHorizontal: 25,
    paddingVertical: 35,
  },

  examNoSubjectsIcon: {
    width: 62,
    height: 62,
    borderRadius: 20,
    backgroundColor: "#EAF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },

  examNoSubjectsTitle: {
    color: DARK_BLUE,
    fontSize: 16,
    fontWeight: "800",
  },

  examNoSubjectsText: {
    color: MUTED,
    fontSize: 9,
    textAlign: "center",
    lineHeight: 14,
    marginTop: 5,
    maxWidth: 260,
  },

  examManageSubjectsButton: {
    height: 42,
    borderRadius: 12,
    backgroundColor: BLUE,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },

  examManageSubjectsText: {
    color: WHITE,
    fontSize: 10,
    fontWeight: "800",
    marginLeft: 6,
  },

  examSubjectLoading: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 35,
  },

  examSubjectLoadingText: {
    color: MUTED,
    fontSize: 10,
    marginTop: 8,
  },

  examTextModalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },

  examTextModalShade: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#000000",
    opacity: 0.35,
  },

  textModalCard: {
    width: "100%",
    backgroundColor: WHITE,
    borderRadius: 21,
    padding: 17,
  },

  textModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 13,
  },

  textModalTitle: {
    color: DARK_BLUE,
    fontSize: 17,
    fontWeight: "900",
    flex: 1,
  },

  textModalClose: {
    width: 35,
    height: 35,
    borderRadius: 11,
    backgroundColor: "#F4F6FA",
    alignItems: "center",
    justifyContent: "center",
  },

  textModalInput: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: "#E2E7EF",
    borderRadius: 13,
    backgroundColor: "#FBFCFE",
    paddingHorizontal: 13,
    paddingVertical: 12,
    color: DARK_BLUE,
    fontSize: 11,
  },

  multilineInput: {
    height: 130,
    paddingTop: 13,
  },

  textModalSave: {
    height: 45,
    borderRadius: 13,
    backgroundColor: BLUE,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 13,
  },

  textModalSaveText: {
    color: WHITE,
    fontSize: 11,
    fontWeight: "900",
  },
});