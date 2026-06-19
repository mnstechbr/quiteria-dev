type EmptyStateProps = {
  message: string;
  title?: string;
  action?: React.ReactNode;
};

export function EmptyState({ message, title = "Nada para exibir", action }: EmptyStateProps) {
  return (
    <div className="rounded-[1.25rem] border border-dashed border-[color:var(--q-border)] bg-[rgba(13,21,18,0.74)] p-6 text-center">
      <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-emerald-400/50" />
      <p className="text-sm font-bold text-white">{title}</p>
      <p className="mt-2 text-sm leading-relaxed text-[var(--q-muted)]">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
