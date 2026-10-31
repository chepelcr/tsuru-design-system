import { mixHex, outlined, tone, type Raster } from "../pixel/raster";
import { pieceColor, poseFor, type AvatarProfile, type Direction, type Motion, type Pose } from "./schema";

// The layered pixel-art avatar. Every piece is drawn in code on a 36 × 47 cell
// grid (a big head and a short body, like the approved sketches), then outlined
// in warm ink. Layers stack body → shoes → bottom/dress → top → bag → hair →
// accessories, with the wheelchair split into a part behind and a part in front
// of the person. Four directions (left mirrors right), standing and seated
// poses, two idle frames and six walking frames — 32 positions per pose.

export type Cells = (string | null)[][];
export type View = "front" | "side" | "back";
export type Layer =
  | "body"
  | "face"
  | "hair"
  | "facial_hair"
  | "shoes"
  | "bottom"
  | "dress"
  | "top"
  | "bag"
  | "accessories"
  | "wheelchair";

export const ALL_LAYERS: readonly Layer[] = [
  "body",
  "face",
  "hair",
  "facial_hair",
  "shoes",
  "bottom",
  "dress",
  "top",
  "bag",
  "accessories",
  "wheelchair",
];

export interface ComposeOptions {
  direction?: Direction;
  pose?: Pose;
  motion?: Motion;
  /** Frame index: 0–1 when idle, 0–5 when walking (wraps). */
  frame?: number;
  /** Draw only these layers (option thumbnails); default all. */
  layers?: readonly Layer[];
}

export interface Sprite {
  cells: Cells;
  width: number;
  height: number;
  /** Column and row of the point that stands on the floor (between the feet or wheels). */
  anchorX: number;
  anchorY: number;
}

export const FRAMES: Record<Motion, number> = { idle: 2, walk: 6 };
export const INK = "#2a1c14";
const W = 36;
const H = 47;
/** Empty rows above the drawing, so tall avatars and hats keep their tops. */
export const PAD = 5;
/** Rows (in the final sprite) that hold the head and hair, for head thumbnails. */
export const HEAD_ROWS = 24 + PAD;
const EYE = "#22201f";
const SHINE = "#fdf8ee";
const LINING = "#f2ece0";
const SOLE = "#d6d1c6";
const TIRE = "#26292d";
const GOLD = "#e2b33c";
const GEM = "#2a9d8f";

const grid = (): Cells => Array.from({ length: H }, () => Array.from({ length: W }, () => null));

const put = (g: Cells, r: number, c: number, hex: string | null) => {
  if (r >= 0 && r < g.length && c >= 0 && c < g[0].length) g[r][c] = hex;
};
const fill = (g: Cells, r0: number, r1: number, c0: number, c1: number, hex: string) => {
  for (let r = Math.min(r0, r1); r <= Math.max(r0, r1); r++)
    for (let c = Math.min(c0, c1); c <= Math.max(c0, c1); c++) put(g, r, c, hex);
};
/** Paints only cells that are already filled (shading on top of a shape). */
const shade = (g: Cells, r0: number, r1: number, c0: number, c1: number, hex: string) => {
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (g[r]?.[c]) g[r][c] = hex;
};
const line = (g: Cells, r0: number, c0: number, r1: number, c1: number, hex: string) => {
  const steps = Math.max(Math.abs(r1 - r0), Math.abs(c1 - c0), 1);
  for (let k = 0; k <= steps; k++) put(g, Math.round(r0 + ((r1 - r0) * k) / steps), Math.round(c0 + ((c1 - c0) * k) / steps), hex);
};
const merge = (under: Cells, over: Cells) => {
  for (let r = 0; r < under.length; r++) for (let c = 0; c < under[r].length; c++) if (over[r]?.[c]) under[r][c] = over[r][c];
};
const mirror = (g: Cells): Cells => g.map((row) => [...row].reverse());

interface Box {
  r0: number;
  r1: number;
  c0: number;
  c1: number;
}
interface Limb {
  upper: Box;
  lower: Box;
  hand: Box;
  far: boolean;
}
interface Leg {
  thigh: Box;
  shin: Box;
  shoe: Box;
  far: boolean;
  /** Which way the toes point in a side view (+1 right). */
  toe: number;
}
interface Geo {
  view: View;
  seated: boolean;
  head: [number, number, number][];
  torso: Box;
  arms: Limb[];
  hips: Box;
  legs: Leg[];
  /** Hem of skirts and dresses grows from here. */
  waist: number;
}

const box = (r0: number, r1: number, c0: number, c1: number): Box => ({ r0, r1, c0, c1 });

const HEAD_FRONT: [number, number, number][] = [
  [4, 14, 21],
  [5, 12, 23],
  ...Array.from({ length: 12 }, (_, k) => [6 + k, 11, 24] as [number, number, number]),
  [18, 12, 23],
  [19, 14, 21],
];
const HEAD_SIDE: [number, number, number][] = [
  [4, 14, 21],
  [5, 13, 23],
  ...Array.from({ length: 12 }, (_, k) => [6 + k, 12, 24] as [number, number, number]),
  [18, 13, 23],
  [19, 15, 22],
];

