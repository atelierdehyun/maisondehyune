'use client';

import Link from 'next/link';

const sections = [
  {
    href: '/admin/shop',
    icon: '🛍️',
    title: 'SHOP',
    description: 'Productos, precios, stock, fotografías y pedidos de la tienda.',
    tone: 'bg-[#faeaf2]',
    accent: 'text-[#a4567d]',
  },
  {
    href: '/admin/gos',
    icon: '📦',
    title: 'GOs',
    description: 'Group Orders, artículos, integrantes, claims y preparación de pedidos.',
    tone: 'bg-[#eaf6f0]',
    accent: 'text-[#528c72]',
  },
  {
    href: '/admin/centro',
    icon: '💳',
    title: 'PAGOS',
    description: 'Comprobantes, pagos recibidos, saldos e historial de operaciones.',
    tone: 'bg-[#fff6df]',
    accent: 'text-[#98752d]',
  },
];

export default function AdminDashboard() {
  return (
    <main className="min-h-screen bg-[#fff9fc] px-4 py-7 text-[#594653] sm:px-7 lg:px-9">
      <div className="mx-auto max-w-5xl space-y-7">
        <header className="rounded-[30px] border border-[#f0e3eb] bg-white px-5 py-6 shadow-sm sm:px-8">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#faeaf2] text-2xl">🎀</span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.22em] text-[#c17b9d]">Hyuneatelier · workspace</p>
              <h1 className="text-2xl font-black tracking-tight text-[#514653] sm:text-3xl">Centro de administración</h1>
              <p className="mt-1 text-sm text-[#9a8793]">Tus tres espacios de trabajo, sin secciones innecesarias.</p>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          {sections.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className="group rounded-[28px] border border-[#f0e3eb] bg-white p-5 shadow-[0_5px_20px_rgba(89,58,75,.04)] transition hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(89,58,75,.09)]"
            >
              <span className={`grid h-14 w-14 place-items-center rounded-2xl text-2xl ${section.tone}`}>{section.icon}</span>
              <h2 className={`mt-5 text-lg font-black ${section.accent}`}>{section.title}</h2>
              <p className="mt-2 min-h-16 text-sm leading-6 text-[#8c7b87]">{section.description}</p>
              <p className="mt-5 border-t border-[#f5edf1] pt-3 text-xs font-bold text-[#b16d90]">Abrir sección <span className="transition group-hover:translate-x-1">↗</span></p>
            </Link>
          ))}
        </section>

        <p className="text-center text-xs text-[#ad9aa5]">Los datos se cargan dentro de cada sección cuando realmente los necesitas.</p>
      </div>
    </main>
  );
}
