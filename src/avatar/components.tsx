import { useEffect, useState } from "react";
import { PixelCanvas } from "../pixel/PixelCanvas";
import { RotateLeftIcon, RotateRightIcon } from "../components/icons";
import { composeAvatar, drawAvatar, FRAMES, SPRITE_SIZE, type ComposeOptions } from "./compose";
import { drawGarden, drawPortrait, drawStage, GARDEN_SIZE, PORTRAIT_SIZE, STAGE_SIZE } from "./scene";
import type { AvatarProfile, Direction, Motion } from "./schema";

export const DIRECTIONS: Direction[] = ["front", "right", "back", "left"];
const DIRECTION_LABEL: Record<Direction, string> = {
  front: "de frente",
  right: "mirando a la derecha",
  back: "de espaldas",
  left: "mirando a la izquierda",
};

/** True when the person asked the system for less motion. */
export function useReducedMotion() {
  const query = "(prefers-reduced-motion: reduce)";
  const [reduced, setReduced] = useState(() => typeof window !== "undefined" && !!window.matchMedia?.(query).matches);
  useEffect(() => {
    const media = window.matchMedia?.(query);
    if (!media) return;
    const update = () => setReduced(media.matches);
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);
  return reduced;
}

/** Cycles through a motion's frames (stays on frame 0 when motion is reduced or paused). */
export function useFrame(motion: Motion, playing = true, msPerFrame = motion === "walk" ? 130 : 650) {
  const reduced = useReducedMotion();
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    if (!playing || reduced) {
      setFrame(0);
      return;
    }
    const id = window.setInterval(() => setFrame((f) => (f + 1) % FRAMES[motion]), msPerFrame);
    return () => window.clearInterval(id);
  }, [motion, playing, reduced, msPerFrame]);
  return frame;
}

const describe = (profile: AvatarProfile) =>
  profile.wheelchair.enabled ? "Tu avatar en silla de ruedas" : "Tu avatar";

/** Just the character, no scene. */
export function AvatarSprite({
  profile,
  scale = 3,
  label,
  ...options
}: ComposeOptions & { profile: AvatarProfile; scale?: number; label?: string }) {
  const sprite = composeAvatar(profile, options);
  return (
    <PixelCanvas
      width={sprite.width}
      height={sprite.height}
      scale={scale}
      label={label ?? describe(profile)}
      draw={(r) => r.grid(sprite.cells, 0, 0)}
    />
  );
}

/** The square portrait used in navigation and headers. */
export function AvatarPortrait({
  profile,
  scale = 2,
  label,
  className,
}: {
  profile: AvatarProfile;
  scale?: number;
  label?: string;
  className?: string;
}) {
  return (
    <PixelCanvas
      width={PORTRAIT_SIZE.width}
      height={PORTRAIT_SIZE.height}
      scale={scale}
      className={["tsr-avatar-portrait", className].filter(Boolean).join(" ")}
      label={label ?? describe(profile)}
      draw={(r) => drawPortrait(r, profile)}
    />
  );
}

/** The garden card from the client panel. */
export function AvatarGarden({ profile, scale = 3, label }: { profile: AvatarProfile; scale?: number; label?: string }) {
  return (
    <PixelCanvas
      width={GARDEN_SIZE.width}
      height={GARDEN_SIZE.height}
      scale={scale}
      className="tsr-avatar-garden"
      label={label ?? `${describe(profile)} en un jardín, junto a un gato`}
      draw={(r) => drawGarden(r, profile)}
    />
  );
}

/** The editor's paved tile, with buttons to turn the avatar around. */
export function AvatarStage({
  profile,
  direction,
  onDirectionChange,
  motion = "idle",
  playing = true,
  scale = 5,
}: {
  profile: AvatarProfile;
  direction: Direction;
  onDirectionChange: (direction: Direction) => void;
  motion?: Motion;
  playing?: boolean;
  scale?: number;
}) {
  const frame = useFrame(motion, playing);
  const turn = (step: number) => {
    const index = DIRECTIONS.indexOf(direction);
    onDirectionChange(DIRECTIONS[(index + step + DIRECTIONS.length) % DIRECTIONS.length]);
  };
  return (
    <div className="tsr-stage">
      <PixelCanvas
        width={STAGE_SIZE.width}
        height={STAGE_SIZE.height}
        scale={scale}
        className="tsr-stage__canvas"
        label={`${describe(profile)}, ${DIRECTION_LABEL[direction]}`}
        draw={(r) => drawStage(r, profile, { direction, motion, frame })}
      />
      <div className="tsr-stage__controls">
        <button type="button" className="tsr-stage__turn" onClick={() => turn(-1)} aria-label="Girar a la izquierda">
          <RotateLeftIcon size={22} />
        </button>
        <button type="button" className="tsr-stage__turn" onClick={() => turn(1)} aria-label="Girar a la derecha">
          <RotateRightIcon size={22} />
        </button>
      </div>
      <p className="tsr-visually-hidden" aria-live="polite">
        {DIRECTION_LABEL[direction]}
      </p>
    </div>
  );
}

/** A small framed figure for example looks. */
export function AvatarFigure({ profile, scale = 2 }: { profile: AvatarProfile; scale?: number }) {
  const w = SPRITE_SIZE.width + 6;
  const h = SPRITE_SIZE.height + 6;
  return (
    <PixelCanvas
      width={w}
      height={h}
      scale={scale}
      draw={(r) => {
        r.ellipse(w / 2, h - 4, 15, 3.5, "#c9b58f");
        r.ellipse(w / 2, h - 5, 14, 3, "#e0cfaa");
        r.px(w / 2 - 9, h - 5, "#5d9c45");
        r.px(w / 2 + 8, h - 4, "#5d9c45");
        drawAvatar(r, w / 2, h - 4, profile, {}, false);
      }}
    />
  );
}
