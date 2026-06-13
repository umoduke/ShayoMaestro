import React, { useState } from "react";
import { Image, Text, View, type ImageStyle, type StyleProp, type ViewStyle } from "react-native";
import { Feather } from "@expo/vector-icons";
import { getProductImage, hasLocalImage } from "@/assets/images/productImages";

interface ProductImageProps {
  id: string;
  imageUri?: string;
  name?: string;
  accentColor?: string;
  style?: StyleProp<ImageStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  resizeMode?: "contain" | "cover" | "stretch" | "center";
}

export function ProductImage({
  id,
  imageUri,
  name,
  accentColor = "#ff6b35",
  style,
  containerStyle,
  resizeMode = "contain",
}: ProductImageProps) {
  const [errored, setErrored] = useState(false);

  const useLocal = hasLocalImage(id);
  const showFallback =
    !useLocal && (errored || !imageUri || imageUri.trim().length === 0);

  if (showFallback) {
    const initial = (name ?? id).trim().charAt(0).toUpperCase() || "?";
    return (
      <View
        style={[
          {
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: accentColor + "22",
          },
          containerStyle,
          style as StyleProp<ViewStyle>,
        ]}
      >
        <Feather name="image" size={28} color={accentColor + "99"} />
        <Text
          style={{
            marginTop: 6,
            fontSize: 28,
            fontWeight: "800",
            color: accentColor,
          }}
        >
          {initial}
        </Text>
      </View>
    );
  }

  return (
    <Image
      source={getProductImage(id, imageUri)}
      style={style}
      resizeMode={resizeMode}
      onError={() => setErrored(true)}
    />
  );
}
