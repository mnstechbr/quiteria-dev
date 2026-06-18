import { ReactNode } from "react";

type CardProps = {
  children: ReactNode;
};

export function Card({ children }: CardProps) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 sm:p-6">
      {children}
    </div>
  );
}
