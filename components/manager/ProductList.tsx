"use client";

import { Product } from "@/types/product";

type ProductListProps = {
  products: Product[];
};

export function ProductList({
  products,
}: ProductListProps) {
  return (
    <div className="space-y-3">
      {products.map((product) => (
        <div
          key={product.id}
          className="flex items-center justify-between rounded-2xl border border-white/10 bg-zinc-900/70 p-4"
        >
          <div>
            <p className="font-medium">
              {product.name}
            </p>

            <p className="text-sm text-zinc-500">
              R$ {Number(product.price).toFixed(2)}
            </p>

            {product.description && (
              <p className="mt-1 text-sm text-zinc-400">
                {product.description}
              </p>
            )}
          </div>

          <div className="flex flex-col items-end gap-2">
            <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-300">
              {product.preparation_area === "BAR"
                ? "Bar"
                : "Cozinha"}
            </span>

            {product.is_featured && (
              <span className="rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs text-orange-400">
                Destaque
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}