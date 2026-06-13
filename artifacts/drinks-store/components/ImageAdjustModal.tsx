import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { captureRef } from "react-native-view-shot";
import { useColors } from "@/hooks/useColors";

interface ImageAdjustModalProps {
  visible: boolean;
  uri: string | null;
  /** width : height, e.g. 4/5 for an upright bottle frame */
  aspectRatio?: number;
  onCancel: () => void;
  onConfirm: (croppedUri: string) => void;
}

const MIN_SCALE = 0.5;
const MAX_SCALE = 4;

function clamp(value: number, min: number, max: number) {
  "worklet";
  return Math.min(Math.max(value, min), max);
}

export function ImageAdjustModal({
  visible,
  uri,
  aspectRatio = 4 / 5,
  onCancel,
  onConfirm,
}: ImageAdjustModalProps) {
  const colors = useColors();
  const { width: screenW } = useWindowDimensions();

  const boxW = Math.min(screenW - 48, 320);
  const boxH = boxW / aspectRatio;

  const captureBoxRef = useRef<View>(null);
  const [baseSize, setBaseSize] = useState<{ w: number; h: number } | null>(
    null,
  );
  const [saving, setSaving] = useState(false);

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);

  const resetTransforms = () => {
    scale.value = 1;
    savedScale.value = 1;
    translateX.value = 0;
    translateY.value = 0;
    savedX.value = 0;
    savedY.value = 0;
  };

  useEffect(() => {
    if (!visible || !uri) return;
    resetTransforms();
    setBaseSize(null);
    Image.getSize(
      uri,
      (w, h) => {
        const imgRatio = w / h;
        const boxRatio = boxW / boxH;
        // Initially fit the whole image inside the box (contain), so the admin
        // sees everything and can then pinch to zoom in / drag to reposition.
        if (imgRatio > boxRatio) {
          setBaseSize({ w: boxW, h: boxW / imgRatio });
        } else {
          setBaseSize({ w: boxH * imgRatio, h: boxH });
        }
      },
      () => setBaseSize({ w: boxW, h: boxH }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, uri]);

  const bw = baseSize?.w ?? 0;
  const bh = baseSize?.h ?? 0;

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = clamp(savedScale.value * e.scale, MIN_SCALE, MAX_SCALE);
      // Re-clamp position so zooming out never leaves the image partly outside
      // the frame.
      const maxX = Math.max(0, (bw * scale.value - boxW) / 2);
      const maxY = Math.max(0, (bh * scale.value - boxH) / 2);
      translateX.value = clamp(translateX.value, -maxX, maxX);
      translateY.value = clamp(translateY.value, -maxY, maxY);
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      savedX.value = translateX.value;
      savedY.value = translateY.value;
    });

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      // Only let the image move as far as its scaled edges, so it always covers
      // the frame when zoomed in (no accidental empty/white crops).
      const maxX = Math.max(0, (bw * scale.value - boxW) / 2);
      const maxY = Math.max(0, (bh * scale.value - boxH) / 2);
      translateX.value = clamp(savedX.value + e.translationX, -maxX, maxX);
      translateY.value = clamp(savedY.value + e.translationY, -maxY, maxY);
    })
    .onEnd(() => {
      savedX.value = translateX.value;
      savedY.value = translateY.value;
    });

  const composed = Gesture.Simultaneous(pinch, pan);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const handleConfirm = async () => {
    if (!captureBoxRef.current) return;
    try {
      setSaving(true);
      const result = await captureRef(captureBoxRef, {
        format: "jpg",
        quality: 0.92,
        result: "tmpfile",
      });
      onConfirm(result);
    } catch {
      onCancel();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onCancel}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View
          style={{
            flex: 1,
            backgroundColor: colors.background,
            paddingTop: 56,
            paddingHorizontal: 24,
            alignItems: "center",
          }}
        >
          <Text
            style={{
              fontSize: 20,
              fontWeight: "800",
              color: colors.foreground,
              marginBottom: 4,
            }}
          >
            Adjust Photo
          </Text>
          <Text
            style={{
              fontSize: 13,
              color: colors.mutedForeground,
              textAlign: "center",
              marginBottom: 20,
            }}
          >
            Pinch to zoom in or out, drag to position. The area inside the frame
            is what customers see.
          </Text>

          <View
            ref={captureBoxRef}
            collapsable={false}
            style={{
              width: boxW,
              height: boxH,
              borderRadius: 12,
              overflow: "hidden",
              backgroundColor: "#ffffff",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {uri && baseSize ? (
              <GestureDetector gesture={composed}>
                <Animated.Image
                  source={{ uri }}
                  resizeMode="contain"
                  style={[
                    { width: baseSize.w, height: baseSize.h },
                    animatedStyle,
                  ]}
                />
              </GestureDetector>
            ) : (
              <ActivityIndicator color={colors.primary} />
            )}
          </View>

          <View
            style={{
              flexDirection: "row",
              gap: 12,
              marginTop: 28,
              width: boxW,
            }}
          >
            <Pressable
              onPress={onCancel}
              disabled={saving}
              style={{
                flex: 1,
                paddingVertical: 14,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.border,
                alignItems: "center",
              }}
            >
              <Text style={{ color: colors.foreground, fontWeight: "700" }}>
                Cancel
              </Text>
            </Pressable>
            <Pressable
              onPress={handleConfirm}
              disabled={saving || !baseSize}
              style={{
                flex: 1,
                paddingVertical: 14,
                borderRadius: 12,
                backgroundColor: colors.primary,
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "center",
                gap: 8,
                opacity: saving || !baseSize ? 0.6 : 1,
              }}
            >
              {saving ? (
                <ActivityIndicator color={colors.primaryForeground} size="small" />
              ) : (
                <Feather
                  name="check"
                  size={18}
                  color={colors.primaryForeground}
                />
              )}
              <Text
                style={{ color: colors.primaryForeground, fontWeight: "800" }}
              >
                {saving ? "Saving…" : "Use Photo"}
              </Text>
            </Pressable>
          </View>

          <Pressable
            onPress={resetTransforms}
            disabled={saving}
            style={{
              marginTop: 16,
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Feather name="refresh-ccw" size={14} color={colors.mutedForeground} />
            <Text style={{ color: colors.mutedForeground, fontWeight: "600" }}>
              Reset
            </Text>
          </Pressable>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}
