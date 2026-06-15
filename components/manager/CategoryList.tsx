"use client";

import { Category } from "@/types/category";

type CategoryListProps = {
  categories: Category[];
};

export function CategoryList({ categories }: CategoryListProps) {
  return (
    <div className="space-y-3">
      {categories.map((category) => (
        <div
          key={category.id}
          className="flex items-center justify-between rounded-2xl border border-white/10 bg-zinc-900/70 p-4"
        >
          <div>
            <p className="font-medium">{category.name}</p>
            <p className="text-sm text-zinc-500">
              Ordem: {category.sort_order ?? "-"}
            </p>
          </div>

          <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-300">
            {category.is_active ? "Ativa" : "Inativa"}
          </span>
        </div>
      ))}
    </div>
  );
}