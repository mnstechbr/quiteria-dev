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
        className="w-full sm:w-auto"
      >
        + Novo Produto
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-0 sm:items-center sm:p-4">
          <form
            onSubmit={handleSubmit}
            className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-white/10 bg-zinc-950 p-4 text-white shadow-2xl sm:rounded-3xl sm:p-6"
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold sm:text-xl">Novo Produto</h2>
                <p className="mt-1 text-xs text-zinc-400 sm:text-sm">
                  Cadastre produtos usando imagem por URL.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl border border-white/10 px-3 py-2 text-sm text-zinc-400 hover:text-white"
              >
                Fechar
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <input
                type="text"
                placeholder="Nome do produto"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                className="rounded-xl border border-white/10 bg-zinc-900 px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-orange-500"
              />

              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="Preço"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                required
                className="rounded-xl border border-white/10 bg-zinc-900 px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-orange-500"
              />

              <select
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
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
                value={preparationArea}
                onChange={(event) => setPreparationArea(event.target.value)}
                className="rounded-xl border border-white/10 bg-zinc-900 px-3 py-2.5 text-sm text-white outline-none focus:border-orange-500"
              >
                <option value="KITCHEN">Cozinha</option>
                <option value="BAR">Bar</option>
              </select>

              <input
                type="url"
                placeholder="URL da imagem do produto"
                value={imageUrl}
                onChange={(event) => setImageUrl(event.target.value)}
                className="rounded-xl border border-white/10 bg-zinc-900 px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-orange-500 md:col-span-2"
              />
            </div>

            {imageUrl && (
              <div className="mt-3 flex gap-3 rounded-2xl border border-white/10 bg-zinc-900 p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt="Prévia do produto"
                  className="h-16 w-16 shrink-0 rounded-xl object-cover"
                />
                <div className="min-w-0 flex-1 py-1">
                  <p className="text-xs font-medium text-zinc-300">Prévia da imagem</p>
                  <p className="mt-1 truncate text-xs text-zinc-500">{imageUrl}</p>
                </div>
              </div>
            )}

            <textarea
              placeholder="Descrição"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="mt-3 min-h-[76px] w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-orange-500"
            />

            <label className="mt-3 flex items-center gap-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={(event) => setIsFeatured(event.target.checked)}
              />
              Produto em destaque
            </label>

            {message && <p className="mt-3 text-sm text-zinc-300">{message}</p>}

            <Button type="submit" disabled={loading} className="mt-4 w-full sm:w-auto">
              {loading ? "Criando..." : "Criar Produto"}
            </Button>
          </form>
        </div>
      )}
    </>
  );
}
