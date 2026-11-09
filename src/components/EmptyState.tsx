interface EmptyStateProps {
  message: string;
}

export default function EmptyState({ message }: EmptyStateProps) {
  return (
    <div className="flex min-h-[60px] items-center justify-start rounded-sm  bg-transparent py-3 text-left text-sm text-slate-500">
      {message}
    </div>
  );
}
