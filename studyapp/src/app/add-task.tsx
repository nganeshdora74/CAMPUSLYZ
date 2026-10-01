import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import {
  collection,
  getDocs,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "../firebase/config";

const DEFAULT_SUBJECTS = [
  "Data Structures",
  "Database Management Systems",
  "Operating Systems",
  "Computer Networks",
  "Object Oriented Programming",
  "Software Engineering",
  "Engineering Mathematics",
  "Artificial Intelligence",
];

type Priority = "Low" | "Medium" | "High";

type Subject = {
  id: string;
  name: string;
};

export default function AddTaskScreen() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [startTime, setStartTime] = useState("09:00 AM");
  const [endTime, setEndTime] = useState("10:30 AM");

  const [priority, setPriority] =
    useState<Priority>("High");

  const [dueDate, setDueDate] =
    useState(new Date());

  const [showDatePicker, setShowDatePicker] =
    useState(false);

  const [showSubjects, setShowSubjects] =
    useState(false);

  const [loadingSubjects, setLoadingSubjects] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  // --------------------------------------------------
  // LOAD SUBJECTS
  // --------------------------------------------------

  useEffect(() => {
    loadSubjects();
  }, []);

  const loadSubjects = async () => {
    try {
      setLoadingSubjects(true);

      const user = auth.currentUser;

      if (!user) {
        setSubjects(
          DEFAULT_SUBJECTS.map((name, index) => ({
            id: `default-${index}`,
            name,
          }))
        );
        return;
      }

      const loaded: Subject[] = [];

      // ----------------------------------------------
      // GLOBAL SUBJECTS
      // ----------------------------------------------

      try {
        const snapshot = await getDocs(
          collection(db, "subjects")
        );

        snapshot.forEach((subjectDoc) => {
          const data = subjectDoc.data();

          if (data.name) {
            loaded.push({
              id: subjectDoc.id,
              name: String(data.name),
            });
          } else if (data.subject) {
            loaded.push({
              id: subjectDoc.id,
              name: String(data.subject),
            });
          }
        });
      } catch (error) {
        console.log(
          "Global subjects query failed:",
          error
        );
      }

      // ----------------------------------------------
      // USER SUBJECTS
      // ----------------------------------------------

      if (loaded.length === 0) {
        try {
          const userSubjects = await getDocs(
            collection(
              db,
              "users",
              user.uid,
              "subjects"
            )
          );

          userSubjects.forEach((subjectDoc) => {
            const data = subjectDoc.data();

            if (data.name) {
              loaded.push({
                id: subjectDoc.id,
                name: String(data.name),
              });
            } else if (data.subject) {
              loaded.push({
                id: subjectDoc.id,
                name: String(data.subject),
              });
            }
          });
        } catch (error) {
          console.log(
            "User subjects query failed:",
            error
          );
        }
      }

      // ----------------------------------------------
      // REMOVE DUPLICATES
      // ----------------------------------------------

      const uniqueSubjects = Array.from(
        new Map(
          loaded.map((subject) => [
            subject.name.toLowerCase(),
            subject,
          ])
        ).values()
      );

      // ----------------------------------------------
      // DEFAULT SUBJECTS
      // ----------------------------------------------

      if (uniqueSubjects.length === 0) {
        setSubjects(
          DEFAULT_SUBJECTS.map((name, index) => ({
            id: `default-${index}`,
            name,
          }))
        );
      } else {
        setSubjects(uniqueSubjects);
      }
    } catch (error) {
      console.error(
        "Subject loading error:",
        error
      );

      setSubjects(
        DEFAULT_SUBJECTS.map((name, index) => ({
          id: `default-${index}`,
          name,
        }))
      );
    } finally {
      setLoadingSubjects(false);
    }
  };

  // --------------------------------------------------
  // DATE
  // --------------------------------------------------

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const changeDate = (days: number) => {
    const nextDate = new Date(dueDate);

    nextDate.setDate(
      nextDate.getDate() + days
    );

    setDueDate(nextDate);
  };

  // --------------------------------------------------
  // CREATE TASK
  // --------------------------------------------------

  const createTask = async () => {
    if (saving) {
      return;
    }

    const cleanTitle = title.trim();
    const cleanDescription =
      description.trim();

    if (!cleanTitle) {
      Alert.alert(
        "Missing title",
        "Please enter a task title."
      );
      return;
    }

    if (!selectedSubject) {
      Alert.alert(
        "Select subject",
        "Please select a subject."
      );
      return;
    }

    const user = auth.currentUser;

    if (!user) {
      Alert.alert(
        "Not logged in",
        "Please login before creating a task."
      );
      return;
    }

    try {
      setSaving(true);

      // ----------------------------------------------
      // USER TASK COLLECTION
      //
      // users/{uid}/tasks
      // ----------------------------------------------

      const tasksRef = collection(
        db,
        "users",
        user.uid,
        "tasks"
      );

      const taskData = {
        title: cleanTitle,
        description: cleanDescription,
        subject: selectedSubject.trim(),
        startTime: startTime.trim(),
        endTime: endTime.trim(),
        timeRange: `${startTime.trim()} – ${endTime.trim()}`,
        dueTime: `${startTime.trim()} – ${endTime.trim()}`,
        priority,

        // Initial task state
        status: "To Do",
        completed: false,

        // Store actual Date
        dueDate,

        // Ownership
        userId: user.uid,

        // Firebase timestamps
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),

        // No completion date initially
        completedAt: null,
      };

      // ----------------------------------------------
      // SAVE TASK
      // ----------------------------------------------

      const createdTask =
        await addDoc(
          tasksRef,
          taskData
        );

      console.log(
        "Task created:",
        createdTask.id
      );

      if (Platform.OS === "web") {
        window.alert("Your task has been added successfully.");
        router.replace("/(tab)/tasks");
      } else {
        Alert.alert(
          "Task created",
          "Your task has been added successfully.",
          [
            {
              text: "OK",
              onPress: () => {
                router.replace("/(tab)/tasks");
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error(
        "Create task error:",
        error
      );

      Alert.alert(
        "Could not create task",
        "Something went wrong while saving the task to Firebase. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={
          styles.container
        }
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}

        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            disabled={saving}
            style={styles.headerButton}
          >
            <Text style={styles.back}>
              ‹
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={createTask}
            disabled={saving}
            style={styles.headerButton}
          >
            {saving ? (
              <ActivityIndicator
                size="small"
                color="#5B45E6"
              />
            ) : (
              <Text style={styles.check}>
                ✓
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.heading}>
          Add new task
        </Text>

        {/* TITLE */}

        <Text style={styles.label}>
          Title
        </Text>

        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Enter task title"
          placeholderTextColor="#888"
          style={styles.input}
          editable={!saving}
        />

        {/* SUBJECT */}

        <Text style={styles.label}>
          Subject
        </Text>

        <TouchableOpacity
          style={styles.select}
          onPress={() => {
            if (
              !saving &&
              !loadingSubjects
            ) {
              setShowSubjects(
                !showSubjects
              );
            }
          }}
          disabled={
            saving ||
            loadingSubjects
          }
        >
          <Text
            style={[
              styles.selectText,
              !selectedSubject &&
                styles.placeholder,
            ]}
          >
            {loadingSubjects
              ? "Loading subjects..."
              : selectedSubject ||
                "Select subject"}
          </Text>

          <Text style={styles.downArrow}>
            {showSubjects
              ? "⌃"
              : "⌄"}
          </Text>
        </TouchableOpacity>

        {/* SUBJECT LIST */}

        {showSubjects &&
          !loadingSubjects && (
            <View
              style={styles.subjectList}
            >
              {subjects.length === 0 ? (
                <Text
                  style={
                    styles.noSubjects
                  }
                >
                  No subjects available
                </Text>
              ) : (
                subjects.map(
                  (subject) => (
                    <TouchableOpacity
                      key={subject.id}
                      style={
                        styles.subjectItem
                      }
                      onPress={() => {
                        setSelectedSubject(
                          subject.name
                        );
                        setShowSubjects(
                          false
                        );
                      }}
                    >
                      <Text
                        style={
                          styles.subjectText
                        }
                      >
                        {subject.name}
                      </Text>

                      {selectedSubject ===
                        subject.name && (
                        <Text
                          style={
                            styles.selectedMark
                          }
                        >
                          ✓
                        </Text>
                      )}
                    </TouchableOpacity>
                  )
                )
              )}
            </View>
          )}

        <TextInput
          value={selectedSubject}
          onChangeText={setSelectedSubject}
          placeholder="Or type custom subject name..."
          placeholderTextColor="#888"
          style={[styles.input, { marginTop: 8 }]}
          editable={!saving}
        />

        {/* START & END TIME */}
        <Text style={styles.label}>
          Starting Time *
        </Text>
        <TextInput
          value={startTime}
          onChangeText={setStartTime}
          placeholder="e.g. 09:00 AM"
          placeholderTextColor="#888"
          style={styles.input}
          editable={!saving}
        />

        <Text style={styles.label}>
          End Time *
        </Text>
        <TextInput
          value={endTime}
          onChangeText={setEndTime}
          placeholder="e.g. 10:30 AM"
          placeholderTextColor="#888"
          style={styles.input}
          editable={!saving}
        />

        {/* DUE DATE */}
        <Text style={styles.label}>
          Due date
        </Text>

        <View style={styles.dateRow}>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() =>
              setShowDatePicker(
                !showDatePicker
              )
            }
            disabled={saving}
          >
            <Text
              style={styles.dateText}
            >
              {formatDate(dueDate)}
            </Text>

            <Text
              style={styles.calendarIcon}
            >
              ▣
            </Text>
          </TouchableOpacity>
        </View>

        {showDatePicker && (
          <View
            style={styles.dateControls}
          >
            <TouchableOpacity
              style={styles.dateControl}
              onPress={() =>
                changeDate(-1)
              }
              disabled={saving}
            >
              <Text
                style={
                  styles.dateControlText
                }
              >
                − 1 day
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dateControl}
              onPress={() =>
                setDueDate(
                  new Date()
                )
              }
              disabled={saving}
            >
              <Text
                style={
                  styles.dateControlText
                }
              >
                Today
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dateControl}
              onPress={() =>
                changeDate(1)
              }
              disabled={saving}
            >
              <Text
                style={
                  styles.dateControlText
                }
              >
                + 1 day
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* PRIORITY */}

        <Text style={styles.label}>
          Priority
        </Text>

        <View
          style={styles.priorityRow}
        >
          <TouchableOpacity
            style={
              styles.priorityOption
            }
            onPress={() =>
              setPriority("Low")
            }
            disabled={saving}
          >
            <View
              style={[
                styles.radio,
                priority === "Low" &&
                  styles.radioSelected,
              ]}
            />

            <Text
              style={
                styles.priorityText
              }
            >
              Low
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={
              styles.priorityOption
            }
            onPress={() =>
              setPriority("Medium")
            }
            disabled={saving}
          >
            <View
              style={[
                styles.radio,
                priority === "Medium" &&
                  styles.radioSelected,
              ]}
            />

            <Text
              style={
                styles.priorityText
              }
            >
              Medium
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={
              styles.priorityOption
            }
            onPress={() =>
              setPriority("High")
            }
            disabled={saving}
          >
            <View
              style={[
                styles.radio,
                priority === "High" &&
                  styles.radioHigh,
              ]}
            />

            <Text
              style={[
                styles.priorityText,
                priority === "High" &&
                  styles.highText,
              ]}
            >
              High
            </Text>
          </TouchableOpacity>
        </View>

        {/* DESCRIPTION */}

        <Text style={styles.label}>
          Description
        </Text>

        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Add description..."
          placeholderTextColor="#888"
          style={styles.description}
          multiline
          textAlignVertical="top"
          editable={!saving}
        />

        {/* CREATE BUTTON */}

        <TouchableOpacity
          style={[
            styles.createButton,
            saving &&
              styles.createButtonDisabled,
          ]}
          onPress={createTask}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <View
              style={styles.loadingRow}
            >
              <ActivityIndicator
                size="small"
                color="#FFFFFF"
              />

              <Text
                style={styles.createText}
              >
                Saving...
              </Text>
            </View>
          ) : (
            <Text
              style={styles.createText}
            >
              Create task
            </Text>
          )}
        </TouchableOpacity>

        <View
          style={styles.bottomSpace}
        />
      </ScrollView>
    </View>
  );
}

// --------------------------------------------------
// STYLES
// --------------------------------------------------

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  scroll: {
    flex: 1,
  },

  container: {
    paddingHorizontal: 40,
    paddingTop: 38,
  },

  header: {
    flexDirection: "row",
    justifyContent:
      "space-between",
    alignItems: "center",
    marginBottom: 24,
  },

  headerButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent:
      "center",
  },

  back: {
    fontSize: 38,
    lineHeight: 38,
    color: "#111111",
    fontWeight: "300",
  },

  check: {
    fontSize: 30,
    color: "#5B45E6",
    fontWeight: "700",
  },

  heading: {
    fontSize: 27,
    fontWeight: "800",
    color: "#111111",
    marginBottom: 82,
  },

  label: {
    fontSize: 15,
    color: "#777777",
    marginBottom: 13,
    marginTop: 7,
  },

  input: {
    height: 76,
    borderWidth: 1,
    borderColor: "#DDDEE4",
    borderRadius: 15,
    paddingHorizontal: 22,
    fontSize: 18,
    color: "#111111",
    marginBottom: 25,
  },

  select: {
    height: 76,
    borderWidth: 1,
    borderColor: "#DDDEE4",
    borderRadius: 15,
    paddingHorizontal: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent:
      "space-between",
  },

  selectText: {
    fontSize: 18,
    color: "#111111",
    flex: 1,
  },

  placeholder: {
    color: "#777777",
  },

  downArrow: {
    fontSize: 22,
    color: "#111111",
    marginLeft: 10,
  },

  subjectList: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: "#DDDEE4",
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },

  subjectItem: {
    minHeight: 52,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent:
      "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },

  subjectText: {
    fontSize: 15,
    color: "#111111",
    flex: 1,
  },

  selectedMark: {
    color: "#5B45E6",
    fontSize: 20,
    fontWeight: "700",
  },

  noSubjects: {
    padding: 18,
    color: "#777777",
  },

  dateRow: {
    marginBottom: 6,
  },

  dateButton: {
    height: 76,
    borderWidth: 1,
    borderColor: "#DDDEE4",
    borderRadius: 15,
    paddingHorizontal: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent:
      "space-between",
  },

  dateText: {
    fontSize: 18,
    color: "#111111",
  },

  calendarIcon: {
    fontSize: 18,
    color: "#111111",
  },

  dateControls: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
    marginBottom: 10,
  },

  dateControl: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    backgroundColor: "#F1EEFF",
    alignItems: "center",
    justifyContent:
      "center",
  },

  dateControlText: {
    color: "#5B45E6",
    fontWeight: "600",
    fontSize: 12,
  },

  priorityRow: {
    flexDirection: "row",
    justifyContent:
      "space-between",
    alignItems: "center",
    marginBottom: 17,
  },

  priorityOption: {
    flexDirection: "row",
    alignItems: "center",
  },

  radio: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: "#333333",
    borderRadius: 10,
    marginRight: 6,
  },

  radioSelected: {
    borderWidth: 6,
    borderColor: "#5B45E6",
  },

  radioHigh: {
    borderWidth: 6,
    borderColor: "#E34E59",
  },

  priorityText: {
    fontSize: 16,
    color: "#111111",
  },

  highText: {
    color: "#E34E59",
  },

  description: {
    height: 142,
    borderWidth: 1,
    borderColor: "#DDDEE4",
    borderRadius: 15,
    paddingHorizontal: 22,
    paddingTop: 18,
    fontSize: 17,
    color: "#111111",
  },

  createButton: {
    height: 62,
    borderRadius: 15,
    backgroundColor: "#5B45E6",
    alignItems: "center",
    justifyContent:
      "center",
    marginTop: 43,
  },

  createButtonDisabled: {
    opacity: 0.7,
  },

  createText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },

  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  bottomSpace: {
    height: 40,
  },
});