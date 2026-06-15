type BadgeProps = {
  children: React.ReactNode;
};

export function Badge({ children }: BadgeProps) {
  return (
    <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-300">
      {children}
    </span>
  );
}