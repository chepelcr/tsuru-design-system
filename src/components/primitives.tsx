import {
  forwardRef,
  useId,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import type { StatusTone } from "../tokens/tokens";
import {
  AlertIcon,
  CheckCircleIcon,
  ClockIcon,
  HourglassIcon,
  InfoIcon,
  PackageIcon,
  XCircleIcon,
} from "./icons";

// Accessible building blocks. Each is a thin wrapper over a `tsr-*` class from
// components.css, so the same look is available to plain HTML (a Phaser overlay,
// a server-rendered page) by using the class names directly.

export const cx = (...names: (string | false | null | undefined)[]) => names.filter(Boolean).join(" ");

export type ButtonVariant = "primary" | "outline" | "ghost" | "link" | "danger";

export const buttonClass = (variant: ButtonVariant = "primary", size: "md" | "lg" | "sm" = "md", block = false) =>
  cx("tsr-button", `tsr-button--${variant}`, size !== "md" && `tsr-button--${size}`, block && "tsr-button--block");

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant;
    size?: "md" | "lg" | "sm";
    block?: boolean;
    icon?: ReactNode;
    trailingIcon?: ReactNode;
    busy?: boolean;
  }
>(function Button({ variant = "primary", size = "md", block, icon, trailingIcon, busy, className, children, type, ...props }, ref) {
  return (
    <button
      ref={ref}
      type={type ?? "button"}
      className={cx(buttonClass(variant, size, block), className)}
      aria-busy={busy || undefined}
      {...props}
    >
      {icon}
      {children}
      {trailingIcon}
    </button>
  );
});

export function Card({
  as: Tag = "section",
  tone,
  className,
  children,
  ...props
}: HTMLAttributes<HTMLElement> & { as?: "section" | "article" | "div" | "aside"; tone?: "sunken" | "accent" }) {
  return (
    <Tag className={cx("tsr-card", tone && `tsr-card--${tone}`, className)} {...props}>
      {children}
    </Tag>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
  className,
  htmlFor,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
  className?: string;
  htmlFor?: string;
}) {
  return (
    <div className={cx("tsr-field", error ? "tsr-field--error" : null, className)}>
      <label className="tsr-field__label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint && !error ? <span className="tsr-field__hint">{hint}</span> : null}
      {error ? (
        <span className="tsr-field__error" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref,
) {
  return <input ref={ref} className={cx("tsr-input", className)} {...props} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, children, ...props },
  ref,
) {
  return (
    <span className="tsr-select">
      <select ref={ref} className={cx("tsr-input", className)} {...props}>
        {children}
      </select>
    </span>
  );
});

const STATUS_ICONS: Record<StatusTone, ReactNode> = {
  success: <CheckCircleIcon size={18} />,
  warning: <ClockIcon size={18} />,
  review: <AlertIcon size={18} />,
  pending: <HourglassIcon size={18} />,
  info: <PackageIcon size={18} />,
  danger: <XCircleIcon size={18} />,
};

/** A status pill: tone, icon and words (colour is never the only signal). */
export function StatusChip({
  tone,
  icon,
  children,
  className,
  size = "md",
}: {
  tone: StatusTone;
  icon?: ReactNode | false;
  children: ReactNode;
  className?: string;
  size?: "md" | "lg";
}) {
  return (
    <span className={cx("tsr-chip", `tsr-chip--${tone}`, size === "lg" && "tsr-chip--lg", className)}>
      {icon === false ? null : <span className="tsr-chip__icon">{icon ?? STATUS_ICONS[tone]}</span>}
      <span>{children}</span>
    </span>
  );
}

/** A labelled status block: "Pedido: Pendiente". */
export function StatusPill({
  tone,
  label,
  value,
  icon,
}: {
  tone: StatusTone;
  label: ReactNode;
  value: ReactNode;
  icon: ReactNode;
}) {
  return (
    <div className={cx("tsr-status-pill", `tsr-status-pill--${tone}`)}>
      <span className="tsr-status-pill__icon">{icon}</span>
      <span className="tsr-status-pill__label">{label}:</span>
      <strong className="tsr-status-pill__value">{value}</strong>
    </div>
  );
}

export function Notice({
  tone = "notice",
  icon,
  children,
  className,
  role,
}: {
  tone?: "notice" | "info" | "danger" | "success";
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  role?: "status" | "alert";
}) {
  return (
    <div className={cx("tsr-notice", `tsr-notice--${tone}`, className)} role={role}>
      <span className="tsr-notice__icon">{icon ?? (tone === "danger" ? <AlertIcon /> : <InfoIcon />)}</span>
      <div>{children}</div>
    </div>
  );
}

export interface Step {
  label: ReactNode;
  detail?: ReactNode;
  state: "done" | "current" | "upcoming";
  icon: ReactNode;
}

/** A horizontal progress tracker (vertical on narrow screens). */
export function Stepper({ steps, label }: { steps: Step[]; label: string }) {
  return (
    <ol className="tsr-stepper" aria-label={label}>
      {steps.map((step, index) => (
        <li
          key={index}
          className={cx("tsr-step", `tsr-step--${step.state}`)}
          aria-current={step.state === "current" ? "step" : undefined}
        >
          <span className="tsr-step__dot">{step.icon}</span>
          <span className="tsr-step__text">
            <strong>{step.label}</strong>
            {step.detail ? <small>{step.detail}</small> : null}
          </span>
          <span className="tsr-visually-hidden">
            {step.state === "done" ? "Completado" : step.state === "current" ? "En curso" : "Pendiente"}
          </span>
        </li>
      ))}
    </ol>
  );
}

export function EmptyState({ icon, title, children }: { icon?: ReactNode; title: ReactNode; children?: ReactNode }) {
  return (
    <div className="tsr-empty">
      {icon ? <span className="tsr-empty__icon">{icon}</span> : null}
      <strong>{title}</strong>
      {children ? <p>{children}</p> : null}
    </div>
  );
}

export function Skeleton({ lines = 3, label = "Cargando" }: { lines?: number; label?: string }) {
  return (
    <div className="tsr-skeleton" role="status" aria-label={label}>
      {Array.from({ length: lines }, (_, i) => (
        <span key={i} style={{ width: `${92 - i * 14}%` }} />
      ))}
    </div>
  );
}

export function VisuallyHidden({ children }: { children: ReactNode }) {
  return <span className="tsr-visually-hidden">{children}</span>;
}

/** A tinted square with a store or product icon (tables, lists). */
export function Mark({
  tone = "leaf",
  children,
  image,
  label,
}: {
  tone?: "rose" | "leaf" | "sky" | "sand";
  children?: ReactNode;
  image?: string | null;
  label?: string;
}) {
  return (
    <span className={cx("tsr-mark", `tsr-mark--${tone}`)} aria-hidden={label ? undefined : true} title={label}>
      {image ? <img src={image} alt={label ?? ""} loading="lazy" /> : children}
    </span>
  );
}

export function useFieldId(prefix = "tsr") {
  return `${prefix}-${useId().replace(/:/g, "")}`;
}
