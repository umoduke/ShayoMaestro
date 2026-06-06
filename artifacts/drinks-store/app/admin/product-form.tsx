import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Platform,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

import { useColors } from "@/hooks/useColors";
import { useProducts } from "@/context/ProductsContext";
import { useAuth } from "@/context/AuthContext";
import { DrinkCategory, CATEGORIES } from "@/data/drinks";
import { ProductImage } from "@/components/ProductImage";

const COLOR_OPTIONS = [
  { label: "Dark Navy", value: "#1a3040" },
  { label: "Dark Amber", value: "#3d2810" },
  { label: "Near Black", value: "#1a0d00" },
  { label: "Dark Blue", value: "#0d1a2a" },
  { label: "Dark Green", value: "#0d2010" },
  { label: "Dark Purple", value: "#1a0d2a" },
];

const ACCENT_OPTIONS = [
  { label: "Sky Blue", value: "#5ba3c9" },
  { label: "Gold", value: "#d4a843" },
  { label: "Amber", value: "#c9963a" },
  { label: "Steel Blue", value: "#4a90c8" },
  { label: "Emerald", value: "#27ae60" },
  { label: "Coral", value: "#e74c3c" },
];

type FieldProps = {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: any;
  error?: string;
  errorKey?: string;
  colors: ReturnType<typeof useColors>;
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
};

// Defined at module scope (NOT inside the screen component) so its identity is
// stable across renders. A component defined inside render is recreated on every
// keystroke, which remounts the TextInput and dismisses the keyboard.
const Field = React.memo(function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType,
  error,
  errorKey,
  colors,
  setErrors,
}: FieldProps) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>
      <TextInput
        style={[
          styles.input,
          multiline && styles.multilineInput,
          {
            backgroundColor: colors.secondary,
            borderColor: error ? colors.destructive : colors.border,
            borderRadius: colors.radius,
            color: colors.foreground,
          },
        ]}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        value={value}
        onChangeText={(t) => {
          onChangeText(t);
          if (error && errorKey)
            setErrors((prev) => ({ ...prev, [errorKey]: "" }));
        }}
        multiline={multiline}
        keyboardType={keyboardType}
        autoCapitalize="sentences"
      />
      {error ? (
        <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text>
      ) : null}
    </View>
  );
});

