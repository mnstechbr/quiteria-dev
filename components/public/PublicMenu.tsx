"use client";

import { useMemo, useState } from "react";

type PublicMenuProduct = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_featured: boolean;
  preparation_area: string;
  is_active: boolean;
};

type PublicMenuCategory = {
  id: string;
  name: string;
  sort_order: number | null;
  products: PublicMenuProduct[];
};

type PublicMenuRestaurant = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
};

type PublicMenuTable = {
  id: string;
  name: string;
  restaurant_id: string;
};

type PublicMenuSession = {
  id: string;
  status: string;
};

type CartItem = {
  product: PublicMenuProduct;
  quantity: number;
};

type PublicMenuProps = {
  restaurant: PublicMenuRestaurant;
  table: PublicMenuTable;
  session: PublicMenuSession;
  categories: PublicMenuCategory[];
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value));
}

function getSessionMessage(status: string) {
  if (status === "PENDING_APPROVAL") {
    return "A equipe já foi avisada. Você pode olhar o cardápio enquanto sua mesa é confirmada.";
  }

  if (status === "OPEN") {
    return "Mesa liberada. Você já pode continuar usando o cardápio normalmente.";
  }

  if (status === "BILL_REQUESTED") {
    return "A conta foi solicitada. Aguarde a equipe ir até a mesa.";
  }

  return "Bem-vindo ao cardápio digital.";
}

export function PublicMenu({
  restaurant,
  table,
  session,
  categories,
}: PublicMenuProps) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderMessage, setOrderMessage] = useState<string | null>(null);

  const categoriesWithProducts = categories.map((category) => ({
    ...category,
    products: category.products.filter((product) => product.is_active),
  }));

  const cartTotal = useMemo(() => {
    return cartItems.reduce(
      (total, item) => total + Number(item.product.price) * item.quantity,
      0,
    );
  }, [cartItems]);

  const cartQuantity = useMemo(() => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  }, [cartItems]);

  function addProduct(product: PublicMenuProduct) {
    setOrderMessage(null);

    setCartItems((currentItems) => {
      const existingItem = currentItems.find(
        (item) => item.product.id === product.id,
      );

      if (existingItem) {
        return currentItems.map((item) =>
          item.product.id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
              }
            : item,
        );
      }

      return [
        ...currentItems,
        {
          product,
          quantity: 1,
        },
      ];
    });
  }

  function decreaseProduct(productId: string) {
    setOrderMessage(null);

    setCartItems((currentItems) => {
      return currentItems
        .map((item) =>
          item.product.id === productId
            ? {
                ...item,
                quantity: item.quantity - 1,
              }
            : item,
        )
        .filter((item) => item.quantity > 0);
    });
  }

  function removeProduct(productId: string) {
    setOrderMessage(null);

    setCartItems((currentItems) =>
      currentItems.filter((item) => item.product.id !== productId),
    );
  }

  async function submitOrder() {
    if (cartItems.length === 0) {
      setOrderMessage("Adicione pelo menos um produto ao carrinho.");
      return;
    }

    try {
      setOrderLoading(true);
      setOrderMessage(null);

      const response = await fetch("/api/public/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: session.id,
          items: cartItems.map((item) => ({
            productId: item.product.id,
            quantity: item.quantity,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? "Erro ao enviar pedido.");
      }

      setCartItems([]);
      setOrderMessage(
        "Pedido enviado. A equipe vai conferir e liberar para preparo.",
      );
    } catch (error) {
      setOrderMessage(
        error instanceof Error ? error.message : "Erro ao enviar pedido.",
      );
    } finally {
      setOrderLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 pb-36 text-white">
      <section className="mx-auto max-w-3xl px-4 py-6">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-orange-500/20 to-white/[0.03] p-6">
          <p className="text-sm font-medium text-orange-300">Quitéria</p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            {restaurant.name}
          </h1>

          <p className="mt-2 text-sm text-zinc-300">{table.name}</p>

          <div className="mt-5 rounded-2xl border border-white/10 bg-zinc-950/60 p-4">
            <p className="text-sm font-medium text-zinc-200">Status da mesa</p>

            <p className="mt-1 text-sm text-zinc-400">
              {getSessionMessage(session.status)}
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-6">
          {categoriesWithProducts.map((category) => (
            <section
              key={category.id}
              className="rounded-3xl border border-white/10 bg-white/[0.04] p-5"
            >
              <div className="mb-4">
                <h2 className="text-xl font-semibold">{category.name}</h2>

                {category.products.length === 0 && (
                  <p className="mt-1 text-sm text-zinc-500">
                    Nenhum produto disponível nesta categoria.
                  </p>
                )}
              </div>

              <div className="space-y-3">
                {category.products.map((product) => (
                  <article
                    key={product.id}
                    className="rounded-2xl border border-white/10 bg-zinc-900/70 p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold">{product.name}</h3>

                          {product.is_featured && (
                            <span className="rounded-full border border-orange-400/30 bg-orange-400/10 px-2 py-0.5 text-xs text-orange-300">
                              Destaque
                            </span>
                          )}
                        </div>

                        {product.description && (
                          <p className="mt-2 text-sm text-zinc-400">
                            {product.description}
                          </p>
                        )}

                        <p className="mt-3 text-lg font-bold text-orange-300">
                          {formatCurrency(product.price)}
                        </p>

                        <button
                          type="button"
                          onClick={() => addProduct(product)}
                          className="mt-4 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-400"
                        >
                          Adicionar
                        </button>
                      </div>

                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-zinc-950 text-xs text-zinc-600">
                        Foto
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-zinc-950/95 px-4 py-4 shadow-2xl backdrop-blur">
        <div className="mx-auto max-w-3xl">
          {cartItems.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-zinc-900 p-4">
              <p className="text-sm font-medium text-zinc-200">Carrinho vazio</p>
              <p className="mt-1 text-sm text-zinc-500">
                Adicione produtos para montar seu pedido.
              </p>

              {orderMessage && (
                <p className="mt-3 text-sm text-orange-300">{orderMessage}</p>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-zinc-900 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-zinc-200">Carrinho</p>
                  <p className="mt-1 text-sm text-zinc-500">
                    {cartQuantity} item(ns) no pedido
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-xs text-zinc-500">Total</p>
                  <p className="text-lg font-bold text-orange-300">
                    {formatCurrency(cartTotal)}
                  </p>
                </div>
              </div>

              <div className="mt-4 max-h-44 space-y-3 overflow-y-auto pr-1">
                {cartItems.map((item) => (
                  <div
                    key={item.product.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-zinc-950 p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {item.product.name}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {formatCurrency(item.product.price)} cada
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => decreaseProduct(item.product.id)}
                        disabled={orderLoading}
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-sm text-zinc-300 disabled:opacity-50"
                      >
                        -
                      </button>

                      <span className="min-w-6 text-center text-sm font-semibold">
                        {item.quantity}
                      </span>

                      <button
                        type="button"
                        onClick={() => addProduct(item.product)}
                        disabled={orderLoading}
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-sm text-zinc-300 disabled:opacity-50"
                      >
                        +
                      </button>

                      <button
                        type="button"
                        onClick={() => removeProduct(item.product.id)}
                        disabled={orderLoading}
                        className="ml-1 rounded-lg px-2 py-1 text-xs text-red-300 disabled:opacity-50"
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {orderMessage && (
                <p className="mt-4 text-sm text-orange-300">{orderMessage}</p>
              )}

              <button
                type="button"
                onClick={submitOrder}
                disabled={orderLoading}
                className="mt-4 w-full rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {orderLoading ? "Enviando pedido..." : "Enviar pedido"}
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
