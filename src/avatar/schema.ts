import catalogData from "./catalog.json";

// The avatar belongs to the person's platform account (one per user, reused in
// every store and fair). It stores only catalog IDs and validated colours — never
// images — so a fair room can relay it safely. No choice here ever changes
// permissions, speed or access: it is appearance only.

export type Hex = `#${string}`;
export type Direction = "front" | "right" | "back" | "left";
export type Pose = "stand" | "sit";
export type Motion = "idle" | "walk";

export interface Piece {
  id: string;
  color?: Hex;
}

export interface AvatarProfile {
  v: 2;
  /** Legacy body shape; superseded by `weight` ("broad" reads as weight 1). */
  body: string;
  /** Altura, −2 (muy bajo) … 2 (muy alto). */
  height: number;
  /** Peso, −2 (muy delgado) … 2 (muy robusto). */
  weight: number;
  skin: Hex;
  facial_hair: string;
  hair: { style: string; color: Hex };
  /** Top and bottom together, or a dress instead of both. */
  top: Piece | null;
  bottom: Piece | null;
  dress: Piece | null;
  shoes: Piece;
  bag: Piece | null;
  accessories: Piece[];
  wheelchair: { enabled: boolean; model: string; color: Hex };
}

/** The first Account avatar (October 2026): three enums only. */
export interface AvatarV1 {
  hair?: "short" | "long" | "curly";
  outfit?: "forest" | "earth" | "ocean";
  accessory?: "none" | "bag" | "hat" | "wheelchair";
}

export interface CatalogItem {
  id: string;
  label: string;
  color?: string;
  tint?: boolean;
  group?: string;
}

export interface Proportion {
  min: number;
  max: number;
  labels: string[];
}

export interface Catalog {
  version: number;
  limits: { accessories: number };
  proportions: { height: Proportion; weight: Proportion };
  poses: Pose[];
  directions: Direction[];
  skin_tones: string[];
  hair_colors: string[];
  swatches: string[];
  wheelchair_colors: string[];
  slots: Record<
    "body" | "facial_hair" | "hair" | "top" | "bottom" | "dress" | "shoes" | "bag" | "accessory" | "wheelchair",
    CatalogItem[]
  >;
  examples: { label: string; profile: AvatarProfile }[];
}

export const catalog = catalogData as unknown as Catalog;
export type Slot = keyof Catalog["slots"];

const HEX = /^#[0-9a-f]{6}$/i;
export const isHex = (value: unknown): value is Hex => typeof value === "string" && HEX.test(value);

export const item = (slot: Slot, id: string | undefined | null) =>
  catalog.slots[slot].find((entry) => entry.id === id);

/** The colour a piece is drawn in: its own when the item can be tinted, else the catalog's. */
export const pieceColor = (slot: Slot, piece: Piece | null | undefined): Hex => {
  const entry = item(slot, piece?.id);
  if (entry?.tint !== false && isHex(piece?.color)) return piece!.color!.toLowerCase() as Hex;
  return (entry?.color ?? "#9aa3a6") as Hex;
};

/** The avatar in the approved client-panel sketch: long wavy hair, green jacket, jeans. */
export const DEFAULT_AVATAR: AvatarProfile = {
  v: 2,
  body: "standard",
  height: 0,
  weight: 0,
  skin: "#d8a47b",
  facial_hair: "none",
  hair: { style: "wavy", color: "#47302a" },
  top: { id: "jacket", color: "#3f7a4a" },
  bottom: { id: "jeans", color: "#33507a" },
  dress: null,
  shoes: { id: "sneakers", color: "#f4f1ea" },
  bag: null,
  accessories: [],
  wheelchair: { enabled: false, model: "classic", color: "#2b2f36" },
};

const OUTFITS: Record<NonNullable<AvatarV1["outfit"]>, Pick<AvatarProfile, "top" | "bottom">> = {
  forest: { top: { id: "jacket", color: "#3f7a4a" }, bottom: { id: "jeans", color: "#33507a" } },
  earth: { top: { id: "sweater", color: "#9c6a3f" }, bottom: { id: "trousers", color: "#5a4632" } },
  ocean: { top: { id: "tee", color: "#346477" }, bottom: { id: "jeans", color: "#33507a" } },
};

/** Maps a first-version avatar onto version 2, keeping what the person chose. */
export const migrateV1 = (old: AvatarV1): AvatarProfile => {
  const outfit = OUTFITS[old.outfit ?? "forest"] ?? OUTFITS.forest;
  const hair = old.hair === "long" ? "wavy" : old.hair === "curly" ? "curly" : "short";
  return {
    ...DEFAULT_AVATAR,
    hair: { style: hair, color: DEFAULT_AVATAR.hair.color },
    ...outfit,
    dress: null,
    bag: old.accessory === "bag" ? { id: "crossbody", color: "#8a5a33" } : null,
    accessories: old.accessory === "hat" ? [{ id: "hat" }] : [],
    wheelchair: { ...DEFAULT_AVATAR.wheelchair, enabled: old.accessory === "wheelchair" },
  };
};

const proportionOf = (name: "height" | "weight", value: unknown): number => {
  const { min, max } = catalog.proportions[name];
  return typeof value === "number" && Number.isFinite(value) ? Math.max(min, Math.min(max, Math.round(value))) : 0;
};