/** Where each body part sits for a view, pose and frame. */
const geometry = (view: View, seated: boolean, broad: boolean, motion: Motion, frame: number): Geo => {
  const b = broad ? 1 : 0;
  const t = (frame / FRAMES.walk) * Math.PI * 2;
  const walking = motion === "walk" && !seated;
  if (view === "side") {
    const step = walking ? Math.round(2.5 * Math.sin(t)) : 0;
    const swing = walking ? -Math.round(1.6 * Math.sin(t)) : 0;
    const torso = box(21, 32, 14 - b, 21 + b);
    const arm = (far: boolean, s: number): Limb => ({
      upper: box(22, 26, 17, 18),
      lower: seated ? box(27, 29, 19, 22) : box(27, 31, 17 + s, 18 + s),
      hand: seated ? box(28, 29, 23, 24) : box(32, 33, 17 + s, 18 + s),
      far,
    });
    if (seated)
      return {
        view,
        seated,
        head: HEAD_SIDE,
        torso,
        arms: [arm(false, 0)],
        hips: box(31, 34, 14 - b, 21),
        legs: [{ thigh: box(32, 34, 16, 24), shin: box(35, 40, 22, 25), shoe: box(41, 42, 22, 28), far: false, toe: 1 }],
        waist: 33,
      };
    const leg = (far: boolean, k: number): Leg => ({
      thigh: box(35, 38, 16 + Math.round(k / 2), 19 + Math.round(k / 2)),
      shin: box(39, 42, 16 + k, 19 + k),
      shoe: box(43, 44, 16 + k, 21 + k),
      far,
      toe: 1,
    });
    return {
      view,
      seated,
      head: HEAD_SIDE,
      torso,
      arms: [arm(true, -swing), arm(false, swing)],
      hips: box(33, 34, 15 - b, 21 + b),
      legs: [leg(true, -step), leg(false, step)],
      waist: 33,
    };
  }
  // Front and back share one silhouette.
  const lift = (left: boolean) => (walking ? Math.max(0, Math.round((left ? 1 : -1) * 1.4 * Math.sin(t))) : 0);
  const sway = walking ? Math.round(Math.sin(t)) : 0;
  const arm = (left: boolean): Limb => {
    const c0 = left ? 10 - b : 24 + b;
    const s = left ? sway : -sway;
    return {
      upper: box(22, 26, c0, c0 + 1),
      lower: box(27, 31 + s, c0, c0 + 1),
      hand: box(32 + s, 33 + s, c0, c0 + 1),
      far: false,
    };
  };
  const torso = box(21, 32, 12 - b, 23 + b);
  if (seated) {
    const leg = (left: boolean): Leg => {
      const c = left ? 13 : 19;
      return {
        thigh: box(35, 37, left ? 12 - b : 18, left ? 17 : 23 + b),
        shin: box(38, 41, c, c + 3),
        shoe: box(42, 43, left ? c - 1 : c, left ? c + 3 : c + 4),
        far: false,
        toe: 0,
      };
    };
    return { view, seated, head: HEAD_FRONT, torso, arms: [arm(true), arm(false)], hips: box(33, 34, 12 - b, 23 + b), legs: [leg(true), leg(false)], waist: 33 };
  }
  const leg = (left: boolean): Leg => {
    const c = left ? 13 : 19;
    const up = lift(left);
    return {
      thigh: box(35, 37, c, c + 3),
      shin: box(38, 42 - up, c, c + 3),
      shoe: box(43 - up, 44 - up, left ? c - 1 : c, left ? c + 3 : c + 4),
      far: false,
      toe: 0,
    };
  };
  return {
    view,
    seated,
    head: HEAD_FRONT,
    torso,
    arms: [arm(true), arm(false)],
    hips: box(33, 34, 13 - b, 22 + b),
    legs: [leg(true), leg(false)],
    waist: 33,
  };
};

interface Ctx {
  g: Cells;
  geo: Geo;
  p: AvatarProfile;
  view: View;
  frame: number;
  motion: Motion;
}

const skinShade = (p: AvatarProfile) => tone(p.skin, -0.2);
const fillBox = (g: Cells, b: Box, hex: string) => fill(g, b.r0, b.r1, b.c0, b.c1, hex);

// ——— Body ———

const drawBody = ({ g, geo, p, view }: Ctx) => {
  const skin = p.skin;
  const dark = skinShade(p);
  for (const [r, c0, c1] of geo.head) fill(g, r, r, c0, c1, skin);
  if (view === "front" || view === "back") {
    fill(g, 12, 14, 10, 10, dark);
    fill(g, 12, 14, 25, 25, dark);
  } else fill(g, 12, 14, 16, 17, dark);
  fill(g, 20, 21, 16, 19, dark);
  for (const arm of geo.arms) {
    const hex = arm.far ? dark : skin;
    fillBox(g, arm.upper, hex);
    fillBox(g, arm.lower, hex);
    fillBox(g, arm.hand, hex);
  }
  fillBox(g, geo.torso, skin);
  fillBox(g, geo.hips, skin);
  for (const leg of geo.legs) {
    fillBox(g, leg.thigh, leg.far ? dark : skin);
    fillBox(g, leg.shin, leg.far ? dark : skin);
  }
};

const drawFace = ({ g, p, view }: Ctx) => {
  const blush = mixHex(p.skin, "#e0705e", 0.35);
  const mouth = mixHex(p.skin, "#8f3a30", 0.6);
  if (view === "front") {
    for (const c of [14, 20]) {
      fill(g, 12, 13, c, c + 1, EYE);
      put(g, 12, c, SHINE);
    }
    put(g, 14, 18, skinShade(p));
    fill(g, 16, 16, 17, 18, mouth);
    put(g, 15, 13, blush);
    put(g, 15, 22, blush);
  } else if (view === "side") {
    fill(g, 12, 13, 21, 22, EYE);
    put(g, 12, 21, SHINE);
    fill(g, 13, 14, 25, 25, p.skin);
    put(g, 14, 25, skinShade(p));
    fill(g, 16, 16, 22, 23, mouth);
    put(g, 15, 20, blush);
    put(g, 13, 16, tone(p.skin, -0.35));
  }
};

const drawFacialHair = ({ g, p, view }: Ctx) => {
  const hair = p.hair.color;
  if (p.facial_hair === "beard") {
    if (view === "front") {
      fill(g, 14, 17, 11, 12, hair);
      fill(g, 14, 17, 23, 24, hair);
      fill(g, 17, 18, 12, 23, hair);
      fill(g, 19, 19, 14, 21, hair);
      fill(g, 15, 15, 16, 19, hair);
      fill(g, 16, 16, 17, 18, mixHex(p.skin, "#8f3a30", 0.6));
    } else if (view === "side") {
      fill(g, 14, 18, 17, 23, hair);
      fill(g, 19, 19, 15, 22, hair);
      fill(g, 16, 16, 22, 23, mixHex(p.skin, "#8f3a30", 0.6));
      fill(g, 12, 13, 16, 17, tone(p.skin, -0.2));
    } else fill(g, 17, 18, 11, 24, hair);
  } else if (p.facial_hair === "mustache") {
    if (view === "front") fill(g, 15, 15, 16, 19, hair);
    else if (view === "side") fill(g, 15, 15, 21, 23, hair);
  }
};

// ——— Hair ———

