'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../supabase';

export default function JoinerLogin() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [esRegistro, setEsRegistro] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [cargando, setCargando] = useState(false);

  const redirectTo = searchParams.get('redirect') || '/gos';

  const manejarSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setMensaje('Por favor, llena todos los campos ✦');
      return;
    }

    setMensaje('');
    setCargando(true);

    try {
      if (esRegistro) {
        const { error } = await supabase.auth.signUp({ email, password });

        if (error) {
          setMensaje(`Error: ${error.message} ✕`);
        } else {
          setMensaje('¡Cuenta creada con éxito! Ya puedes iniciar sesión... ✨');
          setTimeout(() => {
            setEsRegistro(false);
            setMensaje('');
            setPassword('');
          }, 2000);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
          setMensaje(`Error: ${error.message} ✕`);
        } else {
          setMensaje('¡Sesión iniciada con éxito! Redirigiendo... ✨');
          setTimeout(() => router.push(redirectTo), 1500);
        }
      }
    } catch {
      setMensaje('Error: Falla de red o conexión bloqueada ✕');
    } finally {
      setCargando(false);
    }
  };

  const alternarModo = () => {
    setEsRegistro(!esRegistro);
    setMensaje('');
    setEmail('');
    setPassword('');
  };

  const esError = mensaje.includes('Error') || mensaje.includes('Por favor');

  return (
    <main className="relative flex min-h-[calc(100vh-7rem)] w-full items-center justify-center overflow-hidden bg-[#FFF0F4] bg-[linear-gradient(to_right,rgba(255,255,255,0.48)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.48)_1px,transparent_1px)] bg-[size:30px_30px] px-4 py-8 pb-28 font-sans text-[#594653] antialiased">
      <div className="pointer-events-none absolute left-[8%] top-[12%] h-40 w-40 rounded-full bg-[#F8DCE8]/70 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[12%] right-[8%] h-44 w-44 rounded-full bg-[#E5DDF5]/70 blur-3xl" />

      <section className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-[#EBD5E1] bg-white/90 shadow-[0_22px_65px_-35px_rgba(157,91,125,.45)] backdrop-blur-xl">
        <div className="flex items-center justify-between border-b border-[#F0E1E9] bg-[#FFF8FB] px-5 py-3">
          <span className="flex items-center gap-2 text-[9px] font-extrabold uppercase tracking-[0.17em] text-[#B77B9C]">
            <span className="h-2 w-2 rounded-full bg-[#CDE8D8]" />
            {esRegistro ? 'joiner_register.sys' : 'joiner_access.sys'}
          </span>
          <span className="text-xs text-[#C6A6B8]" aria-hidden="true">✿ · · ·</span>
        </div>

        <div className="p-6 sm:p-8">
          <header className="mb-7 text-center">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-[1.25rem] border border-[#F0D9E5] bg-[#FBEAF1] text-2xl shadow-sm">
              🎀
            </div>
            <p className="font-serif text-lg italic text-[#C47EA2]">
              {esRegistro ? 'tu pequeño rincón te espera...' : 'welcome back, joiner...'} ✨
            </p>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-[#594653]">
              {esRegistro ? 'Crear cuenta' : 'Joiner login'} <span className="text-[#D98FB4]">♡</span>
            </h1>
            <p className="mx-auto mt-2 max-w-xs text-[10px] font-semibold uppercase leading-5 tracking-[0.12em] text-[#A3919F]">
              {esRegistro
                ? 'Regístrate para empezar a coleccionar'
                : 'Ingresa para revisar tus photocards y claims'}
            </p>
          </header>

          <form onSubmit={manejarSubmit} className="space-y-4 text-left">
            <div className="space-y-1.5">
              <label htmlFor="joiner-email" className="ml-1 block text-[10px] font-extrabold uppercase tracking-[0.13em] text-[#9A8292]">
                Correo electrónico
              </label>
              <input
                id="joiner-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu_correo@ejemplo.com"
                disabled={cargando}
                className="w-full rounded-2xl border border-[#EAD9E3] bg-[#FFFCFE] px-4 py-3.5 text-sm text-[#594653] outline-none transition placeholder:text-[#C6B8C1] focus:border-[#D58FB2] focus:ring-4 focus:ring-[#F8DCE8]/70 disabled:opacity-50"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="joiner-password" className="ml-1 block text-[10px] font-extrabold uppercase tracking-[0.13em] text-[#9A8292]">
                Contraseña
              </label>
              <input
                id="joiner-password"
                type="password"
                autoComplete={esRegistro ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={cargando}
                className="w-full rounded-2xl border border-[#EAD9E3] bg-[#FFFCFE] px-4 py-3.5 text-sm text-[#594653] outline-none transition placeholder:text-[#C6B8C1] focus:border-[#D58FB2] focus:ring-4 focus:ring-[#F8DCE8]/70 disabled:opacity-50"
              />
            </div>

            {mensaje && (
              <p
                role="status"
                className={`rounded-2xl border px-4 py-3 text-center text-xs font-semibold ${
                  esError
                    ? 'border-[#F2C9D4] bg-[#FFF0F3] text-[#B75B75]'
                    : 'border-[#CDE7D9] bg-[#EFF8F2] text-[#638D76]'
                }`}
              >
                {mensaje}
              </p>
            )}

            <button
              type="submit"
              disabled={cargando}
              className="mt-2 w-full rounded-2xl bg-gradient-to-r from-[#C66D99] to-[#DF91B5] px-5 py-3.5 text-xs font-extrabold uppercase tracking-[0.13em] text-white shadow-[0_8px_18px_-10px_rgba(182,79,131,.75)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_22px_-10px_rgba(182,79,131,.7)] active:translate-y-0 disabled:cursor-wait disabled:opacity-60"
            >
              {cargando ? 'Conectando...' : esRegistro ? 'Crear mi cuenta →' : 'Entrar a mi escritorio →'}
            </button>
          </form>

          <div className="mt-6 flex items-center justify-between gap-3 border-t border-[#F0E3EA] pt-5 text-[9px] font-extrabold uppercase tracking-wide text-[#A58D9D]">
            <Link href="/shop" className="transition hover:text-[#B64F83]">
              ← Volver a la tienda
            </Link>
            <button type="button" onClick={alternarModo} className="text-right transition hover:text-[#B64F83]">
              {esRegistro ? '¿Ya tienes cuenta? Ingresa' : '¿Nuevo joiner? Crear cuenta'}
            </button>
          </div>
        </div>
        <div className="border-t border-[#F0E3EA] bg-[#FFFAFC] px-5 py-3 text-center text-[9px] font-bold uppercase tracking-[0.18em] text-[#C3A7B7]">
          Hyuneatelier · hecho para coleccionistas ♡
        </div>
      </section>
    </main>
  );
}
