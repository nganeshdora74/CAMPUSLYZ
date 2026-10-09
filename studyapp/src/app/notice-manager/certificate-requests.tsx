import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";

export default function CertificateRequests() {
  const requests = [
    ["Rahul Kumar", "Bonafide Certificate"],
    ["Priya Singh", "Character Certificate"],
    ["Ankit Das", "Transfer Certificate"],
  ];

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>📩 Certificate Requests</Text>

      {requests.map(([student, certificate]) => (
        <View style={styles.card} key={student}>
          <View style={styles.content}>
            <Text style={styles.student}>{student}</Text>
            <Text style={styles.certificate}>{certificate}</Text>
          </View>

          <TouchableOpacity style={styles.approve}>
            <Text style={styles.approveText}>Review</Text>
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FB",
    padding: 16,
  },
  title: {
    fontSize: 27,
    fontWeight: "800",
    marginTop: 45,
    marginBottom: 20,
  },
  card: {
    backgroundColor: "#fff",
    padding: 18,
    borderRadius: 15,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  content: {
    flex: 1,
  },
  student: {
    fontWeight: "800",
  },
  certificate: {
    color: "#667085",
    marginTop: 4,
  },
  approve: {
    backgroundColor: "#6246E5",
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 10,
  },
  approveText: {
    color: "#fff",
    fontWeight: "700",
  },
});