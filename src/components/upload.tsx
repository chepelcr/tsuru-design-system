import { useRef, useState, type DragEvent, type ReactNode } from "react";
import { cx } from "./primitives";
import { CheckCircleIcon, FileIcon, ImageIcon, XIcon } from "./icons";

/**
 * A dashed drop area that is also a real file input (keyboard and screen reader
 * friendly). It only hands the chosen file back; size and type checks belong to
 * the caller, which knows the rules and shows its own errors.
 */
export function Dropzone({
  accept,
  label,
  hint,
  disabled,
  onFile,
  id,
}: {
  accept: string;
  label: ReactNode;
  hint?: ReactNode;
  disabled?: boolean;
  onFile: (file: File) => void;
  id?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const drop = (event: DragEvent) => {
    event.preventDefault();
    setOver(false);
    const file = event.dataTransfer.files?.[0];
    if (file && !disabled) onFile(file);
  };
  return (
    <div className="tsr-dropzone-wrap">
      <label
        className={cx("tsr-dropzone", over && "is-over", disabled && "is-disabled")}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={drop}
      >
        <input
          ref={input}
          id={id}
          type="file"
          accept={accept}
          disabled={disabled}
          className="tsr-visually-hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFile(file);
            e.target.value = "";
          }}
        />
        <FileIcon size={28} />
        <span>{label}</span>
      </label>
      {hint ? <span className="tsr-dropzone__hint">{hint}</span> : null}
    </div>
  );
}

/** The chosen file, its state and a remove button. */
export function FileChip({
  name,
  status,
  progress,
  tone = "ready",
  onRemove,
  removeLabel = "Quitar archivo",
  image,
}: {
  name: string;
  status: ReactNode;
  progress?: number;
  tone?: "ready" | "busy" | "error";
  onRemove?: () => void;
  removeLabel?: string;
  image?: boolean;
}) {
  return (
    <div className={cx("tsr-filechip", `tsr-filechip--${tone}`)}>
      <span className="tsr-filechip__icon">{image ? <ImageIcon size={24} /> : <FileIcon size={24} />}</span>
      <span className="tsr-filechip__body">
        <strong>{name}</strong>
        <span className="tsr-filechip__status">
          {tone === "ready" ? <CheckCircleIcon size={16} /> : null}
          {status}
        </span>
        {progress !== undefined ? (
          <progress max={100} value={progress} aria-label={`${name}: ${Math.round(progress)} %`} />
        ) : null}
      </span>
      {onRemove ? (
        <button type="button" className="tsr-icon-button" onClick={onRemove} aria-label={removeLabel}>
          <XIcon size={18} />
        </button>
      ) : null}
    </div>
  );
}
