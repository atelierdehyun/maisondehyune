
'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { firebaseAuth } from '@/lib/firebaseClient';

type ShopProduct = {
  id: number | string;
  nombre_producto?: string;
  title?: string;
  grupo?: string;
  precio?: number;
  cantidad_disponible?: number;
  estado?: string;
  status?: string;
};

export default function ShopAdmin() {
  const [items, setItems] = useState<ShopProduct[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setBusy(true);

    try {
      await firebaseAuth.authStateReady();

      const token = await firebaseAuth.currentUser?.getIdToken();

      if (!token) {
        throw new Error('Inicia sesión con tu cuenta administradora.');
      }

      const response = await fetch(
        '/api/admin/operations?collections=tienda_productos,pedidos,operaciones_pedidos,operaciones_pagos',
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: 'no-store',
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || 'No se pudo cargar Shop.'
        );
      }

      setItems(result.data?.tienda_productos || []);
      setError('');
    } catch (err: any) {
      setError(err.message || 'No se pudo cargar Shop.');
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const stock = items.reduce(
    (total, item) =>
      total + Math.max(0, Number(item.cantidad_disponible || 0)),
    0
  );

  return (
    <main className="min-h-screen bg-[#fbfaff] px-4 py-6 text-[#514653] sm:px-8">
      <div className="mx-auto max-w-7xl space-y-5">

        <header className="flex flex-wrap items-center justify-between gap-3 rounded-[28px] border border-[#e9e3f5] bg-white p-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#9a83bd]">
              Hyuneatelier · administración
            </p>

            <h1 className="text-3xl font-black">
              Shop workspace 🛍️
            </h1>

            <p className="mt-1 text-sm text-[#93889c]">
              El espacio de trabajo de tu tienda, separado visualmente de Group Orders.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin"
              className="rounded-xl border border-[#eee6f2] px-4 py-2 text-sm font-bold"
            >
              ← Dashboard
            </Link>

            <button
              onClick={load}
              disabled={busy}
              className="rounded-xl bg-[#eee9fa] px-4 py-2 text-sm font-bold text-[#8068a7] disabled:opacity-50"
            >
              ↻ Actualizar
            </button>
          </div>
        </header>

        {error && (
          <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
            {error}
          </p>
        )}

        <section className="grid gap-3 sm:grid-cols-3">
          <article className="rounded-3xl border border-[#e9e3f5] bg-white p-5">
            <p className="text-xs text-[#978ba0]">
              Productos publicados
            </p>
            <b className="mt-2 block text-3xl">
              {items.length}
            </b>
          </article>

          <article className="rounded-3xl border border-[#e9e3f5] bg-white p-5">
            <p className="text-xs text-[#978ba0]">
              Unidades en stock
            </p>
            <b className="mt-2 block text-3xl">
              {stock}
            </b>
          </article>

          <article className="rounded-3xl border border-[#e9e3f5] bg-white p-5">
            <p className="text-xs text-[#978ba0]">
              Estado
            </p>
            <b className="mt-2 block text-lg">
              {busy ? 'Cargando…' : error ? 'Revisar conexión' : 'Conectado a Firebase'}
            </b>
          </article>
        </section>

        <section className="rounded-[28px] border border-[#e9e3f5] bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.18em] text-[#9a83bd]">
                Catálogo
              </p>

              <h2 className="text-xl font-black">
                Productos de Shop
              </h2>
            </div>

            <Link
              href="/admin/shop/catalogo"
              className="rounded-xl bg-[#e9e3f5] px-4 py-2.5 text-sm font-bold text-[#765d9f]"
            >
              Abrir catálogo de Shop →
            </Link>
          </div>

          {items.length === 0 ? (
            <p className="mt-4 rounded-2xl bg-[#faf8fd] p-4 text-sm text-[#93889c]">
              {busy
                ? 'Cargando productos…'
                : 'No hay productos para mostrar.'}
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[#f0ebf5] text-xs text-[#95899f]">
                    <th className="p-3">Producto</th>
                    <th className="p-3">Grupo</th>
                    <th className="p-3">Precio</th>
                    <th className="p-3">Stock</th>
                    <th className="p-3">Estado</th>
                  </tr>
                </thead>

                <tbody>
                  {items.map((item, index) => (
                    <tr
                      key={item.id || index}
                      className="border-b border-[#f6f2f8]"
                    >
                      <td className="p-3 font-bold">
                        {item.nombre_producto || item.title || 'Producto sin nombre'}
                      </td>

                      <td className="p-3">
                        {item.grupo || '—'}
                      </td>

                      <td className="p-3">
                        ${Number(item.precio || 0).toFixed(2)}
                      </td>

                      <td className="p-3">
                        {Number(item.cantidad_disponible || 0)}
                      </td>

                      <td className="p-3">
                        {item.estado || item.status || 'Publicado'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="mt-4 rounded-2xl bg-[#f7f3fc] p-3 text-xs leading-5 text-[#887b98]">
            Administra los productos de tu tienda desde el catálogo independiente.
            Los Group Orders mantienen sus propias herramientas y operaciones.
          </p>
        </section>
      </div>
    </main>
  );
}
