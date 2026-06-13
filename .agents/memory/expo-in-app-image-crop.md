---
name: In-app pinch/zoom image cropper in Expo Go
description: How and why the admin photo "adjust to fit the box" cropper is built, and the gotchas.
---

# In-app image adjuster (pinch zoom in/out + drag) for Expo Go

**Why not the OS crop (`ImagePicker` `allowsEditing` + `aspect`):** the native crop
only lets the user zoom *in* — it always fills the crop frame, so you can't zoom *out*
to show a whole tall bottle with padding. Users specifically wanted zoom-out-to-fit, so
a custom adjuster was required.

**Approach:** a Modal with a fixed aspect frame (`overflow:hidden`, white bg). The image
is laid out *contain*-fit initially, then driven by `react-native-gesture-handler`
`Gesture.Simultaneous(Pinch, Pan)` + Reanimated shared values. On confirm,
`react-native-view-shot` `captureRef` snapshots the framed box to a tmp jpg and we upload
that — so the stored image already matches the box (whitespace baked in when zoomed out).
This is more robust than `expo-image-manipulator` because manipulator can only crop a
sub-rectangle; it cannot add letterbox padding for the zoomed-out case.

**Gotchas:**
- `GestureDetector` does NOT work inside a React Native `Modal` unless the modal's own
  content is wrapped in its **own** `GestureHandlerRootView` — the app-root one in
  `_layout.tsx` doesn't cover the modal's separate native view tree.
- `react-native-view-shot` is in Expo Go's bundled native modules (verify the version in
  `expo/bundledNativeModules.json` matches what you install) — no dev build needed.
- Clamp pan/scale translation to `(scaledImg - box)/2` or users drag the image out of
  frame and save a mostly-empty crop.
