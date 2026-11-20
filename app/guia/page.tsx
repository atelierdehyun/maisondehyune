"use client";

import Link from "next/link";

const steps = [
  {
    number: "01",
    icon: "👤",
    title: "Crea tu cuenta",
    description:
      "Regístrate con tu correo y contraseña. Después inicia sesión para que puedas revisar tus claims, pedidos y paquetes desde tu cuenta.",
    href: "/joiner-login",
    action: "Crear cuenta o entrar",
    tone: "pink",
  },
  {
    number: "02",
    icon: "🧸",
    title: "Únete a un GO",
    description:
      "Entra a GOs, explora los pedidos grupales disponibles y revisa sus detalles. Elige el producto y el integrante que quieres reclamar. Si todavía no has iniciado sesión, la página te llevará al acceso.",
    href: "/gos",
    action: "Explorar GOs",
    tone: "mint",
  },
  {
    number: "03",
    icon: "🛒",
    title: "Compra en la tienda",
    description:
      "Explora los productos disponibles, abre los detalles del artículo que te interesa y añádelo a tu pedido siguiendo las opciones que aparecen en pantalla.",
    href: "/shop",
    action: "Ir a la tienda",
    tone: "butter",
  },
  {
    number: "04",
    icon: "💳",
    title: "Revisa y reporta tus pagos",
    description:
      "Entra a Mi cuenta para revisar tus compras y los importes pendientes. Sigue las indicaciones de pago que aparecen allí y reporta tu pago para que pueda ser revisado.",
    href: "/mi-escritorio",
    action: "Abrir Mi cuenta",
    tone: "lilac",
  },
  {
    number: "05",
    icon: "📦",
    title: "Haz seguimiento de tus pedidos",
    description:
      "En Mi cuenta puedes consultar tus pedidos, claims y paquetes. Revisa sus estados para saber si tu artículo sigue en proceso o si ya está listo para solicitar el envío.",
    href: "/mi-escritorio",
    action: "Ver mis pedidos",
    tone: "blue",
  },
  {
    number: "06",
    icon: "✈️",
    title: "Solicita tu envío",
    description:
      "Cuando tus artículos estén disponibles para envío, selecciónalos en la sección de bodega, completa los datos de entrega y confirma tu solicitud. Comprueba que la dirección y la tarifa sean correctas antes de enviarla.",
    href: "/mi-escritorio",
    action: "Solicitar mi envío",
    tone: "pink",
  },
];

const toneClasses: Record<string, string> = {
  pink: "border-[#f0cddd] bg-[#fff3f7] text-[#bd6393]",
  mint: "border-[#d5eadc] bg-[#f1faf4] text-[#628d77]",
  butter: "border-[#f0e2b8] bg-[#fff9e9] text-[#a9873d]",
  lilac: "border-[#e5d9f1] bg-[#f8f3fc] text-[#9477b4]",
  blue: "border-[#d7e8f2] bg-[#f1f8fc] text-[#6795b2]",
};

