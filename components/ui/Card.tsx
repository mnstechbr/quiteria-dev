import { ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  className?: string;
};

export function Card({ children, className = "" }: CardProps) {
  return (
    <div className={`q-card rounded-[1.25rem] p-4 sm:p-6 ${className}`}>
      {children}
    </div>
  );
}
