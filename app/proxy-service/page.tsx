'use client';

import Link from 'next/link';

export default function ProxyService() {
  return (
    <div className="min-h-screen w-full bg-[#FFF0F4] bg-[linear-gradient(to_right,rgba(255,255,255,0.48)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.48)_1px,transparent_1px)] bg-[size:30px_30px] px-4 pb-28 pt-5 font-sans text-[#594653] antialiased sm:pt-8">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-4 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 rounded-full border border-[#EBD3E0] bg-white/80 px-4 py-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#A66B8B] transition hover:border-[#D99ABA] hover:text-[#B64F83]">
            <span aria-hidden="true">←</span> Volver al escritorio
          </Link>
          <span className="hidden rounded-full border border-[#E9D9EF] bg-[#F5F0FA] px-3 py-2 text-[9px] font-bold uppercase tracking-[0.14em] text-[#9B83B7] sm:inline-flex">
            Hyuneatelier · servicio proxy
          </span>
        </div>

        <section className="overflow-hidden rounded-[2rem] border border-[#EBD5E1] bg-white/90 shadow-[0_18px_55px_-35px_rgba(157,91,125,.35)] backdrop-blur">
          <header className="relative overflow-hidden border-b border-[#F0DFE8] bg-[linear-gradient(115deg,#FFF7FA_0%,#FFFDFB_54%,#F2F8F4_100%)] px-6 py-10 text-center sm:px-10 sm:py-14">
            <span className="absolute -left-8 top-4 h-28 w-28 rounded-full bg-[#F8DCE8]/70 blur-2xl" />
            <span className="absolute -right-5 bottom-0 h-32 w-32 rounded-full bg-[#DCE8FA]/70 blur-2xl" />
            <div className="relative">
              <span className="mb-3 inline-flex rounded-full border border-[#EBD1DF] bg-white/85 px-4 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.2em] text-[#B66F96]">
                De Seúl a tus manitos ✈️
              </span>
              <h1 className="text-3xl font-black tracking-tight text-[#A64F7D] sm:text-5xl">
                Proxy service <span className="text-[#D98FB4]">♡</span>
              </h1>
              <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-[#887987] sm:text-base">
                Un espacio para encontrar photocards, álbumes, merch oficial y pequeños tesoros de tiendas y plataformas coreanas.
              </p>
            </div>
          </header>

          <div className="grid grid-cols-1 gap-5 p-5 sm:p-7 md:grid-cols-12 md:gap-6">
            <section className="md:col-span-7">
              <div className="flex h-full flex-col items-center justify-center rounded-[1.5rem] border border-[#EAD8E3] bg-[#FFFBFD] px-6 py-10 text-center shadow-[0_8px_24px_-20px_rgba(166,79,125,.4)] sm:px-9 sm:py-14">
                <span className="grid h-16 w-16 place-items-center rounded-[1.4rem] bg-[#F8E5EE] text-3xl">🧸</span>
                <p className="mt-5 text-[9px] font-extrabold uppercase tracking-[0.2em] text-[#C17B9F]">Una pequeña pausa</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-[#A64F7D] sm:text-3xl">Servicio no disponible por el momento</h2>
                <p className="mt-3 max-w-md text-sm leading-6 text-[#887987]">
                  Por ahora no estamos recibiendo nuevas solicitudes de Proxy. Gracias por tu paciencia y por confiar en Hyuneatelier. ♡
                </p>
                <span className="mt-6 rounded-full border border-[#EBD1DF] bg-white px-4 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#B66F96]">
                  Esperamos volver pronto ✨
                </span>
              </div>
            </section>

            <aside className="space-y-4 md:col-span-5">
              <div className="rounded-[1.5rem] border border-[#DDE9F7] bg-[#F5F8FE] p-5 sm:p-6">
                <div className="mb-3 flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#E5EEFC] text-lg">💌</span>
                  <div>
                    <p className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-[#86A3C9]">Gracias por esperarnos</p>
                    <h2 className="text-base font-extrabold text-[#58677E]">Volveremos a abrir</h2>
                  </div>
                </div>
                <p className="text-xs leading-6 text-[#7E8DA5]">
                  Cuando el servicio vuelva a estar disponible, publicaremos la información y las instrucciones para solicitar cotizaciones por aquí.
                </p>
              </div>

              <div className="rounded-[1.5rem] border border-[#E8E0B9] bg-[#FFFAE9] p-5">
                <div className="flex items-start gap-3">
                  <span className="text-xl">💛</span>
                  <div>
                    <h3 className="text-sm font-extrabold text-[#8D7845]">Mientras tanto...</h3>
                    <p className="mt-1 text-xs leading-5 text-[#9A8961]">
                      Puedes seguir explorando la tienda y los Group Orders disponibles en Hyuneatelier.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link href="/shop" className="rounded-full border border-[#E7D9B4] bg-white px-4 py-2 text-[10px] font-extrabold text-[#927B45] transition hover:bg-[#FFF4D5]">Explorar tienda</Link>
                      <Link href="/gos" className="rounded-full border border-[#D8E8DC] bg-white px-4 py-2 text-[10px] font-extrabold text-[#668B73] transition hover:bg-[#EFF8F2]">Ver GOs</Link>
                    </div>
                  </div>
                </div>
              </div>
            </aside>

            <footer className="border-t border-[#F0E3EA] pt-4 text-center md:col-span-12">
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#C3A7B7]">Hyuneatelier · pequeños tesoros, desde Corea con cariño ♡</span>
            </footer>
          </div>
        </section>
      </div>
    </div>
  );
}
