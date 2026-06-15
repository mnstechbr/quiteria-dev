"use client";

import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Category } from "@/types/category";
import { Button } from "@/components/ui/Button";

type CreateCategoryFormProps = {
  onCreated: (category: Category) => void;
};

export function CreateCategoryForm({
  onCreated,
}: CreateCategoryFormProps) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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

      const response = await fetch("/api/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          name,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ?? "Erro ao criar categoria.",
        );
      }

      onCreated(data.category);

      setName("");
      setMessage("Categoria criada com sucesso.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Erro ao criar categoria.",
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
          Nova Categoria
        </h2>

        <p className="mt-1 text-sm text-zinc-400">
          Crie categorias para organizar o cardápio.
        </p>
      </div>

      <div className="flex flex-col gap-4 md:flex-row">
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Ex: Pizzas"
          required
          className="flex-1 rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-orange-500"
        />

        <Button
          type="submit"
          disabled={loading}
        >
          {loading ? "Criando..." : "Criar Categoria"}
        </Button>
      </div>

      {message && (
        <p className="mt-4 text-sm text-zinc-300">
          {message}
        </p>
      )}
    </form>
  );
}