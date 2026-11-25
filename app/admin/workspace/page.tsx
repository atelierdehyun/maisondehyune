'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

type Task = { id: string; title: string; done: boolean; createdAt: number };

const initialTasks: Task[] = [
  { id: 't1', title: 'Revisar pagos pendientes', done: false, createdAt: 1 },
  { id: 't2', title: 'Preparar paquetes para envío', done: false, createdAt: 2 },
  { id: 't3', title: 'Actualizar estados de los GOs', done: false, createdAt: 3 },
];

const card = 'rounded-3xl border border-[#f0e2eb] bg-white p-4 shadow-[0_4px_18px_rgba(126,77,103,0.04)]';
const action = 'flex min-h-[76px] items-center gap-3 rounded-2xl border border-[#f0e2eb] bg-white p-3 text-left transition active:scale-[.99] hover:border-[#e6b8ce] hover:bg-[#fffafd]';

function Shortcut({ href, icon, title, detail }: { href: string; icon: string; title: string; detail: string }) {
  return <Link href={href} className={action}><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#fff0f6] text-xl">{icon}</span><span className="min-w-0"><span className="block text-sm font-extrabold text-[#594653]">{title}</span><span className="mt-0.5 block text-xs text-[#987f8e]">{detail}</span></span><span className="ml-auto text-[#c18aa5]">›</span></Link>;
}