/** Hair that falls behind the head and shoulders (drawn before the body in front views). */
const drawHairBack = ({ g, p, view }: Ctx) => {
  const hair = p.hair.color;
  const dark = tone(hair, -0.28);
  const style = p.hair.style;
  if (view === "front" || view === "back") {
    if (style === "afro") {
      for (let r = 0; r <= 18; r++) {
        const dy = (r - 9) / 9.5;
        const half = Math.round(11.5 * Math.sqrt(Math.max(0, 1 - dy * dy)));
        if (half > 0) fill(g, r, r, 18 - half, 17 + half, hair);
      }
    }
    if (style === "bob") fill(g, 8, 19, 9, 26, dark);
    if (style === "long") fill(g, 8, 28, 9, 26, dark);
    if (style === "wavy")
      for (let r = 8; r <= 29; r++) {
        const wobble = Math.floor(r / 3) % 2;
        fill(g, r, r, 9 - wobble, 26 + wobble, dark);
      }
    if (style === "curly") fill(g, 8, 16, 9, 26, dark);
  }
};

const drawHairFront = ({ g, p, view }: Ctx) => {
  const hair = p.hair.color;
  const light = tone(hair, 0.28);
  const dark = tone(hair, -0.28);
  const style = p.hair.style;
  if (style === "bald") {
    if (view !== "back") fill(g, 5, 5, 14, 15, tone(p.skin, 0.25));
    return;
  }
  if (view === "back") {
    // The whole head from behind, plus what falls over the back.
    const fade = style === "buzz" ? mixHex(hair, p.skin, 0.45) : hair;
    for (const [r, c0, c1] of HEAD_FRONT) if (r <= (style === "buzz" ? 17 : 19)) fill(g, r, r, c0, c1, fade);
    if (style === "buzz" || style === "short") fill(g, 18, 19, 14, 21, p.skin);
    fill(g, 3, 3, 14, 21, fade);
    if (style === "curly" || style === "afro") {
      fill(g, 1, 3, 11, 24, hair);
      fill(g, 3, 15, 9, 26, hair);
    }
    if (style === "bun") fill(g, 0, 3, 15, 20, hair);
    if (style === "bob") fill(g, 4, 20, 10, 25, hair);
    if (style === "long") fill(g, 18, 27, 12, 23, hair);
    if (style === "wavy")
      for (let r = 18; r <= 28; r++) {
        const wobble = Math.floor(r / 3) % 2;
        fill(g, r, r, 12 - wobble, 23 + wobble, hair);
      }
    if (style === "long" || style === "wavy") for (let r = 20; r <= 27; r += 3) put(g, r, 15 + (r % 2), dark);
    if (style === "braids") {
      fill(g, 19, 31, 16, 19, hair);
      for (let r = 20; r <= 30; r += 2) fill(g, r, r, 16, 19, dark);
      fill(g, 31, 31, 16, 19, "#c0442e");
    }
    for (let c = 13; c <= 22; c += 3) put(g, 6, c, light);
    return;
  }
  if (view === "side") {
    const fade = style === "buzz" ? mixHex(hair, p.skin, 0.45) : hair;
    fill(g, 3, 3, 14, 21, fade);
    fill(g, 4, 5, 13, 23, fade);
    fill(g, 6, 8, 12, 23, fade);
    fill(g, 9, 17, 12, style === "buzz" ? 13 : 15, fade);
    if (style === "buzz") return;
    fill(g, 9, 10, 20, 23, hair);
    if (style === "short") fill(g, 9, 18, 12, 16, hair);
    if (style === "curly") {
      fill(g, 2, 3, 12, 22, hair);
      fill(g, 4, 8, 11, 23, hair);
      fill(g, 9, 15, 10, 15, hair);
      for (let r = 3; r <= 14; r += 2) put(g, r, 11 + (r % 4), light);
    }
    if (style === "afro") {
      fill(g, 0, 3, 11, 23, hair);
      fill(g, 3, 9, 9, 24, hair);
      fill(g, 9, 17, 8, 16, hair);
      for (let r = 1; r <= 15; r += 2) put(g, r, 10 + (r % 4), light);
    }
    if (style === "bun") fill(g, 1, 5, 9, 13, hair);
    if (style === "bob") fill(g, 9, 19, 11, 16, hair);
    if (style === "long") fill(g, 9, 27, 11, 14, hair);
    if (style === "wavy")
      for (let r = 9; r <= 28; r++) {
        const wobble = Math.floor(r / 3) % 2;
        fill(g, r, r, 11 - wobble, 14, hair);
      }
    if (style === "braids") {
      fill(g, 12, 30, 13, 14, hair);
      for (let r = 13; r <= 29; r += 2) fill(g, r, r, 13, 14, dark);
      fill(g, 31, 31, 13, 14, "#c0442e");
    }
    for (let c = 15; c <= 21; c += 3) put(g, 4, c, light);
    put(g, 12, 15, dark);
    return;
  }
  // Front view: crown, fringe and the locks framing the face.
  const fade = style === "buzz" ? mixHex(hair, p.skin, 0.45) : hair;
  fill(g, 3, 3, 14, 21, fade);
  fill(g, 4, 4, 12, 23, fade);
  fill(g, 5, 7, 11, 24, fade);
  if (style === "buzz") {
    fill(g, 8, 10, 11, 11, fade);
    fill(g, 8, 10, 24, 24, fade);
    return;
  }
  if (style === "short" || style === "bun") {
    fill(g, 8, 8, 11, 15, hair);
    fill(g, 8, 8, 19, 24, hair);
    fill(g, 9, 9, 11, 13, hair);
    fill(g, 9, 12, 11, 11, hair);
    fill(g, 9, 12, 24, 24, hair);
    if (style === "bun") {
      fill(g, 0, 2, 15, 20, hair);
      fill(g, 1, 1, 16, 17, light);
    }
  }
  if (style === "curly" || style === "afro") {
    const big = style === "afro";
    fill(g, 2, 2, 12, 23, hair);
    fill(g, 1, 1, 14, 21, hair);
    fill(g, 3, 8, big ? 9 : 10, big ? 26 : 25, hair);
    fill(g, 9, 9, 10, 13, hair);
    fill(g, 9, 9, 22, 25, hair);
    fill(g, 9, big ? 15 : 13, big ? 9 : 10, 10, hair);
    fill(g, 9, big ? 15 : 13, 25, big ? 26 : 25, hair);
    put(g, 9, 16, hair);
    put(g, 9, 19, hair);
    for (let r = 2; r <= 12; r += 2) for (let c = 10 + (r % 4 ? 1 : 0); c <= 25; c += 3) if (g[r][c] === hair) put(g, r, c, light);
    for (let r = 3; r <= 13; r += 2) for (let c = 11 + (r % 4 ? 0 : 1); c <= 25; c += 4) if (g[r][c] === hair) put(g, r, c, dark);
  }
  if (style === "bob" || style === "long" || style === "wavy" || style === "braids") {
    fill(g, 8, 8, 11, 24, hair);
    fill(g, 9, 9, 11, 14, hair);
    fill(g, 9, 9, 21, 24, hair);
    put(g, 9, 17, hair);
    if (style !== "braids") {
      const end = style === "bob" ? 18 : 21;
      for (let r = 9; r <= end; r++) {
        const wobble = style === "wavy" ? Math.floor(r / 3) % 2 : 0;
        fill(g, r, r, 9 - wobble, 11 - wobble, hair);
        fill(g, r, r, 24 + wobble, 26 + wobble, hair);
      }
      for (let r = 10; r <= end; r += 3) {
        put(g, r, 10, light);
        put(g, r + 1, 25, dark);
      }
    } else {
      put(g, 4, 17, p.skin);
      put(g, 5, 17, p.skin);
      for (const c of [10, 24]) {
        fill(g, 9, 30, c, c + 1, hair);
        for (let r = 11; r <= 29; r += 2) fill(g, r, r, c, c + 1, dark);
        fill(g, 31, 31, c, c + 1, "#c0442e");
      }
    }
  }
  for (let c = 13; c <= 22; c += 3) put(g, 4, c, light);
  put(g, 5, 23, dark);
  if (style !== "curly" && style !== "afro") {
    fill(g, 10, 10, 14, 15, dark);
    fill(g, 10, 10, 20, 21, dark);
  }
};

