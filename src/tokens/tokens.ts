// The same tokens for code that cannot read CSS (canvas scenes, Phaser, charts).
// Values mirror tokens.css (light theme); `cssVar` reads the live value instead
// when the app may have overridden it or switched to dark.

export const color = {
  bg: "#faf7ee",
  surface: "#fffdf7",
  ink: "#123a32",
  muted: "#5c6a63",
  brand: "#154a3f",
  accent: "#e6f1cc",
  focus: "#6f9a3d",
} as const;

/** The fair's game palette (header bar, pixel frames, banners). */
export const game = {
  bar: "#1f4d33",
  barLight: "#2e6b45",
  barDark: "#163926",
  cream: "#fbf6ea",
  lime: "#9bc53d",
  gold: "#e8b83a",
  ink: "#1f3d2b",
  scene: "#e3f0c8",
} as const;

export const font = {
  display: '"Source Serif 4", Georgia, "Times New Roman", serif',
  body: '"DM Sans", system-ui, -apple-system, "Segoe UI", sans-serif',
  pixel: '"Pixelify Sans", "DM Sans", system-ui, sans-serif',
} as const;

export type StatusTone = "success" | "warning" | "review" | "pending" | "info" | "danger";

/** Reads a --tsr- token from the document (falls back when there is no DOM). */
export const cssVar = (name: string, fallback = "") => {
  if (typeof document === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(`--tsr-${name}`).trim();
  return value || fallback;
};
