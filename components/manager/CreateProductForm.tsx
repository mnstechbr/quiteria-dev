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

export function CreateProductForm({
  categories,
  onCreated,
}: CreateProductFormProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [preparationArea, setPreparationArea] =
    useState("KITCHEN");
  const [isFeatured, setIsFeatured] = useState(false);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(
    null,
  );

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
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
          preparation_area: preparationArea,
          is_featured: isFeatured,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ?? "Erro ao criar produto.",
        );
      }

      onCreated(data.product);

      setName("");
      setDescription("");
      setPrice("");
      setCategoryId("");
      setPreparationArea("KITCHEN");
      setIsFeatured(false);

      setMessage("Produto criado com sucesso.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Erro ao criar produto.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl border border-white/10 bg-white/[0.04] p-6"
    >
      <div className="mb-4">
        <h2 className="text-xl font-semibold">
          Novo Produto
        </h2>

        <p className="mt-1 text-sm text-zinc-400">
          Cadastre produtos para o cardápio.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <input
          type="text"
          placeholder="Nome do produto"
          value={name}
          onChange={(event) =>
            setName(event.target.value)
          }
          required
          className="rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-sm text-white"
        />

        <input
          type="number"
          step="0.01"
          min="0"
          placeholder="Preço"
          value={price}
          onChange={(event) =>
            setPrice(event.target.value)
          }
          required
          className="rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-sm text-white"
        />

        <select
          value={categoryId}
          onChange={(event) =>
            setCategoryId(event.target.value)
          }
          required
          className="rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-sm text-white"
        >
          <option value="">
            Selecione uma categoria
          </option>

          {categories.map((category) => (
            <option
              key={category.id}
              value={category.id}
            >
              {category.name}
            </option>
          ))}
        </select>

        <select
          value={preparationArea}
          onChange={(event) =>
            setPreparationArea(event.target.value)
          }
          className="rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-sm text-white"
        >
          <option value="KITCHEN">
            Cozinha
          </option>

          <option value="BAR">
            Bar
          </option>
        </select>
      </div>

      <textarea
        placeholder="Descrição"
        value={description}
        onChange={(event) =>
          setDescription(event.target.value)
        }
        className="mt-4 min-h-[100px] w-full rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-sm text-white"
      />

      <label className="mt-4 flex items-center gap-2 text-sm text-zinc-300">
        <input
          type="checkbox"
          checked={isFeatured}
          onChange={(event) =>
            setIsFeatured(event.target.checked)
          }
        />

        Produto em destaque
      </label>

      {message && (
        <p className="mt-4 text-sm text-zinc-300">
          {message}
        </p>
      )}

      <Button
        type="submit"
        disabled={loading}
        className="mt-4"
      >
        {loading
          ? "Criando..."
          : "Criar Produto"}
      </Button>
    </form>
  );
}