// ——— Clothes ———

const drawTop = ({ g, geo, p, view }: Ctx) => {
  if (!p.top || p.dress) return;
  const id = p.top.id;
  const hex = pieceColor("top", p.top);
  const dark = tone(hex, -0.2);
  const light = tone(hex, 0.18);
  const t = geo.torso;
  const longSleeves = id !== "tee" && id !== "blouse";
  fillBox(g, t, hex);
  fill(g, t.r0, t.r0, t.c0 + 1, t.c1 - 1, hex);
  for (const arm of geo.arms) {
    const sleeve = arm.far ? dark : hex;
    if (id === "blouse") fill(g, arm.upper.r0, arm.upper.r0 + 2, arm.upper.c0 - (view === "side" ? 0 : 1), arm.upper.c1 + (view === "side" ? 0 : 1), sleeve);
    else fill(g, arm.upper.r0, longSleeves ? arm.upper.r1 : arm.upper.r0 + 3, arm.upper.c0, arm.upper.c1, sleeve);
    if (longSleeves) {
      fillBox(g, arm.lower, sleeve);
      fill(g, arm.lower.r1, arm.lower.r1, arm.lower.c0, arm.lower.c1, tone(hex, -0.3));
    }
  }
  if (view === "front") {
    fill(g, t.r0 + 1, t.r1, t.c1, t.c1, dark);
    fill(g, t.r0 + 1, t.r1, t.c0, t.c0, light);
  } else if (view === "side") fill(g, t.r0 + 1, t.r1, t.c0, t.c0, dark);
  else fill(g, t.r0 + 1, t.r1, t.c0, t.c0, dark);
  if (id === "jacket") {
    if (view === "front") {
      fill(g, t.r0, t.r1, 16, 19, LINING);
      fill(g, t.r0, t.r0 + 3, 15, 15, dark);
      fill(g, t.r0, t.r0 + 3, 20, 20, dark);
      fill(g, t.r0 + 4, t.r1, 15, 15, hex);
      fill(g, t.r0 + 4, t.r1, 20, 20, hex);
      put(g, 28, 13, dark);
      put(g, 28, 22, dark);
    } else if (view === "side") fill(g, t.r0 + 1, t.r1, t.c1, t.c1, LINING);
    else fill(g, t.r0 + 1, t.r1, 17, 18, dark);
  }
  if (id === "tee" && view === "front") fill(g, t.r0, t.r0, 16, 19, dark);
  if (id === "shirt" && view === "front") {
    fill(g, t.r0, t.r0, 15, 16, light);
    fill(g, t.r0, t.r0, 19, 20, light);
    fill(g, t.r0 + 1, t.r1, 17, 18, tone(hex, -0.1));
    for (const r of [24, 27, 30]) put(g, r, 18, tone(hex, 0.4));
  }
  if (id === "hoodie") {
    if (view === "front") {
      fill(g, 20, 21, 13, 15, dark);
      fill(g, 20, 21, 20, 22, dark);
      fill(g, 28, 31, 15, 20, tone(hex, -0.12));
      fill(g, 22, 25, 16, 16, LINING);
      fill(g, 22, 25, 19, 19, LINING);
    } else if (view === "back") fill(g, 20, 25, 14, 21, dark);
    else fill(g, 20, 24, 14, 15, dark);
  }
  if (id === "sweater") {
    fill(g, t.r1, t.r1, t.c0, t.c1, dark);
    if (view === "front") fill(g, t.r0, t.r0, 16, 19, dark);
    for (let c = t.c0; c <= t.c1; c += 2) put(g, t.r1, c, tone(hex, -0.32));
  }
  if (id === "blouse" && view === "front") {
    fill(g, t.r0, t.r0 + 1, 15, 20, tone(hex, 0.45));
    fill(g, t.r0 + 1, t.r0 + 1, 17, 18, hex);
    for (const r of [25, 28]) put(g, r, 17, tone(hex, -0.3));
  }
};

