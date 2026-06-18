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

type PublicMenuSettings = {
  logo_url?: string | null;
  banner_url?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
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
  settings?: PublicMenuSettings | null;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value));
}

function getSessionMessage(status: string) {
  if (status === "PENDING_APPROVAL") {
    return "Mesa aguardando confirmação. Você já pode escolher seus produtos.";
  }

  if (status === "OPEN") {
    return "Mesa liberada. Seus pedidos serão enviados para a equipe.";
  }

  if (status === "BILL_REQUESTED") {
    return "A conta foi solicitada. Aguarde a equipe ir até a mesa.";
  }

  return "Bem-vindo ao cardápio digital.";
}

function getContrastColor(hexColor: string) {
  const normalized = hexColor.replace("#", "");

  if (normalized.length !== 6) return "#ffffff";

  const red = parseInt(normalized.slice(0, 2), 16);
  const green = parseInt(normalized.slice(2, 4), 16);
  const blue = parseInt(normalized.slice(4, 6), 16);
  const brightness = (red * 299 + green * 587 + blue * 114) / 1000;

  return brightness > 150 ? "#111827" : "#ffffff";
}

function safeColor(color: string | null | undefined, fallback: string) {
  if (!color) return fallback;
  return color.startsWith("#") ? color : fallback;
}