export default function GuiaPage() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-7 pb-10 text-[#514653]">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-[#b8799b] transition hover:text-[#c45e91]"
      >
        ← volver al inicio
      </Link>

      <header className="relative overflow-hidden rounded-[2rem] border border-white bg-[#fffafd] p-5 shadow-[0_20px_55px_-38px_rgba(174,91,135,.4)] sm:p-8">
        <div className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full bg-[#e9ddf7]/65 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-12 h-56 w-56 rounded-full bg-[#dff1e4]/70 blur-3xl" />
        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#edcddd] bg-white/85 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-[#c76d9d]">
            📖 guía para nuevos joiners
          </span>
          <h1 className="mt-4 font-serif text-4xl italic leading-tight text-[#655765] sm:text-5xl">
            ¡Hola, collector! <span className="text-[#c76d9d]">♡</span>
          </h1>
          <p className="mt-3 max-w-2xl text-[12px] leading-6 text-[#827783] sm:text-sm">
            ¿No sabes por dónde empezar? No te preocupes. Aquí te mostramos cómo
            usar Hyuneatelier, desde crear tu cuenta hasta recibir tus compras.
            Puedes volver a esta guía cuando quieras.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href="/joiner-login"
              className="rounded-full bg-gradient-to-r from-[#d96fa7] to-[#e47c91] px-5 py-3 text-[9px] font-black uppercase tracking-[0.15em] text-white shadow-sm transition hover:-translate-y-0.5"
            >
              empezar aquí ↗
            </Link>
            <Link
              href="/info-rules"
              className="rounded-full border border-[#e8d6e1] bg-white px-5 py-3 text-[9px] font-black uppercase tracking-[0.15em] text-[#a66c8d] transition hover:bg-[#fff3f8]"
            >
              leer reglas e información
            </Link>
          </div>
        </div>
      </header>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2 px-1">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.24em] text-[#c76d9d]">
              tu recorrido
            </p>
            <h2 className="mt-1 font-serif text-2xl italic text-[#655765] sm:text-3xl">
              Así funciona Hyuneatelier
            </h2>
          </div>
          <span className="text-[9px] font-bold text-[#aa96a5]">6 pasos · a tu ritmo</span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {steps.map((step) => (
            <article
              key={step.number}
              className={`rounded-[1.5rem] border p-4 shadow-[0_9px_24px_-20px_rgba(100,70,90,.35)] sm:p-5 ${toneClasses[step.tone]}`}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-current/10 bg-white/80 text-2xl">
                  {step.icon}
                </span>
                <span className="font-serif text-2xl italic opacity-50">{step.number}</span>
              </div>
              <h3 className="mt-4 text-[12px] font-black uppercase tracking-[0.12em]">
                {step.title}
              </h3>
              <p className="mt-2 min-h-[76px] text-[11px] leading-5 text-[#827783]">
                {step.description}
              </p>
              <Link
                href={step.href}
                className="mt-4 inline-flex items-center gap-2 rounded-full border border-current/15 bg-white/85 px-4 py-2.5 text-[9px] font-black uppercase tracking-[0.13em] transition hover:-translate-y-0.5 hover:bg-white"
              >
                {step.action} <span>↗</span>
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-[1.8rem] border border-[#dcecdf] bg-gradient-to-br from-[#f1faf4] via-[#fffafd] to-[#f8f3fc] p-5 shadow-[0_14px_35px_-28px_rgba(100,130,110,.4)] sm:p-7">
        <p className="text-[9px] font-black uppercase tracking-[0.23em] text-[#71967c]">
          cuando tu paquete esté listo
        </p>
        <h2 className="mt-2 font-serif text-2xl italic text-[#655765] sm:text-3xl">
          Tarifas de envío dentro de Ecuador
        </h2>
        <p className="mt-2 text-[11px] leading-5 text-[#827783]">
          Al solicitar tu envío, selecciona la tarifa que corresponde a tu destino.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {[
            { place: "Quito", price: "$3.50", icon: "🏙️" },
            { place: "Provincias", price: "$6.50", icon: "📍" },
            { place: "Amazonía y Galápagos", price: "$7.50", icon: "🌿" },
          ].map((rate) => (
            <div
              key={rate.place}
              className="flex items-center justify-between gap-3 rounded-2xl border border-white bg-white/85 p-4"
            >
              <span>
                <span className="block text-xl">{rate.icon}</span>
                <span className="mt-2 block text-[10px] font-black uppercase tracking-[0.1em] text-[#806f7d]">
                  {rate.place}
                </span>
              </span>
              <span className="font-serif text-2xl italic text-[#71967c]">{rate.price}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[9px] leading-4 text-[#968694]">
          Estas tarifas corresponden al envío dentro de Ecuador. Revisa los datos
          y el importe que aparezcan en tu solicitud antes de confirmarla.
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-[1.5rem] border border-[#eadcf3] bg-[#faf7fd] p-5">
          <span className="text-2xl">📜</span>
          <h2 className="mt-2 text-[11px] font-black uppercase tracking-[0.13em] text-[#9477b4]">
            Antes de comprar
          </h2>
          <p className="mt-2 text-[10px] leading-5 text-[#827783]">
            Lee las reglas e información para conocer las condiciones de compra,
            tiempos y procesos de Hyuneatelier.
          </p>
          <Link
            href="/info-rules"
            className="mt-3 inline-flex text-[9px] font-black uppercase tracking-[0.12em] text-[#9477b4] hover:underline"
          >
            leer información ↗
          </Link>
        </div>
        <div className="rounded-[1.5rem] border border-[#f0dce6] bg-[#fff7fa] p-5">
          <span className="text-2xl">💌</span>
          <h2 className="mt-2 text-[11px] font-black uppercase tracking-[0.13em] text-[#bd6393]">
            ¿Tienes dudas?
          </h2>
          <p className="mt-2 text-[10px] leading-5 text-[#827783]">
            Si necesitas ayuda con tu pedido, puedes escribir a la comunidad de
            Hyuneatelier por WhatsApp.
          </p>
          <a
            href="https://chat.whatsapp.com/FMBE0gchYcMKkD7BPxd5q7"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex text-[9px] font-black uppercase tracking-[0.12em] text-[#bd6393] hover:underline"
          >
            ir a WhatsApp ↗
          </a>
        </div>
      </section>

      <div className="pb-2 text-center">
        <Link
          href="/"
          className="inline-flex rounded-full border border-[#edcddd] bg-white px-6 py-3 text-[9px] font-black uppercase tracking-[0.17em] text-[#bd6393] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#fff5f9]"
        >
          volver a Hyuneatelier ♡
        </Link>
      </div>
    </div>
  );
}