const piece = (slot: Slot, value: unknown): Piece | null => {
  if (!value || typeof value !== "object") return null;
  const { id, color } = value as { id?: unknown; color?: unknown };
  const entry = typeof id === "string" ? item(slot, id) : undefined;
  if (!entry) return null;
  return isHex(color) && entry.tint !== false ? { id: entry.id, color: color.toLowerCase() as Hex } : { id: entry.id };
};

/**
 * Any stored value → a drawable version-2 avatar. Version 1 is upgraded; unknown
 * IDs fall back to the default piece; at most one accessory per group and the
 * catalog limit are kept; a dress replaces top and bottom.
 */
export const normalizeAvatar = (value: unknown): AvatarProfile => {
  if (!value || typeof value !== "object") return structuredClone(DEFAULT_AVATAR);
  const raw = value as Record<string, unknown>;
  if (raw.v !== 2) return migrateV1(raw as AvatarV1);
  const d = DEFAULT_AVATAR;
  const hair = (raw.hair ?? {}) as { style?: unknown; color?: unknown };
  const chair = (raw.wheelchair ?? {}) as { enabled?: unknown; model?: unknown; color?: unknown };
  const dress = piece("dress", raw.dress);
  const groups = new Set<string>();
  const accessories: Piece[] = [];
  for (const entry of Array.isArray(raw.accessories) ? raw.accessories : []) {
    const p = piece("accessory", entry);
    const group = p && item("accessory", p.id)?.group;
    if (!p || !group || groups.has(group) || accessories.length >= catalog.limits.accessories) continue;
    groups.add(group);
    accessories.push(p);
  }
  const broad = raw.body === "broad" && raw.weight === undefined;
  return {
    v: 2,
    body: broad ? "standard" : item("body", raw.body as string)?.id ?? d.body,
    height: proportionOf("height", raw.height),
    weight: broad ? 1 : proportionOf("weight", raw.weight),
    skin: isHex(raw.skin) ? (raw.skin.toLowerCase() as Hex) : d.skin,
    facial_hair: item("facial_hair", raw.facial_hair as string)?.id ?? d.facial_hair,
    hair: {
      style: item("hair", hair.style as string)?.id ?? d.hair.style,
      color: isHex(hair.color) ? (hair.color.toLowerCase() as Hex) : d.hair.color,
    },
    top: dress ? null : piece("top", raw.top) ?? d.top,
    bottom: dress ? null : piece("bottom", raw.bottom) ?? d.bottom,
    dress,
    shoes: piece("shoes", raw.shoes) ?? d.shoes,
    bag: piece("bag", raw.bag),
    accessories,
    wheelchair: {
      enabled: chair.enabled === true,
      model: item("wheelchair", chair.model as string)?.id ?? d.wheelchair.model,
      color: isHex(chair.color) ? (chair.color.toLowerCase() as Hex) : d.wheelchair.color,
    },
  };
};

/** Reasons a profile would be refused by the server (empty = valid). */
export const validateAvatar = (value: AvatarProfile): string[] => {
  const errors: string[] = [];
  const known = (slot: Slot, id: string | undefined) => (id && item(slot, id) ? null : `${slot}: ${id ?? "∅"}`);
  if (value.v !== 2) errors.push("v: must be 2");
  for (const problem of [
    known("body", value.body),
    known("facial_hair", value.facial_hair),
    known("hair", value.hair?.style),
    known("shoes", value.shoes?.id),
    known("wheelchair", value.wheelchair?.model),
    value.bag ? known("bag", value.bag.id) : null,
  ])
    if (problem) errors.push(`unknown ${problem}`);
  if (value.dress) {
    if (value.top || value.bottom) errors.push("a dress replaces top and bottom");
    const problem = known("dress", value.dress.id);
    if (problem) errors.push(`unknown ${problem}`);
  } else {
    if (!value.top || known("top", value.top.id)) errors.push("top is required without a dress");
    if (!value.bottom || known("bottom", value.bottom.id)) errors.push("bottom is required without a dress");
  }
  for (const [name, hex] of [
    ["skin", value.skin],
    ["hair.color", value.hair?.color],
    ["wheelchair.color", value.wheelchair?.color],
  ] as const)
    if (!isHex(hex)) errors.push(`${name}: not #RRGGBB`);
  for (const p of [value.top, value.bottom, value.dress, value.shoes, value.bag, ...(value.accessories ?? [])])
    if (p?.color !== undefined && !isHex(p.color)) errors.push(`${p.id}.color: not #RRGGBB`);
  if ((value.accessories ?? []).length > catalog.limits.accessories) errors.push("too many accessories");
  for (const name of ["height", "weight"] as const) {
    const { min, max } = catalog.proportions[name];
    const v = value[name];
    if (!Number.isInteger(v) || v < min || v > max) errors.push(`${name}: integer ${min}…${max}`);
  }
  const groups = new Set<string>();
  for (const a of value.accessories ?? []) {
    const group = item("accessory", a.id)?.group;
    if (!group) errors.push(`unknown accessory: ${a.id}`);
    else if (groups.has(group)) errors.push(`one accessory per group: ${group}`);
    else groups.add(group);
  }
  return errors;
};

/** The pose an avatar uses: a wheelchair always means seated. */
export const poseFor = (profile: AvatarProfile, wanted: Pose = "stand"): Pose =>
  profile.wheelchair.enabled ? "sit" : wanted;

/** A stable key for caches and for "has this changed?" checks. */
export const avatarKey = (profile: AvatarProfile) => JSON.stringify(profile);
