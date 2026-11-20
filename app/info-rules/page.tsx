"use client";

import Link from "next/link";

const reglas = [
  {
    id: "01",
    icono: "🌸",
    titulo: "Pedidos y cotizaciones",
    contenido:
      "Todas las cotizaciones de Bunjang, Aladin o Twitter KR se procesan en un lapso de 24 a 48 horas. Una vez recibido el pago, se realiza la compra de inmediato.",
    etiqueta: "Compras en Corea",
  },
  {
    id: "02",
    icono: "✈️",
    titulo: "Envíos internacionales",
    contenido:
      "Los artículos se consolidan en la bodega de Seúl. Los envíos marítimos o aéreos tardan aproximadamente de 3 a 5 semanas en llegar a destino una vez que se solicita el envío.",
    etiqueta: "Batches",
  },
  {
    id: "03",
    icono: "🎀",
    titulo: "Cancelaciones y reembolsos",
    contenido:
      "Al ser productos importados bajo pedido, no se aceptan cancelaciones ni devoluciones.",
    etiqueta: "Importante",
  },
  {
    id: "04",
    icono: "📦",
    titulo: "Entregas y envíos locales",
    contenido:
      "Una vez que el lote llega a mis manos y pasa aduana, te notificaré por la masterlist para coordinar tu envío local o entrega personal según las reglas vigentes.",
    etiqueta: "Entrega final",
  },
];

export default function Info() {
  return (
    <main className="relative mx-auto min-h-[70vh] w-full max-w-4xl pb-12 text-[#514653]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-[#edcddd] bg-white/85 px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#bd6393] shadow-sm transition hover:-translate-y-0.5 hover:bg-white"
        >
          <span>🏠</span> Volver al escritorio
        </Link>
        <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#b69aaa]">
          Hyuneatelier · Centro de información
        </span>
      </div>

      <section className="overflow-hidden rounded-[2rem] border border-[#edcddd] bg-[#fffafd] shadow-[0_22px_65px_-40px_rgba(174,91,135,.42)]">
        <div className="flex items-center justify-between border-b border-[#f0dce6] bg-[#fff3f8] px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ed9bb8]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#f0d58c]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#a9d4b7]" />
            </div>
            <span className="ml-2 text-[9px] font-black uppercase tracking-[0.16em] text-[#b77b9b]">
              📁 información_y_reglas
            </span>
          </div>
          <span className="text-[9px] font-mono text-[#c4aabb]">VENTANA 01</span>
        </div>

        <div className="relative overflow-hidden p-5 sm:p-8">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#f9dce9]/60 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-[#e4f4e9]/60 blur-3xl" />

          <header className="relative border-b border-[#f0dce6] pb-6 text-center">
            <span className="mb-2 inline-block rounded-full border border-[#edcddd] bg-white/80 px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-[#c76d9d]">
              Antes de realizar tu pedido
            </span>
            <p className="font-serif text-2xl italic text-[#d18bb0]">
              Un momento para leer... ♡
            </p>
            <h1 className="mt-1 text-3xl font-black tracking-[-0.06em] text-[#bd5e91] sm:text-4xl">
              Información y reglas
              <span className="text-[#e5b94e]">.</span>
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-xs leading-6 text-[#887987] sm:text-sm">
              Aquí encontrarás información importante sobre pedidos, cotizaciones,
              envíos y entregas. Te recomendamos leerla antes de realizar una compra.
            </p>
          </header>

          <div className="relative mt-6 grid gap-3 sm:grid-cols-2">
            {reglas.map((item) => (
              <article
                key={item.id}
                className="group relative overflow-hidden rounded-[1.4rem] border border-[#f0dce6] bg-white/90 p-4 shadow-[0_8px_24px_-20px_rgba(100,70,90,.4)] transition duration-200 hover:-translate-y-1 hover:border-[#e6b9d0] hover:shadow-md sm:p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#f1d8e5] bg-[#fff3f8] text-xl">
                      {item.icono}
                    </span>
                    <div>
                      <span className="block text-[8px] font-black uppercase tracking-[0.18em] text-[#c58aa8]">
                        {item.id} · {item.etiqueta}
                      </span>
                      <h2 className="mt-1 text-[11px] font-black uppercase leading-5 tracking-[0.08em] text-[#635463]">
                        {item.titulo}
                      </h2>
                    </div>
                  </div>
                  <span className="pt-1 text-sm text-[#e2b4ca] transition group-hover:rotate-12 group-hover:text-[#c76d9d]">
                    ✦
                  </span>
                </div>
                <p className="mt-4 border-t border-[#f5e8ef] pt-3 text-[11px] leading-6 text-[#887987] sm:text-xs">
                  {item.contenido}
                </p>
              </article>
            ))}
          </div>

          <aside className="relative mt-5 rounded-[1.3rem] border border-dashed border-[#e9bfd3] bg-[#fff5f9]/90 p-4 text-center">
            <span className="text-xl">💌</span>
            <p className="mt-2 text-[11px] font-semibold leading-5 text-[#b45f89] sm:text-xs">
              Al realizar cualquier reclamo (claim) o depósito, aceptas automáticamente
              estos términos. ¡Gracias por confiar en hyuneatelier! ✨
            </p>
          </aside>

          <footer className="relative mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-[#f0dce6] pt-4 text-[8px] font-bold uppercase tracking-[0.18em] text-[#b69aaa]">
            <span>Hyuneatelier · Información para clientes</span>
            <span>Hecho con cariño ♡</span>
          </footer>
        </div>
      </section>
    </main>
  );
}
