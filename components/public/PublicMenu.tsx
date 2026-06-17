"use client";

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
  const categoriesWithProducts = categories.map((category) => ({
    ...category,
    products: category.products.filter((product) => product.is_active),
  }));

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <section className="mx-auto max-w-3xl px-4 py-6">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-orange-500/20 to-white/[0.03] p-6">
          <p className="text-sm font-medium text-orange-300">
            Quitéria
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            {restaurant.name}
          </h1>

          <p className="mt-2 text-sm text-zinc-300">
            {table.name}
          </p>

          <div className="mt-5 rounded-2xl border border-white/10 bg-zinc-950/60 p-4">
            <p className="text-sm font-medium text-zinc-200">
              Status da mesa
            </p>

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
                <h2 className="text-xl font-semibold">
                  {category.name}
                </h2>

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
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold">
                            {product.name}
                          </h3>

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

        <div className="sticky bottom-4 mt-6 rounded-2xl border border-white/10 bg-zinc-900/95 p-4 shadow-2xl">
          <p className="text-sm text-zinc-400">
            Carrinho e pedidos serão ativados na próxima etapa.
          </p>
        </div>
      </section>
    </main>
  );
}
