type ButtonVariant = "primary" | "secondary" | "attention" | "danger" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "border border-emerald-400/30 bg-emerald-500 text-white shadow-[0_12px_32px_rgba(34,197,94,0.18)] hover:bg-emerald-400",
  secondary:
    "border border-[color:var(--q-border)] bg-[rgba(17,28,24,0.78)] text-[var(--q-text-soft)] hover:border-emerald-400/40 hover:text-white",
  attention:
    "border border-amber-400/30 bg-amber-500 text-zinc-950 shadow-[0_12px_32px_rgba(245,158,11,0.16)] hover:bg-amber-400",
  danger:
    "border border-red-400/35 bg-red-500/12 text-red-100 hover:border-red-300 hover:bg-red-500/18",
  ghost:
    "border border-transparent bg-transparent text-[var(--q-muted)] hover:bg-[rgba(17,28,24,0.72)] hover:text-white",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "min-h-9 rounded-xl px-3 py-2 text-xs",
  md: "min-h-11 rounded-2xl px-4 py-2.5 text-sm",
  lg: "min-h-12 rounded-2xl px-5 py-3 text-base",
};

export function Button({
  className = "",
  children,
  variant = "primary",
  size = "md",
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      className={`${SIZE_CLASSES[size]} ${VARIANT_CLASSES[variant]} font-bold transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {children}
    </button>
  );
}
