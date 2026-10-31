import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { composeAvatar, FRAMES, SPRITE_SIZE, type Cells } from "../src/avatar/compose";
import { catalog, DEFAULT_AVATAR, type AvatarProfile, type Direction, type Motion, type Pose } from "../src/avatar/schema";

const directions: Direction[] = ["front", "right", "back", "left"];
const poses: Pose[] = ["stand", "sit"];
const motions: Motion[] = ["idle", "walk"];
const filled = (cells: Cells) => cells.flat().filter(Boolean).length;
const hash = (cells: Cells) => createHash("sha1").update(JSON.stringify(cells)).digest("hex").slice(0, 12);

const every = (profile: AvatarProfile, check: (cells: Cells, label: string) => void) => {
  for (const direction of directions)
    for (const pose of poses)
      for (const motion of motions)
        for (let frame = 0; frame < FRAMES[motion]; frame++) {
          const sprite = composeAvatar(profile, { direction, pose, motion, frame });
          check(sprite.cells, `${direction}/${pose}/${motion}/${frame}`);
        }
};

describe("avatar composer", () => {
  it("draws 32 positions per pose, all inside the sprite box", () => {
    let count = 0;
    every(DEFAULT_AVATAR, (cells) => {
      count++;
      expect(cells.length).toBe(SPRITE_SIZE.height);
      expect(cells[0].length).toBe(SPRITE_SIZE.width);
      expect(filled(cells)).toBeGreaterThan(300);
    });
    expect(count).toBe(32 * 2);
  });

  it("draws every catalog piece in every direction, pose and frame", () => {
    const base = DEFAULT_AVATAR;
    const variants: AvatarProfile[] = [
      ...catalog.slots.hair.map((h) => ({ ...base, hair: { ...base.hair, style: h.id } })),
      ...catalog.slots.facial_hair.map((f) => ({ ...base, facial_hair: f.id })),
      ...catalog.slots.body.map((b) => ({ ...base, body: b.id })),
      ...catalog.slots.top.map((t) => ({ ...base, top: { id: t.id } })),
      ...catalog.slots.bottom.map((b) => ({ ...base, bottom: { id: b.id } })),
      ...catalog.slots.dress.map((d) => ({ ...base, top: null, bottom: null, dress: { id: d.id } })),
      ...catalog.slots.shoes.map((s) => ({ ...base, shoes: { id: s.id } })),
      ...catalog.slots.bag.map((b) => ({ ...base, bag: { id: b.id } })),
      ...catalog.slots.accessory.map((a) => ({ ...base, accessories: [{ id: a.id }] })),
      ...catalog.slots.wheelchair.map((w) => ({ ...base, wheelchair: { enabled: true, model: w.id, color: "#2f5f8f" as const } })),
    ];
    for (const variant of variants) every(variant, (cells) => expect(filled(cells)).toBeGreaterThan(300));
  });

  it("gives every garment and bag a visible seated variant", () => {
    // Seated must differ from standing, and the piece must still show when seated.
    const check = (profile: AvatarProfile, color: string) => {
      for (const direction of directions) {
        const stand = composeAvatar(profile, { direction, pose: "stand" }).cells;
        const sit = composeAvatar(profile, { direction, pose: "sit" }).cells;
        expect(hash(stand)).not.toBe(hash(sit));
        expect(sit.flat().some((c) => c === color), `${JSON.stringify(profile.dress ?? profile.bag ?? profile.bottom)} ${direction}`).toBe(true);
      }
    };
    for (const d of catalog.slots.dress) check({ ...DEFAULT_AVATAR, top: null, bottom: null, dress: { id: d.id, color: "#123456" } }, "#123456");
    for (const b of catalog.slots.bottom) check({ ...DEFAULT_AVATAR, bottom: { id: b.id, color: "#123456" } }, "#123456");
    // A bag (or at least its straps) shows in every seated direction.
    for (const b of catalog.slots.bag)
      for (const direction of directions) {
        const without = composeAvatar(DEFAULT_AVATAR, { direction, pose: "sit" }).cells;
        const sit = composeAvatar({ ...DEFAULT_AVATAR, bag: { id: b.id, color: "#123456" } }, { direction, pose: "sit" }).cells;
        expect(hash(sit), `${b.id} ${direction}`).not.toBe(hash(without));
      }
  });

  it("mirrors left from right", () => {
    const right = composeAvatar(DEFAULT_AVATAR, { direction: "right" }).cells;
    const left = composeAvatar(DEFAULT_AVATAR, { direction: "left" }).cells;
    expect(left).toEqual(right.map((row) => [...row].reverse()));
  });

  it("keeps the example looks stable", () => {
    const hashes = catalog.examples.map((e) => hash(composeAvatar(e.profile, { direction: "front" }).cells));
    expect(new Set(hashes).size).toBe(catalog.examples.length);
    expect(hashes).toMatchSnapshot();
  });

  it("draws only the requested layers for thumbnails", () => {
    const top = composeAvatar(DEFAULT_AVATAR, { layers: ["top"] }).cells;
    const all = composeAvatar(DEFAULT_AVATAR).cells;
    expect(filled(top)).toBeGreaterThan(50);
    expect(filled(top)).toBeLessThan(filled(all));
    expect(top.flat()).not.toContain(DEFAULT_AVATAR.skin);
  });
});

describe("altura y peso", () => {
  const top = (cells: Cells) => cells.findIndex((row) => row.some(Boolean));
  const bottom = (cells: Cells) => cells.length - 1 - [...cells].reverse().findIndex((row) => row.some(Boolean));
  const widthAt = (cells: Cells, r: number) => cells[r].filter(Boolean).length;
  const steps = [-2, -1, 0, 1, 2];

  it("grows upward from the floor and widens the body, in every direction and pose", () => {
    for (const direction of directions)
      for (const pose of poses) {
        const tops = steps.map((height) => top(composeAvatar({ ...DEFAULT_AVATAR, height }, { direction, pose }).cells));
        const feet = steps.map((height) => bottom(composeAvatar({ ...DEFAULT_AVATAR, height }, { direction, pose }).cells));
        // Taller means the head sits higher; the feet never move.
        for (let k = 1; k < tops.length; k++) expect(tops[k], `${direction}/${pose}`).toBeLessThan(tops[k - 1]);
        expect(new Set(feet).size).toBe(1);
        const waist = bottom(composeAvatar(DEFAULT_AVATAR, { direction, pose }).cells) - 14;
        const widths = steps.map((weight) => widthAt(composeAvatar({ ...DEFAULT_AVATAR, weight }, { direction, pose }).cells, waist));
        for (let k = 1; k < widths.length; k++) expect(widths[k], `${direction}/${pose}`).toBeGreaterThanOrEqual(widths[k - 1]);
        expect(widths[4]).toBeGreaterThan(widths[0]);
      }
  });

  it("keeps the extremes inside the sprite box and the wheelchair on the floor", () => {
    for (const height of [-2, 2])
      for (const weight of [-2, 2])
        for (const direction of directions) {
          const look = { ...DEFAULT_AVATAR, height, weight, accessories: [{ id: "hat" }], wheelchair: { enabled: true, model: "classic", color: "#2b2f36" as const } };
          const cells = composeAvatar(look, { direction }).cells;
          expect(top(cells)).toBeGreaterThan(0);
          expect(cells.length).toBe(SPRITE_SIZE.height);
          expect(bottom(cells)).toBe(bottom(composeAvatar({ ...look, height: 0, weight: 0 }, { direction }).cells));
        }
  });
});
