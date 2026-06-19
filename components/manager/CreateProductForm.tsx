"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/Button";
import { supabase } from "@/lib/supabase/client";
import { Category } from "@/types/category";
import { Product } from "@/types/product";

type CreateProductFormProps = {
  categories: Category[];
  onCreated: (product: Product) => void;
};

export function CreateProductForm({ categories, onCreated }: CreateProductFormProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [preparationArea, setPreparationArea] = useState("KITCHEN");
  const [isFeatured, setIsFeatured] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function resetForm() {
    setName("");
    setDescription("");
    setPrice("");
    setCategoryId("");
    setImageUrl("");
    setPreparationArea("KITCHEN");
    setIsFeatured(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setLoading(true);
      setMessage(null);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Sessão não encontrada.");
      }

      const response = await fetch("/api/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          name,
          description,
          price: Number(price),
          category_id: categoryId,
          image_url: imageUrl,
          preparation_area: preparationArea,
          is_featured: isFeatured,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? "Erro ao criar produto.");
      }

      onCreated(data.product);
      resetForm();
      setMessage("Produto criado com sucesso.");
      setOpen(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro ao criar produto.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        onClick={() => {
          setMessage(null);
          setOpen(true);
        }}
        className="min-h-12 w-full rounded-2xl text-sm font-black"
      >
        + Novo Produto
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--q-bg-outer)]/75 p-0">
          <form
            onSubmit={handleSubmit}
            className="max-h-[92vh] w-full max-w-[480px] overflow-y-auto rounded-t-3xl border border-[color:var(--q-border)] bg-[var(--q-bg)] p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] text-white shadow-2xl"
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-black">Novo Produto</h2>
                <p className="mt-1 text-sm leading-relaxed text-[var(--q-muted)]">
                  Cadastre produtos usando imagem por URL.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl border border-[color:var(--q-border)] px-3 py-2 text-sm text-[var(--q-muted)] hover:text-white"
              >
                Fechar
              </button>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                placeholder="Nome do produto"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                className="w-full rounded-2xl border border-[color:var(--q-border)] bg-[var(--q-card)] px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-emerald-500"
              />

              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="Preço"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                required
                className="w-full rounded-2xl border border-[color:var(--q-border)] bg-[var(--q-card)] px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-emerald-500"
              />

              <select
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
                required
                className="w-full rounded-2xl border border-[color:var(--q-border)] bg-[var(--q-card)] px-4 py-3 text-sm text-white outline-none focus:border-emerald-500"
              >
                <option value="">Selecione uma categoria</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>

              <select
                value={preparationArea}
                onChange={(event) => setPreparationArea(event.target.value)}
                className="w-full rounded-2xl border border-[color:var(--q-border)] bg-[var(--q-card)] px-4 py-3 text-sm text-white outline-none focus:border-emerald-500"
              >
                <option value="KITCHEN">Cozinha</option>
                <option value="BAR">Bar</option>
              </select>

              <input
                type="url"
                placeholder="URL da imagem do produto"
                value={imageUrl}
                onChange={(event) => setImageUrl(event.target.value)}
                className="w-full rounded-2xl border border-[color:var(--q-border)] bg-[var(--q-card)] px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-emerald-500"
              />
            </div>

            {imageUrl && (
              <div className="mt-3 flex gap-3 rounded-2xl border border-[color:var(--q-border)] bg-[var(--q-card)] p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt="Prévia do produto"
                  className="h-16 w-16 shrink-0 rounded-xl object-cover"
                />
                <div className="min-w-0 flex-1 py-1">
                  <p className="text-xs font-medium text-[var(--q-text-soft)]">Prévia da imagem</p>
                  <p className="mt-1 truncate text-xs text-[var(--q-dim)]">{imageUrl}</p>
                </div>
              </div>
            )}

            <textarea
              placeholder="Descrição"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="mt-3 min-h-[88px] w-full rounded-2xl border border-[color:var(--q-border)] bg-[var(--q-card)] px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-emerald-500"
            />

            <label className="mt-3 flex items-center gap-2 text-sm text-[var(--q-text-soft)]">
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={(event) => setIsFeatured(event.target.checked)}
              />
              Produto em destaque
            </label>

            {message && <p className="mt-3 text-sm text-[var(--q-text-soft)]">{message}</p>}

            <Button type="submit" disabled={loading} className="mt-4 min-h-12 w-full rounded-2xl text-sm font-black">
              {loading ? "Criando..." : "Criar Produto"}
            </Button>
          </form>
        </div>
      )}
    </>
  );
}
