// A small software rasteriser for pixel art: whole pixels, no anti-aliasing,
// flat colours with optional alpha. A scene draws into it every frame and
// PixelCanvas shows it scaled up with nearest-neighbour sampling, so edges stay
// as crisp stair-steps at any zoom.

export type RGB = readonly [number, number, number];
export type Point = readonly [number, number];

const parsed = new Map<string, RGB>();

/** '#RRGGBB', '#RGB' or 'rgb(a)(…)' → [r, g, b] (cached). */
export const rgb = (colour: string): RGB => {
  let c = parsed.get(colour);
  if (!c) {
    if (colour[0] === '#') {
      const hex = colour.length === 4 ? [...colour.slice(1)].map((ch) => ch + ch).join('') : colour.slice(1, 7);
      const n = parseInt(hex, 16);
      c = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    } else {
      const m = colour.match(/[\d.]+/g) ?? ['0', '0', '0'];
      c = [Number(m[0]), Number(m[1]), Number(m[2])];
    }
    parsed.set(colour, c);
  }
  return c;
};

const toHex = ([r, g, b]: RGB) => `#${((1 << 24) | (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b)).toString(16).slice(1)}`;

const mixed = new Map<string, string>();
/** Blend of two colours, t 0 → 1 (cached per step of 1/64). */
export const mixHex = (a: string, b: string, t: number) => {
  const q = Math.round(Math.max(0, Math.min(1, t)) * 64);
  const key = `${a}${b}${q}`;
  let c = mixed.get(key);
  if (!c) {
    const x = rgb(a);
    const y = rgb(b);
    c = toHex([x[0] + ((y[0] - x[0]) * q) / 64, x[1] + ((y[1] - x[1]) * q) / 64, x[2] + ((y[2] - x[2]) * q) / 64]);
    mixed.set(key, c);
  }
  return c;
};

/** Pixel-art shading: towards a warm dark (k < 0) or a warm light (k > 0). */
export const tone = (hex: string, k: number) => (k < 0 ? mixHex(hex, '#2A1C14', -k) : mixHex(hex, '#FFF6E2', k));

export class Raster {
  readonly data: Uint8ClampedArray;

  constructor(
    readonly w: number,
    readonly h: number,
  ) {
    this.data = new Uint8ClampedArray(w * h * 4);
  }

  clear(hex?: string) {
    if (!hex) {
      this.data.fill(0);
      return;
    }
    const [r, g, b] = rgb(hex);
    for (let o = 0; o < this.data.length; o += 4) {
      this.data[o] = r;
      this.data[o + 1] = g;
      this.data[o + 2] = b;
      this.data[o + 3] = 255;
    }
  }

  /** A horizontal run of pixels x0..x1 (inclusive) on row y. */
  span(x0: number, x1: number, y: number, hex: string, a = 1) {
    if (y < 0 || y >= this.h || a <= 0) return;
    const from = Math.max(0, Math.floor(x0));
    const to = Math.min(this.w - 1, Math.floor(x1));
    if (to < from) return;
    const [r, g, b] = rgb(hex);
    const d = this.data;
    let o = (y * this.w + from) * 4;
    if (a >= 1) {
      for (let x = from; x <= to; x++, o += 4) {
        d[o] = r;
        d[o + 1] = g;
        d[o + 2] = b;
        d[o + 3] = 255;
      }
      return;
    }
    // Source over destination, straight (non-premultiplied) alpha.
    for (let x = from; x <= to; x++, o += 4) {
      const da = (d[o + 3] / 255) * (1 - a);
      const oa = a + da;
      d[o] = (r * a + d[o] * da) / oa;
      d[o + 1] = (g * a + d[o + 1] * da) / oa;
      d[o + 2] = (b * a + d[o + 2] * da) / oa;
      d[o + 3] = oa * 255;
    }
  }

  px(x: number, y: number, hex: string, a = 1) {
    const xi = Math.floor(x);
    this.span(xi, xi, Math.floor(y), hex, a);
  }

