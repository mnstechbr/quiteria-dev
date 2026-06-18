"use client";

import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Category } from "@/types/category";
import { Button } from "@/components/ui/Button";

type CreateCategoryFormProps = {
  onCreated: (category: Category) => void;
};

export function CreateCategoryForm({ onCreated }: CreateCategoryFormProps) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

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
        body: JSON.stringify({ name }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? "Erro ao criar categoria.");
      }

      onCreated(data.category);
      setName("");
      setMessage("Categoria criada com sucesso.");
      setOpen(false);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Erro ao criar categoria.",
      );
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
        + Nova Categoria
      </Button>

      {message && !open && (
        <p className="text-xs text-zinc-400 sm:hidden">{message}</p>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-[480px] rounded-t-3xl border border-white/10 bg-zinc-950 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] text-white shadow-2xl"
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-black">
                  Nova Categoria
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-zinc-400">
                  Crie categorias para organizar o cardápio.
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

            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex: Pizzas"
              required
              autoFocus
              className="w-full rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-orange-500"
            />

            {message && (
              <p className="mt-3 text-sm text-zinc-300">{message}</p>
            )}

            <div className="mt-4 space-y-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="min-h-12 w-full rounded-2xl border border-white/10 px-4 py-3 text-sm font-black text-zinc-300 hover:text-white"
              >
                Cancelar
              </button>

              <Button type="submit" disabled={loading} className="min-h-12 w-full rounded-2xl text-sm font-black">
                {loading ? "Criando..." : "Criar Categoria"}
              </Button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