export default function ProductFormScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { addProduct, updateProduct, getProductById } = useProducts();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const isEditing = !!id;
  const existing = id ? getProductById(id) : null;

  const [name, setName] = useState(existing?.name ?? "");
  const [shortName, setShortName] = useState(existing?.shortName ?? "");
  const [category, setCategory] = useState<DrinkCategory>(existing?.category ?? "tequila");
  const [price, setPrice] = useState(existing?.price?.toString() ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [shortDesc, setShortDesc] = useState(existing?.shortDescription ?? "");
  const [imageUri, setImageUri] = useState(existing?.imageUri ?? "");
  const [origin, setOrigin] = useState(existing?.origin ?? "");
  const [abv, setAbv] = useState(existing?.abv ?? "");
  const [tags, setTags] = useState(existing?.tags?.join(", ") ?? "");
  const [imageColor, setImageColor] = useState(existing?.imageColor ?? "#1a3040");
  const [accentColor, setAccentColor] = useState(existing?.accentColor ?? "#d4a843");
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!user?.isAdmin) {
    router.replace("/(tabs)" as any);
    return null;
  }

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Product name is required";
    if (!price.trim() || isNaN(Number(price))) e.price = "Valid price is required";
    if (!description.trim()) e.description = "Description is required";
    return e;
  };

  const handleSave = async () => {
    const e = validate();
    if (Object.keys(e).length > 0) {
      setErrors(e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    const productData = {
      name: name.trim(),
      shortName: shortName.trim() || name.trim().split(" ").slice(0, 3).join(" "),
      category,
      price: parseFloat(price),
      currency: "₦",
      rating: existing?.rating ?? 4.5,
      reviewCount: existing?.reviewCount ?? 0,
      description: description.trim(),
      shortDescription: shortDesc.trim() || description.trim().slice(0, 120),
      ingredients: existing?.ingredients ?? [],
      sizes: existing?.sizes ?? [{ label: "750ml", price: parseFloat(price) }],
      imageUri: imageUri.trim(),
      imageColor,
      accentColor,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      origin: origin.trim() || undefined,
      abv: abv.trim() || undefined,
      featured: existing?.featured ?? false,
    };

    if (isEditing && id) {
      await updateProduct(id, productData);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      await addProduct(productData);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={[
          styles.header,
          { paddingTop: topInset + 16, borderBottomColor: colors.border },
        ]}
      >
        <Pressable onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>
          {isEditing ? "Edit Product" : "Add Product"}
        </Text>
        <Pressable
          onPress={handleSave}
          style={[styles.saveBtn, { backgroundColor: colors.primary, borderRadius: 100 }]}
        >
          <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>Save</Text>
        </Pressable>
      </View>

      <KeyboardAwareScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: bottomInset + 80 }}
        bottomOffset={20}
        keyboardShouldPersistTaps="handled"
      >
        <Field
          colors={colors}
          setErrors={setErrors}
          label="Product Name"
          value={name}
          onChangeText={setName}
          placeholder="e.g. Clase Azul Reposado Tequila"
          error={errors.name}
          errorKey="name"
        />
        <Field
          colors={colors}
          setErrors={setErrors}
          label="Short Name (optional)"
          value={shortName}
          onChangeText={setShortName}
          placeholder="e.g. Clase Azul Reposado"
        />

        {/* Category */}
        <View style={{ gap: 8 }}>
          <Text style={[styles.label, { color: colors.foreground }]}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {CATEGORIES.filter((c) => c.id !== "all").map((cat) => (
                <Pressable
                  key={cat.id}
                  onPress={() => setCategory(cat.id)}
                  style={[
                    styles.catChip,
                    {
                      backgroundColor:
                        category === cat.id ? colors.primary : colors.secondary,
                      borderColor:
                        category === cat.id ? colors.primary : colors.border,
                      borderRadius: 100,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.catChipText,
                      {
                        color:
                          category === cat.id
                            ? colors.primaryForeground
                            : colors.foreground,
                        fontWeight: category === cat.id ? "700" : "500",
                      },
                    ]}
                  >
                    {cat.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>

        <Field
          colors={colors}
          setErrors={setErrors}
          label="Price (₦)"
          value={price}
          onChangeText={setPrice}
          placeholder="e.g. 116000"
          keyboardType="numeric"
          error={errors.price}
          errorKey="price"
        />

        <Field
          colors={colors}
          setErrors={setErrors}
          label="Description"
          value={description}
          onChangeText={setDescription}
          placeholder="Full product description..."
          multiline
          error={errors.description}
          errorKey="description"
        />

        <Field
          colors={colors}
          setErrors={setErrors}
          label="Short Description (optional)"
          value={shortDesc}
          onChangeText={setShortDesc}
          placeholder="Brief one-line description..."
          multiline
        />

        <Field
          colors={colors}
          setErrors={setErrors}
          label="Image URL (optional)"
          value={imageUri}
          onChangeText={setImageUri}
          placeholder="https://example.com/bottle.webp"
          keyboardType="url"
        />
        {imageUri ? (
          <View
            style={{
              marginTop: 8,
              padding: 12,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: imageColor + "18",
              alignItems: "center",
            }}
          >
            <ProductImage
              id={isEditing && id ? id : "preview"}
              imageUri={imageUri}
              name={name || "Product"}
              accentColor={accentColor}
              style={{ width: 120, height: 140 }}
              containerStyle={{ width: 120, height: 140, borderRadius: 8 }}
              resizeMode="contain"
            />
            <Text style={[styles.hint, { color: colors.mutedForeground, marginTop: 6 }]}>
              Live preview — if you see a placeholder, the URL didn't load
            </Text>
          </View>
        ) : (
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>
            No image URL — a placeholder with the accent color will be shown
          </Text>
        )}

        <Field
          colors={colors}
          setErrors={setErrors}
          label="Origin (optional)"
          value={origin}
          onChangeText={setOrigin}
          placeholder="e.g. Jalisco, Mexico"
        />
        <Field
          colors={colors}
          setErrors={setErrors}
          label="ABV (optional)"
          value={abv}
          onChangeText={setAbv}
          placeholder="e.g. 40%"
        />
        <Field
          colors={colors}
          setErrors={setErrors}
          label="Tags (comma-separated, optional)"
          value={tags}
          onChangeText={setTags}
          placeholder="e.g. premium, bestseller, luxury"
        />

        {/* Image background color */}
        <View style={{ gap: 8 }}>
          <Text style={[styles.label, { color: colors.foreground }]}>Card Background Color</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {COLOR_OPTIONS.map((c) => (
              <Pressable
                key={c.value}
                onPress={() => setImageColor(c.value)}
                style={[
                  styles.colorChip,
                  { backgroundColor: c.value },
                  imageColor === c.value && styles.colorChipSelected,
                ]}
              >
                {imageColor === c.value && (
                  <Feather name="check" size={14} color="#fff" />
                )}
              </Pressable>
            ))}
          </View>
        </View>

        {/* Accent color */}
        <View style={{ gap: 8 }}>
          <Text style={[styles.label, { color: colors.foreground }]}>Accent Color</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {ACCENT_OPTIONS.map((c) => (
              <Pressable
                key={c.value}
                onPress={() => setAccentColor(c.value)}
                style={[
                  styles.colorChip,
                  { backgroundColor: c.value },
                  accentColor === c.value && styles.colorChipSelected,
                ]}
              >
                {accentColor === c.value && (
                  <Feather name="check" size={14} color="#fff" />
                )}
              </Pressable>
            ))}
          </View>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  title: { flex: 1, fontSize: 18, fontWeight: "800" },
  saveBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  saveBtnText: { fontSize: 14, fontWeight: "700" },
  label: { fontSize: 14, fontWeight: "600" },
  input: { padding: 14, fontSize: 15, borderWidth: 1 },
  multilineInput: { minHeight: 90, textAlignVertical: "top" },
  error: { fontSize: 12 },
  hint: { fontSize: 12, marginTop: -10 },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
  },
  catChipText: { fontSize: 13 },
  colorChip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  colorChipSelected: {
    borderWidth: 3,
    borderColor: "#fff",
  },
});
