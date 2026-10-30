import { mixHex, spriteGrid, outlined, tone, type Raster } from "../pixel/raster";
import { game } from "../tokens/tokens";
import { drawAvatar, INK, type ComposeOptions } from "./compose";
import type { AvatarProfile } from "./schema";

// The little worlds an avatar stands in: the editor's paved isometric tile with a
// planter and a fair lamp post (sketch 03), the garden card in the client panel
// (sketch 05) and the fair banner. All drawn in code, like the avatar.

const STONE = "#d8c6a3";
const LEAF = "#5d9c45";
const LEAF_DARK = "#3f7a35";
const LEAF_LIGHT = "#8cc063";
const WOOD = "#9a6a3a";
const POST = "#244a33";

export const STAGE_SIZE = { width: 96, height: 98 } as const;
export const PORTRAIT_SIZE = { width: 64, height: 64 } as const;
export const GARDEN_SIZE = { width: 96, height: 80 } as const;

const tuft = (r: Raster, x: number, y: number) => {
  r.px(x, y, LEAF_DARK);
  r.px(x - 1, y - 1, LEAF);
  r.px(x + 1, y - 2, LEAF_LIGHT);
  r.px(x + 1, y - 1, LEAF);
};

const flower = (r: Raster, x: number, y: number, petal: string) => {
  r.px(x, y - 1, petal);
  r.px(x - 1, y, petal);
  r.px(x + 1, y, petal);
  r.px(x, y + 1, petal);
  r.px(x, y, "#f2c94c");
};

/** The paved isometric tile the editor shows the avatar on. */
export const drawStage = (r: Raster, profile: AvatarProfile, options: ComposeOptions = {}) => {
  const cx = 48;
  const top = 50;
  const hw = 42;
  const hh = 21;
  const depth = 6;
  // Sides of the tile, then its paved top.
  r.poly([[cx - hw, top + hh], [cx, top + 2 * hh], [cx, top + 2 * hh + depth], [cx - hw, top + hh + depth]], tone(STONE, -0.28));
  r.poly([[cx + hw, top + hh], [cx, top + 2 * hh], [cx, top + 2 * hh + depth], [cx + hw, top + hh + depth]], tone(STONE, -0.4));
  r.poly([[cx, top], [cx + hw, top + hh], [cx, top + 2 * hh], [cx - hw, top + hh]], STONE);
  for (let k = 1; k < 4; k++) {
    const t = k / 4;
    r.line(cx - hw * (1 - t), top + hh * (1 + t), cx + hw * t, top + hh * t, tone(STONE, -0.14));
    r.line(cx + hw * (1 - t), top + hh * (1 + t), cx - hw * t, top + hh * t, tone(STONE, -0.14));
  }
  for (let k = 0; k < 9; k++) r.px(cx - 28 + k * 7, top + hh + ((k * 5) % 9) - 4, tone(STONE, 0.22));
  // Moss along the back edges.
  for (let x = cx - hw + 3; x < cx + hw - 2; x += 5) tuft(r, x, top + Math.abs(x - cx) / 2 + 2);

  // Planter box at the back left.
  r.poly([[8, 55], [30, 44], [38, 48], [16, 59]], tone(WOOD, 0.1));
  r.poly([[8, 55], [16, 59], [16, 68], [8, 64]], tone(WOOD, -0.15));
  r.poly([[16, 59], [38, 48], [38, 57], [16, 68]], WOOD);
  for (const y of [61, 64]) r.line(17, y, 37, y - 10, tone(WOOD, -0.3));
  r.ellipse(21, 48, 10, 6, LEAF);
  r.ellipse(28, 44, 8, 5, LEAF_LIGHT);
  r.ellipse(15, 52, 6, 4, LEAF_DARK);
  r.ellipse(33, 47, 6, 4, LEAF);
  flower(r, 19, 45, "#fbf6ea");
  flower(r, 27, 41, "#fbf6ea");
  flower(r, 33, 45, "#f29a4b");
  flower(r, 14, 50, "#fbf6ea");

  // The fair lamp post with two banners.
  const lx = 78;
  r.rect(lx, 12, 2, 52, POST);
  r.rect(lx - 3, 62, 8, 3, tone(POST, -0.2));
  r.rect(lx - 8, 16, 18, 1, POST);
  r.rect(lx - 2, 5, 6, 6, POST);
  r.rect(lx - 1, 6, 4, 4, "#f7d774");
  r.px(lx, 4, POST);
  r.px(lx + 1, 4, POST);
  r.rect(lx - 8, 17, 6, 14, game.barLight);
  r.px(lx - 5, 31, game.barLight);
  r.rect(lx + 4, 17, 6, 14, game.gold);
  r.px(lx + 7, 31, game.gold);
  r.px(lx - 6, 22, game.lime);
  r.px(lx - 5, 23, game.lime);
  r.px(lx + 6, 22, LEAF_DARK);
  r.px(lx + 7, 23, LEAF_DARK);
  tuft(r, lx - 2, 65);
  tuft(r, lx + 5, 66);

  drawAvatar(r, cx, top + hh + 5, profile, options);
};

