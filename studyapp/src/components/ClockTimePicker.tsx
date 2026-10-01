import React, { useEffect, useState } from "react";
import {
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

// Try native Android DateTimePicker
let NativeDateTimePicker: any = null;
try {
  NativeDateTimePicker = require("@react-native-community/datetimepicker").default;
} catch {
  NativeDateTimePicker = null;
}

interface ClockTimePickerProps {
  visible: boolean;
  initialTime?: string;
  title?: string;
  onConfirm: (formattedTime: string) => void;
  onCancel: () => void;
}

export const ClockTimePicker: React.FC<ClockTimePickerProps> = ({
  visible,
  initialTime = "9:00 AM",
  onConfirm,
  onCancel,
}) => {
  const [hour, setHour] = useState(9);
  const [minute, setMinute] = useState(0);
  const [period, setPeriod] = useState<"AM" | "PM">("AM");
  const [mode, setMode] = useState<"hour" | "minute">("hour");
  const [keyboardMode, setKeyboardMode] = useState(false);
  const [manualText, setManualText] = useState("");
  const [showNative, setShowNative] = useState(false);

  useEffect(() => {
    if (visible && initialTime) {
      const parts = initialTime.trim().split(" ");
      const timeParts = (parts[0] || "9:00").split(":");
      const h = parseInt(timeParts[0], 10) || 9;
      const m = parseInt(timeParts[1], 10) || 0;
      const p = parts[1]?.toUpperCase() === "PM" ? "PM" : "AM";

      setHour(h);
      setMinute(m);
      setPeriod(p);
      setMode("hour");
      setKeyboardMode(false);
      setManualText(`${h}:${m < 10 ? "0" + m : m} ${p}`);

      if (Platform.OS === "android" && NativeDateTimePicker) {
        setShowNative(true);
      } else {
        setShowNative(false);
      }
    }
  }, [visible, initialTime]);

  const handleNativeChange = (_event: any, selectedDate?: Date) => {
    setShowNative(false);
    if (!selectedDate) {
      onCancel();
      return;
    }

    let h = selectedDate.getHours();
    const m = selectedDate.getMinutes();
    const p = h >= 12 ? "PM" : "AM";
    h = h % 12;
    if (h === 0) h = 12;

    const formatted = `${h}:${m < 10 ? "0" + m : m} ${p}`;
    onConfirm(formatted);
  };

  const handleConfirmCustom = () => {
    if (keyboardMode && manualText.trim()) {
      onConfirm(manualText.trim());
      return;
    }
    const formatted = `${hour}:${minute < 10 ? "0" + minute : minute} ${period}`;
    onConfirm(formatted);
  };

  if (!visible) return null;

  if (showNative && NativeDateTimePicker) {
    return (
      <NativeDateTimePicker
        value={new Date()}
        mode="time"
        is24Hour={false}
        display="clock"
        onChange={handleNativeChange}
      />
    );
  }

  const hoursList = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const minutesList = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Top Teal Header matching gdhgh.jpeg */}
          <View style={styles.header}>
            <View style={styles.timeDisplay}>
              <TouchableOpacity onPress={() => setMode("hour")}>
                <Text
                  style={[
                    styles.timeText,
                    mode === "hour" && styles.timeTextSelected,
                  ]}
                >
                  {hour}
                </Text>
              </TouchableOpacity>

              <Text style={styles.timeColon}>:</Text>

              <TouchableOpacity onPress={() => setMode("minute")}>
                <Text
                  style={[
                    styles.timeText,
                    mode === "minute" && styles.timeTextSelected,
                  ]}
                >
                  {minute < 10 ? "0" + minute : minute}
                </Text>
              </TouchableOpacity>

              <View style={styles.periodCol}>
                <TouchableOpacity onPress={() => setPeriod("AM")}>
                  <Text
                    style={[
                      styles.periodText,
                      period === "AM" && styles.periodTextActive,
                    ]}
                  >
                    AM
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setPeriod("PM")}>
                  <Text
                    style={[
                      styles.periodText,
                      period === "PM" && styles.periodTextActive,
                    ]}
                  >
                    PM
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Body: Clock Face Dial or Keyboard Entry */}
          {keyboardMode ? (
            <View style={styles.keyboardWrap}>
              <Text style={styles.keyboardLabel}>Enter time (e.g. 09:30 AM):</Text>
              <TextInput
                style={styles.keyboardInput}
                value={manualText}
                onChangeText={setManualText}
                placeholder="09:00 AM"
                placeholderTextColor="#94A3B8"
              />
            </View>
          ) : (
            <View style={styles.dialWrap}>
              <View style={styles.dialCircle}>
                {mode === "hour"
                  ? hoursList.map((h, i) => {
                      const angle = (i * 30 - 90) * (Math.PI / 180);
                      const radius = 80;
                      const x = Math.round(95 + radius * Math.cos(angle));
                      const y = Math.round(95 + radius * Math.sin(angle));
                      const isSelected = hour === h;

                      return (
                        <TouchableOpacity
                          key={h}
                          style={[
                            styles.numberItem,
                            { left: x - 16, top: y - 16 },
                            isSelected && styles.numberSelected,
                          ]}
                          onPress={() => {
                            setHour(h);
                            setMode("minute"); // auto advance to minute
                          }}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.numberText,
                              isSelected && styles.numberTextSelected,
                            ]}
                          >
                            {h}
                          </Text>
                        </TouchableOpacity>
                      );
                    })
                  : minutesList.map((m, i) => {
                      const angle = (i * 30 - 90) * (Math.PI / 180);
                      const radius = 80;
                      const x = Math.round(95 + radius * Math.cos(angle));
                      const y = Math.round(95 + radius * Math.sin(angle));
                      const isSelected = minute === m;

                      return (
                        <TouchableOpacity
                          key={m}
                          style={[
                            styles.numberItem,
                            { left: x - 16, top: y - 16 },
                            isSelected && styles.numberSelected,
                          ]}
                          onPress={() => setMinute(m)}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.numberText,
                              isSelected && styles.numberTextSelected,
                            ]}
                          >
                            {m < 10 ? "0" + m : m}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}

                {/* Dial Center Pin */}
                <View style={styles.centerPin} />
              </View>
            </View>
          )}

          {/* Footer Actions */}
          <View style={styles.actionsRow}>
            <TouchableOpacity onPress={() => setKeyboardMode(!keyboardMode)}>
              <Ionicons
                name={keyboardMode ? "time-outline" : "keypad-outline"}
                size={22}
                color="#00897B"
              />
            </TouchableOpacity>

            <View style={{ flexDirection: "row", gap: 16 }}>
              <TouchableOpacity onPress={onCancel}>
                <Text style={styles.btnCancel}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleConfirmCustom}>
                <Text style={styles.btnOk}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: 290,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  header: {
    backgroundColor: "#00897B",
    paddingVertical: 18,
    paddingHorizontal: 22,
  },
  timeDisplay: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  timeText: {
    fontSize: 48,
    fontWeight: "300",
    color: "rgba(255, 255, 255, 0.65)",
    letterSpacing: -1,
  },
  timeTextSelected: {
    color: "#FFFFFF",
    fontWeight: "400",
  },
  timeColon: {
    fontSize: 44,
    color: "#FFFFFF",
    marginHorizontal: 4,
    marginTop: -4,
  },
  periodCol: {
    marginLeft: 12,
    gap: 4,
  },
  periodText: {
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.55)",
  },
  periodTextActive: {
    color: "#FFFFFF",
  },
  dialWrap: {
    paddingVertical: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  dialCircle: {
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: "#F1F5F9",
    position: "relative",
  },
  numberItem: {
    position: "absolute",
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  numberSelected: {
    backgroundColor: "#00897B",
  },
  numberText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
  },
  numberTextSelected: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  centerPin: {
    position: "absolute",
    left: 91,
    top: 91,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#00897B",
  },
  keyboardWrap: {
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  keyboardLabel: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 8,
  },
  keyboardInput: {
    width: "100%",
    height: 48,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
    color: "#0F172A",
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
    paddingTop: 6,
  },
  btnCancel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#00897B",
  },
  btnOk: {
    fontSize: 14,
    fontWeight: "700",
    color: "#00897B",
  },
});