const drawBottom = ({ g, geo, p, view }: Ctx) => {
  if (!p.bottom || p.dress) return;
  const id = p.bottom.id;
  const hex = pieceColor("bottom", p.bottom);
  const dark = tone(hex, -0.22);
  fillBox(g, geo.hips, hex);
  if (id === "skirt") {
    const flare = geo.seated ? 1 : 0;
    const hem = geo.seated ? (view === "side" ? 34 : 38) : 39;
    for (let r = geo.waist; r <= hem; r++) {
      const grow = Math.floor((r - geo.waist) / 2) + flare;
      if (view === "side") fill(g, r, r, geo.hips.c0 - Math.floor(grow / 2), geo.seated ? 24 : geo.hips.c1 + grow, hex);
      else fill(g, r, r, geo.hips.c0 - grow, geo.hips.c1 + grow, hex);
    }
    for (let r = geo.waist + 2; r <= hem; r += 2) put(g, r, 17, dark);
    for (let c = 0; c < W; c++) if (g[hem][c] === hex) g[hem][c] = dark;
    return;
  }
  for (const leg of geo.legs) {
    const hexLeg = leg.far ? dark : hex;
    fillBox(g, leg.thigh, hexLeg);
    if (id !== "shorts") fillBox(g, leg.shin, hexLeg);
    else if (!geo.seated || view !== "side") fill(g, leg.shin.r0, leg.shin.r0, leg.shin.c0, leg.shin.c1, hexLeg);
    if (view === "front" && !leg.far) fill(g, leg.thigh.r0, leg.shin.r1, leg.thigh.c1, leg.thigh.c1, dark);
  }
  if (id === "trousers") fill(g, geo.hips.r0, geo.hips.r0, geo.hips.c0, geo.hips.c1, tone(hex, -0.4));
  if (id === "jeans" && view === "front") {
    put(g, geo.hips.r0 + 1, 17, tone(hex, 0.25));
    put(g, geo.hips.r0 + 1, 18, tone(hex, 0.25));
  }
};

const drawDress = ({ g, geo, p, view }: Ctx) => {
  if (!p.dress) return;
  const id = p.dress.id;
  const hex = pieceColor("dress", p.dress);
  const dark = tone(hex, -0.22);
  const t = geo.torso;
  fillBox(g, t, hex);
  fillBox(g, geo.hips, hex);
  for (const arm of geo.arms) {
    if (id === "sundress") continue;
    fill(g, arm.upper.r0, arm.upper.r0 + (id === "long" ? 9 : 3), arm.upper.c0, arm.upper.c1, arm.far ? dark : hex);
  }
  if (id === "sundress" && view !== "side") {
    fill(g, t.r0, t.r0 + 1, t.c0, t.c1, p.skin);
    fill(g, t.r0, t.r0 + 1, 14, 14, hex);
    fill(g, t.r0, t.r0 + 1, 21, 21, hex);
  }
  const hem = geo.seated ? (view === "side" ? 35 : 39) : id === "long" ? 43 : id === "midi" ? 40 : 39;
  for (let r = geo.waist; r <= hem; r++) {
    const grow = Math.floor((r - geo.waist) / 2);
    if (view === "side") fill(g, r, r, geo.hips.c0 - Math.floor(grow / 2), geo.seated ? 25 : geo.hips.c1 + grow, hex);
    else fill(g, r, r, geo.hips.c0 - grow, geo.hips.c1 + grow, hex);
  }
  for (let c = 0; c < W; c++) if (g[hem][c] === hex) g[hem][c] = dark;
  if (view === "front") fill(g, t.r0 + 1, hem - 1, t.c1, t.c1, dark);
  if (id === "midi" && view === "front") {
    for (const r of [23, 26, 29, 32, 35]) put(g, r, 17, tone(hex, 0.45));
    fill(g, geo.waist - 1, geo.waist - 1, t.c0, t.c1, dark);
  }
  if (id === "sundress")
    for (let r = geo.waist; r < hem; r += 2)
      for (let c = 6 + (r % 4 ? 1 : 0); c < W - 6; c += 3) if (g[r][c] === hex) put(g, r, c, "#fbf3e2");
  if (id === "long" && view === "front") fill(g, geo.waist, geo.waist, t.c0, t.c1, tone(hex, -0.4));
};

const drawShoes = ({ g, geo, p }: Ctx) => {
  const id = p.shoes.id;
  const hex = pieceColor("shoes", p.shoes);
  const dark = tone(hex, -0.25);
  for (const leg of geo.legs) {
    const s = leg.shoe;
    const main = leg.far ? dark : hex;
    if (id === "boots") {
      fill(g, s.r0 - 3, s.r0 - 1, leg.shin.c0, leg.shin.c1, main);
      fillBox(g, s, main);
      fill(g, s.r1, s.r1, s.c0, s.c1, tone(hex, -0.45));
    } else if (id === "sandals") {
      fill(g, s.r0, s.r0, s.c0, s.c1, p.skin);
      fill(g, s.r1, s.r1, s.c0, s.c1, main);
      for (let c = s.c0 + 1; c <= s.c1; c += 2) put(g, s.r0, c, main);
    } else if (id === "flats") {
      fill(g, s.r0, s.r0, s.c0 + 1, s.c1 - 1, p.skin);
      fill(g, s.r1, s.r1, s.c0, s.c1, main);
      put(g, s.r0, leg.toe >= 0 ? s.c1 : s.c0, main);
    } else {
      fillBox(g, s, main);
      fill(g, s.r1, s.r1, s.c0, s.c1, leg.far ? tone(SOLE, -0.2) : SOLE);
      put(g, s.r0, leg.toe > 0 ? s.c0 + 2 : s.c0 + 1, tone(hex, -0.35));
    }
  }
};

// ——— Bags ———

