'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
const NUMERO_WHATSAPP = '593999530327';

type ReclamoGo = {
  idUnico: string;
  catalogoNombre: string;
  itemNombre: string;
  imagenUrl: string | null;
  integranteElegido: string;
  cantidad: number;
  precioUnitario: number;
  fechaLimite: string | null;
  estadoConfirmacion: string;
  estadoPago: string;
  fechaPago: string | null;
};

type CompraShop = {
  id: number;
  producto_nombre?: string;
  detalles: string | null;
  total_pagar: number;
  estado_pago: string;
  estado_confirmacion?: string;
  fecha_pago?: string | null;
  fecha_limite?: string | null;
  imagen_producto?: string | null;
};

export default function MiEscritorioJoiner() {
  const [pestanaJoiner, setPestanaInterna] = useState<'gos' | 'compras'>('gos');
  const [filtroEstado, setFiltroEstado] = useState<'TODOS' | 'PENDIENTES' | 'PAGADOS'>('TODOS');
  const [usuarioEmail, setUsuarioEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [misGos, setMisGos] = useState<ReclamoGo[]>([]);
  const [misCompras, setMisCompras] = useState<CompraShop[]>([]);

  async function cargarEscritorioCliente() {
    try {
      setLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user?.email) {
        setLoading(false);
        return;
      }
      const emailLogueado = session.user.email.toLowerCase().trim();
      setUsuarioEmail(emailLogueado);

      const [{ data: dProds }, { data: dSeg }] = await Promise.all([
        supabase
          .from('productos')
          .select('id, nombre_producto, precio, imagen_url, claims_integrantes, due_date, gos(title)'),
        supabase
          .from('seguimiento_claims')
          .select('*')
          .eq('user_email', emailLogueado),
      ]);

      const mapaSeg: Record<string, any> = {};
      if (dSeg) {
        dSeg.forEach((s) => {
          mapaSeg[s.claim_key] = s;
        });
      }

      const listaReclamos: ReclamoGo[] = [];

      if (dProds) {
        dProds.forEach((p: any) => {
          const claims = p.claims_integrantes || {};
          Object.entries(claims).forEach(([intName, comprador]: [string, any]) => {
            const matchDirecto =
              typeof comprador === 'string' &&
              comprador.toLowerCase().trim() === emailLogueado;
            const matchObj =
              typeof comprador === 'object' &&
              comprador !== null &&
              Object.keys(comprador).some((k) => k.toLowerCase().trim() === emailLogueado);

            if (matchDirecto || matchObj) {
              const cantidadElegida =
                typeof comprador === 'object' ? Number(comprador[emailLogueado] || 1) : 1;
              const key = `${p.id}-${intName}`;
              const seg = mapaSeg[key];

              listaReclamos.push({
                idUnico: key,
                catalogoNombre: p.gos?.title || 'Group Order Atelier',
                itemNombre: p.nombre_producto,
                imagenUrl: p.imagen_url || null,
                integranteElegido: intName,
                cantidad: cantidadElegida,
                precioUnitario: Number(p.precio || 0) * cantidadElegida,
                fechaLimite: p.due_date ? new Date(p.due_date).toLocaleDateString() : 'Por definir',
                estadoConfirmacion: seg?.estado_confirmacion || 'Pendiente',
                estadoPago: seg?.estado_pago || 'Sin pagar',
                fechaPago: seg?.fecha_pago || null,
              });
            }
          });
        });
      }
      setMisGos(listaReclamos);

      const { data: dPedidos } = await supabase
        .from('pedidos')
        .select('*')
        .eq('user_email', emailLogueado)
        .order('id', { ascending: false });
      if (dPedidos) setMisCompras(dPedidos);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargarEscritorioCliente();
  }, []);

  const gosFiltrados = misGos.filter((item) => {
    if (filtroEstado === 'PAGADOS') return item.estadoPago === 'Pagado';
    if (filtroEstado === 'PENDIENTES') return item.estadoPago !== 'Pagado';
    return true;
  });

  const gosAgrupados = gosFiltrados.reduce((acc: Record<string, ReclamoGo[]>, item) => {
    if (!acc[item.catalogoNombre]) acc[item.catalogoNombre] = [];
    acc[item.catalogoNombre].push(item);
    return acc;
  }, {});

  const totalAcumuladoGos = misGos.reduce((acc, item) => acc + item.precioUnitario, 0);
  const totalPendienteGos = misGos
    .filter((i) => i.estadoPago !== 'Pagado')
    .reduce((acc, item) => acc + item.precioUnitario, 0);

  const badgeConfirmacion = (estado: string) => {
    if (estado === 'Confirmado')
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (estado === 'Cancelado')
      return 'bg-rose-50 text-rose-700 border-rose-200';
    return 'bg-amber-50 text-amber-700 border-amber-200';
  };

  const badgePago = (estado: string) => {
    if (estado === 'Pagado' || estado === 'PAGADO' || estado === 'INSTOCK')
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (estado === 'Verificando')
      return 'bg-sky-50 text-sky-700 border-sky-200';
    return 'bg-rose-50 text-rose-700 border-rose-200';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F9] flex items-center justify-center font-mono text-xs text-zinc-400">
        ✧ cargando tu cuenta y pedidos...
      </div>
    );
  }

  if (!usuarioEmail) {
    return (
      <div className="min-h-screen bg-[#FAF8F9] flex flex-col items-center justify-center p-4 text-center gap-3">
        <p className="text-xs font-bold text-pink-600 bg-white border border-pink-100 px-5 py-3 rounded-2xl shadow-2xs">
          🎀 Inicia sesión para revisar tus Group Orders y compras
        </p>
        <Link href="/gos" className="text-xs font-semibold text-zinc-500 underline">
          Volver al catálogo ➔
        </Link>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-[#FAF8F9] font-sans text-zinc-800 pb-16">
      <div className="bg-white border-b border-zinc-200/80 px-4 py-3">
        <div className="max-w-5xl mx-auto flex flex-wrap justify-between items-center gap-2">
          <Link
            href="/gos"
            className="text-xs font-semibold text-zinc-500 hover:text-pink-600 transition-colors"
          >
            ← Volver al catálogo
          </Link>
          <span className="text-[11px] text-zinc-500 bg-zinc-100 px-3 py-1 rounded-full font-medium">
            👤 {usuarioEmail}
          </span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 pt-6 grid grid-cols-1 md:grid-cols-4 gap-6">
        <aside className="md:col-span-1 space-y-3">
          <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 shadow-2xs">
            <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-3">
              Mi Cuenta
            </p>
            <nav className="space-y-1.5">
              <button
                type="button"
                onClick={() => setPestanaInterna('gos')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  pestanaJoiner === 'gos'
                    ? 'bg-pink-50 text-pink-600 border border-pink-200'
                    : 'text-zinc-600 hover:bg-zinc-50'
                }`}
              >
                <span>🧸 Mis Group Orders</span>
                <span className="bg-white text-zinc-700 px-2 py-0.5 rounded-full text-[10px] border border-zinc-200">
                  {misGos.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setPestanaInterna('compras')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  pestanaJoiner === 'compras'
                    ? 'bg-zinc-900 text-white'
                    : 'text-zinc-600 hover:bg-zinc-50'
                }`}
              >
                <span>🛍️ Mis Compras Tienda</span>
                <span className="bg-zinc-100 text-zinc-800 px-2 py-0.5 rounded-full text-[10px]">
                  {misCompras.length}
                </span>
              </button>
            </nav>
          </div>

          <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 shadow-2xs space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Resumen GOs
            </p>
            <div className="flex justify-between text-xs">
              <span className="text-zinc-500">Total apartado:</span>
              <span className="font-bold text-zinc-900">${totalAcumuladoGos.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-zinc-500">Por pagar:</span>
              <span className="font-bold text-rose-600">${totalPendienteGos.toFixed(2)}</span>
            </div>
          </div>

          <div className="bg-pink-50/60 border border-pink-100 rounded-2xl p-4 text-[11px] text-zinc-600 space-y-1">
            <p className="font-bold text-pink-700">🏦 Datos de Transferencia</p>
            <p>Banco Pichincha / Produbanco (Cuenta de Ahorros)</p>
            <p className="text-[10px] text-zinc-500 pt-1">
              Envía tu comprobante desde cada tarjeta para actualizar tu estado.
            </p>
          </div>
        </aside>
        <main className="md:col-span-3 space-y-5">
          {pestanaJoiner === 'gos' && (
            <>
              <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 flex flex-wrap justify-between items-center gap-3 shadow-2xs">
                <div>
                  <h1 className="text-base font-extrabold text-zinc-900">
                    Mis Group Orders
                  </h1>
                  <p className="text-xs text-zinc-500">
                    Tus apartados organizados por cada GO sin mezclarse
                  </p>
                </div>

                <div className="flex gap-1.5 bg-zinc-100 p-1 rounded-xl">
                  {(['TODOS', 'PENDIENTES', 'PAGADOS'] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setFiltroEstado(tab)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                        filtroEstado === tab
                          ? 'bg-white text-zinc-900 shadow-2xs'
                          : 'text-zinc-500 hover:text-zinc-800'
                      }`}
                    >
                      {tab === 'TODOS' ? 'Todos' : tab === 'PENDIENTES' ? 'Sin pagar' : 'Pagados'}
                    </button>
                  ))}
                </div>
              </div>

              {Object.keys(gosAgrupados).length === 0 ? (
                <div className="bg-white border border-zinc-200/80 rounded-2xl p-10 text-center space-y-2">
                  <p className="text-sm font-bold text-zinc-700">
                    No hay apartados en esta sección 🌸
                  </p>
                  <p className="text-xs text-zinc-400">
                    Explora los GOs activos para reclamar tus slots favoritos.
                  </p>
                </div>
              ) : (
                Object.entries(gosAgrupados).map(([nombreGo, items]) => {
                  const subtotalGo = items.reduce((s, x) => s + x.precioUnitario, 0);
                  return (
                    <section
                      key={nombreGo}
                      className="bg-white border border-zinc-200/90 rounded-2xl overflow-hidden shadow-2xs"
                    >
                      <div className="bg-zinc-50/80 border-b border-zinc-200/80 px-5 py-3.5 flex flex-wrap justify-between items-center gap-2">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-pink-600 bg-pink-50 border border-pink-200 px-2.5 py-0.5 rounded-full">
                            Group Order
                          </span>
                          <h2 className="text-sm font-extrabold text-zinc-900 mt-1">
                            {nombreGo}
                          </h2>
                        </div>
                        <div className="text-right">
                          <p className="text-[11px] text-zinc-400">Subtotal de este GO</p>
                          <p className="text-sm font-black text-zinc-900">
                            ${subtotalGo.toFixed(2)} USD
                          </p>
                        </div>
                      </div>

                      <div className="divide-y divide-zinc-100">
                        {items.map((item) => (
                          <div
                            key={item.idUnico}
                            className="p-5 flex flex-col sm:flex-row justify-between gap-4 hover:bg-zinc-50/40 transition-colors"
                          >
                            <div className="flex gap-4">
                              <div className="w-20 h-20 rounded-xl bg-zinc-100 border border-zinc-200 overflow-hidden shrink-0 flex items-center justify-center">
                                {item.imagenUrl ? (
                                  <img
                                    src={item.imagenUrl}
                                    alt={item.itemNombre}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <span className="text-2xl">🧸</span>
                                )}
                              </div>

                              <div className="space-y-1.5">
                                <p className="text-sm font-bold text-zinc-900">
                                  {item.itemNombre}
                                </p>
                                <p className="text-xs text-zinc-500">
                                  Integrante / Slot:{' '}
                                  <strong className="text-pink-600">
                                    {item.integranteElegido}
                                  </strong>{' '}
                                  · Cant: <strong>{item.cantidad}</strong>
                                </p>

                                <div className="flex flex-wrap gap-1.5 pt-1">
                                  <span
                                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${badgeConfirmacion(
                                      item.estadoConfirmacion
                                    )}`}
                                  >
                                    Estado: {item.estadoConfirmacion}
                                  </span>
                                  <span
                                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${badgePago(
                                      item.estadoPago
                                    )}`}
                                  >
                                    Pago: {item.estadoPago}
                                  </span>
                                </div>

                                <div className="flex flex-wrap gap-4 text-[11px] text-zinc-400 pt-1">
                                  <span>📅 Límite: {item.fechaLimite}</span>
                                  {item.fechaPago && (
                                    <span className="text-emerald-600 font-semibold">
                                      ✅ Pagado el: {item.fechaPago}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex sm:flex-col justify-between sm:items-end items-center border-t sm:border-t-0 pt-3 sm:pt-0 border-zinc-100 shrink-0">
                              <p className="text-base font-black text-zinc-900">
                                ${item.precioUnitario.toFixed(2)} USD
                              </p>

                              {item.estadoPago !== 'Pagado' ? (
                                <a
                                  href={`https://wa.me{NUMERO_WHATSAPP}?text=${encodeURIComponent(
                                    `¡Hola! ✨ Envío mi comprobante de pago:\n\n👤 *Correo:* ${usuarioEmail}\n📂 *GO:* ${item.catalogoNombre}\n📦 *Producto:* ${item.itemNombre}\n🪞 *Slot:* ${item.integranteElegido}\n💰 *Monto:* $${item.precioUnitario.toFixed(2)} USD`
                                  )}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition-colors"
                                >
                                  💬 Enviar comprobante
                                </a>
                              ) : (
                                <span className="text-[11px] font-bold text-emerald-600">
                                  ✔ Pago verificado
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  );
                })
              )}
            </>
          )}
          {pestanaJoiner === 'compras' && (
            <div className="space-y-4">
              <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 shadow-2xs">
                <h1 className="text-base font-extrabold text-zinc-900">
                  Mis Compras de Tienda
                </h1>
                <p className="text-xs text-zinc-500">
                  Historial de pedidos directos en la shop
                </p>
              </div>

              {misCompras.length === 0 ? (
                <div className="bg-white border border-zinc-200/80 rounded-2xl p-10 text-center">
                  <p className="text-sm font-bold text-zinc-700">
                    Aún no tienes compras en la tienda 🛍️
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {misCompras.map((compra) => (
                    <div
                      key={compra.id}
                      className="bg-white border border-zinc-200/90 rounded-2xl p-5 flex flex-col sm:flex-row justify-between gap-4 shadow-2xs"
                    >
                      <div className="flex gap-4">
                        <div className="w-20 h-20 rounded-xl bg-zinc-100 border border-zinc-200 overflow-hidden shrink-0 flex items-center justify-center">
                          {compra.imagen_producto ? (
                            <img
                              src={compra.imagen_producto}
                              alt="Producto tienda"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-2xl">🛍️</span>
                          )}
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono font-bold bg-zinc-900 text-white px-2 py-0.5 rounded">
                              ORDEN #{compra.id}
                            </span>
                            <span className="text-[10px] font-bold uppercase text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                              Tienda
                            </span>
                          </div>

                          <p className="text-sm font-bold text-zinc-900">
                            {compra.producto_nombre || compra.detalles || 'Pedido Tienda'}
                          </p>

                          {compra.detalles && (
                            <p className="text-xs text-zinc-500">{compra.detalles}</p>
                          )}

                          <div className="flex flex-wrap gap-1.5 pt-1">
                            <span
                              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${badgeConfirmacion(
                                compra.estado_confirmacion || 'Pendiente'
                              )}`}
                            >
                              Estado: {compra.estado_confirmacion || 'Pendiente'}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${badgePago(
                                compra.estado_pago
                              )}`}
                            >
                              Pago: {compra.estado_pago || 'Sin pagar'}
                            </span>
                          </div>

                          {compra.fecha_pago && (
                            <p className="text-[11px] text-emerald-600 font-semibold pt-1">
                              ✅ Pagado el: {compra.fecha_pago}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex sm:flex-col justify-between sm:items-end items-center border-t sm:border-t-0 pt-3 sm:pt-0 border-zinc-100 shrink-0">
                        <p className="text-base font-black text-zinc-900">
                          ${Number(compra.total_pagar || 0).toFixed(2)} USD
                        </p>

                        {compra.estado_pago !== 'Pagado' &&
                          compra.estado_pago !== 'PAGADO' &&
                          compra.estado_pago !== 'INSTOCK' && (
                            <a
                              href={`https://wa.me{NUMERO_WHATSAPP}?text=${encodeURIComponent(
                                `¡Hola! ✨ Envío mi comprobante de compra en Tienda:\n\n👤 *Correo:* ${usuarioEmail}\n🧾 *Orden:* #${compra.id}\n📦 *Detalle:* ${compra.producto_nombre || compra.detalles || 'Tienda'}\n💰 *Total:* $${Number(compra.total_pagar || 0).toFixed(2)} USD`
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition-colors"
                            >
                              💬 Enviar comprobante
                            </a>
                          )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
