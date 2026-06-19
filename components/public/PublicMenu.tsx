"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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

const STATUS_COPY: Record<
  string,
  {
    title: string;
    description: string;
  }
> = {
  PENDING_APPROVAL: {
    title: "Aguardando liberação",
    description: "Você já pode montar o pedido. A equipe confirma a mesa antes do preparo.",
  },
  OPEN: {
    title: "Mesa liberada",
    description: "Escolha os itens e envie seu pedido para a equipe.",
  },
  BILL_REQUESTED: {
    title: "Conta solicitada",
    description: "A conta já foi pedida. Aguarde a equipe ir até a mesa.",
  },
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value));
}

function getSessionCopy(status: string) {
  return (
    STATUS_COPY[status] ?? {
      title: "Cardápio digital",
      description: "Escolha os itens e envie seu pedido para a equipe.",
    }
  );
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
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color : fallback;
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function PublicMenu({
  restaurant,
  table,
  session,
  categories,
  settings,
}: PublicMenuProps) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] =
    useState<PublicMenuProduct | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<{
    url: string;
    title: string;
  } | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const messageTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const primaryColor = safeColor(settings?.primary_color, "#f97316");
  const secondaryColor = safeColor(settings?.secondary_color, "#111827");
  const primaryTextColor = getContrastColor(primaryColor);
  const sessionCopy = getSessionCopy(session.status);
  const orderBlocked = session.status === "BILL_REQUESTED";

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

  const featuredProducts = useMemo(
    () =>
      categoriesWithProducts
        .flatMap((category) => category.products)
        .filter((product) => product.is_featured)
        .slice(0, 6),
    [categoriesWithProducts],
  );

  const visibleCategories = useMemo(() => {
    const normalizedSearch = normalizeText(searchTerm.trim());

    return categoriesWithProducts
      .filter(
        (category) => activeCategoryId === "all" || category.id === activeCategoryId,
      )
      .map((category) => ({
        ...category,
        products: category.products.filter((product) => {
          if (!normalizedSearch) return true;

          const searchableText = normalizeText(
            `${product.name} ${product.description ?? ""}`,
          );

          return searchableText.includes(normalizedSearch);
        }),
      }))
      .filter((category) => category.products.length > 0);
  }, [activeCategoryId, categoriesWithProducts, searchTerm]);

  const cartTotal = cart.reduce(
    (total, item) => total + Number(item.product.price) * item.quantity,
    0,
  );

  const cartQuantity = cart.reduce((total, item) => total + item.quantity, 0);

  useEffect(() => {
    return () => {
      if (messageTimeoutRef.current) {
        clearTimeout(messageTimeoutRef.current);
      }
    };
  }, []);

  function showMessage(nextMessage: string) {
    setMessage(nextMessage);

    if (messageTimeoutRef.current) {
      clearTimeout(messageTimeoutRef.current);
    }

    messageTimeoutRef.current = setTimeout(() => {
      setMessage(null);
    }, 4200);
  }

  function addProduct(product: PublicMenuProduct) {
    if (orderBlocked) {
      showMessage("A conta já foi solicitada para esta mesa.");
      return;
    }

    setMessage(null);
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

  function getProductQuantity(productId: string) {
    return cart.find((item) => item.product.id === productId)?.quantity ?? 0;
  }

  async function submitOrder() {
    try {
      setSubmitting(true);
      setMessage(null);

      if (cart.length === 0) {
        throw new Error("Adicione pelo menos um produto ao carrinho.");
      }

      if (orderBlocked) {
        throw new Error("A conta já foi solicitada para esta mesa.");
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
      showMessage("Pedido enviado com sucesso. Aguarde a confirmação da equipe.");
    } catch (error) {
      showMessage(error instanceof Error ? error.message : "Erro ao enviar pedido.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-dvh overflow-x-hidden bg-[var(--q-bg)] text-white">
      <section className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-[var(--q-bg)] pb-[calc(104px+env(safe-area-inset-bottom))] shadow-2xl shadow-black/40">
        <header
          className="shrink-0 overflow-hidden border-b border-[color:var(--q-border)] bg-[var(--q-bg)]"
          style={{ borderColor: `${primaryColor}33` }}
        >
          {settings?.banner_url ? (
            <button
              type="button"
              onClick={() =>
                setFullscreenImage({
                  url: settings.banner_url ?? "",
                  title: restaurant.name,
                })
              }
              className="block h-28 w-full overflow-hidden bg-[var(--q-card)]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={settings.banner_url}
                alt={`Banner ${restaurant.name}`}
                className="h-full w-full object-cover"
              />
            </button>
          ) : (
            <div
              className="h-16 w-full"
              style={{
                background: `linear-gradient(135deg, ${secondaryColor}, ${primaryColor}44)`,
              }}
            />
          )}

          <div
            className="px-4 py-3"
            style={{
              background: `linear-gradient(135deg, ${secondaryColor}f2, #09090bf2)`,
            }}
          >
            <div className="flex min-w-0 items-center gap-3">
              {settings?.logo_url ? (
                <button
                  type="button"
                  onClick={() =>
                    setFullscreenImage({
                      url: settings.logo_url ?? "",
                      title: restaurant.name,
                    })
                  }
                  className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/15 bg-[var(--q-card)]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={settings.logo_url}
                    alt={`Logo ${restaurant.name}`}
                    className="h-full w-full object-cover"
                  />
                </button>
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-[var(--q-card)] text-lg font-black">
                  {restaurant.name.slice(0, 1).toUpperCase()}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <p
                  className="text-[11px] font-black uppercase tracking-[0.2em]"
                  style={{ color: primaryColor }}
                >
                  Cardápio digital
                </p>
                <h1 className="break-words text-xl font-black leading-tight tracking-tight">
                  {restaurant.name}
                </h1>
                <p className="mt-0.5 text-sm font-semibold text-[var(--q-text-soft)]">
                  {table.name}
                </p>
              </div>
            </div>

            <div className="mt-3 rounded-3xl border border-[color:var(--q-border)] bg-[var(--q-bg-outer)]/25 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-zinc-100">{sessionCopy.title}</p>
                <span
                  className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide"
                  style={{ background: `${primaryColor}22`, color: primaryColor }}
                >
                  {cartQuantity} itens
                </span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-[var(--q-muted)]">
                {sessionCopy.description}
              </p>
            </div>
          </div>
        </header>

        <div className="sticky top-0 z-30 border-b border-[color:var(--q-border)] bg-[rgba(8,13,11,0.94)] px-3 py-3 backdrop-blur-xl">
          <label className="block">
            <span className="sr-only">Buscar produto</span>
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar no cardápio"
              className="w-full rounded-2xl border border-[color:var(--q-border)] bg-[rgba(255,255,255,0.06)] px-4 py-3 text-sm font-semibold text-white outline-none placeholder:text-[var(--q-dim)] focus:border-emerald-400/50"
            />
          </label>

          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onClick={() => setActiveCategoryId("all")}
              className="shrink-0 rounded-full border px-3 py-2 text-xs font-black transition"
              style={
                activeCategoryId === "all"
                  ? {
                      background: primaryColor,
                      color: primaryTextColor,
                      borderColor: primaryColor,
                    }
                  : undefined
              }
            >
              Tudo
            </button>

            {categoriesWithProducts.map((category) => {
              const isActive = activeCategoryId === category.id;

              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setActiveCategoryId(category.id)}
                  className="shrink-0 rounded-full border px-3 py-2 text-xs font-black transition"
                  style={
                    isActive
                      ? {
                          background: primaryColor,
                          color: primaryTextColor,
                          borderColor: primaryColor,
                        }
                      : undefined
                  }
                >
                  {category.name}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 space-y-5 px-3 py-4">
          {featuredProducts.length > 0 && activeCategoryId === "all" && !searchTerm && (
            <section className="rounded-[2rem] border border-[color:var(--q-border)] bg-white/[0.035] p-3">
              <div className="mb-3 flex items-center justify-between px-1">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--q-dim)]">
                    Sugestões
                  </p>
                  <h2 className="text-base font-black text-white">Destaques da casa</h2>
                </div>
                <span className="text-[11px] font-semibold text-[var(--q-dim)]">
                  {featuredProducts.length} itens
                </span>
              </div>

              <div className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {featuredProducts.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => setSelectedProduct(product)}
                    className="w-36 shrink-0 overflow-hidden rounded-3xl border border-[color:var(--q-border)] bg-[var(--q-card)] text-left"
                  >
                    <div className="h-24 w-full bg-zinc-800">
                      {product.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[11px] text-zinc-600">
                          Sem foto
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="line-clamp-2 text-sm font-black leading-tight text-white">
                        {product.name}
                      </p>
                      <p className="mt-2 text-sm font-black" style={{ color: primaryColor }}>
                        {formatCurrency(product.price)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {categoriesWithProducts.length === 0 ? (
            <div className="rounded-[2rem] border border-[color:var(--q-border)] bg-[rgba(17,28,24,0.74)] p-6 text-center">
              <p className="text-base font-black text-white">Cardápio indisponível</p>
              <p className="mt-2 text-sm leading-relaxed text-[var(--q-muted)]">
                Nenhum produto ativo foi encontrado no momento.
              </p>
            </div>
          ) : visibleCategories.length === 0 ? (
            <div className="rounded-[2rem] border border-[color:var(--q-border)] bg-[rgba(17,28,24,0.74)] p-6 text-center">
              <p className="text-base font-black text-white">Nada encontrado</p>
              <p className="mt-2 text-sm leading-relaxed text-[var(--q-muted)]">
                Tente buscar por outro nome ou selecione outra categoria.
              </p>
            </div>
          ) : (
            visibleCategories.map((category) => (
              <section key={category.id} className="scroll-mt-32">
                <div className="mb-3 flex items-end justify-between gap-3 px-1">
                  <div className="min-w-0">
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--q-dim)]">
                      Categoria
                    </p>
                    <h2 className="break-words text-lg font-black text-white">
                      {category.name}
                    </h2>
                  </div>
                  <span className="shrink-0 text-[11px] font-semibold text-[var(--q-dim)]">
                    {category.products.length} itens
                  </span>
                </div>

                <div className="space-y-3">
                  {category.products.map((product) => {
                    const quantity = getProductQuantity(product.id);

                    return (
                      <article
                        key={product.id}
                        className="overflow-hidden rounded-[1.75rem] border border-[color:var(--q-border)] bg-[rgba(17,28,24,0.74)]"
                      >
                        <div className="flex gap-3 p-3">
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
                            className="h-24 w-24 shrink-0 overflow-hidden rounded-3xl border border-[color:var(--q-border)] bg-[var(--q-card)]"
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
                                Sem foto
                              </div>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => setSelectedProduct(product)}
                            className="min-w-0 flex-1 text-left"
                          >
                            <div className="flex flex-wrap items-center gap-1.5">
                              <h3 className="break-words text-base font-black leading-tight text-white">
                                {product.name}
                              </h3>
                              {product.is_featured && (
                                <span
                                  className="rounded-full px-2 py-0.5 text-[10px] font-black uppercase"
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
                              <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-[var(--q-dim)]">
                                {product.description}
                              </p>
                            )}

                            <p
                              className="mt-2 text-base font-black"
                              style={{ color: primaryColor }}
                            >
                              {formatCurrency(product.price)}
                            </p>
                          </button>
                        </div>

                        <div className="flex items-center justify-between gap-3 border-t border-[color:var(--q-border)] px-3 py-2.5">
                          <span className="text-xs font-semibold text-[var(--q-dim)]">
                            {quantity > 0 ? `${quantity} no carrinho` : "Adicionar ao pedido"}
                          </span>

                          {quantity > 0 ? (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => changeQuantity(product.id, quantity - 1)}
                                className="flex h-9 w-9 items-center justify-center rounded-xl border border-[color:var(--q-border)] text-lg font-black text-[var(--q-text)]"
                              >
                                -
                              </button>
                              <span className="w-7 text-center text-sm font-black text-white">
                                {quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => addProduct(product)}
                                className="flex h-9 w-9 items-center justify-center rounded-xl text-lg font-black"
                                style={{ background: primaryColor, color: primaryTextColor }}
                              >
                                +
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => addProduct(product)}
                              disabled={orderBlocked}
                              className="rounded-2xl px-4 py-2 text-sm font-black disabled:cursor-not-allowed disabled:opacity-50"
                              style={{ background: primaryColor, color: primaryTextColor }}
                            >
                              Adicionar
                            </button>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))
          )}
        </div>
      </section>

      {message && (
        <div className="fixed inset-x-0 bottom-[calc(104px+env(safe-area-inset-bottom))] z-50 px-3">
          <div className="mx-auto max-w-md rounded-3xl border border-[color:var(--q-border)] bg-[var(--q-card)] p-3 text-sm font-semibold leading-relaxed text-zinc-100 shadow-2xl shadow-black/50">
            {message}
          </div>
        </div>
      )}

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[color:var(--q-border)] bg-[rgba(8,13,11,0.94)] px-3 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
        <div className="mx-auto max-w-md">
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            disabled={cart.length === 0}
            className="flex w-full items-center justify-between gap-3 rounded-3xl px-4 py-3 text-left shadow-2xl disabled:cursor-not-allowed disabled:opacity-70"
            style={{
              background: cart.length > 0 ? primaryColor : "#18181b",
              color: cart.length > 0 ? primaryTextColor : "#a1a1aa",
            }}
          >
            <span className="min-w-0">
              <span className="block text-sm font-black">
                {cart.length > 0
                  ? `Ver carrinho (${cartQuantity})`
                  : orderBlocked
                    ? "Conta solicitada"
                    : "Carrinho vazio"}
              </span>
              <span className="block text-xs font-semibold opacity-80">
                {cart.length > 0
                  ? "Conferir e enviar pedido"
                  : orderBlocked
                    ? "Aguarde a equipe"
                    : "Adicione itens ao pedido"}
              </span>
            </span>
            <span className="shrink-0 text-base font-black">
              {formatCurrency(cartTotal)}
            </span>
          </button>
        </div>
      </div>

      {cartOpen && (
        <div className="fixed inset-0 z-50 flex items-end bg-[var(--q-bg-outer)]/70 px-0 pt-16 backdrop-blur-sm">
          <div className="mx-auto flex max-h-[86dvh] w-full max-w-md flex-col overflow-hidden rounded-t-[2rem] border border-[color:var(--q-border)] bg-[var(--q-bg)] text-white shadow-2xl">
            <div className="shrink-0 border-b border-[color:var(--q-border)] p-4">
              <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-white/20" />
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--q-dim)]">
                    Conferência
                  </p>
                  <h2 className="text-xl font-black">Seu carrinho</h2>
                  <p className="mt-1 text-sm text-[var(--q-muted)]">
                    {cartQuantity} {cartQuantity === 1 ? "item" : "itens"} no pedido
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCartOpen(false)}
                  className="rounded-2xl border border-[color:var(--q-border)] px-4 py-2 text-sm font-black text-[var(--q-text-soft)]"
                >
                  Fechar
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3">
              {cart.length === 0 ? (
                <div className="rounded-[2rem] border border-[color:var(--q-border)] bg-[rgba(17,28,24,0.74)] p-6 text-center">
                  <p className="text-base font-black text-white">Carrinho vazio</p>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--q-muted)]">
                    Escolha os produtos no cardápio para montar o pedido.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map((item) => (
                    <div
                      key={item.product.id}
                      className="rounded-[1.5rem] border border-[color:var(--q-border)] bg-[rgba(17,28,24,0.74)] p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="break-words text-sm font-black text-zinc-100">
                            {item.product.name}
                          </p>
                          <p className="mt-1 text-xs font-semibold text-[var(--q-dim)]">
                            {formatCurrency(item.product.price)} cada
                          </p>
                        </div>
                        <p className="shrink-0 text-sm font-black text-white">
                          {formatCurrency(Number(item.product.price) * item.quantity)}
                        </p>
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => changeQuantity(item.product.id, 0)}
                          className="text-xs font-black text-[var(--q-dim)] underline underline-offset-4"
                        >
                          Remover
                        </button>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => changeQuantity(item.product.id, item.quantity - 1)}
                            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[color:var(--q-border)] text-lg font-black text-[var(--q-text)]"
                          >
                            -
                          </button>
                          <span className="w-8 text-center text-sm font-black text-white">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => changeQuantity(item.product.id, item.quantity + 1)}
                            className="flex h-10 w-10 items-center justify-center rounded-xl text-lg font-black"
                            style={{ background: primaryColor, color: primaryTextColor }}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="shrink-0 border-t border-[color:var(--q-border)] p-4 pb-[calc(16px+env(safe-area-inset-bottom))]">
              <div className="mb-3 flex items-center justify-between text-sm font-semibold text-[var(--q-text-soft)]">
                <span>Total do pedido</span>
                <span className="text-2xl font-black text-white">
                  {formatCurrency(cartTotal)}
                </span>
              </div>

              <button
                type="button"
                onClick={submitOrder}
                disabled={submitting || cart.length === 0 || orderBlocked}
                className="w-full rounded-3xl px-4 py-4 text-sm font-black disabled:cursor-not-allowed disabled:opacity-50"
                style={{ background: primaryColor, color: primaryTextColor }}
              >
                {submitting
                  ? "Enviando..."
                  : orderBlocked
                    ? "Conta já solicitada"
                    : "Enviar pedido"}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-end bg-[var(--q-bg-outer)]/70 px-0 pt-16 backdrop-blur-sm">
          <div className="mx-auto flex max-h-[90dvh] w-full max-w-md flex-col overflow-hidden rounded-t-[2rem] border border-[color:var(--q-border)] bg-[var(--q-bg)] text-white shadow-2xl">
            <div className="shrink-0 border-b border-[color:var(--q-border)] p-3">
              <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-white/20" />
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedProduct(null)}
                  className="rounded-2xl border border-[color:var(--q-border)] px-4 py-2 text-sm font-black text-[var(--q-text-soft)]"
                >
                  Fechar
                </button>

                <button
                  type="button"
                  onClick={() => addProduct(selectedProduct)}
                  disabled={orderBlocked}
                  className="rounded-2xl px-4 py-2 text-sm font-black disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ background: primaryColor, color: primaryTextColor }}
                >
                  Adicionar
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
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
                className="block h-72 w-full overflow-hidden bg-[var(--q-card)]"
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

              <div className="p-4 pb-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h2 className="break-words text-2xl font-black leading-tight">
                      {selectedProduct.name}
                    </h2>
                    <p
                      className="mt-2 text-2xl font-black"
                      style={{ color: primaryColor }}
                    >
                      {formatCurrency(selectedProduct.price)}
                    </p>
                  </div>

                  {selectedProduct.is_featured && (
                    <span
                      className="shrink-0 rounded-full px-3 py-1 text-xs font-black uppercase"
                      style={{ background: `${primaryColor}22`, color: primaryColor }}
                    >
                      Destaque
                    </span>
                  )}
                </div>

                {selectedProduct.description && (
                  <p className="mt-4 rounded-[1.5rem] border border-[color:var(--q-border)] bg-[rgba(17,28,24,0.74)] p-4 text-sm leading-relaxed text-[var(--q-text-soft)]">
                    {selectedProduct.description}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {fullscreenImage && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[var(--q-bg-outer)]/95 p-4">
          <button
            type="button"
            onClick={() => setFullscreenImage(null)}
            className="absolute right-4 top-4 z-10 rounded-full border border-[color:var(--q-border)] bg-white/10 px-4 py-2 text-sm font-black text-white backdrop-blur"
          >
            Fechar
          </button>

          <div className="w-full max-w-3xl overflow-hidden rounded-3xl border border-[color:var(--q-border)] bg-[var(--q-bg)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={fullscreenImage.url}
              alt={fullscreenImage.title}
              className="max-h-[82dvh] w-full object-contain"
            />
          </div>
        </div>
      )}
    </main>
  );
}
