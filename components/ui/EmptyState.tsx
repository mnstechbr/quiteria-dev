type EmptyStateProps = {
  message: string;
};

export function EmptyState({
  message,
}: EmptyStateProps) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center">
      <p className="text-sm text-zinc-400">
        {message}
      </p>
    </div>
  );
}