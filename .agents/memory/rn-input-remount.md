---
name: React Native keyboard-dismiss-per-keystroke
description: Why a TextInput loses focus / the keyboard closes after every character in this Expo app, and the fix.
---

Symptom: typing in a form field dismisses the keyboard after each character; the
user must re-tap the field for every keystroke.

Root cause: a component that renders the `TextInput` was **defined inside another
component's render body** (e.g. `const Field = (...) => (...)` inside the screen
function). Each parent re-render (which happens on every keystroke via `setState`)
creates a brand-new component *type*, so React unmounts and remounts the subtree,
destroying the focused `<TextInput>`.

**Fix:** hoist the field/input component to module scope (outside any component) so
its identity is stable across renders. Pass anything it used to close over
(`colors`, state setters like `setErrors`, an `errorKey`) as props. Wrapping in
`React.memo` is fine but the hoist is the essential part — `useCallback` does NOT
fix it because hooks like `useColors()` return a new object each render, making the
dep array unstable.

**How to apply:** Never define a component (especially one containing inputs) inside
render. If you see inputs losing focus, grep the screen for `const X = (...) =>` or
`function X` declared *inside* the default-exported component.
