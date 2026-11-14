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
  fechaLimiteTexto: string;
  diasRestantes: number | null;
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
  imagen_producto?: string | null;
};

export default function MiEscritorioJoiner() {
  const [pestanaJoiner, setPestanaInterna] = useState<'gos' | 'compras'>('gos');
  const [filtroEstado, setFiltroEstado] = useState<'TODOS' | 'PENDIENTES' | 'PAGADOS'>('TODOS');
  const [usuarioEmail, setUsuarioEmail] = useState('');
  const [nombreJoiner, setNombreJoiner] = useState('');
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);
  const [perfilGuardadoOk, setPerfilGuardadoOk] = useState(false);
  const [loading, setLoading] = useState(true);
  const [misGos, setMisGos] = useState<ReclamoGo[]>([]);
  const [misCompras, setMisCompras] = useState<CompraShop[]>([]);
  async function cargarEscritorioCliente() {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.email) {
        setLoading(false);
        return;
      }
      const emailLogueado = session.user.email.toLowerCase().trim();
      setUsuarioEmail(emailLogueado);

      const [{ data: dProds }, { data: dSeg }, { data: dPerfil }, { data: dPedidos }] = await Promise.all([
        supabase
          .from('productos')
          .select('id, nombre_producto, precio, imagen_producto, claims_integrantes, due_date, gos(title)'),
        supabase
          .from('seguimiento_claims')
          .select('*')
          .eq('user_email', emailLogueado),
        supabase
          .from('perfiles_joiners')
          .select('*')
          .eq('user_email', emailLogueado)
          .maybeSingle(),
        supabase
          .from('pedidos')
          .select('*')
          .eq('user_email', emailLogueado)
          .order('id', { ascending: false }),
      ]);

      if (dPerfil?.nombre_completo) {
        setNombreJoiner(dPerfil.nombre_completo);
      }

      const mapaSeg: Record<string, any> = {};
      if (dSeg) {
        dSeg.forEach((s: any) => {
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

              let diasRestantes: number | null = null;
              if (p.due_date) {
                const diffMs = new Date(p.due_date).getTime() - Date.now();
                diasRestantes = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
              }

              listaReclamos.push({
                idUnico: key,
                catalogoNombre: p.gos?.title || 'Group Order Atelier',
                itemNombre: p.nombre_producto,
                imagenUrl: p.imagen_producto || null,
                integranteElegido: intName,
                cantidad: cantidadElegida,
                precioUnitario: Number(p.precio || 0) * cantidadElegida,
                fechaLimiteTexto: p.due_date ? new Date(p.due_date).toLocaleDateString() : 'Por definir',
                diasRestantes,
                estadoConfirmacion: seg?.estado_confirmacion || 'Pendiente',
                estadoPago: seg?.estado_pago || 'Sin pagar',
                fechaPago: seg?.fecha_pago || null,
              });
            }
          });
        });
      }
      setMisGos(listaReclamos);
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
  async function guardarMiNombre(e: React.FormEvent) {
    e.preventDefault();
    if (!nombreJoiner.trim() || !usuarioEmail) return;
    setGuardandoPerfil(true);
    await supabase.from('perfiles_joiners').upsert({
      user_email: usuarioEmail,
      nombre_completo: nombreJoiner.trim(),
    });
    setGuardandoPerfil(false);
    setPerfilGuardadoOk(true);
    setTimeout(() => setPerfilGuardadoOk(false), 3000);
  }

  const itemsCancelados = misGos.filter((i) => i.estadoConfirmacion === 'Cancelado');
  const itemsPorVencer = misGos.filter(
    (i) =>
      i.estadoConfirmacion !== 'Cancelado' &&
      i.estadoPago !== 'Pagado' &&
      i.diasRestantes !== null &&
      i.diasRestantes <= 3
  );
  const itemsSinPagar = misGos.filter(
    (i) => i.estadoConfirmacion !== 'Cancelado' && i.estadoPago === 'Sin pagar'
  );

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

  const totalAcumuladoGos = misGos
    .filter((i) => i.estadoConfirmacion !== 'Cancelado')
    .reduce((acc, item) => acc + item.precioUnitario, 0);
  const totalPendienteGos = misGos
    .filter((i) => i.estadoConfirmacion !== 'Cancelado' && i.estadoPago !== 'Pagado')
    .reduce((acc, item) => acc + item.precioUnitario, 0);
  const badgeConfirmacion = (estado: string) => {
    if (estado === 'Confirmado') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (estado === 'Cancelado') return 'bg-rose-100 text-rose-800 border-rose-300';
    return 'bg-amber-50 text-amber-700 border-amber-200';
  };

  const badgePago = (estado: string) => {
    if (estado === 'Pagado' || estado === 'PAGADO' || estado === 'INSTOCK')
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (estado === 'Verificando') return 'bg-sky-50 text-sky-700 border-sky-200';
    return 'bg-rose-50 text-rose-700 border-rose-200';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F9] flex items-center justify-center font-mono text-xs text-zinc-400">
        ✧ cargando tu cuenta y alertas...
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
          <Link href="/gos" className="text-xs font-semibold text-zinc-500 hover:text-pink-600">
            ← Volver al catálogo
          </Link>
          <span className="text-[11px] text-zinc-600 bg-zinc-100 px-3 py-1 rounded-full font-medium">
            👤 {nombreJoiner ? `${nombreJoiner} (${usuarioEmail})` : usuarioEmail}
          </span>
        </div>
      </div>

      {/* ZONA DE ALERTAS AUTOMÁTICAS Y NOTIFICACIONES */}
      <div className="max-w-5xl mx-auto px-4 pt-5 space-y-2.5">
        {itemsCancelados.length > 0 && (
          <div className="bg-rose-50 border border-rose-300 text-rose-900 rounded-2xl p-4 flex items-start gap-3 shadow-2xs">
            <span className="text-lg">🚨</span>
            <div className="text-xs space-y-1">
              <p className="font-extrabold uppercase tracking-wide text-rose-700">
                Aviso importante: Producto(s) cancelado(s) por falta de pago
              </p>
              <p>
                Los siguientes apartados fueron cancelados:{' '}
                <strong>{itemsCancelados.map((x) => `${x.itemNombre} (${x.integranteElegido})`).join(', ')}</strong>.
                Si crees que es un error, contáctanos por WhatsApp.
              </p>
            </div>
          </div>
        )}

        {itemsPorVencer.length > 0 && (
          <div className="bg-amber-50 border border-amber-300 text-amber-950 rounded-2xl p-4 flex items-start gap-3 shadow-2xs">
            <span className="text-lg">⏰</span>
            <div className="text-xs space-y-1">
              <p className="font-extrabold uppercase tracking-wide text-amber-800">
                ¡Tu fecha límite de pago está por vencer o ya venció!
              </p>
              <p>
                Tienes <strong>{itemsPorVencer.length} artículo(s)</strong> sin pagar cerca de su fecha límite.
                Envía tu comprobante hoy para evitar la cancelación de tu cupo.
              </p>
            </div>
          </div>
        )}

        {itemsPorVencer.length === 0 && itemsSinPagar.length > 0 && (
          <div className="bg-pink-50/90 border border-pink-200 text-pink-950 rounded-2xl p-3.5 flex items-center gap-3 text-xs">
            <span className="text-base">💳</span>
            <p>
              Recordatorio: Aún no registras ningún pago para <strong>{itemsSinPagar.length} apartado(s)</strong> (Total pendiente: <strong>${totalPendienteGos.toFixed(2)} USD</strong>).
            </p>
          </div>
        )}
      </div>
      <div className="max-w-5xl mx-auto px-4 pt-5 grid grid-cols-1 md:grid-cols-4 gap-6">
        <aside className="md:col-span-1 space-y-3">
          {/* Cajita de Nombre del Joiner */}
          <form onSubmit={guardarMiNombre} className="bg-white border border-zinc-200/80 rounded-2xl p-4 shadow-2xs space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Mis Datos de Joiner
            </p>
            <input
              type="text"
              placeholder="Escribe tu nombre real..."
              value={nombreJoiner}
              onChange={(e) => setNombreJoiner(e.target.value)}
              className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-xs"
            />
            <button
              type="submit"
              disabled={guardandoPerfil}
              className="w-full bg-pink-600 hover:bg-pink-700 text-white text-[11px] font-bold py-1.5 rounded-xl transition-colors"
            >
              {guardandoPerfil ? 'Guardando...' : 'Guardar mi nombre'}
            </button>
            {perfilGuardadoOk && (
              <p className="text-[10px] text-emerald-600 font-bold text-center">✔ Nombre actualizado</p>
            )}
          </form>

          <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 shadow-2xs">
            <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
              Secciones
            </p>
            <nav className="space-y-1.5">
              <button
                type="button"
                onClick={() => setPestanaInterna('gos')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold ${
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
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold ${
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

          <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 shadow-2xs space-y-2 text-xs">
            <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Resumen GOs</p>
            <div className="flex justify-between">
              <span className="text-zinc-500">Total activo:</span>
              <span className="font-bold">${totalAcumuladoGos.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Por pagar:</span>
              <span className="font-bold text-rose-600">${totalPendienteGos.toFixed(2)}</span>
            </div>
          </div>
        </aside>
        <main className="md:col-span-3 space-y-5">
          {pestanaJoiner === 'gos' && (
            <>
              <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 flex flex-wrap justify-between items-center gap-3 shadow-2xs">
                <div>
                  <h1 className="text-base font-extrabold text-zinc-900">Mis Group Orders</h1>
                  <p className="text-xs text-zinc-500">Tus apartados separados por cada GO</p>
                </div>
                <div className="flex gap-1.5 bg-zinc-100 p-1 rounded-xl">
                  {(['TODOS', 'PENDIENTES', 'PAGADOS'] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setFiltroEstado(tab)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold ${
                        filtroEstado === tab ? 'bg-white text-zinc-900 shadow-2xs' : 'text-zinc-500'
                      }`}
                    >
                      {tab === 'TODOS' ? 'Todos' : tab === 'PENDIENTES' ? 'Sin pagar' : 'Pagados'}
                    </button>
                  ))}
                </div>
              </div>

              {Object.keys(gosAgrupados).length === 0 ? (
                <div className="bg-white border border-zinc-200/80 rounded-2xl p-10 text-center text-xs text-zinc-500">
                  No hay apartados en esta sección 🌸
                </div>
              ) : (
                Object.entries(gosAgrupados).map(([nombreGo, items]) => {
                  const subtotalGo = items.reduce((s, x) => s + x.precioUnitario, 0);
                  return (
                    <section key={nombreGo} className="bg-white border border-zinc-200/90 rounded-2xl overflow-hidden shadow-2xs">
                      <div className="bg-zinc-50/80 border-b border-zinc-200/80 px-5 py-3.5 flex justify-between items-center">
                        <div>
                          <span className="text-[10px] font-bold uppercase text-pink-600 bg-pink-50 border border-pink-200 px-2.5 py-0.5 rounded-full">
                            Group Order
                          </span>
                          <h2 className="text-sm font-extrabold text-zinc-900 mt-1">{nombreGo}</h2>
                        </div>
                        <p className="text-sm font-black text-zinc-900">${subtotalGo.toFixed(2)} USD</p>
                      </div>

                      <div className="divide-y divide-zinc-100">
                        {items.map((item) => (
                          <div key={item.idUnico} className="p-5 flex flex-col sm:flex-row justify-between gap-4">
                            <div className="flex gap-4">
                              <div className="w-20 h-20 rounded-xl bg-zinc-100 border border-zinc-200 overflow-hidden shrink-0 flex items-center justify-center">
                                {item.imagenUrl ? (
                                  <img src={item.imagenUrl} alt={item.itemNombre} className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-2xl">🧸</span>
                                )}
                              </div>

                              <div className="space-y-1.5">
                                <p className="text-sm font-bold text-zinc-900">{item.itemNombre}</p>
                                <p className="text-xs text-zinc-500">
                                  Slot: <strong className="text-pink-600">{item.integranteElegido}</strong> · Cant: <strong>{item.cantidad}</strong>
                                </p>

                                <div className="flex flex-wrap gap-1.5 pt-1">
                                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${badgeConfirmacion(item.estadoConfirmacion)}`}>
                                    Estado: {item.estadoConfirmacion}
                                  </span>
                                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${badgePago(item.estadoPago)}`}>
                                    Pago: {item.estadoPago}
                                  </span>
                                </div>

                                <div className="flex flex-wrap gap-3 text-[11px] text-zinc-400 pt-1">
                                  <span>📅 Límite: {item.fechaLimiteTexto}</span>
                                  {item.fechaPago && <span className="text-emerald-600 font-semibold">✅ Pagado: {item.fechaPago}</span>}
                                </div>
                              </div>
                            </div>

                            <div className="flex sm:flex-col justify-between sm:items-end items-center shrink-0">
                              <p className="text-base font-black text-zinc-900">${item.precioUnitario.toFixed(2)} USD</p>
                              {item.estadoConfirmacion === 'Cancelado' ? (
                                <span className="text-[11px] font-bold text-rose-600">❌ Cancelado</span>
                              ) : item.estadoPago !== 'Pagado' ? (
                                <a
                                  href={`https://wa.me{NUMERO_WHATSAPP}?text=${encodeURIComponent(
                                    `¡Hola! ✨ Envío mi comprobante:\n👤 *Nombre:* ${nombreJoiner || usuarioEmail}\n📂 *GO:* ${item.catalogoNombre}\n📦 *Producto:* ${item.itemNombre} (${item.integranteElegido})\n💰 *Monto:* $${item.precioUnitario.toFixed(2)} USD`
                                  )}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold"
                                >
                                  💬 Enviar comprobante
                                </a>
                              ) : (
                                <span className="text-[11px] font-bold text-emerald-600">✔ Pago verificado</span>
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
            <div className="space-y-3">
              <div className="bg-white border border-zinc-200/80 rounded-2xl p-4">
                <h1 className="text-base font-extrabold text-zinc-900">Mis Compras de Tienda</h1>
              </div>
              {misCompras.length === 0 ? (
                <div className="bg-white border rounded-2xl p-10 text-center text-xs text-zinc-500">
                  Aún no tienes compras en la tienda 🛍️
                </div>
              ) : (
                misCompras.map((compra) => (
                  <div key={compra.id} className="bg-white border border-zinc-200/90 rounded-2xl p-5 flex justify-between items-center gap-4">
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono font-bold bg-zinc-900 text-white px-2 py-0.5 rounded">ORDEN #{compra.id}</span>
                      <p className="text-sm font-bold text-zinc-900">{compra.producto_nombre || compra.detalles || 'Pedido Tienda'}</p>
                      <div className="flex gap-1.5 pt-1">
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${badgeConfirmacion(compra.estado_confirmacion || 'Pendiente')}`}>
                          {compra.estado_confirmacion || 'Pendiente'}
                        </span>
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${badgePago(compra.estado_pago)}`}>
                          {compra.estado_pago || 'Sin pagar'}
                        </span>
                      </div>
                    </div>
                    <p className="text-base font-black text-zinc-900">${Number(compra.total_pagar || 0).toFixed(2)} USD</p>
                  </div>
                ))
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
