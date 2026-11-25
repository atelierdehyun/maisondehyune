'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const bottomLinks = [
  { href: '/', icon: '🏠', label: 'Inicio' },
  { href: '/shop', icon: '🛒', label: 'Tienda' },
  { href: '/gos', icon: '🧸', label: 'GOs' },
  { href: '/proxy-service', icon: '🇰🇷', label: 'Proxy' },
  { href: '/joiner-login', icon: '👤', label: 'Login' },
  { href: '/mi-escritorio', icon: '⭐', label: 'Mi cuenta', primary: true },
];

export default function AdminAwareShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname === '/admin' || pathname.startsWith('/admin/');

  return (
    <>
      <main className={isAdmin ? 'mx-auto w-full px-0 pt-0 pb-8' : 'mx-auto w-full max-w-6xl px-4 pt-5 pb-32 sm:pt-7 sm:pb-32'}>
        {children}
      </main>
      {!isAdmin && (
        <nav aria-label="Navegación principal" className="fixed inset-x-3 bottom-3 z-40 mx-auto max-w-2xl rounded-[1.6rem] border border-white/90 bg-white/90 px-2 py-2 shadow-[0_12px_40px_-12px_rgba(160,90,125,.35)] backdrop-blur-xl">
          <div className="grid grid-cols-6 gap-1">
            {bottomLinks.map((item) => (
              <Link key={item.href} href={item.href} aria-label={item.label} className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 transition ${item.primary ? '-mt-4 border border-[#efc2d8] bg-gradient-to-b from-[#fbe3ee] to-[#f8d5e6] text-[#a83f75] shadow-[0_7px_18px_-9px_rgba(184,75,128,.65)]' : 'text-[#a66c8d] hover:bg-[#fff0f6] hover:text-[#c45e91]'}`}>
                <span aria-hidden="true" className={`${item.primary ? 'text-2xl' : 'text-xl'} leading-none`}>{item.icon}</span>
                <span className={`truncate font-bold ${item.primary ? 'text-[10px]' : 'text-[9px] sm:text-[10px]'}`}>{item.label}</span>
              </Link>
            ))}
          </div>
        </nav>
      )}
    </>
  );
}