/** A square portrait: the avatar on a soft green scene with sparkles. */
export const drawPortrait = (r: Raster, profile: AvatarProfile, scene = game.scene) => {
  r.clear(scene);
  const sparkle = mixHex(scene, LEAF, 0.45);
  for (const [x, y] of [
    [8, 12],
    [55, 9],
    [52, 40],
    [9, 44],
  ]) {
    r.px(x, y, sparkle);
    r.px(x - 1, y, sparkle);
    r.px(x + 1, y, sparkle);
    r.px(x, y - 1, sparkle);
    r.px(x, y + 1, sparkle);
  }
  drawAvatar(r, 32, 61, profile, {}, false);
};

const CAT = outlined(
  spriteGrid(
    [
      ".o...o..",
      ".oo.oo..",
      ".owwwo..",
      "owewewo.",
      "owwpwwo.",
      ".owwwo.t",
      ".oowoo.t",
      ".owwwwot",
      ".owwwwo.",
      ".ow.wo..",
    ],
    { o: "#e2a35c", w: "#fbf3e2", e: "#2a1c14", p: "#e58a7a", t: "#e2a35c" },
  ),
  INK,
);

/** The client panel's card: the avatar in a garden with plants and a cat. */
export const drawGarden = (r: Raster, profile: AvatarProfile, scene = game.scene) => {
  r.clear(scene);
  const sparkle = mixHex(scene, LEAF, 0.45);
  for (const [x, y] of [
    [12, 10],
    [84, 12],
    [78, 34],
    [10, 38],
  ]) {
    r.px(x, y, sparkle);
    r.px(x - 1, y, sparkle);
    r.px(x + 1, y, sparkle);
    r.px(x, y - 1, sparkle);
    r.px(x, y + 1, sparkle);
  }
  r.rect(0, 70, 96, 10, LEAF);
  r.rect(0, 68, 96, 2, LEAF_LIGHT);
  for (let x = 2; x < 96; x += 4) tuft(r, x, 70 + ((x * 3) % 4));
  // Plants on both sides.
  for (const [x, h] of [
    [9, 16],
    [16, 11],
    [83, 14],
    [89, 18],
  ]) {
    r.line(x, 70, x, 70 - h, LEAF_DARK);
    for (let k = 3; k < h; k += 3) {
      r.px(x - 1 - (k % 2), 70 - k, LEAF);
      r.px(x + 1 + (k % 2), 70 - k - 1, LEAF_LIGHT);
    }
  }
  drawAvatar(r, 40, 74, profile, {}, false);
  r.grid(CAT, 60, 59);
};

/** One side of the fair banner: trees, bunting and a stall (left) or a lamp and bench (right). */
export const drawBannerSide = (r: Raster, side: "left" | "right") => {
  r.clear(game.bar);
  const tree = (x: number, y: number, s: number) => {
    r.rect(x - 1, y, 3, 8, tone(WOOD, -0.2));
    r.ellipse(x, y - 2, 6 * s, 5 * s, LEAF_DARK);
    r.ellipse(x - 2, y - 4, 4 * s, 4 * s, LEAF);
    r.px(x + 2, y - 5, LEAF_LIGHT);
  };
  r.rect(0, 22, r.w, 4, tone(game.bar, -0.2));
  const colours = [game.gold, "#d2463c", "#fbf6ea", game.lime, "#5b8fd1"];
  for (let x = 2; x < r.w; x += 6) {
    const y = 3 + Math.round(Math.sin(x / 9) * 1.5);
    r.line(x, y, x + 6, y, tone(game.cream, -0.3));
    const c = colours[(x / 6) % colours.length | 0];
    r.poly([[x + 1, y + 1], [x + 5, y + 1], [x + 3, y + 5]], c);
  }
  if (side === "left") {
    tree(8, 15, 1);
    tree(70, 16, 1.1);
    // A striped stall.
    r.rect(28, 12, 26, 10, "#a8744a");
    for (let x = 26; x < 56; x += 4) {
      r.rect(x, 8, 2, 4, "#d2463c");
      r.rect(x + 2, 8, 2, 4, "#fbf6ea");
    }
    r.rect(30, 14, 22, 2, "#f2c94c");
    r.rect(32, 17, 3, 2, "#d2463c");
    r.rect(38, 17, 3, 2, LEAF_LIGHT);
    r.rect(44, 17, 3, 2, "#f29a4b");
  } else {
    tree(20, 15, 1.1);
    tree(86, 15, 1);
    r.rect(52, 4, 2, 20, "#1b1f1d");
    r.rect(50, 3, 6, 3, "#1b1f1d");
    r.rect(51, 4, 4, 1, "#f7d774");
    r.rect(60, 17, 16, 2, "#a8744a");
    r.rect(60, 14, 16, 1, "#a8744a");
    r.rect(61, 19, 1, 3, "#1b1f1d");
    r.rect(74, 19, 1, 3, "#1b1f1d");
  }
  for (let x = 1; x < r.w; x += 7) flower(r, x, 23 + (x % 3), x % 2 ? "#fbf6ea" : "#f29a4b");
};