const drawBag = ({ g, geo, p, view }: Ctx) => {
  if (!p.bag) return;
  const id = p.bag.id;
  const hex = pieceColor("bag", p.bag);
  const dark = tone(hex, -0.25);
  const strap = tone(hex, -0.35);
  const seated = geo.seated;
  if (id === "crossbody") {
    if (view === "front") {
      line(g, 21, 14, 29, 22, strap);
      fill(g, 29, 33, 21, 25, hex);
      fill(g, 29, 30, 21, 25, dark);
      put(g, 31, 23, GOLD);
    } else if (view === "back") {
      line(g, 21, 21, 29, 13, strap);
      fill(g, 29, 33, 10, 14, hex);
    } else {
      line(g, 21, 17, 29, 14, strap);
      fill(g, 28, 32, 11, 14, hex);
      fill(g, 28, 29, 11, 14, dark);
    }
  }
  if (id === "backpack") {
    if (view === "front") {
      fill(g, 21, 30, 14, 14, strap);
      fill(g, 21, 30, 21, 21, strap);
    } else if (view === "back") {
      fill(g, 22, seated ? 31 : 33, 13, 22, hex);
      fill(g, 22, 23, 13, 22, dark);
      fill(g, 28, 31, 15, 20, dark);
      put(g, 24, 17, GOLD);
    } else {
      fill(g, 21, 32, 9, 13, hex);
      fill(g, 21, 22, 9, 13, dark);
      fill(g, 21, 30, 15, 15, strap);
    }
  }
  if (id === "tote") {
    if (seated && view !== "back") {
      const c0 = view === "side" ? 19 : 14;
      fill(g, 31, 36, c0, c0 + 5, hex);
      line(g, 31, c0 + 1, 29, c0 + 2, strap);
      line(g, 29, c0 + 3, 31, c0 + 4, strap);
      put(g, 33, c0 + 2, "#5d9c45");
      put(g, 34, c0 + 3, "#5d9c45");
    } else if (view === "front") {
      fill(g, 21, 27, 23, 23, strap);
      fill(g, 27, 34, 23, 28, hex);
      fill(g, 27, 27, 23, 28, dark);
      put(g, 30, 25, "#5d9c45");
      put(g, 31, 26, "#5d9c45");
      put(g, 31, 25, "#3f7a35");
    } else if (view === "back") {
      fill(g, 21, 27, 12, 12, strap);
      fill(g, 27, 34, 7, 12, hex);
    } else {
      fill(g, 21, 27, 15, 15, strap);
      fill(g, 27, 34, 10, 15, hex);
    }
  }
  if (id === "handbag") {
    if (seated && view !== "back") {
      const c0 = view === "side" ? 19 : 15;
      fill(g, 32, 35, c0, c0 + 4, hex);
      fill(g, 30, 30, c0 + 1, c0 + 3, strap);
      put(g, 31, c0 + 1, strap);
      put(g, 31, c0 + 3, strap);
    } else if (view === "front") {
      const hand = geo.arms[1].hand;
      fill(g, hand.r1 - 1, hand.r1, hand.c1 + 1, hand.c1 + 2, strap);
      fill(g, hand.r1 + 1, hand.r1 + 4, hand.c0 + 1, hand.c1 + 3, hex);
      put(g, hand.r1 + 2, hand.c0 + 2, GOLD);
    } else if (view === "back") {
      const hand = geo.arms[0].hand;
      fill(g, hand.r1 + 1, hand.r1 + 4, hand.c0 - 2, hand.c1, hex);
    } else {
      const hand = geo.arms[geo.arms.length - 1].hand;
      fill(g, hand.r1 + 1, hand.r1 + 4, hand.c0 - 1, hand.c1 + 1, hex);
      fill(g, hand.r1 + 1, hand.r1 + 1, hand.c0 - 1, hand.c1 + 1, dark);
    }
  }
};

// ——— Accessories ———

const drawAccessories = ({ g, p, view }: Ctx) => {
  for (const a of p.accessories) {
    const hex = pieceColor("accessory", a);
    const dark = tone(hex, -0.3);
    if (view === "back" && a.id !== "hat" && a.id !== "cap" && a.id !== "headband" && a.id !== "scarf") continue;
    switch (a.id) {
      case "glasses":
        if (view === "front")
          for (const c of [13, 19]) {
            fill(g, 11, 11, c, c + 3, hex);
            fill(g, 14, 14, c, c + 3, hex);
            fill(g, 12, 13, c, c, hex);
            fill(g, 12, 13, c + 3, c + 3, hex);
          }
        else {
          fill(g, 11, 11, 20, 23, hex);
          fill(g, 14, 14, 20, 23, hex);
          fill(g, 12, 13, 23, 23, hex);
          fill(g, 12, 12, 16, 19, hex);
        }
        if (view === "front") fill(g, 12, 12, 17, 18, hex);
        break;
      case "sunglasses":
        if (view === "front") {
          fill(g, 11, 13, 13, 16, hex);
          fill(g, 11, 13, 19, 22, hex);
          fill(g, 11, 11, 17, 18, hex);
          put(g, 11, 14, "#6b7280");
          put(g, 11, 20, "#6b7280");
        } else {
          fill(g, 11, 13, 20, 23, hex);
          fill(g, 11, 11, 16, 19, hex);
          put(g, 11, 22, "#6b7280");
        }
        break;
      case "earrings":
        if (view === "front") {
          fill(g, 15, 16, 10, 10, hex);
          fill(g, 15, 16, 25, 25, hex);
          put(g, 17, 10, dark);
          put(g, 17, 25, dark);
        } else fill(g, 15, 17, 16, 16, hex);
        break;
      case "necklace":
        if (view === "front") {
          fill(g, 22, 22, 15, 15, hex);
          fill(g, 22, 22, 20, 20, hex);
          fill(g, 23, 23, 16, 19, hex);
          fill(g, 24, 24, 17, 18, GEM);
        } else fill(g, 22, 22, 18, 20, hex);
        break;
      case "scarf":
        if (view === "front") {
          fill(g, 20, 22, 13, 22, hex);
          fill(g, 23, 28, 19, 20, hex);
          fill(g, 28, 28, 19, 20, dark);
          for (let c = 14; c <= 22; c += 3) put(g, 21, c, dark);
        } else if (view === "back") fill(g, 20, 22, 13, 22, hex);
        else {
          fill(g, 20, 22, 14, 21, hex);
          fill(g, 23, 27, 13, 14, hex);
        }
        break;
      case "hat": {
        const band = "#3f7a4a";
        fill(g, 1, 5, 12, 23, hex);
        fill(g, 0, 0, 14, 21, hex);
        fill(g, 6, 7, view === "side" ? 8 : 7, view === "side" ? 28 : 28, hex);
        fill(g, 7, 7, view === "side" ? 8 : 7, 28, dark);
        fill(g, 5, 5, 12, 23, band);
        put(g, 2, 15, tone(hex, 0.3));
        break;
      }
      case "cap":
        fill(g, 2, 6, 11, 24, hex);
        fill(g, 1, 1, 13, 22, hex);
        if (view === "front") fill(g, 7, 7, 12, 23, dark);
        else if (view === "side") fill(g, 6, 7, 21, 28, dark);
        put(g, 1, 17, tone(hex, 0.35));
        break;
      case "headband":
        fill(g, 6, 6, 11, 24, hex);
        if (view === "side") fill(g, 6, 6, 12, 23, hex);
        put(g, 6, 21, tone(hex, 0.3));
        break;
    }
  }
};

// ——— Wheelchair ———

