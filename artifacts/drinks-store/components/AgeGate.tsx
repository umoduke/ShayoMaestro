import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useMemo, useState } from "react";
import {
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useAgeVerification, LEGAL_DRINKING_AGE, calculateAge } from "@/context/AgeVerificationContext";

const ASL_LOGO = require("@/assets/images/asl-logo.webp");

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function AgeGate() {
  const { verify, declined, reset } = useAgeVerification();
  const [day, setDay] = useState("");
  const [month, setMonth] = useState<number | null>(null);
  const [year, setYear] = useState("");
  const [error, setError] = useState("");
  const [showDeclined, setShowDeclined] = useState(false);
  const [underAge, setUnderAge] = useState(false);

  const isValidInput = useMemo(() => {
    const d = parseInt(day, 10);
    const y = parseInt(year, 10);
    return (
      !isNaN(d) &&
      d >= 1 &&
      d <= 31 &&
      month !== null &&
      !isNaN(y) &&
      y >= 1900 &&
      y <= new Date().getFullYear()
    );
  }, [day, month, year]);

  const handleVerify = () => {
    setError("");
    const d = parseInt(day, 10);
    const y = parseInt(year, 10);

    if (!isValidInput || month === null) {
      setError("Please enter a valid date of birth");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    const testDate = new Date(y, month - 1, d);
    if (
      testDate.getFullYear() !== y ||
      testDate.getMonth() !== month - 1 ||
      testDate.getDate() !== d
    ) {
      setError("Please enter a valid date of birth");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (testDate > new Date()) {
      setError("Date of birth cannot be in the future");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    const result = verify(y, month, d);
    if (!result.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setUnderAge(true);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleDeclined = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setShowDeclined(true);
  };

  // Underage rejection screen
  if (underAge) {
    return (
      <View style={styles.container}>
        <View style={styles.rejectedContainer}>
          <View style={styles.rejectedIcon}>
            <Feather name="x-circle" size={56} color="#e74c3c" />
          </View>
          <Text style={styles.rejectedTitle}>We're sorry</Text>
          <Text style={styles.rejectedText}>
            You must be at least {LEGAL_DRINKING_AGE} years old to access this site.
          </Text>
          <Text style={styles.rejectedSubtext}>
            The sale of alcoholic beverages to persons under {LEGAL_DRINKING_AGE} is
            prohibited by Nigerian law.
          </Text>
          <Pressable
            style={styles.tryAgainBtn}
            onPress={() => {
              setUnderAge(false);
              setDay("");
              setMonth(null);
              setYear("");
              reset();
            }}
          >
            <Text style={styles.tryAgainText}>Re-enter date of birth</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // User declined
  if (showDeclined) {
    return (
      <View style={styles.container}>
        <View style={styles.rejectedContainer}>
          <View style={styles.rejectedIcon}>
            <Feather name="alert-triangle" size={56} color="#e6a817" />
          </View>
          <Text style={styles.rejectedTitle}>Access restricted</Text>
          <Text style={styles.rejectedText}>
            This site is for adults of legal drinking age only.
          </Text>
          <Text style={styles.rejectedSubtext}>
            You must be {LEGAL_DRINKING_AGE} or older to enter.
          </Text>
          <Pressable
            style={styles.tryAgainBtn}
            onPress={() => setShowDeclined(false)}
          >
            <Text style={styles.tryAgainText}>Go back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#0d0b08" }}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Image source={ASL_LOGO} style={styles.logo} resizeMode="contain" />

      <Text style={styles.title}>Age Verification</Text>
      <View style={styles.goldBar} />
      <Text style={styles.subtitle}>
        Welcome to Authentic Shayo Lockerr — premium spirits, responsibly served.
      </Text>
      <Text style={styles.legalText}>
        Please confirm your date of birth. You must be at least{" "}
        <Text style={{ color: "#d4a843", fontWeight: "700" }}>
          {LEGAL_DRINKING_AGE} years old
        </Text>{" "}
        to enter.
      </Text>

      {/* DOB Input */}
      <View style={styles.dobRow}>
        <View style={[styles.dobField, { flex: 0.7 }]}>
          <Text style={styles.dobLabel}>Day</Text>
          <TextInput
            style={styles.dobInput}
            placeholder="DD"
            placeholderTextColor="#6a5d44"
            keyboardType="number-pad"
            maxLength={2}
            value={day}
            onChangeText={(t) => {
              setDay(t.replace(/[^0-9]/g, ""));
              setError("");
            }}
          />
        </View>
        <View style={[styles.dobField, { flex: 1.4 }]}>
          <Text style={styles.dobLabel}>Month</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.monthScroll}
          >
            {MONTHS.map((m, idx) => {
              const isActive = month === idx + 1;
              return (
                <Pressable
                  key={m}
                  onPress={() => {
                    setMonth(idx + 1);
                    setError("");
                  }}
                  style={[
                    styles.monthChip,
                    isActive && { backgroundColor: "#d4a843", borderColor: "#d4a843" },
                  ]}
                >
                  <Text
                    style={[
                      styles.monthChipText,
                      isActive && { color: "#0d0b08", fontWeight: "800" },
                    ]}
                  >
                    {m}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
        <View style={[styles.dobField, { flex: 0.9 }]}>
          <Text style={styles.dobLabel}>Year</Text>
          <TextInput
            style={styles.dobInput}
            placeholder="YYYY"
            placeholderTextColor="#6a5d44"
            keyboardType="number-pad"
            maxLength={4}
            value={year}
            onChangeText={(t) => {
              setYear(t.replace(/[^0-9]/g, ""));
              setError("");
            }}
          />
        </View>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {/* Enter button */}
      <Pressable
        onPress={handleVerify}
        disabled={!isValidInput}
        style={[
          styles.enterBtn,
          { opacity: isValidInput ? 1 : 0.4 },
        ]}
      >
        <Text style={styles.enterBtnText}>Enter Site</Text>
        <Feather name="arrow-right" size={18} color="#0d0b08" />
      </Pressable>

      <Pressable onPress={handleDeclined} style={styles.declineBtn}>
        <Text style={styles.declineText}>I am under {LEGAL_DRINKING_AGE}</Text>
      </Pressable>

      <View style={styles.disclaimer}>
        <Feather name="info" size={12} color="#6a5d44" />
        <Text style={styles.disclaimerText}>
          By entering, you confirm you are of legal drinking age and agree to drink
          responsibly. Please don't drink and drive.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#0d0b08",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 48,
    gap: 12,
  },
  logo: {
    width: 200,
    height: 200,
    marginBottom: 8,
  },
  title: {
    color: "#f5e6c8",
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  goldBar: {
    width: 48,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#d4a843",
    marginVertical: 4,
  },
  subtitle: {
    color: "#9a8a6c",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 360,
  },
  legalText: {
    color: "#c9b88e",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
    marginTop: 8,
    marginBottom: 16,
    maxWidth: 360,
  },
  dobRow: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
    maxWidth: 420,
    alignItems: "flex-start",
  },
  dobField: {
    gap: 6,
  },
  dobLabel: {
    color: "#9a8a6c",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    paddingLeft: 4,
  },
  dobInput: {
    backgroundColor: "#1a1610",
    borderColor: "#3a3022",
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 14,
    color: "#f5e6c8",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  monthScroll: {
    backgroundColor: "#1a1610",
    borderColor: "#3a3022",
    borderWidth: 1,
    borderRadius: 10,
    padding: 6,
    height: 52,
  },
  monthChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: "#3a3022",
    marginRight: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  monthChipText: {
    color: "#9a8a6c",
    fontSize: 12,
    fontWeight: "600",
  },
  error: {
    color: "#e74c3c",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 4,
  },
  enterBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#d4a843",
    paddingVertical: 16,
    paddingHorizontal: 36,
    borderRadius: 100,
    marginTop: 20,
    width: "100%",
    maxWidth: 320,
  },
  enterBtnText: {
    color: "#0d0b08",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  declineBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  declineText: {
    color: "#9a8a6c",
    fontSize: 14,
    textDecorationLine: "underline",
  },
  disclaimer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginTop: 20,
    paddingHorizontal: 16,
    maxWidth: 420,
  },
  disclaimerText: {
    color: "#6a5d44",
    fontSize: 11,
    lineHeight: 16,
    flex: 1,
    textAlign: "center",
  },
  rejectedContainer: {
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 24,
    maxWidth: 420,
  },
  rejectedIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#e74c3c18",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  rejectedTitle: {
    color: "#f5e6c8",
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  rejectedText: {
    color: "#c9b88e",
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
  },
  rejectedSubtext: {
    color: "#9a8a6c",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
    marginTop: 4,
  },
  tryAgainBtn: {
    marginTop: 24,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: "#d4a843",
  },
  tryAgainText: {
    color: "#d4a843",
    fontSize: 14,
    fontWeight: "700",
  },
});
