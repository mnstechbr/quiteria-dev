import Link from "next/link";

const PLATFORM_MODULES = [
  {
    title: "Cardápio digital com QR Code",
    description:
      "O cliente acessa o cardápio pela mesa, monta o pedido e envia para a equipe sem depender de aplicativo instalado.",
  },
  {
    title: "Controle de mesas e comandas",
    description:
      "Gerente e garçom acompanham mesas abertas, pedidos aguardando aprovação, contas solicitadas e atendimentos em andamento.",
  },
  {
    title: "Cozinha, bar e caixa conectados",
    description:
      "Itens são separados por área de preparo, passam por status operacionais e chegam ao caixa com o fechamento organizado.",
  },
];

const OPERATION_FLOW = [
  "Cliente lê o QR Code da mesa",
  "Pedido é enviado para aprovação",
  "Cozinha e bar recebem apenas os itens da sua área",
  "Caixa acompanha contas abertas e finaliza o pagamento",
];

const AUDIENCE = ["Bares", "Restaurantes", "Lanchonetes", "Adegas", "Food halls", "Operações com salão"];

export default function Home() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[var(--q-bg-outer)] text-white">
      <section className="mx-auto flex min-h-screen w-full max-w-[520px] flex-col bg-[linear-gradient(180deg,#0D1512_0%,#080D0B_100%)] px-4 pb-[calc(2.25rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))]">
        <header className="q-card rounded-[1.75rem] p-5">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-300">
            Quitéria · MNS Tech
          </p>

          <h1 className="mt-4 text-[2.55rem] font-black leading-[0.95] tracking-[-0.06em] text-white">
            Sistema para bares e restaurantes com pedidos por QR Code.
          </h1>

          <p className="mt-4 text-[15px] leading-7 text-[var(--q-text-soft)]">
            O Quitéria organiza o atendimento por mesa, conecta cardápio digital,
            garçom, cozinha, bar, gerente e caixa, e mantém a operação do
            restaurante acompanhável em tempo real.
          </p>

          <div className="mt-5 grid grid-cols-2 gap-2">
            <Link
              href="/login"
              className="rounded-2xl bg-emerald-500 px-4 py-3 text-center text-sm font-black text-white shadow-[0_16px_40px_rgba(34,197,94,0.18)] transition active:scale-[0.99]"
            >
              Entrar no sistema
            </Link>
            <a
              href="#como-funciona"
              className="rounded-2xl border border-[color:var(--q-border)] bg-[rgba(17,28,24,0.72)] px-4 py-3 text-center text-sm font-bold text-[var(--q-text-soft)] transition active:scale-[0.99]"
            >
              Ver como funciona
            </a>
          </div>
        </header>

        <section aria-label="Indicadores do sistema" className="mt-4 grid grid-cols-3 gap-2">
          <div className="q-card-subtle rounded-3xl p-3">
            <p className="text-2xl font-black text-white">QR</p>
            <p className="mt-1 text-[11px] leading-tight text-[var(--q-muted)]">
              Pedido direto da mesa
            </p>
          </div>
          <div className="q-card-subtle rounded-3xl p-3">
            <p className="text-2xl font-black text-white">6</p>
            <p className="mt-1 text-[11px] leading-tight text-[var(--q-muted)]">
              Perfis operacionais
            </p>
          </div>
          <div className="q-card-subtle rounded-3xl p-3">
            <p className="text-2xl font-black text-white">24h</p>
            <p className="mt-1 text-[11px] leading-tight text-[var(--q-muted)]">
              Operação registrada
            </p>
          </div>
        </section>

        <section id="como-funciona" className="mt-4 q-card rounded-[1.75rem] p-5">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">
            Como funciona
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-white">
            Da mesa ao fechamento da conta, sem perder o controle do atendimento.
          </h2>

          <div className="mt-5 space-y-3">
            {OPERATION_FLOW.map((step, index) => (
              <div
                key={step}
                className="flex items-start gap-3 rounded-2xl border border-[color:var(--q-border)] bg-[rgba(8,13,11,0.42)] p-3"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/14 text-sm font-black text-emerald-200">
                  {index + 1}
                </span>
                <p className="text-sm font-semibold leading-6 text-[var(--q-text-soft)]">
                  {step}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-4 space-y-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">
              Plataforma
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-white">
              Um sistema de atendimento digital para a rotina real do salão.
            </h2>
          </div>

          {PLATFORM_MODULES.map((module) => (
            <article key={module.title} className="q-card rounded-[1.5rem] p-4">
              <h3 className="text-base font-black text-white">{module.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--q-muted)]">
                {module.description}
              </p>
            </article>
          ))}
        </section>

        <section className="mt-4 q-card rounded-[1.75rem] p-5">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">
            Para quem é
          </p>
          <h2 className="mt-2 text-xl font-black tracking-[-0.03em] text-white">
            Bares, restaurantes e operações que trabalham com mesa, pedido e fechamento de conta.
          </h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {AUDIENCE.map((item) => (
              <span
                key={item}
                className="rounded-full border border-[color:var(--q-border)] bg-[rgba(17,28,24,0.72)] px-3 py-1.5 text-xs font-bold text-[var(--q-text-soft)]"
              >
                {item}
              </span>
            ))}
          </div>
        </section>

        <section className="mt-4 rounded-[1.75rem] border border-emerald-400/20 bg-emerald-400/10 p-5">
          <h2 className="text-xl font-black tracking-[-0.03em] text-white">
            Atendimento digital sem transformar a operação em um painel confuso.
          </h2>
          <p className="mt-2 text-sm leading-6 text-emerald-50/80">
            O Quitéria foi pensado para celular: botões grandes, cards objetivos,
            QR Code por mesa e fluxo separado para gerente, garçom, cozinha, bar e caixa.
          </p>
          <Link
            href="/login"
            className="mt-5 block rounded-2xl bg-emerald-500 px-5 py-4 text-center text-base font-black text-white transition active:scale-[0.99]"
          >
            Acessar área restrita
          </Link>
        </section>
      </section>
    </main>
  );
}
