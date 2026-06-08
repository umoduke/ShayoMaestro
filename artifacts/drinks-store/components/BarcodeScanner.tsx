import { Feather } from "@expo/vector-icons";
import {
  CameraView,
  useCameraPermissions,
  type BarcodeScanningResult,
} from "expo-camera";
import React, { useEffect, useRef, useState } from "react";
import {
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

// Kept focused on the codes actually found on bottles/cartons. Feeding the
// decoder fewer types makes it noticeably faster and more reliable at locking
// onto a small retail barcode (e.g. the EAN-13 on a Hennessy bottle).
const BARCODE_TYPES = [
  "qr",
  "ean13",
  "ean8",
  "upc_a",
  "upc_e",
  "code128",
  "datamatrix",
] as const;

type Props = {
  visible: boolean;
  onClose: () => void;
  onScanned: (data: string, type: string) => void;
};

export function BarcodeScanner({ visible, onClose, onScanned }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [manual, setManual] = useState("");
  const [torch, setTorch] = useState(false);
  const [mountError, setMountError] = useState<string | null>(null);
  // Guard so a single physical scan fires the callback only once. Re-armed only
  // on the closed -> open transition, never during render, so a burst of camera
  // frames after the first hit cannot fire the callback again.
  const scanned = useRef(false);

  useEffect(() => {
    if (visible) {
      scanned.current = false;
      setTorch(false);
      setMountError(null);
    }
  }, [visible]);

  const handleClose = () => {
    scanned.current = false;
    setTorch(false);
    setManual("");
    onClose();
  };

  const handleScanned = (result: BarcodeScanningResult) => {
    if (scanned.current) return;
    scanned.current = true;
    onScanned(result.data, result.type);
    setManual("");
  };

  const submitManual = () => {
    const value = manual.trim();
    if (!value) return;
    setManual("");
    onScanned(value, "manual");
  };

  const isWeb = Platform.OS === "web";

  const renderBody = () => {
    if (isWeb) {
      return (
        <View style={styles.centered}>
          <Feather name="smartphone" size={48} color={colors.mutedForeground} />
          <Text style={[styles.infoTitle, { color: colors.foreground }]}>
            Camera scanning runs on the mobile app
          </Text>
          <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
            Open the app on your phone to scan a barcode, or enter the code
            manually below.
          </Text>
          <ManualEntry
            value={manual}
            onChange={setManual}
            onSubmit={submitManual}
            colors={colors}
          />
        </View>
      );
    }

    if (!permission) {
      return (
        <View style={styles.centered}>
          <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
            Preparing camera…
          </Text>
        </View>
      );
    }

    if (!permission.granted) {
      const blocked = permission.status === "denied" && !permission.canAskAgain;
      return (
        <View style={styles.centered}>
          <Feather name="camera-off" size={48} color={colors.mutedForeground} />
          <Text style={[styles.infoTitle, { color: colors.foreground }]}>
            Camera access needed
          </Text>
          <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
            We use the camera to scan barcodes and QR codes on bottles and
            cartons.
          </Text>
          <Pressable
            onPress={() =>
              blocked ? Linking.openSettings() : requestPermission()
            }
            style={[
              styles.primaryBtn,
              { backgroundColor: colors.primary, borderRadius: 100 },
            ]}
          >
            <Text
              style={[styles.primaryBtnText, { color: colors.primaryForeground }]}
            >
              {blocked ? "Open Settings" : "Allow Camera"}
            </Text>
          </Pressable>
          <ManualEntry
            value={manual}
            onChange={setManual}
            onSubmit={submitManual}
            colors={colors}
          />
        </View>
      );
    }

    if (mountError) {
      return (
        <View style={styles.centered}>
          <Feather name="alert-triangle" size={48} color={colors.mutedForeground} />
          <Text style={[styles.infoTitle, { color: colors.foreground }]}>
            Camera couldn&apos;t start
          </Text>
          <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
            {mountError}. Close and reopen the scanner, or enter the code
            manually below.
          </Text>
          <ManualEntry
            value={manual}
            onChange={setManual}
            onSubmit={submitManual}
            colors={colors}
          />
        </View>
      );
    }

    return (
      <View style={{ flex: 1 }}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={torch}
          barcodeScannerSettings={{ barcodeTypes: [...BARCODE_TYPES] }}
          onBarcodeScanned={handleScanned}
          onMountError={(e) =>
            setMountError(e?.message ?? "The camera failed to start")
          }
        />
        <View style={styles.overlay} pointerEvents="none">
          <View style={[styles.reticle, { borderColor: colors.primary }]} />
          <Text style={styles.overlayText}>
            Fill the frame with the barcode or QR code
          </Text>
          <Text style={styles.overlayHint}>
            Hold steady ~15cm away in good light. Tap the flash if it&apos;s dim.
          </Text>
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
    >
      <View style={{ flex: 1, backgroundColor: "#000" }}>
        <View
          style={[
            styles.header,
            { paddingTop: insets.top + 12, backgroundColor: "#000" },
          ]}
        >
          <Pressable onPress={handleClose} hitSlop={12}>
            <Feather name="x" size={26} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>Scan Product</Text>
          {!isWeb && permission?.granted && !mountError ? (
            <Pressable onPress={() => setTorch((t) => !t)} hitSlop={12}>
              <Feather
                name={torch ? "zap" : "zap-off"}
                size={24}
                color={torch ? colors.primary : "#fff"}
              />
            </Pressable>
          ) : (
            <View style={{ width: 26 }} />
          )}
        </View>
        {renderBody()}
      </View>
    </Modal>
  );
}

function ManualEntry({
  value,
  onChange,
  onSubmit,
  colors,
}: {
  value: string;
  onChange: (t: string) => void;
  onSubmit: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.manualWrap}>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="Enter code manually"
        placeholderTextColor={colors.mutedForeground}
        autoCapitalize="characters"
        autoCorrect={false}
        onSubmitEditing={onSubmit}
        returnKeyType="done"
        style={[
          styles.manualInput,
          {
            backgroundColor: colors.secondary,
            borderColor: colors.border,
            borderRadius: colors.radius,
            color: colors.foreground,
          },
        ]}
      />
      <Pressable
        onPress={onSubmit}
        style={[
          styles.manualBtn,
          { backgroundColor: colors.primary, borderRadius: colors.radius },
        ]}
      >
        <Text style={{ color: colors.primaryForeground, fontWeight: "700" }}>
          Use
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerTitle: { color: "#fff", fontSize: 17, fontWeight: "700" },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 14,
    backgroundColor: "#000",
  },
  infoTitle: { fontSize: 18, fontWeight: "700", textAlign: "center" },
  infoText: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  primaryBtn: { paddingHorizontal: 28, paddingVertical: 13, marginTop: 4 },
  primaryBtnText: { fontSize: 15, fontWeight: "700" },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
  },
  reticle: {
    width: 240,
    height: 240,
    borderWidth: 3,
    borderRadius: 24,
    backgroundColor: "transparent",
  },
  overlayText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowRadius: 6,
  },
  overlayHint: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
    textAlign: "center",
    paddingHorizontal: 32,
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowRadius: 6,
  },
  manualWrap: {
    flexDirection: "row",
    gap: 8,
    width: "100%",
    maxWidth: 360,
    marginTop: 8,
  },
  manualInput: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  manualBtn: {
    paddingHorizontal: 18,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
});