export function PublicMenu({
  restaurant,
  table,
  session,
  categories,
  settings,
}: PublicMenuProps) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProduct, setSelectedProduct] =
    useState<PublicMenuProduct | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<{
    url: string;
    title: string;
  } | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const primaryColor = safeColor(settings?.primary_color, "#f97316");
  const secondaryColor = safeColor(settings?.secondary_color, "#111827");
  const primaryTextColor = getContrastColor(primaryColor);

  const categoriesWithProducts = useMemo(
    () =>
      categories
        .map((category) => ({
          ...category,
          products: category.products.filter((product) => product.is_active),
        }))
        .filter((category) => category.products.length > 0),
    [categories],
  );

  const cartTotal = cart.reduce(
    (total, item) => total + Number(item.product.price) * item.quantity,
    0,
  );

  const cartQuantity = cart.reduce((total, item) => total + item.quantity, 0);

  function addProduct(product: PublicMenuProduct) {
    setMessage(null);
    setCartOpen(true);
    setCart((currentCart) => {
      const existingItem = currentCart.find(
        (item) => item.product.id === product.id,
      );

      if (existingItem) {
        return currentCart.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }

      return [...currentCart, { product, quantity: 1 }];
    });
  }

  function changeQuantity(productId: string, quantity: number) {
    setCart((currentCart) => {
      if (quantity <= 0) {
        return currentCart.filter((item) => item.product.id !== productId);
      }

      return currentCart.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item,
      );
    });
  }

  async function submitOrder() {
    try {
      setSubmitting(true);
      setMessage(null);

      if (cart.length === 0) {
        throw new Error("Adicione pelo menos um produto ao carrinho.");
      }

      const response = await fetch("/api/public/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: session.id,
          items: cart.map((item) => ({
            productId: item.product.id,
            quantity: item.quantity,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? "Erro ao enviar pedido.");
      }

      setCart([]);
      setCartOpen(false);
      setSelectedProduct(null);
      setMessage("Pedido enviado com sucesso. Aguarde a confirmação da equipe.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro ao enviar pedido.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <style jsx global>{`
        @keyframes quiteriaSlowZoom {
          0%, 100% {
            transform: scale(1) translate3d(0, 0, 0);
          }
          50% {
            transform: scale(1.035) translate3d(0, -6px, 0);
          }
        }

        .quiteria-fullscreen-image {
          animation: quiteriaSlowZoom 8s ease-in-out infinite;
          will-change: transform;
        }
      `}</style>

      <section className="mx-auto min-h-screen max-w-md bg-zinc-950 pb-24 shadow-2xl shadow-black/40">
        <header
          className="border-b border-white/10 bg-zinc-950"
          style={{ borderColor: `${primaryColor}33` }}
        >
          {settings?.banner_url && (
            <button
              type="button"
              onClick={() =>
                setFullscreenImage({
                  url: settings.banner_url ?? "",
                  title: restaurant.name,
                })
              }
              className="block h-[118px] w-full overflow-hidden bg-zinc-900"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={settings.banner_url}
                alt={`Banner ${restaurant.name}`}
                className="h-full w-full object-cover"
              />
            </button>
          )}

          <div
            className="px-4 py-3"
            style={{
              background: `linear-gradient(135deg, ${secondaryColor}ee, #09090bcc)`,
            }}
          >
            <div className="flex items-center gap-3">
              {settings?.logo_url ? (
                <button
                  type="button"
                  onClick={() =>
                    setFullscreenImage({
                      url: settings.logo_url ?? "",
                      title: restaurant.name,
                    })
                  }
                  className="h-12 w-12 shrink-0 overflow-hidden rounded-2xl border border-white/15 bg-zinc-900"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={settings.logo_url}
                    alt={`Logo ${restaurant.name}`}
                    className="h-full w-full object-cover"
                  />
                </button>
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-zinc-900 text-lg font-bold">
                  {restaurant.name.slice(0, 1).toUpperCase()}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold" style={{ color: primaryColor }}>
                  Cardápio digital
                </p>
                <h1 className="truncate text-lg font-bold tracking-tight">
                  {restaurant.name}
                </h1>
                <p className="text-xs text-zinc-300">{table.name}</p>
              </div>
            </div>

            <div className="mt-3 rounded-2xl border border-white/10 bg-black/25 px-3 py-2 text-xs text-zinc-300">
              {getSessionMessage(session.status)}
            </div>
          </div>
        </header>

        <nav className="sticky top-0 z-20 border-b border-white/10 bg-zinc-950/95 px-3 py-2 backdrop-blur">
          <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {categoriesWithProducts.map((category) => (
              <a
                key={category.id}
                href={`#category-${category.id}`}
                className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-zinc-200"
              >
                {category.name}
              </a>
            ))}
          </div>
        </nav>

        <div className="space-y-5 px-3 py-4">
          {categoriesWithProducts.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-center text-sm text-zinc-400">
              Nenhum produto disponível no momento.
            </div>
          ) : (
            categoriesWithProducts.map((category) => (
              <section
                key={category.id}
                id={`category-${category.id}`}
                className="scroll-mt-16"
              >
                <div className="mb-2 flex items-center justify-between px-1">
                  <h2 className="text-base font-bold">{category.name}</h2>
                  <span className="text-[11px] text-zinc-500">
                    {category.products.length} itens
                  </span>
                </div>

                <div className="space-y-2">
                  {category.products.map((product) => (
                    <article
                      key={product.id}
                      className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-2.5"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          product.image_url
                            ? setFullscreenImage({
                                url: product.image_url,
                                title: product.name,
                              })
                            : setSelectedProduct(product)
                        }
                        className="h-[64px] w-[64px] shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-zinc-900"
                      >
                        {product.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[11px] text-zinc-600">
                            Foto
                          </div>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedProduct(product)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <div className="flex items-center gap-2">
                          <h3 className="truncate text-sm font-semibold">
                            {product.name}
                          </h3>
                          {product.is_featured && (
                            <span
                              className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                              style={{
                                background: `${primaryColor}22`,
                                color: primaryColor,
                              }}
                            >
                              Destaque
                            </span>
                          )}
                        </div>

                        {product.description && (
                          <p className="mt-0.5 line-clamp-1 text-[11px] leading-relaxed text-zinc-500">
                            {product.description}
                          </p>
                        )}

                        <p className="mt-1 text-sm font-bold" style={{ color: primaryColor }}>
                          {formatCurrency(product.price)}
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => addProduct(product)}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg font-bold"
                        style={{
                          background: primaryColor,
                          color: primaryTextColor,
                        }}
                        aria-label={`Adicionar ${product.name}`}
                      >
                        +
                      </button>
                    </article>
                  ))}
                </div>
              </section>
            ))
          )}
        </div>

        {message && (
          <div className="fixed bottom-20 left-1/2 z-40 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl border border-white/10 bg-zinc-900 p-3 text-sm text-zinc-200 shadow-2xl">
            {message}
          </div>
        )}

        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/10 bg-zinc-950/95 p-3 backdrop-blur">
          <div className="mx-auto max-w-md">
            <button
              type="button"
              onClick={() => setCartOpen((current) => !current)}
              className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left shadow-2xl disabled:opacity-60"
              style={{
                background: cart.length > 0 ? primaryColor : "#18181b",
                color: cart.length > 0 ? primaryTextColor : "#a1a1aa",
              }}
            >
              <span className="text-sm font-bold">
                {cart.length > 0
                  ? `${cartQuantity} ${cartQuantity === 1 ? "item" : "itens"}`
                  : "Carrinho vazio"}
              </span>
              <span className="text-sm font-extrabold">
                {formatCurrency(cartTotal)}
              </span>
            </button>
          </div>
        </div>
      </section>

      {cartOpen && cart.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/60">
          <div className="mx-auto max-h-[78vh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-white/10 bg-zinc-950 p-4 text-white shadow-2xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">Seu carrinho</h2>
                <p className="text-sm text-zinc-400">
                  {cartQuantity} {cartQuantity === 1 ? "item" : "itens"} no pedido
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCartOpen(false)}
                className="rounded-xl border border-white/10 px-3 py-2 text-sm text-zinc-300"
              >
                Fechar
              </button>
            </div>

            <div className="space-y-3">
              {cart.map((item) => (
                <div
                  key={item.product.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-zinc-100">
                      {item.product.name}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {formatCurrency(Number(item.product.price) * item.quantity)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => changeQuantity(item.product.id, item.quantity - 1)}
                      className="h-8 w-8 rounded-lg border border-white/10 text-zinc-300"
                    >
                      -
                    </button>
                    <span className="w-6 text-center text-sm font-semibold">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => changeQuantity(item.product.id, item.quantity + 1)}
                      className="h-8 w-8 rounded-lg border border-white/10 text-zinc-300"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="flex items-center justify-between text-sm text-zinc-300">
                <span>Total</span>
                <span className="text-xl font-extrabold text-white">
                  {formatCurrency(cartTotal)}
                </span>
              </div>

              <button
                type="button"
                onClick={submitOrder}
                disabled={submitting}
                className="mt-4 w-full rounded-2xl px-4 py-3 text-sm font-bold disabled:opacity-60"
                style={{
                  background: primaryColor,
                  color: primaryTextColor,
                }}
              >
                {submitting ? "Enviando..." : "Enviar pedido"}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedProduct && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-zinc-950 text-white">
          <div className="mx-auto min-h-screen max-w-md pb-28">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-zinc-950/90 p-3 backdrop-blur">
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                className="rounded-xl border border-white/10 px-3 py-2 text-sm font-semibold text-zinc-200"
              >
                Voltar
              </button>

              <button
                type="button"
                onClick={() => addProduct(selectedProduct)}
                className="rounded-xl px-3 py-2 text-sm font-bold"
                style={{ background: primaryColor, color: primaryTextColor }}
              >
                Adicionar
              </button>
            </div>

            <button
              type="button"
              onClick={() =>
                selectedProduct.image_url
                  ? setFullscreenImage({
                      url: selectedProduct.image_url,
                      title: selectedProduct.name,
                    })
                  : undefined
              }
              className="block h-72 w-full overflow-hidden bg-zinc-900"
            >
              {selectedProduct.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selectedProduct.image_url}
                  alt={selectedProduct.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-zinc-600">
                  Sem foto
                </div>
              )}
            </button>

            <div className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-2xl font-bold">{selectedProduct.name}</h2>
                  <p className="mt-2 text-2xl font-extrabold" style={{ color: primaryColor }}>
                    {formatCurrency(selectedProduct.price)}
                  </p>
                </div>

                {selectedProduct.is_featured && (
                  <span
                    className="shrink-0 rounded-full px-3 py-1 text-xs font-semibold"
                    style={{ background: `${primaryColor}22`, color: primaryColor }}
                  >
                    Destaque
                  </span>
                )}
              </div>

              {selectedProduct.description && (
                <p className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm leading-relaxed text-zinc-300">
                  {selectedProduct.description}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {fullscreenImage && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 p-4">
          <button
            type="button"
            onClick={() => setFullscreenImage(null)}
            className="absolute right-4 top-4 z-10 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur"
          >
            Fechar
          </button>

          <div className="w-full max-w-3xl overflow-hidden rounded-3xl border border-white/10 bg-zinc-950">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={fullscreenImage.url}
              alt={fullscreenImage.title}
              className="quiteria-fullscreen-image max-h-[82vh] w-full object-contain"
            />
          </div>
        </div>
      )}
    </main>
  );
}
