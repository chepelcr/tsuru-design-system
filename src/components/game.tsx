import type { HTMLAttributes, ReactNode } from "react";
import { PixelCanvas } from "../pixel/PixelCanvas";
import { drawBannerSide } from "../avatar/scene";
import { cx } from "./primitives";

// The fair's game framing: a forest-green banner with pixel scenery on both
// sides of the title, and a stepped pixel frame for scenes and portraits.

export function PixelBanner({ title, as: Tag = "h1" }: { title: ReactNode; as?: "h1" | "h2" | "div" }) {
  return (
    <div className="tsr-banner">
      <PixelCanvas width={96} height={26} scale={3} draw={(r) => drawBannerSide(r, "left")} className="tsr-banner__side" />
      <Tag className="tsr-banner__title">
        <span className="tsr-banner__leaf" aria-hidden="true" />
        {title}
        <span className="tsr-banner__leaf tsr-banner__leaf--flip" aria-hidden="true" />
      </Tag>
      <PixelCanvas
        width={96}
        height={26}
        scale={3}
        draw={(r) => drawBannerSide(r, "right")}
        className="tsr-banner__side tsr-banner__side--right"
      />
    </div>
  );
}

export function PixelFrame({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cx("tsr-pixel-frame", className)} {...props}>
      {children}
    </div>
  );
}
