"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { supabase } from "@/lib/supabase/client";
import { Category } from "@/types/category";
import { Product } from "@/types/product";

type ProductListProps = {
  products: Product[];
  categories?: Category[];
  onUpdated?: (product: Product) => void;
};

type ProductFormState = {
  id: string;
  name: string;
  description: string;
  price: string;
  category_id: string;
  image_url: string;
  preparation_area: string;
  is_active: boolean;
  is_featured: boolean;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value));
}

function createFormState(product: Product): ProductFormState {
  return {
    id: product.id,
    name: product.name,
    description: product.description ?? "",
    price: String(Number(product.price).toFixed(2)),
    category_id: product.category_id ?? "",
    image_url: product.image_url ?? "",
    preparation_area: product.preparation_area,
    is_active: Boolean(product.is_active),
    is_featured: Boolean(product.is_featured),
  };
}

export function ProductList({ products, categories = [], onUpdated }: ProductListProps) {
  const [localProducts, setLocalProducts] = useState<Product[]>(products);
  const [editingProduct, setEditingProduct] = useState<ProductFormState | null>(null);
  const [savingProductId, setSavingProductId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setLocalProducts(products);
  }, [products]);

  async function handleSaveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingProduct) return;

    try {
      setSavingProductId(editingProduct.id);
      setMessage(null);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Sessão não encontrada.");
      }

      const response = await fetch("/api/products", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          id: editingProduct.id,
          name: editingProduct.name,
          description: editingProduct.description,
          price: Number(editingProduct.price),
          category_id: editingProduct.category_id,
          image_url: editingProduct.image_url,
          preparation_area: editingProduct.preparation_area,
          is_active: editingProduct.is_active,
          is_featured: editingProduct.is_featured,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? "Erro ao atualizar produto.");
      }

      const updatedProduct = data.product as Product;

      setLocalProducts((currentProducts) =>
        currentProducts.map((product) =>
          product.id === updatedProduct.id ? updatedProduct : product,
        ),
      );

      onUpdated?.(updatedProduct);
      setEditingProduct(null);
      setMessage("Produto atualizado com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro ao atualizar produto.");
    } finally {
      setSavingProductId(null);
    }
  }

  if (localProducts.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 p-5 text-center">
        <p className="text-sm text-zinc-400">Nenhum produto cadastrado ainda.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {message && (
        <p className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-sm text-zinc-300">
          {message}
        </p>
      )}

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {localProducts.map((product) => (
          <div
            key={product.id}
            className="rounded-2xl border border-white/10 bg-zinc-900/70 p-2.5"
          >
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-zinc-950">
                {product.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[10px] text-zinc-600">
                    Sem foto
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{product.name}</p>
                    <p className="mt-0.5 text-sm font-bold text-orange-300">
                      {formatCurrency(product.price)}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setEditingProduct(createFormState(product))}
                    className="shrink-0 rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-zinc-300 transition hover:border-orange-500 hover:text-white"
                  >
                    Editar
                  </button>
                </div>

                {product.description && (
                  <p className="mt-1 line-clamp-1 text-xs text-zinc-500">
                    {product.description}
                  </p>
                )}

                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-zinc-300">
                    {product.preparation_area === "BAR" ? "Bar" : "Cozinha"}
                  </span>

                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] ${
                      product.is_active
                        ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                        : "border-red-400/30 bg-red-400/10 text-red-300"
                    }`}
                  >
                    {product.is_active ? "Ativo" : "Inativo"}
                  </span>

                  {product.is_featured && (
                    <span className="rounded-full border border-orange-500/30 bg-orange-500/10 px-2 py-0.5 text-[10px] text-orange-400">
                      Destaque
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-0 sm:items-center sm:p-4">
          <form
            onSubmit={handleSaveProduct}
            className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-white/10 bg-zinc-950 p-4 text-white shadow-2xl sm:rounded-3xl sm:p-6"
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold sm:text-xl">Editar produto</h3>
                <p className="mt-1 text-xs text-zinc-400 sm:text-sm">
                  Ajuste informações, preço, foto e disponibilidade.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="rounded-xl border border-white/10 px-3 py-2 text-sm text-zinc-400 hover:text-white"
              >
                Fechar
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <input
                type="text"
                value={editingProduct.name}
                onChange={(event) =>
                  setEditingProduct((current) =>
                    current ? { ...current, name: event.target.value } : current,
                  )
                }
                required
                className="rounded-xl border border-white/10 bg-zinc-900 px-3 py-2.5 text-sm text-white outline-none focus:border-orange-500"
              />

              <input
                type="number"
                step="0.01"
                min="0"
                value={editingProduct.price}
                onChange={(event) =>
                  setEditingProduct((current) =>
                    current ? { ...current, price: event.target.value } : current,
                  )
                }
                required
                className="rounded-xl border border-white/10 bg-zinc-900 px-3 py-2.5 text-sm text-white outline-none focus:border-orange-500"
              />

              <select
                value={editingProduct.category_id}
                onChange={(event) =>
                  setEditingProduct((current) =>
                    current ? { ...current, category_id: event.target.value } : current,
                  )
                }
                required
                className="rounded-xl border border-white/10 bg-zinc-900 px-3 py-2.5 text-sm text-white outline-none focus:border-orange-500"
              >
                <option value="">Selecione uma categoria</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>

              <select
                value={editingProduct.preparation_area}
                onChange={(event) =>
                  setEditingProduct((current) =>
                    current
                      ? { ...current, preparation_area: event.target.value }
                      : current,
                  )
                }
                className="rounded-xl border border-white/10 bg-zinc-900 px-3 py-2.5 text-sm text-white outline-none focus:border-orange-500"
              >
                <option value="KITCHEN">Cozinha</option>
                <option value="BAR">Bar</option>
              </select>

              <input
                type="url"
                value={editingProduct.image_url}
                onChange={(event) =>
                  setEditingProduct((current) =>
                    current ? { ...current, image_url: event.target.value } : current,
                  )
                }
                placeholder="URL da imagem"
                className="rounded-xl border border-white/10 bg-zinc-900 px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-orange-500 md:col-span-2"
              />
            </div>

            {editingProduct.image_url && (
              <div className="mt-3 flex gap-3 rounded-2xl border border-white/10 bg-zinc-900 p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={editingProduct.image_url}
                  alt="Prévia do produto"
                  className="h-16 w-16 shrink-0 rounded-xl object-cover"
                />
                <div className="min-w-0 flex-1 py-1">
                  <p className="text-xs font-medium text-zinc-300">Prévia da imagem</p>
                  <p className="mt-1 truncate text-xs text-zinc-500">
                    {editingProduct.image_url}
                  </p>
                </div>
              </div>
            )}

            <textarea
              value={editingProduct.description}
              onChange={(event) =>
                setEditingProduct((current) =>
                  current ? { ...current, description: event.target.value } : current,
                )
              }
              placeholder="Descrição"
              className="mt-3 min-h-[76px] w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-orange-500"
            />

            <div className="mt-3 grid gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 sm:grid-cols-2">
              <label className="flex items-center gap-2 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  checked={editingProduct.is_active}
                  onChange={(event) =>
                    setEditingProduct((current) =>
                      current ? { ...current, is_active: event.target.checked } : current,
                    )
                  }
                />
                Produto ativo
              </label>

              <label className="flex items-center gap-2 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  checked={editingProduct.is_featured}
                  onChange={(event) =>
                    setEditingProduct((current) =>
                      current
                        ? { ...current, is_featured: event.target.checked }
                        : current,
                    )
                  }
                />
                Produto em destaque
              </label>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="border border-white/10 bg-transparent text-zinc-300 hover:border-orange-500 hover:bg-transparent hover:text-white"
              >
                Cancelar
              </Button>

              <Button type="submit" disabled={savingProductId === editingProduct.id}>
                {savingProductId === editingProduct.id ? "Salvando..." : "Salvar alterações"}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
