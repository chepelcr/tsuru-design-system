import { useLayoutEffect, useMemo, useRef, type CSSProperties } from "react";
import { Raster } from "./raster";

/**
 * A low-resolution canvas shown scaled up with nearest-neighbour sampling.
 * `draw` paints into a fresh transparent Raster on every render, so pass a
 * closure over the current state. `scale` is a whole number so every art pixel
 * stays a crisp square; size the element with `style` only to override that.
 */
export function PixelCanvas({
  width,
  height,
  draw,
  scale = 4,
  label,
  className,
  style,
}: {
  width: number;
  height: number;
  draw: (r: Raster) => void;
  scale?: number;
  label?: string;
  className?: string;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const raster = useMemo(() => new Raster(width, height), [width, height]);
  useLayoutEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    raster.clear();
    draw(raster);
    ctx.putImageData(new ImageData(raster.data, width, height), 0, 0);
  });
  const whole = Math.max(1, Math.round(scale));
  return (
    <canvas
      ref={ref}
      width={width}
      height={height}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={["tsr-pixel", className].filter(Boolean).join(" ")}
      style={{ width: width * whole, height: height * whole, ...style }}
    />
  );
}
