import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  Alert,
  Platform,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
} from "firebase/firestore";
import { auth, db } from "../firebase/config";

type EventItem = {
  id: string;
  title: string;
  date: string;
  userId: string;
};

const PURPLE = "#5B45E6";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

export default function CalendarScreen() {
  const today = new Date();

  const [selectedDate, setSelectedDate] = useState(
    new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    )
  );

  const [currentMonth, setCurrentMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );

  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalVisible, setModalVisible] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newDate, setNewDate] = useState(
    formatDate(selectedDate)
  );
  const [saving, setSaving] = useState(false);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const daysInMonth = new Date(
    year,
    month + 1,
    0
  ).getDate();

  const firstDay = new Date(
    year,
    month,
    1
  ).getDay();

  // --------------------------------------------------
  // LOAD CALENDAR EVENTS FROM FIREBASE
  // --------------------------------------------------

  useEffect(() => {
    const user = auth.currentUser;

    if (!user) {
      setEvents([]);
      setLoading(false);
      return;
    }

    console.log(
      "Loading calendar for UID:",
      user.uid
    );

    const calendarRef = collection(
      db,
      "users",
      user.uid,
      "calendar"
    );

    const calendarQuery = query(
      calendarRef,
      orderBy("date")
    );

    const unsubscribe = onSnapshot(
      calendarQuery,
      (snapshot) => {
        const loadedEvents: EventItem[] =
          snapshot.docs.map((eventDoc) => {
            const data = eventDoc.data();

            let eventDate = "";

            if (typeof data.date === "string") {
              eventDate = data.date;
            } else if (
              data.date instanceof Timestamp
            ) {
              const date = data.date.toDate();
              eventDate = formatDate(date);
            }

            return {
              id: eventDoc.id,
              title: String(
                data.title ?? "Untitled event"
              ),
              date: eventDate,
              userId: String(
                data.userId ?? user.uid
              ),
            };
          });

        setEvents(loadedEvents);
        setLoading(false);

        console.log(
          "Calendar events loaded:",
          loadedEvents.length
        );
      },
      (error) => {
        console.error(
          "Calendar loading error:",
          error
        );

        setLoading(false);

        Alert.alert(
          "Could not load calendar",
          "There was a problem loading your calendar events from Firebase."
        );
      }
    );

    return unsubscribe;
  }, []);

  // --------------------------------------------------
  // CALENDAR DAYS
  // --------------------------------------------------

  const calendarDays = useMemo(() => {
    const days: (number | null)[] = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    for (
      let day = 1;
      day <= daysInMonth;
      day++
    ) {
      days.push(day);
    }

    return days;
  }, [firstDay, daysInMonth]);

  // --------------------------------------------------
  // SELECTED EVENTS
  // --------------------------------------------------

  const selectedEvents = events.filter(
    (event) =>
      event.date === formatDate(selectedDate)
  );

  // --------------------------------------------------
  // UPCOMING EVENTS
  // --------------------------------------------------

  const upcomingEvents = [...events].sort(
    (a, b) =>
      parseDate(a.date).getTime() -
      parseDate(b.date).getTime()
  );

  // --------------------------------------------------
  // MONTH NAVIGATION
  // --------------------------------------------------

  function goToPreviousMonth() {
    setCurrentMonth(
      new Date(year, month - 1, 1)
    );
  }

  function goToNextMonth() {
    setCurrentMonth(
      new Date(year, month + 1, 1)
    );
  }

  function goToToday() {
    const now = new Date();

    setCurrentMonth(
      new Date(
        now.getFullYear(),
        now.getMonth(),
        1
      )
    );

    setSelectedDate(
      new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      )
    );
  }

  function selectDay(day: number) {
    const date = new Date(
      year,
      month,
      day
    );

    setSelectedDate(date);
  }

  // --------------------------------------------------
  // OPEN ADD EVENT
  // --------------------------------------------------

  function openAddSubject() {
    setNewSubject("");
    setNewDate(formatDate(selectedDate));
    setModalVisible(true);
  }

  // --------------------------------------------------
  // ADD EVENT TO FIREBASE
  // --------------------------------------------------

  async function addSubject() {
    if (saving) {
      return;
    }

    const title = newSubject.trim();
    const date = newDate.trim();

    if (!title) {
      Alert.alert(
        "Missing subject",
        "Please enter the subject or event name."
      );
      return;
    }

    if (!isValidDate(date)) {
      Alert.alert(
        "Invalid date",
        "Please use the format YYYY-MM-DD.\nExample: 2026-09-15"
      );
      return;
    }

    const user = auth.currentUser;

    if (!user) {
      Alert.alert(
        "Not logged in",
        "Please log in before adding a calendar event."
      );
      return;
    }

    try {
      setSaving(true);

      await addDoc(
        collection(
          db,
          "users",
          user.uid,
          "calendar"
        ),
        {
          title,
          date,
          userId: user.uid,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        }
      );

      const eventDate = parseDate(date);

      setSelectedDate(eventDate);

      setCurrentMonth(
        new Date(
          eventDate.getFullYear(),
          eventDate.getMonth(),
          1
        )
      );

      setModalVisible(false);
      setNewSubject("");

      console.log(
        "Calendar event created for UID:",
        user.uid
      );
    } catch (error) {
      console.error(
        "Add calendar event error:",
        error
      );

      Alert.alert(
        "Could not add subject",
        "Something went wrong while saving the event to Firebase."
      );
    } finally {
      setSaving(false);
    }
  }

  // --------------------------------------------------
  // DELETE EVENT FROM FIREBASE
  // --------------------------------------------------

  function deleteSubject(event: EventItem) {
    Alert.alert(
      "Remove subject",
      `Do you want to remove "${event.title}"?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            const user = auth.currentUser;

            if (!user) {
              Alert.alert(
                "Not logged in",
                "Please log in again."
              );
              return;
            }

            try {
              await deleteDoc(
                doc(
                  db,
                  "users",
                  user.uid,
                  "calendar",
                  event.id
                )
              );
            } catch (error) {
              console.error(
                "Delete calendar event error:",
                error
              );

              Alert.alert(
                "Could not remove subject",
                "Something went wrong while deleting the event."
              );
            }
          },
        },
      ]
    );
  }

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* HEADER */}

        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Text style={styles.backArrow}>
              ‹
            </Text>
          </TouchableOpacity>

          <Text style={styles.headerTitle}>
            Academic Calendar
          </Text>

          <View style={styles.headerSpacer} />
        </View>

        {/* LOADING */}

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator
              size="large"
              color={PURPLE}
            />

            <Text style={styles.loadingText}>
              Loading calendar...
            </Text>
          </View>
        ) : null}

        {/* MONTH NAVIGATION */}

        <View style={styles.monthHeader}>
          <TouchableOpacity
            onPress={goToPreviousMonth}
            style={styles.monthButton}
          >
            <Text style={styles.monthArrow}>
              ‹
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={goToToday}>
            <Text style={styles.monthTitle}>
              {MONTHS[month]} {year}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={goToNextMonth}
            style={styles.monthButton}
          >
            <Text style={styles.monthArrow}>
              ›
            </Text>
          </TouchableOpacity>
        </View>

        {/* TODAY */}

        <TouchableOpacity
          style={styles.todayButton}
          onPress={goToToday}
        >
          <Text style={styles.todayButtonText}>
            Today
          </Text>
        </TouchableOpacity>

        {/* WEEKDAYS */}

        <View style={styles.weekRow}>
          {WEEKDAYS.map((day, index) => (
            <Text
              key={`weekday-${index}`}
              style={styles.weekText}
            >
              {day}
            </Text>
          ))}
        </View>

        {/* CALENDAR */}

        <View style={styles.calendarGrid}>
          {calendarDays.map((day, index) => {
            if (day === null) {
              return (
                <View
                  key={`empty-${index}`}
                  style={styles.dayCell}
                />
              );
            }

            const date = new Date(
              year,
              month,
              day
            );

            const dateString =
              formatDate(date);

            const isSelected =
              formatDate(selectedDate) ===
              dateString;

            const isToday =
              formatDate(today) ===
              dateString;

            const hasEvent = events.some(
              (event) =>
                event.date === dateString
            );

            return (
              <TouchableOpacity
                key={`day-${year}-${month}-${day}`}
                style={styles.dayCell}
                onPress={() =>
                  selectDay(day)
                }
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.dayCircle,
                    isSelected &&
                      styles.selectedDay,
                    !isSelected &&
                      isToday &&
                      styles.todayOutline,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      isSelected &&
                        styles.selectedDayText,
                    ]}
                  >
                    {day}
                  </Text>
                </View>

                {hasEvent &&
                  !isSelected && (
                    <View
                      style={styles.eventDot}
                    />
                  )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* SELECTED DATE */}

        <View style={styles.selectedDateBox}>
          <Text style={styles.selectedDateLabel}>
            Selected date
          </Text>

          <Text style={styles.selectedDateText}>
            {formatLongDate(selectedDate)}
          </Text>
        </View>

        {/* SELECTED DAY EVENTS */}

        {selectedEvents.length > 0 && (
          <View style={styles.selectedEventsBox}>
            <Text style={styles.sectionTitle}>
              Subjects on this date
            </Text>

            {selectedEvents.map((event) => (
              <View
                key={`selected-${event.id}`}
                style={styles.eventRow}
              >
                <View style={styles.eventIcon}>
                  <Text
                    style={styles.eventIconText}
                  >
                    □
                  </Text>
                </View>

                <View style={styles.eventInfo}>
                  <Text
                    style={styles.eventTitle}
                  >
                    {event.title}
                  </Text>

                  <Text
                    style={styles.eventDate}
                  >
                    {formatLongDate(
                      parseDate(event.date)
                    )}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() =>
                    deleteSubject(event)
                  }
                  style={styles.deleteButton}
                >
                  <Text
                    style={styles.deleteText}
                  >
                    ×
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* UPCOMING */}

        <View style={styles.upcomingHeader}>
          <Text style={styles.sectionTitle}>
            Upcoming
          </Text>

          <TouchableOpacity
            style={styles.addButton}
            onPress={openAddSubject}
          >
            <Text style={styles.addButtonText}>
              + Add
            </Text>
          </TouchableOpacity>
        </View>

        {upcomingEvents.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>
              No upcoming subjects
            </Text>

            <Text style={styles.emptyText}>
              Tap "+ Add" to add a test, quiz,
              assignment or project.
            </Text>
          </View>
        ) : (
          upcomingEvents.map((event) => (
            <View
              key={`upcoming-${event.id}`}
              style={styles.eventRow}
            >
              <View style={styles.eventIcon}>
                <Text
                  style={styles.eventIconText}
                >
                  □
                </Text>
              </View>

              <View style={styles.eventInfo}>
                <Text
                  style={styles.eventTitle}
                >
                  {event.title}
                </Text>

                <Text
                  style={styles.eventDate}
                >
                  {formatLongDate(
                    parseDate(event.date)
                  )}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() =>
                  deleteSubject(event)
                }
                style={styles.deleteButton}
              >
                <Text
                  style={styles.deleteText}
                >
                  ×
                </Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      {/* ADD SUBJECT MODAL */}

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() =>
          setModalVisible(false)
        }
      >
        <View style={styles.modalBackground}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>
              Add Upcoming Subject
            </Text>

            <Text style={styles.modalLabel}>
              Subject / Event
            </Text>

            <TextInput
              value={newSubject}
              onChangeText={setNewSubject}
              placeholder="Example: Mathematics Test"
              placeholderTextColor="#999"
              style={styles.modalInput}
              autoFocus
              editable={!saving}
            />

            <Text style={styles.modalLabel}>
              Date
            </Text>

            <TextInput
              value={newDate}
              onChangeText={setNewDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#999"
              style={styles.modalInput}
              autoCapitalize="none"
              keyboardType={
                Platform.OS === "ios"
                  ? "numbers-and-punctuation"
                  : "default"
              }
              editable={!saving}
            />

            <Text style={styles.dateHint}>
              Example: 2026-09-15
            </Text>

            <TouchableOpacity
              style={[
                styles.saveButton,
                saving &&
                  styles.disabledButton,
              ]}
              onPress={addSubject}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator
                  color="#FFFFFF"
                />
              ) : (
                <Text
                  style={
                    styles.saveButtonText
                  }
                >
                  Add Subject
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() =>
                setModalVisible(false)
              }
              disabled={saving}
            >
              <Text
                style={styles.cancelButtonText}
              >
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* ---------------- HELPERS ---------------- */

function formatDate(date: Date) {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseDate(value: string) {
  const [year, month, day] = value
    .split("-")
    .map(Number);

  return new Date(
    year,
    month - 1,
    day
  );
}

function isValidDate(value: string) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return false;
  }

  const date = parseDate(value);

  return (
    !isNaN(date.getTime()) &&
    formatDate(date) === value
  );
}

function formatLongDate(date: Date) {
  return date.toLocaleDateString(
    "en-US",
    {
      month: "long",
      day: "numeric",
      year: "numeric",
    }
  );
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 45,
    paddingBottom: 50,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },

  backButton: {
    width: 42,
    height: 42,
    justifyContent: "center",
  },

  backArrow: {
    fontSize: 34,
    color: "#111827",
  },

  headerTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: "#111827",
  },

  headerSpacer: {
    width: 42,
  },

  loadingBox: {
    alignItems: "center",
    paddingVertical: 10,
  },

  loadingText: {
    marginTop: 8,
    color: "#777",
    fontSize: 13,
  },

  monthHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 5,
  },

  monthButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },

  monthArrow: {
    fontSize: 35,
    color: "#111827",
  },

  monthTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
  },

  todayButton: {
    alignSelf: "center",
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#F0EDFF",
  },

  todayButtonText: {
    color: PURPLE,
    fontWeight: "700",
    fontSize: 13,
  },

  weekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 25,
    marginBottom: 8,
  },

  weekText: {
    width: "14.28%",
    textAlign: "center",
    color: "#777",
    fontSize: 14,
    fontWeight: "500",
  },

  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },

  dayCell: {
    width: "14.28%",
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },

  dayCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },

  selectedDay: {
    backgroundColor: PURPLE,
  },

  todayOutline: {
    borderWidth: 1.5,
    borderColor: PURPLE,
  },

  dayText: {
    fontSize: 15,
    color: "#222",
  },

  selectedDayText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },

  eventDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: PURPLE,
    position: "absolute",
    bottom: 3,
  },

  selectedDateBox: {
    marginTop: 20,
    padding: 15,
    backgroundColor: "#F7F6FF",
    borderRadius: 14,
  },

  selectedDateLabel: {
    fontSize: 12,
    color: "#777",
    marginBottom: 4,
  },

  selectedDateText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
  },

  selectedEventsBox: {
    marginTop: 22,
  },

  upcomingHeader: {
    marginTop: 28,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
  },

  addButton: {
    backgroundColor: PURPLE,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9,
  },

  addButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },

  eventRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },

  eventIcon: {
    width: 48,
    height: 48,
    borderRadius: 13,
    backgroundColor: "#EFEDFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  eventIconText: {
    fontSize: 18,
    color: "#222",
  },

  eventInfo: {
    flex: 1,
  },

  eventTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },

  eventDate: {
    fontSize: 12,
    color: "#777",
    marginTop: 4,
  },

  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFF0F0",
    alignItems: "center",
    justifyContent: "center",
  },

  deleteText: {
    color: "#D33",
    fontSize: 24,
    lineHeight: 25,
  },

  emptyBox: {
    backgroundColor: "#F8F8FA",
    padding: 20,
    borderRadius: 14,
    marginTop: 5,
  },

  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#333",
  },

  emptyText: {
    fontSize: 12,
    color: "#777",
    marginTop: 5,
    lineHeight: 18,
  },

  modalBackground: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },

  modal: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 24,
    paddingBottom: 35,
  },

  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 22,
  },

  modalLabel: {
    fontSize: 13,
    color: "#555",
    marginBottom: 7,
  },

  modalInput: {
    height: 50,
    borderWidth: 1,
    borderColor: "#E1E1E6",
    borderRadius: 11,
    paddingHorizontal: 14,
    fontSize: 15,
    color: "#111827",
    marginBottom: 7,
  },

  dateHint: {
    fontSize: 11,
    color: "#888",
    marginBottom: 18,
  },

  saveButton: {
    height: 50,
    borderRadius: 11,
    backgroundColor: PURPLE,
    alignItems: "center",
    justifyContent: "center",
  },

  disabledButton: {
    opacity: 0.7,
  },

  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  cancelButton: {
    height: 45,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },

  cancelButtonText: {
    color: "#666",
    fontSize: 14,
    fontWeight: "600",
  },
});