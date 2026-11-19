'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
function crearLinkMiWhatsApp(mensaje: string) {
  const telefono = ['593', '999', '530', '327'].join('');
  const params = new URLSearchParams({ phone: telefono, text: mensaje });
  return 'https://whatsapp.com?' + params.toString();
}

const PRECIOS_ENVIO: Record<string, number> = {
  'Quito (+$3.50)': 3.5,
  'Otras Provincias (+$6.50)': 6.5,
  'Perú Internacional ($0.00)': 0.0,
  'Retiro en Cumbayá ($0.00)': 0.0,
};

type ItemEscritorio = {
  idUnico: string;
  origen: 'GO' | 'SHOP';
  goTitulo: string;
  productoNombre: string;
  imagenUrl: string | null;
  detalleSlot: string;
  cantidad: number;
  precioTotal: number;
  dueDate: string | null;
  estadoConfirmacion: string;
  estadoPago: string;
  fechaPago: string;
  estadoEnvio?: string;
  montoAbonado?: number;
  estadoLogistica?: string;
};

type GrupoGoEscritorio = {
  titulo: string;
  origen: 'GO' | 'SHOP';
  items: ItemEscritorio[];
  totalGrupo: number;
};
export default function MiEscritorioJoiner() {
  const [vista, setVista] = useState<'pedidos' | 'bodega'>('pedidos');
  const [usuarioEmail, setUsuarioEmail] = useState('');
  const [nombreJoiner, setNombreJoiner] = useState('');
  const [instagramJoiner, setInstagramJoiner] = useState('');
  const [guardandoNombre, setGuardandoNombre] = useState(false);

  const [grupos, setGrupos] = useState<GrupoGoEscritorio[]>([]);
  const [solicitudesPrevias, setSolicitudesPrevias] = useState<any[]>([]);
  const [wishlistProds, setWishlistProds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [seleccionadosPago, setSeleccionadosPago] = useState<Record<string, boolean>>({});
  const [titularTransferencia, setTitularTransferencia] = useState('');

  const [seleccionadosEnvio, setSeleccionadosEnvio] = useState<Record<string, boolean>>({});
  const [envioNombre, setEnvioNombre] = useState('');
  const [envioTelefono, setEnvioTelefono] = useState('');
  const [envioCiudad, setEnvioCiudad] = useState('');
  const [envioDireccion, setEnvioDireccion] = useState('');
  const [envioMetodo, setEnvioMetodo] = useState('Quito (+$3.50)');
  const [enviandoSolicitud, setEnviandoSolicitud] = useState(false);
  async function cargarMisPedidos() {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const email = session?.user?.email?.toLowerCase().trim() || '';
      setUsuarioEmail(email);

      if (email) {
        const [{ data: perfil }, { data: prods }, { data: segs }, { data: peds }, { data: sols }, { data: wishRows }] = await Promise.all([
          supabase.from('perfiles_joiners').select('*').eq('user_email', email).maybeSingle(),
          supabase.from('productos').select('id, nombre_producto, precio, imagen_producto, due_date, claims_integrantes, gos(title, estado_logistica)'),
          supabase.from('seguimiento_claims').select('*').eq('user_email', email),
          supabase.from('pedidos').select('*').eq('user_email', email).order('id', { ascending: false }),
          supabase.from('solicitudes_envio').select('*').eq('user_email', email).order('id', { ascending: false }),
          supabase.from('wishlist_joiners').select('producto_id').eq('user_email', email),
        ]);

        if (perfil) {
          setNombreJoiner(perfil.nombre_completo || '');
          setEnvioNombre(perfil.nombre_completo || '');
          setInstagramJoiner(perfil.usuario_red || '');
          if (perfil.telefono) setEnvioTelefono(perfil.telefono);
        }
        if (sols) setSolicitudesPrevias(sols);

        if (wishRows && wishRows.length > 0) {
          const ids = wishRows.map((w: any) => w.producto_id);
          const { data: prodsW } = await supabase
            .from('tienda_productos')
            .select('id, nombre_producto, imagen_producto, integrante')
            .in('id', ids);
          setWishlistProds(prodsW || []);
        }

        const mapaSeg: Record<string, any> = {};
        if (segs) segs.forEach((s: any) => { mapaSeg[s.claim_key] = s; });

        const mapaGrupos: Record<string, GrupoGoEscritorio> = {};
        const agregarItem = (tituloGrupo: string, origen: 'GO' | 'SHOP', item: ItemEscritorio) => {
          if (!mapaGrupos[tituloGrupo]) {
            mapaGrupos[tituloGrupo] = { titulo: tituloGrupo, origen, items: [], totalGrupo: 0 };
          }
          mapaGrupos[tituloGrupo].items.push(item);
          mapaGrupos[tituloGrupo].totalGrupo += item.precioTotal;
        };
        if (prods) {
          prods.forEach((p: any) => {
            const claims = p.claims_integrantes || {};
            const goTitle = p.gos?.title || 'Group Order';
            const goEstadoLog = p.gos?.estado_logistica || 'Esperando cierre';

            Object.entries(claims).forEach(([integrante, dataClaim]: [string, any]) => {
              if (!dataClaim) return;
              const claimKey = p.id + '-' + integrante;
              const seg = mapaSeg[claimKey];

              if (typeof dataClaim === 'string' && dataClaim.toLowerCase().trim() === email) {
                agregarItem(goTitle, 'GO', {
                  idUnico: claimKey,
                  origen: 'GO',
                  goTitulo: goTitle,
                  productoNombre: p.nombre_producto,
                  imagenUrl: p.imagen_producto || null,
                  detalleSlot: integrante,
                  cantidad: 1,
                  precioTotal: Number(p.precio || 0),
                  dueDate: p.due_date || null,
                  estadoConfirmacion: seg?.estado_confirmacion || 'Pendiente',
                  estadoPago: seg?.estado_pago || 'Sin pagar',
                  fechaPago: seg?.fecha_pago || '',
                  montoAbonado: Number(seg?.monto_abonado || 0),
                  estadoLogistica: goEstadoLog,
                });
              } else if (typeof dataClaim === 'object') {
                Object.entries(dataClaim).forEach(([mailC, cant]: [string, any]) => {
                  if (mailC.toLowerCase().trim() === email && Number(cant) > 0) {
                    agregarItem(goTitle, 'GO', {
                      idUnico: claimKey + '-' + mailC,
                      origen: 'GO',
                      goTitulo: goTitle,
                      productoNombre: p.nombre_producto,
                      imagenUrl: p.imagen_producto || null,
                      detalleSlot: integrante,
                      cantidad: Number(cant),
                      precioTotal: Number(p.precio || 0) * Number(cant),
                      dueDate: p.due_date || null,
                      estadoConfirmacion: seg?.estado_confirmacion || 'Pendiente',
                      estadoPago: seg?.estado_pago || 'Sin pagar',
                      fechaPago: seg?.fecha_pago || '',
                      montoAbonado: Number(seg?.monto_abonado || 0),
                      estadoLogistica: goEstadoLog,
                    });
                  }
                });
              }
            });
          });
        }

        if (peds) {
          peds.forEach((ped: any) => {
            agregarItem('Tienda / Shop', 'SHOP', {
              idUnico: 'shop-' + ped.id,
              origen: 'SHOP',
              goTitulo: 'Tienda / Shop',
              productoNombre: ped.producto_nombre || ped.detalles || 'Compra Tienda',
              imagenUrl: ped.imagen_producto || null,
              detalleSlot: ped.estado_envio || 'En bodega',
              cantidad: 1,
              precioTotal: Number(ped.total_pagar || 0),
              dueDate: null,
              estadoConfirmacion: ped.estado_confirmacion || 'Pendiente',
              estadoPago: ped.estado_pago || 'Sin pagar',
              fechaPago: ped.fecha_pago || '',
              estadoEnvio: ped.estado_envio || 'En bodega',
              montoAbonado: Number(ped.monto_abonado || 0),
            });
          });
        }

        setGrupos(Object.values(mapaGrupos));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargarMisPedidos();
  }, []);
  async function handleGuardarMiPerfil(e: React.FormEvent) {
    e.preventDefault();
    if (!usuarioEmail || !nombreJoiner.trim()) return;
    setGuardandoNombre(true);
    const { error } = await supabase.from('perfiles_joiners').upsert(
      {
        user_email: usuarioEmail.toLowerCase().trim(),
        nombre_completo: nombreJoiner.trim(),
        usuario_red: instagramJoiner.trim()
          ? '@' + instagramJoiner.replace('@', '').trim()
          : '',
        telefono: envioTelefono.trim(),
      },
      { onConflict: 'user_email' }
    );
    setGuardandoNombre(false);
    if (error) {
      alert('Error al guardar: ' + error.message);
    } else {
      alert('✅ ¡Tus datos quedaron guardados!');
      cargarMisPedidos();
    }
  }

  const todosLosItems = grupos.flatMap((g) => g.items);
  const itemsPagadosEnBodega = todosLosItems.filter(
    (i) => i.estadoPago === 'Pagado' && i.estadoConfirmacion !== 'Cancelado' && i.estadoEnvio !== 'Enviado'
  );

  const itemsMarcados = itemsPagadosEnBodega.filter((i) => seleccionadosEnvio[i.idUnico]);
  const costoEnvioElegido = PRECIOS_ENVIO[envioMetodo] ?? 0;

  async function handleSolicitarEnvioAcumulado(e: React.FormEvent) {
    e.preventDefault();
    if (itemsMarcados.length === 0) return alert('Marca al menos 1 artículo pagado de tu bodega 📦');
    if (!envioNombre || !envioTelefono || !envioCiudad || !envioDireccion) {
      return alert('Completa todos tus datos de dirección y teléfono 🚚');
    }

    setEnviandoSolicitud(true);
    const listaTexto = itemsMarcados
      .map((i) => '• [' + i.goTitulo + '] ' + i.productoNombre + ' (' + i.detalleSlot + ')')
      .join('\n');

    const { error } = await supabase.from('solicitudes_envio').insert([{
      user_email: usuarioEmail,
      nombre_completo: envioNombre.trim(),
      instagram: instagramJoiner.replace('@', '').trim(),
      telefono: envioTelefono.trim(),
      ciudad: envioCiudad.trim(),
      direccion: envioDireccion.trim(),
      metodo_envio: envioMetodo,
      costo_envio: costoEnvioElegido,
      articulos_incluidos: listaTexto,
      estado_despacho: 'Pendiente',
    }]);

    if (!error) {
      for (const it of itemsMarcados) {
        if (it.origen === 'SHOP' && it.idUnico.startsWith('shop-')) {
          const idPed = Number(it.idUnico.replace('shop-', ''));
          await supabase.from('pedidos').update({ estado_envio: 'Envío solicitado' }).eq('id', idPed);
        }
      }

      const msgWsp =
        '¡Holis, Lia! Quiero solicitar el envío de mis compras acumuladas en bodega:\n\n' +
        '• *Nombre:* ' + envioNombre + ' (@' + instagramJoiner.replace('@', '') + ')\n' +
        '• *Teléfono:* ' + envioTelefono + '\n' +
        '• *Destino:* ' + envioCiudad + ' — ' + envioDireccion + '\n' +
        '• *Método:* ' + envioMetodo + '\n\n' +
        '*Artículos a enviar:*\n' + listaTexto + '\n\n' +
        '• *Costo de envío:* $' + costoEnvioElegido.toFixed(2) + ' USD\n\n' +
        'Confirmo que sigo a @atelierdehyun.';

      setSeleccionadosEnvio({});
      await cargarMisPedidos();
      window.location.href = abrirChatLia(msgWsp);
    } else {
      alert('Error: ' + error.message);
    }
    setEnviandoSolicitud(false);
  }
  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F9] flex items-center justify-center font-mono text-xs text-zinc-400">
        ✧ cargando tu cuenta y bodega... 🎀
      </div>
    );
  }

  if (!usuarioEmail) {
    return (
      <div className="min-h-screen bg-[#FAF8F9] flex flex-col items-center justify-center p-4 gap-4">
        <p className="text-sm font-bold text-zinc-700">Inicia sesión para ver tus compras y bodega 🎀</p>
        <Link href="/joiner-login" className="px-6 py-2.5 rounded-full bg-pink-600 text-white text-xs font-bold">
          Iniciar sesión ➔
        </Link>
      </div>
    );
  }

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const itemsCancelados = todosLosItems.filter((i) => i.estadoConfirmacion === 'Cancelado');
  const itemsUrgentes = todosLosItems.filter((i) => {
    if (i.estadoPago === 'Pagado' || i.estadoConfirmacion === 'Cancelado' || !i.dueDate) return false;
    const limite = new Date(i.dueDate + 'T00:00:00');
    const diffDias = Math.ceil((limite.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    return diffDias <= 3;
  });

  const inicialAvatar = (nombreJoiner || usuarioEmail).slice(0, 2).toUpperCase();
  const itemsSinPagar = todosLosItems.filter(
    (i) => i.estadoPago !== 'Pagado' && i.estadoConfirmacion !== 'Cancelado'
  );
  const haySeleccionManualPago = Object.values(seleccionadosPago).some(Boolean);
  const itemsAPagarHoy = haySeleccionManualPago
    ? itemsSinPagar.filter((i) => seleccionadosPago[i.idUnico])
    : itemsSinPagar;

  const totalAbonadoPendientes = itemsAPagarHoy.reduce((acc, i) => acc + Number(i.montoAbonado || 0), 0);
  const totalPendientePagar = Math.max(
    0,
    itemsAPagarHoy.reduce((acc, i) => acc + i.precioTotal, 0) - totalAbonadoPendientes
  );

  const estampitasGanadas = todosLosItems.filter(
    (i) => i.estadoPago === 'Pagado' && i.estadoConfirmacion !== 'Cancelado' && i.precioTotal >= 20
  ).length;
  const estampitasActuales = estampitasGanadas % 10;
  const premiosDisponibles = Math.floor(estampitasGanadas / 10);
  return (
    <div className="min-h-screen bg-[#FAF8F9] font-sans text-zinc-800 pb-16">
      <div className="bg-white border-b border-zinc-200/80 px-4 py-3">
        <div className="max-w-6xl mx-auto flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center gap-4">
            <Link href="/gos" className="text-xs font-semibold text-zinc-500 hover:text-pink-600">
              ← Catálogo GOs
            </Link>
            <Link href="/shop" className="text-xs font-semibold text-zinc-500 hover:text-pink-600">
              🛍️ Tienda
            </Link>
          </div>

          <div className="flex gap-1.5 bg-zinc-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setVista('pedidos')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all ${vista === 'pedidos' ? 'bg-white text-zinc-900 shadow-2xs' : 'text-zinc-500'}`}
            >
              📋 Mis Pedidos ({todosLosItems.length})
            </button>
            <button
              type="button"
              onClick={() => setVista('bodega')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all ${vista === 'bodega' ? 'bg-pink-600 text-white shadow-2xs' : 'text-zinc-600'}`}
            >
              📦 Mi Bodega / Solicitar Envío ({itemsPagadosEnBodega.length})
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-4 space-y-5">
          <div className="bg-white border border-zinc-200/80 rounded-3xl p-5 shadow-2xs space-y-5">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-pink-600 text-white font-black text-base flex items-center justify-center shrink-0">
                {inicialAvatar}
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-extrabold text-zinc-900 truncate">{nombreJoiner || 'Joiner hyuneatelier'}</h2>
                <p className="text-xs text-zinc-400 truncate">{usuarioEmail}</p>
              </div>
            </div>

            <form onSubmit={handleGuardarMiPerfil} className="space-y-2.5 pt-2 border-t border-zinc-100">
              <label className="text-[11px] font-bold text-zinc-500 block">Tus datos de contacto (obligatorio)</label>
              <input type="text" placeholder="Tu Nombre y Apellido" value={nombreJoiner} onChange={(e) => setNombreJoiner(e.target.value)} className="border border-zinc-200 rounded-xl px-3 py-2 text-xs w-full bg-zinc-50/70" />
              <input type="text" placeholder="Tu Instagram (ej: @cami_skz)" value={instagramJoiner} onChange={(e) => setInstagramJoiner(e.target.value)} className="border border-zinc-200 rounded-xl px-3 py-2 text-xs w-full bg-zinc-50/70" />
              <input type="tel" placeholder="Tu WhatsApp (ej: 0991234567)" value={envioTelefono} onChange={(e) => setEnvioTelefono(e.target.value)} className="border border-zinc-200 rounded-xl px-3 py-2 text-xs w-full bg-zinc-50/70 font-bold" />
              <button type="submit" disabled={guardandoNombre} className="w-full py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold">
                {guardandoNombre ? 'Guardando...' : '💾 Guardar mis datos'}
              </button>
            </form>

            <div className="bg-pink-5/70 border border-pink-200 rounded-2xl p-4 text-[11px] text-zinc-700 space-y-1.5">
              <p className="font-extrabold text-pink-700">🏦 Datos de Transferencia</p>
              <p><strong>Banco Pichincha (Ahorros):</strong> #2213367970</p>
              <p><strong>Titular:</strong> Isabel Revollar — <strong>CI:</strong> 1752806388</p>
              <p className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200 p-2 rounded-lg mt-1 font-semibold">
                ⚠️ Recuerda seguir a <strong>@atelierdehyun</strong> en Instagram para poder subir tus proofs, si no lo haces, se te bloqueará.
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-pink-50 via-rose-50 to-amber-50 border-2 border-pink-200 rounded-3xl p-4 space-y-3 shadow-2xs">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-[10px] font-black uppercase bg-pink-600 text-white px-2.5 py-0.5 rounded-full">
                  🎀 Loyalty Card
                </span>
                <h3 className="text-sm font-black text-zinc-900 mt-1">Pasaporte de Estampitas</h3>
              </div>
              <span className="text-xs font-black text-pink-600 bg-white border border-pink-200 px-2.5 py-1 rounded-xl">
                {premiosDisponibles > 0 ? '10 / 10 🎉' : `${estampitasActuales} / 10`}
              </span>
            </div>

            <p className="text-[11px] text-zinc-600 leading-snug">
              Ganas <strong>1 estampita</strong> por cada compra pagada de <strong>$20+ USD</strong>. ¡Al juntar 10 te llevas <strong>1 PC de tu Wishlist o sorpresa extra</strong>! ✨
            </p>

            <div className="grid grid-cols-5 gap-2 py-1">
              {Array.from({ length: 10 }).map((_, idx) => {
                const llena = premiosDisponibles > 0 || idx < estampitasActuales;
                return (
                  <div
                    key={idx}
                    className={`h-10 rounded-2xl flex items-center justify-center text-sm font-black border-2 transition-all ${
                      llena
                        ? 'bg-pink-600 border-pink-600 text-white shadow-2xs scale-105'
                        : 'bg-white/80 border-dashed border-pink-300 text-pink-300'
                    }`}
                  >
                    {llena ? '🧸' : idx + 1}
                  </div>
                );
              })}
            </div>

            {premiosDisponibles > 0 && (
              <a
                href={abrirChatLia('¡Holis, Lia! 🎉 Completé mis 10 estampitas en hyuneatelier y quiero reclamar mi PC de Wishlist.')}

                className="w-full py-2.5 bg-amber-400 hover:bg-amber-500 text-zinc-950 font-black text-[11px] uppercase rounded-xl flex items-center justify-center gap-1.5 shadow-2xs"
              >
                🎁 ¡Reclamar mi PC de Wishlist por WhatsApp!
              </a>
            )}
          </div>

          <div className="bg-white border border-zinc-200/80 rounded-3xl p-4 space-y-2.5 shadow-2xs text-xs">
            <p className="font-black text-zinc-900 text-xs">✈️ Guía de Estados de tu GO</p>
            <div className="space-y-1.5 text-[11px] text-zinc-600">
              <p><strong className="text-zinc-800">⏳ Esperando cierre:</strong> El GO sigue abierto juntando slots.</p>
              <p><strong className="text-amber-700">🟡 Pedido realizado:</strong> Ya fue comprado en Corea / Japón.</p>
              <p><strong className="text-indigo-700">🇰🇷 En bodega Corea / Japón:</strong> Llegó a bodega internacional.</p>
              <p><strong className="text-purple-700">✈️ En camino a Ecuador:</strong> En tránsito hacia hyuneatelier.</p>
              <p><strong className="text-emerald-700">📦 ¡Llegó a hyuneatelier!:</strong> Ya está aquí, listo para pedir despacho en Mi Bodega.</p>
            </div>
          </div>
        </div>
        <div className="lg:col-span-8 space-y-4">
          {itemsCancelados.length > 0 && (
            <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-4 flex items-start gap-3">
              <span className="text-xl">🚨</span>
              <div className="text-xs text-rose-900 space-y-1">
                <p className="font-extrabold text-sm text-rose-700">Pedido cancelado por falta de pago</p>
                <p>El siguiente artículo fue cancelado porque no se registró el pago a tiempo: <strong>{itemsCancelados.map((i) => i.productoNombre).join(', ')}</strong>.</p>
              </div>
            </div>
          )}

          {itemsUrgentes.length > 0 && (
            <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex items-start gap-3">
              <span className="text-xl">⏰</span>
              <div className="text-xs text-amber-950 space-y-1">
                <p className="font-extrabold text-sm text-amber-800">¡Recordatorio de pago próximo a vencer!</p>
                <p>Tienes artículos pendientes de pago cuya fecha límite está por vencer. Envía tu comprobante para evitar la cancelación automática.</p>
              </div>
            </div>
          )}

          {vista === 'pedidos' ? (
            <>
              <div className="flex flex-wrap justify-between items-center gap-2">
                <h1 className="text-lg font-extrabold text-zinc-900">Mis Pedidos y Apartados</h1>
                <button type="button" onClick={() => setVista('bodega')} className="text-xs font-extrabold text-pink-600 bg-pink-50 border border-pink-200 px-3.5 py-1.5 rounded-xl">
                  📦 Ir a mi bodega para pedir envío ➔
                </button>
              </div>

              {itemsSinPagar.length > 0 && (
                <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-pink-50 border-2 border-emerald-300 rounded-3xl p-5 shadow-2xs space-y-3">
                  <div>
                    <span className="text-[10px] font-black uppercase bg-emerald-600 text-white px-2.5 py-0.5 rounded-full">
                      💳 Resumen listo para pagar
                    </span>
                    <h2 className="text-base font-black text-zinc-900 mt-1">
                      Total a transferir hoy: ${totalPendientePagar.toFixed(2)} USD ({itemsAPagarHoy.length} artículo(s))
                    </h2>
                    {totalAbonadoPendientes > 0 && (
                      <p className="text-xs font-bold text-emerald-700">
                        ✅ Ya tienes abonado: ${totalAbonadoPendientes.toFixed(2)} USD
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5 bg-white/85 border border-emerald-200 rounded-2xl p-3">
                    <p className="text-[11px] font-extrabold text-zinc-700">☑️ Marca los artículos que vas a pagar hoy:</p>
                    {itemsSinPagar.map((it) => {
                      const marcado = haySeleccionManualPago ? !!seleccionadosPago[it.idUnico] : true;
                      return (
                        <label key={it.idUnico} className="flex items-center justify-between gap-2 text-xs cursor-pointer py-0.5">
                          <span className="flex items-center gap-2 truncate">
                            <input
                              type="checkbox"
                              checked={marcado}
                              onChange={(e) => {
                                const base: Record<string, boolean> = {};
                                itemsSinPagar.forEach((x) => {
                                  base[x.idUnico] = haySeleccionManualPago ? !!seleccionadosPago[x.idUnico] : true;
                                });
                                base[it.idUnico] = e.target.checked;
                                setSeleccionadosPago(base);
                              }}
                              className="accent-emerald-600 w-3.5 h-3.5"
                            />
                            <span className="truncate font-semibold text-zinc-800">[{it.goTitulo}] {it.productoNombre} ({it.detalleSlot})</span>
                          </span>
                          <span className="font-extrabold text-zinc-900 shrink-0">${it.precioTotal.toFixed(2)}</span>
                        </label>
                      );
                    })}
                    <input
                      type="text"
                      placeholder="👤 Nombre del titular de la cuenta bancaria que transfiere *"
                      value={titularTransferencia}
                      onChange={(e) => setTitularTransferencia(e.target.value)}
                      className="mt-2 border border-emerald-300 bg-white rounded-xl px-3 py-2 text-xs w-full font-semibold"
                    />
                  </div>

                  <p className="text-xs text-zinc-700">
                    Transfiere al <strong>Banco Pichincha (#2213367970 — Isabel Revollar)</strong> y envíame el comprobante por WhatsApp:
                  </p>

                  <a
                    href={abrirChatLia(
  '¡Hola, Lia! Quiero reportar mi pago en hyuneatelier:\n' +
  '• Nombre: ' + (nombreJoiner || usuarioEmail) + '\n' +
  '• Titular cuenta: ' + (titularTransferencia || nombreJoiner || usuarioEmail) + '\n' +
  '• Total transferido: $' + totalPendientePagar.toFixed(2) + ' USD\n' +
  'Confirmo que sigo a @atelierdehyun y adjunto mi comprobante.'
)}

                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase rounded-2xl flex items-center justify-center gap-2 shadow-sm transition-all"
                  >
                    💬 Enviar Resumen de Pago y Comprobante por WhatsApp (${totalPendientePagar.toFixed(2)})
                  </a>
                </div>
              )}
              {grupos.length === 0 ? (
                <div className="bg-white border border-zinc-200/80 rounded-3xl p-10 text-center space-y-3">
                  <p className="text-sm font-bold text-zinc-500">Aún no tienes apartados registrados 🌸</p>
                  <Link href="/gos" className="inline-block px-5 py-2.5 rounded-full bg-pink-600 text-white text-xs font-bold">
                    Explorar catálogos ➔
                  </Link>
                </div>
              ) : (
                grupos.map((grupo) => (
                  <div key={grupo.titulo} className="bg-white border border-zinc-200/80 rounded-3xl p-5 shadow-2xs space-y-4">
                    <div className="flex justify-between items-center border-b border-zinc-100 pb-3">
                      <span className="text-xs font-extrabold text-pink-600 uppercase">{grupo.titulo}</span>
                      <span className="text-sm font-black text-zinc-900">${grupo.totalGrupo.toFixed(2)} USD</span>
                    </div>

                    <div className="space-y-3">
                      {grupo.items.map((item) => (
                        <div key={item.idUnico} className="flex items-center justify-between gap-3 bg-zinc-50/70 p-3 rounded-2xl border border-zinc-100">
                          <div className="flex items-center gap-3 min-w-0">
                            {item.imagenUrl ? <img src={item.imagenUrl} alt="" className="w-12 h-12 rounded-xl object-cover border shrink-0" /> : <div className="w-12 h-12 rounded-xl bg-white border flex items-center justify-center text-lg shrink-0">🧸</div>}
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-zinc-900 truncate">{item.productoNombre}</p>
                              <p className="text-[11px] font-semibold text-pink-600">{item.detalleSlot}</p>
                              <div className="flex flex-wrap gap-1.5 mt-1">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.estadoPago === 'Pagado' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'}`}>
                                  {item.estadoPago === 'Pagado' ? '💚 Pagado (En bodega)' : '💸 ' + item.estadoPago}
                                </span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.estadoConfirmacion === 'Confirmado' ? 'bg-blue-50 text-blue-700' : item.estadoConfirmacion === 'Cancelado' ? 'bg-rose-100 text-rose-700' : 'bg-zinc-200/70 text-zinc-600'}`}>
                                  {item.estadoConfirmacion}
                                </span>
                                {Number(item.montoAbonado || 0) > 0 && item.estadoPago !== 'Pagado' && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    💰 Abonado: ${Number(item.montoAbonado).toFixed(2)}
                                  </span>
                                )}
                                {item.origen === 'GO' && item.estadoLogistica && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                                    ✈️ {item.estadoLogistica}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <span className="text-xs font-extrabold text-zinc-900 shrink-0">${item.precioTotal.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </>
          ) : (
            <div className="space-y-5">
              <div className="bg-white border border-zinc-200/80 rounded-3xl p-5 shadow-2xs space-y-4">
                <div>
                  <span className="text-[10px] font-bold uppercase bg-pink-50 text-pink-600 px-2.5 py-1 rounded-full">
                    Estilo Pocamarket
                  </span>
                  <h1 className="text-lg font-extrabold text-zinc-900 mt-1">📦 Mi Bodega (Compras Pagadas)</h1>
                  <p className="text-xs text-zinc-500">
                    Marca los artículos pagados que deseas recibir juntos en un solo paquete y solicita tu envío.
                  </p>
                </div>

                {itemsPagadosEnBodega.length === 0 ? (
                  <p className="text-xs text-zinc-400 text-center py-8 bg-zinc-50 rounded-2xl border border-dashed">
                    Aún no tienes artículos con pago confirmado en tu bodega 🌸 Cuando Lia confirme tu pago aparecerán aquí.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {itemsPagadosEnBodega.map((item) => {
                      const marcado = !!seleccionadosEnvio[item.idUnico];
                      return (
                        <label
                          key={item.idUnico}
                          className={`flex items-center justify-between gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${marcado ? 'bg-pink-50/70 border-pink-400' : 'bg-zinc-50/60 border-zinc-200/80'}`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <input
                              type="checkbox"
                              checked={marcado}
                              onChange={(e) => setSeleccionadosEnvio((prev) => ({ ...prev, [item.idUnico]: e.target.checked }))}
                              className="w-4 h-4 accent-pink-600 rounded"
                            />
                            {item.imagenUrl ? <img src={item.imagenUrl} alt="" className="w-11 h-11 rounded-xl object-cover border shrink-0" /> : <span className="w-11 h-11 rounded-xl bg-white border flex items-center justify-center shrink-0">🧸</span>}
                            <div className="min-w-0">
                              <p className="text-[10px] font-bold text-zinc-400 uppercase">{item.goTitulo}</p>
                              <p className="text-xs font-bold text-zinc-900 truncate">{item.productoNombre}</p>
                              <p className="text-[11px] text-pink-600 font-semibold">{item.detalleSlot}</p>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full shrink-0">
                            Listo para envío
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {itemsPagadosEnBodega.length > 0 && (
                  <form onSubmit={handleSolicitarEnvioAcumulado} className="space-y-3 pt-4 border-t border-zinc-100">
                    <p className="text-xs font-extrabold text-zinc-800">🚚 Datos de Despacho ({itemsMarcados.length} seleccionados)</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <input type="text" required placeholder="Nombre quien recibe" value={envioNombre} onChange={(e) => setEnvioNombre(e.target.value)} className="border rounded-xl px-3.5 py-2 text-xs bg-zinc-50" />
                      <input type="tel" required placeholder="Teléfono / WhatsApp" value={envioTelefono} onChange={(e) => setEnvioTelefono(e.target.value)} className="border rounded-xl px-3.5 py-2 text-xs bg-zinc-50" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <input type="text" required placeholder="Ciudad / Provincia" value={envioCiudad} onChange={(e) => setEnvioCiudad(e.target.value)} className="border rounded-xl px-3.5 py-2 text-xs bg-zinc-50" />
                      <select value={envioMetodo} onChange={(e) => setEnvioMetodo(e.target.value)} className="border rounded-xl px-3.5 py-2 text-xs bg-zinc-50 font-bold">
                        <option value="Quito (+$3.50)">Quito (+$3.50)</option>
                        <option value="Otras Provincias (+$6.50)">Otras Provincias (+$6.50)</option>
                        <option value="Perú Internacional ($0.00)">Perú Internacional ($0.00)</option>
                        <option value="Retiro en Cumbayá ($0.00)">Retiro en Cumbayá ($0.00)</option>
                      </select>
                    </div>
                    <input type="text" required placeholder="Dirección exacta y referencia" value={envioDireccion} onChange={(e) => setEnvioDireccion(e.target.value)} className="border rounded-xl px-3.5 py-2 text-xs bg-zinc-50 w-full" />

                    <div className="bg-pink-50 border border-pink-200 rounded-2xl p-3.5 flex justify-between items-center text-sm font-black">
                      <span>Total Envío ({itemsMarcados.length} artículos):</span>
                      <span className="text-pink-600">${costoEnvioElegido.toFixed(2)} USD</span>
                    </div>

                    <button type="submit" disabled={enviandoSolicitud} className="w-full py-3 bg-zinc-950 hover:bg-zinc-800 text-white font-black text-xs uppercase rounded-xl">
                      {enviandoSolicitud ? 'Enviando solicitud...' : '🚚 Solicitar Envío y Notificar por WhatsApp'}
                    </button>
                  </form>
                )}
              </div>

              {solicitudesPrevias.length > 0 && (
                <div className="bg-white border border-zinc-200/80 rounded-3xl p-5 shadow-2xs space-y-3">
                  <h2 className="text-sm font-extrabold text-zinc-900">📜 Historial de Envíos Solicitados</h2>
                  {solicitudesPrevias.map((sol) => (
                    <div key={sol.id} className="bg-zinc-50 border rounded-2xl p-3.5 text-xs space-y-1">
                      <div className="flex justify-between font-bold">
                        <span>{sol.metodo_envio} — {sol.ciudad}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] ${sol.estado_despacho === 'Enviado' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'}`}>
                          {sol.estado_despacho}
                        </span>
                      </div>
                      <p className="text-zinc-600 whitespace-pre-line text-[11px]">{sol.articulos_incluidos}</p>
                      {sol.guia_rastreo && <p className="font-bold text-indigo-600">🔎 Guía de rastreo: {sol.guia_rastreo}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
