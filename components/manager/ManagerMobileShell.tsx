"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { Button } from "@/components/ui/Button";

type ManagerMobileShellProps = {
  title: string;
  description: string;
  activeHref: string;
  children: ReactNode;
  action?: ReactNode;
  onLogout?: () => void;
};

const MANAGER_NAV_ITEMS = [
  { href: "/manager", label: "Início", icon: "🏠" },
  { href: "/manager/tables", label: "Mesas", icon: "🪑" },
  { href: "/manager/orders", label: "Pedidos", icon: "📋" },
  { href: "/manager/products", label: "Itens", icon: "🍔" },
  { href: "/manager/categories", label: "Cat.", icon: "📂" },
  { href: "/manager/settings", label: "Config", icon: "⚙️" },
];

export function ManagerMobileShell({
  title,
  description,
  activeHref,
  children,
  action,
  onLogout,
}: ManagerMobileShellProps) {
  return (
    <main className="min-h-screen overflow-x-hidden bg-black text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col bg-zinc-950">
        <header className="sticky top-0 z-40 border-b border-white/10 bg-zinc-950/95 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <Link
                href="/manager"
                className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-bold text-orange-300 transition active:scale-95"
              >
                ← Painel
              </Link>

              <h1 className="mt-3 truncate text-2xl font-black leading-tight tracking-tight">
                {title}
              </h1>

              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-zinc-400">
                {description}
              </p>
            </div>

            {onLogout && (
              <Button
                type="button"
                onClick={onLogout}
                className="shrink-0 border border-white/10 bg-transparent px-3 py-2 text-xs text-zinc-300 hover:border-orange-500 hover:bg-transparent hover:text-white"
              >
                Sair
              </Button>
            )}
          </div>

          {action && <div className="mt-3">{action}</div>}
        </header>

        <section className="flex-1 space-y-4 px-4 py-4 pb-[calc(6.75rem+env(safe-area-inset-bottom))]">
          {children}
        </section>

        <nav className="fixed bottom-0 left-1/2 z-50 w-full max-w-[480px] -translate-x-1/2 border-t border-white/10 bg-zinc-950/95 px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 backdrop-blur">
          <div className="grid grid-cols-6 gap-1">
            {MANAGER_NAV_ITEMS.map((item) => {
              const isActive = activeHref === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`min-w-0 rounded-2xl px-1 py-2 text-center text-[10px] font-semibold transition active:scale-95 ${
                    isActive
                      ? "bg-orange-500 text-white shadow-[0_0_18px_rgba(249,115,22,0.22)]"
                      : "text-zinc-400"
                  }`}
                >
                  <span className="block text-base leading-none">{item.icon}</span>
                  <span className="mt-1 block truncate leading-tight">
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </main>
  );
}

export function MobileSectionCard({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-black leading-tight text-white">{title}</h2>
          {description && (
            <p className="mt-1 text-sm leading-relaxed text-zinc-400">
              {description}
            </p>
          )}
        </div>

        {action && <div className="shrink-0">{action}</div>}
      </div>

      {children && <div className="mt-4">{children}</div>}
    </section>
  );
}

export function MobileMetricCard({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
      <p className="truncate text-xs text-zinc-400">{label}</p>
      <p className="mt-1 truncate text-xl font-black text-white">{value}</p>
    </div>
  );
}

export function MobileMessage({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-sm leading-relaxed text-zinc-300">
      {message}
    </div>
  );
}