export default function AdminWorkspacePage() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [draft, setDraft] = useState('');
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState('gos');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('hyuneatelier-admin-tasks-v1');
      if (saved) setTasks(JSON.parse(saved));
    } catch { /* Keep the starter tasks if local storage is unavailable. */ }
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) {
      try { localStorage.setItem('hyuneatelier-admin-tasks-v1', JSON.stringify(tasks)); } catch { /* Ignore storage restrictions. */ }
    }
  }, [tasks, ready]);

  const pending = useMemo(() => tasks.filter(t => !t.done).length, [tasks]);
  function addTask(e: React.FormEvent) {
    e.preventDefault();
    const title = draft.trim();
    if (!title) return;
    setTasks(current => [{ id: `${Date.now()}-${Math.random()}`, title, done: false, createdAt: Date.now() }, ...current]);
    setDraft('');
  }

  return <main className="min-h-screen bg-[#fff8fc] px-3 pb-28 pt-5 text-[#594653] sm:px-6 sm:pb-10">
    <div className="mx-auto max-w-5xl space-y-5">
      <header className="rounded-[28px] bg-gradient-to-br from-[#fff0f6] via-white to-[#f0fbf7] p-5 sm:p-7">
        <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.24em] text-[#bd7899]">HYUNEATELIER · PRIVATE SPACE</p><h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Mi workspace ♡</h1><p className="mt-1 max-w-md text-sm text-[#987f8e]">Tu espacio de trabajo. Un paso a la vez, sin tener todo abierto.</p></div><Link href="/admin" className="rounded-full border border-[#ead9e3] bg-white/90 px-3 py-2 text-xs font-bold text-[#916b80]">Panel actual ↗</Link></div>
        <div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-white/90 p-4"><p className="text-xs text-[#987f8e]">Tareas pendientes</p><p className="mt-1 text-3xl font-black">{pending}</p></div><div className="rounded-2xl bg-white/90 p-4"><p className="text-xs text-[#987f8e]">Tareas completadas</p><p className="mt-1 text-3xl font-black">{tasks.length - pending}</p></div></div>
      </header>

      <section className={card}>
        <div className="flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-[#bd7899]">01 · planner</p><h2 className="mt-1 text-lg font-black">Mi diario de tareas</h2></div><span className="rounded-full bg-[#fff0f6] px-3 py-1 text-xs font-bold text-[#a45e7c]">{pending} por hacer</span></div>
        <form onSubmit={addTask} className="mt-4 flex gap-2"><input value={draft} onChange={e => setDraft(e.target.value)} placeholder="¿Qué necesitas hacer hoy?" className="min-w-0 flex-1 rounded-2xl border border-[#ead9e3] bg-[#fffafd] px-4 py-3 text-sm outline-none focus:border-[#d779a5]"/><button className="rounded-2xl bg-[#d779a5] px-4 py-3 text-sm font-bold text-white">＋</button></form>
        <div className="mt-3 space-y-2">{tasks.length === 0 ? <p className="rounded-xl bg-[#fffafd] p-4 text-center text-sm text-[#987f8e]">Tu lista está vacía. Añade tu primera tarea ♡</p> : tasks.map(task => <div key={task.id} className="flex items-center gap-3 rounded-2xl bg-[#fffafd] px-3 py-3"><input aria-label={`Marcar ${task.title}`} type="checkbox" checked={task.done} onChange={e => setTasks(current => current.map(t => t.id === task.id ? { ...t, done: e.target.checked } : t))} className="h-4 w-4 accent-[#d779a5]"/><span className={`min-w-0 flex-1 text-sm ${task.done ? 'text-[#b49aa8] line-through' : 'font-semibold text-[#665260]'}`}>{task.title}</span><button onClick={() => setTasks(current => current.filter(t => t.id !== task.id))} className="px-2 text-lg text-[#c49bad]" aria-label="Eliminar tarea">×</button></div>)}</div>
      </section>

      <section className={card}><p className="text-[10px] font-black uppercase tracking-[.2em] text-[#bd7899]">02 · operaciones</p><h2 className="mb-3 mt-1 text-lg font-black">Mis áreas</h2>
        <div className="space-y-2">
          <div className="overflow-hidden rounded-2xl border border-[#f0e2eb]"><button onClick={() => setOpen(open === 'gos' ? '' : 'gos')} className="flex w-full items-center justify-between bg-[#fffafd] p-3 text-left"><span className="font-extrabold">🐻 Group Orders</span><span>{open === 'gos' ? '−' : '+'}</span></button>{open === 'gos' && <div className="grid gap-2 p-3 sm:grid-cols-2"><Shortcut href="/admin/gos" icon="📦" title="Administrar GOs" detail="Crear, revisar y actualizar GOs"/><Shortcut href="/admin/fotos" icon="🖼️" title="Fotos y portadas" detail="Imágenes de GOs y productos"/><Shortcut href="/gos" icon="🛍️" title="Ver catálogo público" detail="Comprobar lo que ven los joiners"/></div>}</div>
          <div className="overflow-hidden rounded-2xl border border-[#f0e2eb]"><button onClick={() => setOpen(open === 'shop' ? '' : 'shop')} className="flex w-full items-center justify-between bg-[#fffafd] p-3 text-left"><span className="font-extrabold">🛒 Tienda</span><span>{open === 'shop' ? '−' : '+'}</span></button>{open === 'shop' && <div className="grid gap-2 p-3 sm:grid-cols-2"><Shortcut href="/admin" icon="🧺" title="Gestión de tienda" detail="Productos, pedidos y joiners"/><Shortcut href="/tienda" icon="🛍️" title="Ver tienda pública" detail="Revisar catálogo de la tienda"/></div>}</div>
          <div className="overflow-hidden rounded-2xl border border-[#f0e2eb]"><button onClick={() => setOpen(open === 'money' ? '' : 'money')} className="flex w-full items-center justify-between bg-[#fffafd] p-3 text-left"><span className="font-extrabold">💗 Pagos y pedidos</span><span>{open === 'money' ? '−' : '+'}</span></button>{open === 'money' && <div className="grid gap-2 p-3 sm:grid-cols-2"><Shortcut href="/admin" icon="💳" title="Revisar pagos" detail="Confirmaciones y saldos desde el panel actual"/><Shortcut href="/admin" icon="📮" title="Envíos y seguimiento" detail="Solicitudes, guías y estados"/></div>}</div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2"><div className={card}><p className="text-[10px] font-black uppercase tracking-[.2em] text-[#bd7899]">03 · acceso rápido</p><h2 className="mb-3 mt-1 text-lg font-black">Administración</h2><Shortcut href="/admin" icon="⚙️" title="Abrir panel completo" detail="Joiners, pagos, envíos, stock y publicaciones"/></div><div className={card}><p className="text-[10px] font-black uppercase tracking-[.2em] text-[#bd7899]">04 · nota</p><h2 className="mt-1 text-lg font-black">Un espacio más tranquilo</h2><p className="mt-2 text-sm leading-relaxed text-[#987f8e]">Las tareas de esta primera versión se guardan en este navegador y dispositivo. Los pagos, pedidos y datos de clientes siguen gestionándose desde el panel actual, sin duplicar ni modificar registros.</p></div></section>
      <p className="pb-4 text-center text-[11px] text-[#b49aa8]">Hyuneatelier workspace · hecho para trabajar desde el teléfono ♡</p>
    </div>
  </main>;
}
