import Link from "next/link";

const FEATURES = [
  "Atendimento por QR Code",
  "Gerente, garçom, cozinha, bar e caixa",
  "Pedidos e mesas em tempo real",
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-black text-white">
      <section className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col bg-zinc-950 px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))]">
        <header className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-4">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-orange-300">
            MNS Tech
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-white">
            Quitéria
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            Sistema mobile-first para bares e restaurantes operarem mesas,
            pedidos, cozinha, bar e caixa sem painel cortado no celular.
          </p>
        </header>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-3">
            <p className="text-xl font-black">QR</p>
            <p className="mt-1 text-[11px] text-zinc-400">Cardápio</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-3">
            <p className="text-xl font-black">5</p>
            <p className="mt-1 text-[11px] text-zinc-400">Operações</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-3">
            <p className="text-xl font-black">100%</p>
            <p className="mt-1 text-[11px] text-zinc-400">Mobile</p>
          </div>
        </div>

        <section className="mt-4 rounded-[2rem] border border-white/10 bg-white/[0.04] p-4">
          <h2 className="text-lg font-black">Operação simples</h2>
          <div className="mt-4 space-y-3">
            {FEATURES.map((feature) => (
              <div
                key={feature}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-zinc-900/70 p-3"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-orange-500 text-sm font-black text-white">
                  ✓
                </span>
                <p className="text-sm font-semibold text-zinc-200">{feature}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-auto pt-6">
          <Link
            href="/login"
            className="block w-full rounded-3xl bg-orange-500 px-5 py-4 text-center text-base font-black text-white transition active:scale-[0.99]"
          >
            Entrar no sistema
          </Link>

          <p className="mt-4 text-center text-xs leading-relaxed text-zinc-500">
            Acesso exclusivo para equipes cadastradas pela MNS Tech.
          </p>
        </div>
      </section>
    </main>
  );
}
