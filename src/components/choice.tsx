import type { ReactNode } from "react";
import { cx } from "./primitives";

// Choice controls for the avatar editor and the stand editor. Every option is a
// native radio or checkbox inside its label, so arrow keys, Tab, Space and screen
// readers behave as people expect, and the visible tile is only decoration.

export function ChoiceGroup({
  legend,
  hideLegend,
  children,
  className,
  layout = "tiles",
}: {
  legend: ReactNode;
  hideLegend?: boolean;
  children: ReactNode;
  className?: string;
  layout?: "tiles" | "swatches";
}) {
  return (
    <fieldset className={cx("tsr-choices", `tsr-choices--${layout}`, className)}>
      <legend className={hideLegend ? "tsr-visually-hidden" : "tsr-choices__legend"}>{legend}</legend>
      <div className="tsr-choices__items">{children}</div>
    </fieldset>
  );
}

/** A picture tile (hair style, garment, bag…) backed by a radio or checkbox. */
export function OptionTile({
  name,
  value,
  checked,
  label,
  onSelect,
  children,
  multiple,
  disabled,
  size = "md",
}: {
  name: string;
  value: string;
  checked: boolean;
  label: string;
  onSelect: () => void;
  children: ReactNode;
  multiple?: boolean;
  disabled?: boolean;
  size?: "md" | "lg";
}) {
  return (
    <label className={cx("tsr-tile", size === "lg" && "tsr-tile--lg", checked && "is-checked", disabled && "is-disabled")} title={label}>
      <input
        type={multiple ? "checkbox" : "radio"}
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={onSelect}
        className="tsr-visually-hidden"
      />
      <span className="tsr-tile__art" aria-hidden="true">
        {children}
      </span>
      <span className="tsr-tile__label">{label}</span>
    </label>
  );
}

/** A colour dot backed by a radio. */
export function Swatch({
  name,
  color,
  checked,
  label,
  onSelect,
}: {
  name: string;
  color: string;
  checked: boolean;
  label: string;
  onSelect: () => void;
}) {
  return (
    <label className={cx("tsr-swatch", checked && "is-checked")} title={label}>
      <input type="radio" name={name} value={color} checked={checked} onChange={onSelect} className="tsr-visually-hidden" />
      <span className="tsr-swatch__dot" style={{ background: color }} aria-hidden="true" />
      <span className="tsr-visually-hidden">{label}</span>
    </label>
  );
}

/** A native colour picker drawn as the rainbow dot from the sketches. */
export function CustomColor({
  value,
  onChange,
  label = "Color personalizado",
  showText = true,
}: {
  value: string;
  onChange: (hex: string) => void;
  label?: string;
  showText?: boolean;
}) {
  return (
    <label className="tsr-custom-color">
      <span className="tsr-custom-color__dot" aria-hidden="true" />
      <input type="color" value={value} onChange={(e) => onChange(e.target.value.toLowerCase())} className="tsr-visually-hidden" />
      <span className={showText ? "tsr-custom-color__text" : "tsr-visually-hidden"}>{label}</span>
    </label>
  );
}

/** A row of preset colours plus the custom picker. */
export function SwatchRow({
  name,
  legend,
  colors,
  value,
  onChange,
  customLabel = "Color personalizado",
  hideLegend,
}: {
  name: string;
  legend: ReactNode;
  colors: readonly string[];
  value: string;
  onChange: (hex: string) => void;
  customLabel?: string;
  hideLegend?: boolean;
}) {
  const custom = !colors.includes(value);
  return (
    <ChoiceGroup legend={legend} hideLegend={hideLegend} layout="swatches">
      {colors.map((color, index) => (
        <Swatch
          key={color}
          name={name}
          color={color}
          checked={value === color}
          label={`Tono ${index + 1} (${color})`}
          onSelect={() => onChange(color)}
        />
      ))}
      <span className={cx("tsr-swatch-custom", custom && "is-checked")}>
        <CustomColor value={value} onChange={onChange} label={customLabel} />
      </span>
    </ChoiceGroup>
  );
}

/** Section tabs that switch (and, on wide screens, jump to) a panel. */
export function CategoryTabs<T extends string>({
  items,
  value,
  onChange,
  label,
}: {
  items: { id: T; label: string; icon?: ReactNode }[];
  value: T;
  onChange: (id: T) => void;
  label: string;
}) {
  return (
    <div className="tsr-tabs" role="tablist" aria-label={label} aria-orientation="vertical">
      {items.map((item, index) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          id={`tsr-tab-${item.id}`}
          aria-selected={item.id === value}
          aria-controls={`tsr-panel-${item.id}`}
          tabIndex={item.id === value ? 0 : -1}
          className={cx("tsr-tab", item.id === value && "is-active")}
          onClick={() => onChange(item.id)}
          onKeyDown={(e) => {
            const step = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
            if (!step) return;
            e.preventDefault();
            const next = items[(index + step + items.length) % items.length];
            onChange(next.id);
            document.getElementById(`tsr-tab-${next.id}`)?.focus();
          }}
        >
          {item.icon ? <span className="tsr-tab__icon">{item.icon}</span> : null}
          {item.label}
        </button>
      ))}
    </div>
  );
}

/** A stepped slider with its current step in words (altura, peso). */
export function RangeField({
  id,
  label,
  min,
  max,
  value,
  labels,
  onChange,
}: {
  id: string;
  label: string;
  min: number;
  max: number;
  value: number;
  /** One label per step, from min to max. */
  labels: readonly string[];
  onChange: (value: number) => void;
}) {
  const text = labels[value - min] ?? String(value);
  return (
    <div className="tsr-range">
      <div className="tsr-range__head">
        <label htmlFor={id} className="tsr-range__label">
          {label}
        </label>
        <output htmlFor={id} className="tsr-range__value">
          {text}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        aria-valuetext={text}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <div className="tsr-range__ends" aria-hidden="true">
        <span>{labels[0]}</span>
        <span>{labels[labels.length - 1]}</span>
      </div>
    </div>
  );
}