const ring = (g: Cells, cr: number, cc: number, radius: number, thick: number, hex: string) => {
  for (let r = Math.floor(cr - radius - 1); r <= Math.ceil(cr + radius + 1); r++)
    for (let c = Math.floor(cc - radius - 1); c <= Math.ceil(cc + radius + 1); c++) {
      const d = Math.hypot(r - cr, c - cc);
      if (d <= radius + 0.5 && d >= radius - thick + 0.5) put(g, r, c, hex);
    }
};

/** The chair parts behind the person (backrest, push handles). */
const drawChairBack = (g: Cells, p: AvatarProfile, view: View) => {
  const hex = p.wheelchair.color;
  const sport = p.wheelchair.model === "sport";
  const fabric = mixHex(hex, "#1c1d20", 0.55);
  const top = sport ? 26 : 20;
  if (view === "side") {
    fill(g, top, 33, 11, 12, hex);
    if (!sport) fill(g, 19, 19, 8, 12, hex);
    fill(g, 34, 34, 11, 24, hex);
    return;
  }
  fill(g, top, 33, 11, 24, fabric);
  fill(g, top, 34, 11, 11, hex);
  fill(g, top, 34, 24, 24, hex);
  if (!sport) {
    fill(g, 18, 19, 10, 11, hex);
    fill(g, 18, 19, 24, 25, hex);
  }
};

/** The chair parts in front of the person (wheels, seat edge, footrest, casters). */
const drawChairFront = (g: Cells, p: AvatarProfile, view: View, frame: number, motion: Motion, back: boolean) => {
  const hex = p.wheelchair.color;
  const sport = p.wheelchair.model === "sport";
  const rim = tone(hex, 0.35);
  const spoke = "#b8bcc2";
  if (view === "side") {
    const cr = 35;
    const cc = 15;
    ring(g, cr, cc, 9, 2, TIRE);
    ring(g, cr, cc, 7, 1, rim);
    const turn = motion === "walk" ? (frame / FRAMES.walk) * (Math.PI / 2) : 0;
    for (let k = 0; k < 4; k++) {
      const a = turn + (k * Math.PI) / 4;
      line(g, cr - Math.round(6 * Math.sin(a)), cc - Math.round(6 * Math.cos(a)), cr + Math.round(6 * Math.sin(a)), cc + Math.round(6 * Math.cos(a)), spoke);
    }
    fill(g, cr - 1, cr + 1, cc - 1, cc + 1, hex);
    put(g, cr, cc, rim);
    fill(g, 34, 41, 23, 23, hex);
    fill(g, 43, 43, 22, 28, hex);
    ring(g, 44.5, 23.5, 1.6, 2, TIRE);
    if (sport) ring(g, 43.5, 6, 1.2, 2, TIRE);
    return;
  }
  // Front and back: the big wheels seen edge-on, leaning in at the top on the sport model.
  for (const side of [-1, 1]) {
    const base = side < 0 ? 6 : 29;
    for (let r = 26; r <= 44; r++) {
      const lean = sport ? Math.round(((44 - r) / 18) * 2) * -side : 0;
      const round = r === 26 || r === 44 ? 0 : 1;
      fill(g, r, r, base - round + lean, base + round + lean, TIRE);
      if (r >= 29 && r <= 41) put(g, r, base + lean + (side < 0 ? 2 : -2), rim);
    }
  }
  if (!back) {
    fill(g, 38, 38, 11, 24, mixHex(hex, "#1c1d20", 0.4));
    fill(g, 44, 44, 12, 23, hex);
    fill(g, 39, 44, 12, 12, hex);
    fill(g, 39, 44, 23, 23, hex);
    fill(g, 45, 46, 12, 13, TIRE);
    fill(g, 45, 46, 22, 23, TIRE);
  } else {
    fill(g, 21, 33, 11, 24, mixHex(hex, "#1c1d20", 0.55));
    fill(g, 21, 34, 11, 11, hex);
    fill(g, 21, 34, 24, 24, hex);
    fill(g, 45, 46, 12, 13, TIRE);
    fill(g, 45, 46, 22, 23, TIRE);
  }
};

// ——— Composition ———

const VIEWS: Record<Direction, { view: View; flip: boolean }> = {
  front: { view: "front", flip: false },
  right: { view: "side", flip: false },
  back: { view: "back", flip: false },
  left: { view: "side", flip: true },
};

const emptyRow = () => Array.from({ length: W }, () => null as string | null);
const padTop = (g: Cells): Cells => [...Array.from({ length: PAD }, emptyRow), ...g];

/**
 * Altura and peso, −2…2 (like a Mii's sliders). Height adds or removes rows
 * inside the legs and torso — the feet stay on the floor and the head moves up
 * — and only above the hips when seated, so the wheelchair still fits. Weight
 * adds or removes columns inside the torso and legs below the neck, one on each
 * side, so the body stays centred under the head.
 */
const proportion = (input: Cells, view: View, seated: boolean, height: number, weight: number): Cells => {
  const g = input.map((row) => [...row]);
  const steps = (v: number) => Math.min(2, Math.abs(Math.round(v)));
  // Each height step is two rows: one in the shins and one in the torso
  // (both in the torso when seated). Worked bottom-up; rows above an edit
  // move by one per edit already made.
  const n = steps(height);
  const rows = seated ? [...Array(n).fill(28), ...Array(n).fill(25)] : [...Array(n).fill(39), ...Array(n).fill(28)];
  rows.forEach((row, done) => {
    if (height > 0) {
      const r = row + PAD - done;
      g.splice(r, 0, [...g[r]]);
      g.shift();
    } else {
      g.splice(row + PAD + done, 1);
      g.unshift(emptyRow());
    }
  });
  // Each weight step is one column on each side, inside the torso and legs.
  const [right, left] = view === "side" ? [19, 15] : [20, 15];
  const neck = 20 + PAD - Math.sign(height) * rows.length;
  for (let r = Math.max(0, neck); r < g.length; r++) {
    const line = g[r];
    for (let k = 0; k < steps(weight); k++) {
      if (weight > 0) {
        line.splice(right, 0, line[right]);
        line.pop();
        line.splice(left, 0, line[left]);
        line.shift();
      } else {
        line.splice(right, 1);
        line.push(null);
        line.splice(left, 1);
        line.unshift(null);
      }
    }
  }
  return g;
};

