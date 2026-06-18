"use client";

import { Category } from "@/types/category";

type CategoryListProps = {
  categories: Category[];
};

export function CategoryList({ categories }: CategoryListProps) {
  if (categories.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 p-5 text-center">
        <p className="text-sm text-zinc-400">Nenhuma categoria cadastrada.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {categories.map((category) => (
        <div
          key={category.id}
          className="flex min-h-[58px] items-center justify-between gap-3 rounded-2xl border border-white/10 bg-zinc-900/70 px-3 py-2 sm:min-h-[64px] sm:px-4 sm:py-3"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight sm:text-base">
              {category.name}
            </p>
            <p className="mt-0.5 text-[11px] text-zinc-500 sm:text-xs">
              Ordem: {category.sort_order ?? "-"}
            </p>
          </div>

          <span className="shrink-0 rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-zinc-300 sm:text-xs">
            {category.is_active ? "Ativa" : "Inativa"}
          </span>
        </div>
      ))}
    </div>
  );
}