  rect(x: number, y: number, w: number, h: number, hex: string, a = 1) {
    const x0 = Math.round(x);
    const y0 = Math.round(y);
    for (let yy = y0; yy < y0 + Math.round(h); yy++) this.span(x0, x0 + Math.round(w) - 1, yy, hex, a);
  }

  /** Filled polygon, sampled at pixel centres (shared edges never double up or gap). */
  poly(pts: readonly Point[], hex: string, a = 1) {
    let minY = Infinity;
    let maxY = -Infinity;
    for (const [, y] of pts) {
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
    const y0 = Math.max(0, Math.ceil(minY - 0.5));
    const y1 = Math.min(this.h - 1, Math.floor(maxY - 0.5));
    const xs: number[] = [];
    for (let y = y0; y <= y1; y++) {
      const cy = y + 0.5;
      xs.length = 0;
      for (let i = 0; i < pts.length; i++) {
        const [ax, ay] = pts[i];
        const [bx, by] = pts[(i + 1) % pts.length];
        if ((ay <= cy && by > cy) || (by <= cy && ay > cy)) xs.push(ax + ((cy - ay) / (by - ay)) * (bx - ax));
      }
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2) this.span(Math.ceil(xs[k] - 0.5), Math.floor(xs[k + 1] - 0.5), y, hex, a);
    }
  }

  /** Filled ellipse centred on (cx, cy). */
  ellipse(cx: number, cy: number, rx: number, ry: number, hex: string, a = 1) {
    if (rx <= 0 || ry <= 0) return;
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      const dy = (y + 0.5 - cy) / ry;
      if (dy * dy > 1) continue;
      const dx = rx * Math.sqrt(1 - dy * dy);
      this.span(Math.ceil(cx - dx - 0.5), Math.floor(cx + dx - 0.5), y, hex, a);
    }
  }

  circle(cx: number, cy: number, r: number, hex: string, a = 1) {
    this.ellipse(cx, cy, r, r, hex, a);
  }

  /** One-pixel line (Bresenham). */
  line(x0: number, y0: number, x1: number, y1: number, hex: string, a = 1) {
    let x = Math.round(x0);
    let y = Math.round(y0);
    const xe = Math.round(x1);
    const ye = Math.round(y1);
    const dx = Math.abs(xe - x);
    const dy = -Math.abs(ye - y);
    const sx = x < xe ? 1 : -1;
    const sy = y < ye ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.px(x, y, hex, a);
      if (x === xe && y === ye) return;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y += sy;
      }
    }
  }

  /** A grid of colours (null = transparent) with its top-left corner at (x, y). */
  grid(cells: readonly (string | null)[][], x: number, y: number, flip = false, a = 1) {
    const x0 = Math.round(x);
    const y0 = Math.round(y);
    for (let r = 0; r < cells.length; r++) {
      const row = cells[r];
      for (let c = 0; c < row.length; c++) {
        const hex = row[flip ? row.length - 1 - c : c];
        if (hex) this.px(x0 + c, y0 + r, hex, a);
      }
    }
  }
}

/** Builds a sprite grid from text rows and a palette ('.' and unknown keys are transparent). */
export const spriteGrid = (rows: readonly string[], pal: Readonly<Record<string, string>>) => rows.map((row) => [...row].map((ch) => pal[ch] ?? null));

/** Adds a one-pixel outline around the filled cells of a grid (grows it by 1 on every side). */
export const outlined = (cells: readonly (string | null)[][], ink: string) => {
  const h = cells.length + 2;
  const w = (cells[0]?.length ?? 0) + 2;
  const at = (r: number, c: number) => (r >= 1 && r <= cells.length && c >= 1 && c <= cells[r - 1].length ? cells[r - 1][c - 1] : null);
  const out: (string | null)[][] = [];
  for (let r = 0; r < h; r++) {
    const row: (string | null)[] = [];
    for (let c = 0; c < w; c++) {
      const own = at(r, c);
      row.push(own ?? (at(r - 1, c) || at(r + 1, c) || at(r, c - 1) || at(r, c + 1) ? ink : null));
    }
    out.push(row);
  }
  return out;
};