/** Moves rows 0..until down (dy > 0) or up (dy < 0) by one; used for the idle breath and the walking bob. */
const bob = (g: Cells, until: number, dy: number) => {
  if (dy > 0) {
    for (let r = until; r >= 1; r--) g[r] = [...g[r - 1]];
    g[0] = Array.from({ length: g[0].length }, () => null);
  } else if (dy < 0) {
    for (let r = 0; r < until; r++) g[r] = [...g[r + 1]];
  }
};

const cache = new Map<string, Sprite>();

/** Builds (and caches) one frame of an avatar. */
export const composeAvatar = (profile: AvatarProfile, options: ComposeOptions = {}): Sprite => {
  const direction = options.direction ?? "front";
  const pose = poseFor(profile, options.pose);
  const motion = options.motion ?? "idle";
  const frame = ((options.frame ?? 0) % FRAMES[motion] + FRAMES[motion]) % FRAMES[motion];
  const layers = new Set(options.layers ?? ALL_LAYERS);
  const key = JSON.stringify([profile, direction, pose, motion, frame, [...layers].sort()]);
  const hit = cache.get(key);
  if (hit) return hit;

  const { view, flip } = VIEWS[direction];
  const seated = pose === "sit";
  const geo = geometry(view, seated, false, motion, frame);
  const g = grid();
  const ctx: Ctx = { g, geo, p: profile, view, frame, motion };
  const has = (layer: Layer) => layers.has(layer);
  const hairBehind = view !== "back";

  if (has("hair") && hairBehind) drawHairBack(ctx);
  if (has("body")) drawBody(ctx);
  if (has("face")) drawFace(ctx);
  if (has("shoes")) drawShoes(ctx);
  if (has("bottom")) drawBottom(ctx);
  if (has("dress")) drawDress(ctx);
  if (has("top")) drawTop(ctx);
  if (has("bag") && !(view === "back" && profile.bag?.id === "backpack")) drawBag(ctx);
  if (has("facial_hair")) drawFacialHair(ctx);
  if (has("hair")) drawHairFront(ctx);
  if (has("bag") && view === "back" && profile.bag?.id === "backpack") drawBag(ctx);
  if (has("accessories")) drawAccessories(ctx);

  // Breathing while idle, a bob on the passing steps while walking.
  if (motion === "idle" && frame === 1) bob(g, seated ? 31 : 33, 1);
  if (motion === "walk" && !seated && (frame === 1 || frame === 4)) bob(g, 34, -1);

  let cells = outlined(proportion(padTop(g), view, seated, profile.height, profile.weight), INK);
  if (has("wheelchair") && profile.wheelchair.enabled) {
    const behind = grid();
    const front = grid();
    if (view === "back") drawChairFront(front, profile, view, frame, motion, true);
    else {
      drawChairBack(behind, profile, view);
      drawChairFront(front, profile, view, frame, motion, false);
    }
    const composed = outlined(padTop(behind), INK);
    merge(composed, cells);
    const pad: Cells = Array.from({ length: H + PAD + 2 }, () => Array.from({ length: W + 2 }, () => null));
    padTop(front).forEach((row, r) => row.forEach((hex, c) => (pad[r + 1][c + 1] = hex)));
    // Solid chair parts get their own outline; tyres are already dark.
    merge(composed, outlinedSolid(pad));
    cells = composed;
  }
  if (flip) cells = mirror(cells);

  let lowest = cells.length - 1;
  while (lowest > 0 && cells[lowest].every((c) => c === null)) lowest--;
  const sprite: Sprite = { cells, width: cells[0].length, height: cells.length, anchorX: cells[0].length / 2, anchorY: lowest + 1 };
  if (cache.size > 600) cache.clear();
  cache.set(key, sprite);
  return sprite;
};

/** Outlines a layer without growing it (the chair's front parts share the body's frame). */
const outlinedSolid = (cells: Cells): Cells => {
  const out = cells.map((row) => [...row]);
  for (let r = 0; r < cells.length; r++)
    for (let c = 0; c < cells[r].length; c++) {
      if (cells[r][c]) continue;
      const near = [cells[r - 1]?.[c], cells[r + 1]?.[c], cells[r]?.[c - 1], cells[r]?.[c + 1]].some(
        (hex) => hex && hex !== TIRE && hex !== "#b8bcc2",
      );
      if (near) out[r][c] = INK;
    }
  return out;
};

/** Crops a sprite to its painted cells (option thumbnails). */
export const cropSprite = (sprite: Sprite, padding = 1): Sprite => {
  const { cells } = sprite;
  let r0 = cells.length;
  let r1 = -1;
  let c0 = cells[0].length;
  let c1 = -1;
  cells.forEach((row, r) =>
    row.forEach((hex, c) => {
      if (!hex) return;
      r0 = Math.min(r0, r);
      r1 = Math.max(r1, r);
      c0 = Math.min(c0, c);
      c1 = Math.max(c1, c);
    }),
  );
  if (r1 < 0) return { cells: [[null]], width: 1, height: 1, anchorX: 0.5, anchorY: 1 };
  const out: Cells = [];
  for (let r = r0 - padding; r <= r1 + padding; r++) {
    const row: (string | null)[] = [];
    for (let c = c0 - padding; c <= c1 + padding; c++) row.push(cells[r]?.[c] ?? null);
    out.push(row);
  }
  return { cells: out, width: out[0].length, height: out.length, anchorX: out[0].length / 2, anchorY: out.length };
};

/** Draws an avatar frame with its floor point at raster (x, y), plus a soft shadow. */
export const drawAvatar = (r: Raster, x: number, y: number, profile: AvatarProfile, options: ComposeOptions = {}, shadow = true) => {
  const sprite = composeAvatar(profile, options);
  if (shadow) r.ellipse(x, y - 0.5, profile.wheelchair.enabled ? 13 : 9, 2.2, INK, 0.2);
  r.grid(sprite.cells, Math.round(x - sprite.anchorX), Math.round(y - sprite.anchorY));
  return sprite;
};

/** Draws any cell grid (a cropped thumbnail, say) centred in a raster. */
export const drawCentered = (r: Raster, sprite: Sprite) => {
  r.grid(sprite.cells, Math.floor((r.w - sprite.width) / 2), Math.floor((r.h - sprite.height) / 2));
};

/** The sprite's size in cells, for sizing canvases. */
export const SPRITE_SIZE = { width: W + 2, height: H + PAD + 2 } as const;
