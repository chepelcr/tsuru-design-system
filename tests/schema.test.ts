import { describe, expect, it } from "vitest";
import {
  catalog,
  DEFAULT_AVATAR,
  migrateV1,
  normalizeAvatar,
  poseFor,
  validateAvatar,
  type AvatarProfile,
} from "../src/avatar/schema";

describe("avatar schema", () => {
  it("accepts the default and every example", () => {
    expect(validateAvatar(DEFAULT_AVATAR)).toEqual([]);
    for (const example of catalog.examples) expect(validateAvatar(example.profile), example.label).toEqual([]);
  });

  it("upgrades every first-version avatar", () => {
    for (const hair of ["short", "long", "curly"] as const)
      for (const outfit of ["forest", "earth", "ocean"] as const)
        for (const accessory of ["none", "bag", "hat", "wheelchair"] as const) {
          const v2 = migrateV1({ hair, outfit, accessory });
          expect(validateAvatar(v2)).toEqual([]);
          expect(v2.wheelchair.enabled).toBe(accessory === "wheelchair");
          expect(Boolean(v2.bag)).toBe(accessory === "bag");
        }
    expect(normalizeAvatar({}).v).toBe(2);
    expect(normalizeAvatar(null)).toEqual(DEFAULT_AVATAR);
    expect(normalizeAvatar({ hair: "curly", accessory: "wheelchair" }).hair.style).toBe("curly");
  });

  it("keeps wheelchair, dress, bag and custom hair colour together", () => {
    const look: AvatarProfile = {
      ...DEFAULT_AVATAR,
      hair: { style: "bob", color: "#b8552a" },
      top: null,
      bottom: null,
      dress: { id: "midi", color: "#1f6f6b" },
      bag: { id: "crossbody", color: "#8a5a33" },
      wheelchair: { enabled: true, model: "classic", color: "#2b2f36" },
    };
    expect(validateAvatar(look)).toEqual([]);
    expect(normalizeAvatar(look)).toEqual(look);
    expect(poseFor(look, "stand")).toBe("sit");
  });

  it("rejects what the server would refuse", () => {
    const bad = {
      ...DEFAULT_AVATAR,
      hair: { style: "https://example.invalid/x.png", color: "red" },
      dress: { id: "midi" },
      accessories: [{ id: "hat" }, { id: "cap" }],
    } as unknown as AvatarProfile;
    const errors = validateAvatar(bad);
    expect(errors.some((e) => e.includes("hair"))).toBe(true);
    expect(errors.some((e) => e.includes("hair.color"))).toBe(true);
    expect(errors).toContain("a dress replaces top and bottom");
    expect(errors.some((e) => e.includes("one accessory per group"))).toBe(true);
  });

  it("normalises unknown values instead of failing to draw", () => {
    const fixed = normalizeAvatar({
      v: 2,
      body: "giant",
      skin: "javascript:alert(1)",
      hair: { style: "mohawk", color: "#ABCDEF" },
      accessories: [{ id: "hat" }, { id: "cap" }, { id: "glasses" }, { id: "x" }],
      top: { id: "tee", color: "#123456" },
      bottom: { id: "cape" },
    });
    expect(fixed.body).toBe("standard");
    expect(fixed.skin).toBe(DEFAULT_AVATAR.skin);
    expect(fixed.hair).toEqual({ style: DEFAULT_AVATAR.hair.style, color: "#abcdef" });
    expect(fixed.accessories.map((a) => a.id)).toEqual(["hat", "glasses"]);
    expect(fixed.bottom).toEqual(DEFAULT_AVATAR.bottom);
    expect(validateAvatar(fixed)).toEqual([]);
  });

  it("has no access-related field", () => {
    // Appearance never carries speed, role or permission data.
    const keys = Object.keys(DEFAULT_AVATAR).sort();
    expect(keys).toEqual(["accessories", "bag", "body", "bottom", "dress", "facial_hair", "hair", "height", "shoes", "skin", "top", "v", "weight", "wheelchair"]);
  });

  it("clamps altura and peso and reads the old broad body as heavier", () => {
    expect(normalizeAvatar({ ...DEFAULT_AVATAR, height: 9, weight: -7.6 })).toMatchObject({ height: 2, weight: -2 });
    expect(normalizeAvatar({ ...DEFAULT_AVATAR, height: "tall" })).toMatchObject({ height: 0 });
    expect(normalizeAvatar({ v: 2, body: "broad" })).toMatchObject({ body: "standard", weight: 1 });
    expect(normalizeAvatar(migrateV1({ hair: "short" }))).toMatchObject({ height: 0, weight: 0 });
    expect(validateAvatar({ ...DEFAULT_AVATAR, height: 1.5 })).toContain("height: integer -2…2");
    expect(validateAvatar({ ...DEFAULT_AVATAR, weight: 3 })).toContain("weight: integer -2…2");
  });
});
