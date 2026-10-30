import type { SVGProps } from "react";

// A small stroke icon set (24 × 24, 2 px, round caps) so the package needs no
// icon dependency. Apps may pass their own icons to any component instead.

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

const make = (paths: string[], name: string) => {
  const Icon = ({ size = 20, ...props }: IconProps) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
  Icon.displayName = name;
  return Icon;
};

export const CheckIcon = make(["M20 6 9 17l-5-5"], "CheckIcon");
export const CheckCircleIcon = make(["M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z", "m8 12 3 3 5-6"], "CheckCircleIcon");
export const ClockIcon = make(["M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z", "M12 7v5l3 2"], "ClockIcon");
export const HourglassIcon = make(["M6 2h12M6 22h12", "M7 2v4l5 6 5-6V2M7 22v-4l5-6 5 6v4"], "HourglassIcon");
export const AlertIcon = make(["M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z", "M12 7v6", "M12 17h.01"], "AlertIcon");
export const InfoIcon = make(["M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z", "M12 11v6", "M12 7h.01"], "InfoIcon");
export const PackageIcon = make(["m21 8-9-5-9 5v8l9 5 9-5Z", "m3 8 9 5 9-5", "M12 13v8"], "PackageIcon");
export const XIcon = make(["M18 6 6 18M6 6l12 12"], "XIcon");
export const XCircleIcon = make(["M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z", "m15 9-6 6M9 9l6 6"], "XCircleIcon");
export const UploadFileIcon = make(["M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z", "M14 2v6h6", "M12 18v-6m-3 3 3-3 3 3"], "UploadFileIcon");
export const FileIcon = make(["M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z", "M14 2v6h6"], "FileIcon");
export const ImageIcon = make(["M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z", "m21 15-5-5L5 21", "M9 8.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0Z"], "ImageIcon");
export const RotateLeftIcon = make(["M3 7v6h6", "M21 17a9 9 0 0 0-15-6.7L3 13"], "RotateLeftIcon");
export const RotateRightIcon = make(["M21 7v6h-6", "M3 17a9 9 0 0 1 15-6.7L21 13"], "RotateRightIcon");
export const ResetIcon = make(["M3 12a9 9 0 1 0 3-6.7L3 8", "M3 3v5h5"], "ResetIcon");
export const EyeIcon = make(["M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z", "M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"], "EyeIcon");
export const PaletteIcon = make(["M12 22a10 10 0 1 1 10-10c0 2.8-2.2 3.5-4 3.5h-1.5a1.5 1.5 0 0 0-1 2.6A1.6 1.6 0 0 1 12 22Z", "M7.5 10.5h.01M10.5 7h.01M15 7.5h.01M17 11h.01"], "PaletteIcon");
export const StoreIcon = make(["M3 9 4.5 4h15L21 9", "M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0", "M5 12v8h14v-8", "M10 20v-5h4v5"], "StoreIcon");
export const ChevronRightIcon = make(["m9 18 6-6-6-6"], "ChevronRightIcon");
export const ChevronLeftIcon = make(["m15 18-6-6 6-6"], "ChevronLeftIcon");
export const ArrowLeftIcon = make(["M19 12H5", "m12 19-7-7 7-7"], "ArrowLeftIcon");
export const SendIcon = make(["m22 2-7 20-4-9-9-4Z", "M22 2 11 13"], "SendIcon");
export const ReceiptIcon = make(["M5 2h14v20l-3-2-2 2-2-2-2 2-2-2-3 2Z", "M9 7h6M9 11h6M9 15h4"], "ReceiptIcon");
export const CardIcon = make(["M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z", "M2 10h20", "M6 15h4"], "CardIcon");
export const SparkleIcon = make(["M12 3v4M12 17v4M3 12h4M17 12h4", "m6 6 2 2m8 8 2 2M6 18l2-2m8-8 2-2"], "SparkleIcon");
