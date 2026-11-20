'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const PRECIOS_ENVIO: Record<string, number> = {
  'Quito (+$3.50)': 3.5,
  'Otras Provincias (+$6.50)': 6.5,
};

function abrirChatLia(texto: string) {
  // Número correcto de WhatsApp en formato internacional: 593 + 999530327.
  const miNumero = '593999530327';
  return 'https://wa.me/' + miNumero + '?text=' + encodeURIComponent(texto);
}

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
        if (Array.isArray(sols)) setSolicitudesPrevias(sols);

        if (Array.isArray(wishRows) && wishRows.length > 0) {
          const ids = wishRows.map((w: any) => w.producto_id);
          const { data: prodsW } = await supabase
            .from('tienda_productos')
            .select('id, nombre_producto, imagen_producto, integrante')
            .in('id', ids);
          setWishlistProds(Array.isArray(prodsW) ? prodsW : []);
        }

        const mapaSeg: Record<string, any> = {};
        if (Array.isArray(segs)) segs.forEach((s: any) => { if (s?.claim_key) mapaSeg[s.claim_key] = s; });

        const mapaGrupos: Record<string, GrupoGoEscritorio> = {};
        const agregarItem = (tituloGrupo: string, origen: 'GO' | 'SHOP', item: ItemEscritorio) => {
          if (!mapaGrupos[tituloGrupo]) {
            mapaGrupos[tituloGrupo] = { titulo: tituloGrupo, origen, items: [], totalGrupo: 0 };
          }
          mapaGrupos[tituloGrupo].items.push(item);
          mapaGrupos[tituloGrupo].totalGrupo += item.precioTotal;
        };

        if (Array.isArray(prods)) {
          prods.forEach((p: any) => {
            const claims = p?.claims_integrantes || {};
            const goObj = Array.isArray(p?.gos) ? p.gos.at(0) : p?.gos;
            const goTitle = goObj?.title || 'Group Order';
            const goEstadoLog = goObj?.estado_logistica || 'Esperando cierre';

            Object.entries(claims).forEach(([integrante, dataClaim]: [string, any]) => {
              if (!dataClaim) return;
              const claimKey = p.id + '-' + integrante;
              const seg = mapaSeg[claimKey];

              if (typeof dataClaim === 'string' && dataClaim.toLowerCase().trim() === email) {
                agregarItem(goTitle, 'GO', {
                  idUnico: claimKey,
                  origen: 'GO',
                  goTitulo: goTitle,
                  productoNombre: p.nombre_producto || 'Artículo GO',
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
              } else if (typeof dataClaim === 'object' && dataClaim !== null) {
                Object.entries(dataClaim).forEach(([mailC, cant]: [string, any]) => {
                  if (String(mailC).toLowerCase().trim() === email && Number(cant) > 0) {
                    agregarItem(goTitle, 'GO', {
                      idUnico: claimKey + '-' + mailC,
                      origen: 'GO',
                      goTitulo: goTitle,
                      productoNombre: p.nombre_producto || 'Artículo GO',
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
        if (Array.isArray(peds)) {
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
  const itemsPagadosTodos = todosLosItems.filter(
    (i) => i.estadoPago === 'Pagado' && i.estadoConfirmacion !== 'Cancelado' && i.estadoEnvio !== 'Enviado'
  );

  const itemsPagadosEnBodega = itemsPagadosTodos.filter(
    (i) => i.origen === 'SHOP' || i.estadoLogistica === 'Llegó a hyuneatelier'
  );

  const itemsPagadosEnCamino = itemsPagadosTodos.filter(
    (i) => i.origen === 'GO' && i.estadoLogistica !== 'Llegó a hyuneatelier'
  );

  const itemsMarcados = itemsPagadosEnBodega.filter((i) => seleccionadosEnvio[i.idUnico]);
  const costoEnvioElegido = PRECIOS_ENVIO[envioMetodo] ?? 0;

  async function handleSolicitarEnvioAcumulado(e: React.FormEvent) {
    e.preventDefault();
    if (itemsMarcados.length === 0) return alert('Marca al menos 1 artículo pagado que ya haya llegado 📦');
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
    <div className="min-h-screen bg-[#FFF9FC] font-sans text-[#51434D] pb-24">
      {/* Encabezado del escritorio */}
      <header className="sticky top-0 z-30 border-b border-[#F2DCE8] bg-[#FFFCFE]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#FCE6F0] text-xl">🎀</div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#C47A9C]">hyuneatelier</p>
              <p className="text-sm font-black text-[#493744]">Mi escritorio</p>
            </div>
          </div>
          <nav className="flex items-center gap-2 text-xs font-bold">
            <Link href="/gos" className="rounded-full border border-[#EADCE5] bg-white px-3 py-2 text-[#8B647A] transition hover:border-[#D98EB0] hover:text-[#B85E89]">🧸 Explorar GOs</Link>
            <Link href="/shop" className="rounded-full border border-[#EADCE5] bg-white px-3 py-2 text-[#8B647A] transition hover:border-[#D98EB0] hover:text-[#B85E89]">🛍️ Tienda</Link>
            {usuarioEmail.toLowerCase().trim() === 'liahwang1852@gmail.com' && (
              <Link href="/admin" className="rounded-full border border-[#E6DDF3] bg-[#F4F0FA] px-3 py-2 text-[#806D9F] transition hover:border-[#CFC0E8] hover:bg-[#EEE8F8]">👑 Admin</Link>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        {/* Bienvenida + resumen */}
        <section className="relative overflow-hidden rounded-[28px] border border-[#F0D7E4] bg-gradient-to-br from-[#FCEAF2] via-[#FFF5F8] to-[#F0F8F4] p-5 shadow-[0_8px_30px_rgba(180,120,150,0.07)] sm:p-7">
          <div className="pointer-events-none absolute -right-8 -top-12 h-44 w-44 rounded-full bg-[#F6D5E4]/60 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-16 right-1/3 h-40 w-40 rounded-full bg-[#E2F2EC]/80 blur-2xl" />
          <div className="relative flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div className="max-w-xl">
              <span className="inline-flex rounded-full border border-[#EBC9D9] bg-white/75 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#B76C90]">Tu espacio personal</span>
              <h1 className="mt-3 text-2xl font-black tracking-tight text-[#493744] sm:text-3xl">
                ¡Hola, {nombreJoiner.trim().split(' ')[0] || 'bienvenida'}! <span className="text-[#D889AA]">♡</span>
              </h1>
              <p className="mt-2 max-w-lg text-xs leading-6 text-[#806B79] sm:text-sm">
                Aquí puedes revisar tus apartados, consultar tus pagos y reunir tus compras para solicitar un envío cuando estén listas.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:min-w-[330px]">
              <div className="rounded-2xl border border-white/80 bg-white/75 p-3 text-center backdrop-blur">
                <p className="text-xl font-black text-[#B9688D]">{todosLosItems.length}</p>
                <p className="mt-1 text-[9px] font-bold uppercase tracking-wide text-[#967E8D]">Pedidos</p>
              </div>
              <div className="rounded-2xl border border-white/80 bg-white/75 p-3 text-center backdrop-blur">
                <p className="text-xl font-black text-[#57927E]">{itemsPagadosEnBodega.length}</p>
                <p className="mt-1 text-[9px] font-bold uppercase tracking-wide text-[#967E8D]">En bodega</p>
              </div>
              <div className="rounded-2xl border border-white/80 bg-white/75 p-3 text-center backdrop-blur">
                <p className="text-xl font-black text-[#B18C45]">{itemsSinPagar.length}</p>
                <p className="mt-1 text-[9px] font-bold uppercase tracking-wide text-[#967E8D]">Por pagar</p>
              </div>
            </div>
          </div>
        </section>

        {/* Selector de sección */}
        <div className="grid grid-cols-2 gap-2 rounded-2xl border border-[#F0DFE8] bg-white p-1.5 shadow-sm sm:inline-grid sm:min-w-[390px]">
          <button
            type="button"
            onClick={() => setVista('pedidos')}
            className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-extrabold transition-all ${vista === 'pedidos' ? 'bg-[#D982A7] text-white shadow-sm' : 'text-[#94798A] hover:bg-[#FFF2F7]'}`}
          >
            <span>📋</span> Mis pedidos <span className={`rounded-full px-2 py-0.5 text-[10px] ${vista === 'pedidos' ? 'bg-white/20' : 'bg-[#F8EAF1]'}`}>{todosLosItems.length}</span>
          </button>
          <button
            type="button"
            onClick={() => setVista('bodega')}
            className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-extrabold transition-all ${vista === 'bodega' ? 'bg-[#78A997] text-white shadow-sm' : 'text-[#94798A] hover:bg-[#EFF8F3]'}`}
          >
            <span>📦</span> Mi bodega <span className={`rounded-full px-2 py-0.5 text-[10px] ${vista === 'bodega' ? 'bg-white/20' : 'bg-[#EAF5EF]'}`}>{itemsPagadosEnBodega.length}</span>
          </button>
        </div>

        {/* Avisos importantes */}
        {itemsCancelados.length > 0 && (
          <div className="flex items-start gap-3 rounded-2xl border border-[#F2BFCB] bg-[#FFF0F2] p-4 text-xs text-[#994F60]">
            <span className="text-xl">♡</span>
            <div className="space-y-1">
              <p className="font-black">Pedido cancelado</p>
              <p>Este artículo fue cancelado porque no se registró el pago a tiempo: <strong>{itemsCancelados.map((i) => i.productoNombre).join(', ')}</strong>.</p>
            </div>
          </div>
        )}
        {itemsUrgentes.length > 0 && (
          <div className="flex items-start gap-3 rounded-2xl border border-[#EED69D] bg-[#FFF8E5] p-4 text-xs text-[#85672C]">
            <span className="text-xl">⏰</span>
            <div className="space-y-1">
              <p className="font-black">Tienes pagos próximos a vencer</p>
              <p>Revisa tus artículos pendientes y envía tu comprobante para evitar que se cancelen tus apartados.</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12 lg:gap-6">
          {/* Columna de perfil y ayuda */}
          <aside className="space-y-4 lg:col-span-4">
            <section className="overflow-hidden rounded-[26px] border border-[#F0DFE8] bg-white shadow-[0_5px_22px_rgba(180,120,150,0.05)]">
              <div className="border-b border-[#F5E9EF] bg-gradient-to-r from-[#FFF1F7] to-[#F1F8F4] p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#D982A7] text-sm font-black text-white shadow-sm">{inicialAvatar}</div>
                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-black text-[#493744]">{nombreJoiner || 'Tu perfil de joiner'}</h2>
                    <p className="truncate text-[11px] text-[#9B8492]">{usuarioEmail}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3 p-4">
                <div>
                  <h3 className="text-xs font-black text-[#594553]">Tus datos de contacto</h3>
                  <p className="mt-1 text-[10px] leading-4 text-[#9B8492]">Mantén esta información actualizada para coordinar tus pedidos y envíos.</p>
                </div>
                <form onSubmit={handleGuardarMiPerfil} className="space-y-2.5">
                  <input type="text" placeholder="Nombre y apellido" value={nombreJoiner} onChange={(e) => setNombreJoiner(e.target.value)} className="w-full rounded-xl border border-[#EADDE5] bg-[#FFFBFD] px-3 py-2.5 text-xs outline-none transition focus:border-[#D98EB0] focus:ring-2 focus:ring-[#F9E5EF]" />
                  <input type="text" placeholder="Instagram (ej. @cami_skz)" value={instagramJoiner} onChange={(e) => setInstagramJoiner(e.target.value)} className="w-full rounded-xl border border-[#EADDE5] bg-[#FFFBFD] px-3 py-2.5 text-xs outline-none transition focus:border-[#D98EB0] focus:ring-2 focus:ring-[#F9E5EF]" />
                  <input type="tel" placeholder="WhatsApp (ej. 0991234567)" value={envioTelefono} onChange={(e) => setEnvioTelefono(e.target.value)} className="w-full rounded-xl border border-[#EADDE5] bg-[#FFFBFD] px-3 py-2.5 text-xs outline-none transition focus:border-[#D98EB0] focus:ring-2 focus:ring-[#F9E5EF]" />
                  <button type="submit" disabled={guardandoNombre} className="w-full rounded-xl bg-[#D982A7] px-4 py-3 text-xs font-black text-white transition hover:bg-[#C86F96] disabled:opacity-60">
                    {guardandoNombre ? 'Guardando…' : 'Guardar mis datos'}
                  </button>
                </form>
              </div>
            </section>

            <section className="rounded-[26px] border border-[#F0D9E5] bg-gradient-to-br from-[#FFF0F6] via-[#FFF8FA] to-[#FFF7E8] p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="rounded-full bg-white/80 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-[#B86B8E]">Recompensas</span>
                  <h3 className="mt-2 text-sm font-black text-[#594553]">Pasaporte de estampitas</h3>
                </div>
                <span className="rounded-xl border border-[#F1D5E2] bg-white px-2.5 py-1.5 text-xs font-black text-[#C36F96]">{premiosDisponibles > 0 ? '10 / 10 ✨' : `${estampitasActuales} / 10`}</span>
              </div>
              <p className="mt-2 text-[11px] leading-5 text-[#826D7A]">
                Ganas <strong>1 estampita</strong> por cada compra pagada de <strong>$20+ USD</strong>. Al reunir 10 puedes reclamar <strong>1 PC de tu Wishlist o una sorpresa extra</strong>.
              </p>
              <div className="mt-3 grid grid-cols-5 gap-2">
                {Array.from({ length: 10 }).map((_, idx) => {
                  const llena = premiosDisponibles > 0 || idx < estampitasActuales;
                  return <div key={idx} className={`flex h-9 items-center justify-center rounded-xl border text-xs font-black ${llena ? 'border-[#D982A7] bg-[#D982A7] text-white' : 'border-dashed border-[#E7BBD0] bg-white/70 text-[#D99BB7]'}`}>{llena ? '♡' : idx + 1}</div>;
                })}
              </div>
              {premiosDisponibles > 0 && (
                <a href={abrirChatLia(
                  '¡Holis, Lia! 🎉 Completé mis 10 estampitas en hyuneatelier y quiero reclamar mi PC de Wishlist / sorpresa extra:\n\n' +
                    '• *Nombre:* ' + (nombreJoiner || usuarioEmail) + ' (' + (instagramJoiner || usuarioEmail) + ')\n' +
                    '• *Mi Wishlist guardada:* ' +
                    (wishlistProds.length > 0
                      ? wishlistProds.map((w) => w.nombre_producto).join(', ')
                      : 'Sorpresa del Atelier ✨')
                )} className="mt-3 flex w-full items-center justify-center rounded-xl bg-[#E8C66F] px-3 py-2.5 text-[11px] font-black text-[#594A2D] transition hover:bg-[#DDB957]">
                  🎁 Reclamar mi recompensa por WhatsApp
                </a>
              )}
            </section>

            <section className="rounded-[26px] border border-[#DDEBE4] bg-[#F3FAF6] p-4">
              <h3 className="text-xs font-black text-[#527E6D]">✈️ ¿Qué significa cada estado?</h3>
              <div className="mt-3 space-y-2 text-[10px] leading-4 text-[#6F8279]">
                <p><strong className="text-[#64756D]">Esperando cierre:</strong> el GO sigue reuniendo pedidos.</p>
                <p><strong className="text-[#B58B3E]">Pedido realizado:</strong> ya se compró en Corea o Japón.</p>
                <p><strong className="text-[#668FAE]">En bodega Corea / Japón:</strong> llegó a la bodega internacional.</p>
                <p><strong className="text-[#8A80B4]">En camino a Ecuador:</strong> está en tránsito.</p>
                <p><strong className="text-[#548B72]">Llegó a hyuneatelier:</strong> ya puedes seleccionarlo para solicitar tu envío.</p>
              </div>
            </section>

            <section className="rounded-[26px] border border-[#E7DDF0] bg-[#F8F5FC] p-4">
              <h3 className="text-xs font-black text-[#786A9A]">🏦 Datos para transferencias</h3>
              <div className="mt-2 space-y-1 text-[11px] text-[#71677F]">
                <p><strong>Banco Pichincha · Ahorros</strong></p>
                <p className="font-black text-[#51445F]">2213367970</p>
                <p>Titular: Isabel Revollar</p>
                <p>CI: 1752806388</p>
              </div>
              <p className="mt-3 rounded-xl border border-[#E7DDF0] bg-white/80 p-2.5 text-[10px] leading-4 text-[#8A7190]">
                Recuerda seguir a <strong>@atelierdehyun</strong> en Instagram para poder enviar tus proofs.
              </p>
            </section>
          </aside>

          {/* Contenido principal */}
          <section className="min-w-0 space-y-4 lg:col-span-8">
            {vista === 'pedidos' ? (
              <>
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#C47A9C]">Resumen de compras</p>
                    <h2 className="mt-1 text-xl font-black text-[#493744]">Mis pedidos y apartados</h2>
                    <p className="mt-1 text-xs text-[#9B8492]">Consulta tus artículos, pagos y avances de cada Group Order.</p>
                  </div>
                  <button type="button" onClick={() => setVista('bodega')} className="rounded-xl border border-[#CFE3D8] bg-[#EFF8F3] px-3.5 py-2.5 text-[11px] font-black text-[#578773] transition hover:bg-[#E4F3EB]">
                    Ir a mi bodega →
                  </button>
                </div>

                {itemsSinPagar.length > 0 && (
                  <section className="overflow-hidden rounded-[26px] border border-[#CFE6D9] bg-gradient-to-br from-[#F0FAF4] via-white to-[#FFF8F0] shadow-sm">
                    <div className="border-b border-[#DCEDE3] px-4 py-4 sm:px-5">
                      <span className="rounded-full bg-[#DDEFE4] px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-[#4F896F]">Resumen de pago</span>
                      <div className="mt-2 flex flex-wrap items-end justify-between gap-2">
                        <div>
                          <h3 className="text-lg font-black text-[#435B4E]">Total pendiente: ${totalPendientePagar.toFixed(2)} USD</h3>
                          <p className="mt-1 text-[10px] text-[#82978B]">{itemsAPagarHoy.length} artículo(s) seleccionados para pagar</p>
                        </div>
                        {totalAbonadoPendientes > 0 && <p className="text-[11px] font-bold text-[#57927E]">Ya abonaste ${totalAbonadoPendientes.toFixed(2)}</p>}
                      </div>
                    </div>
                    <div className="space-y-3 p-4 sm:p-5">
                      <p className="text-[11px] font-black text-[#64766B]">Selecciona los artículos que pagarás ahora:</p>
                      <div className="space-y-2 rounded-2xl border border-[#E2EEE6] bg-white/80 p-3">
                        {itemsSinPagar.map((it) => {
                          const marcado = haySeleccionManualPago ? !!seleccionadosPago[it.idUnico] : true;
                          return (
                            <label key={it.idUnico} className="flex cursor-pointer items-center justify-between gap-3 rounded-xl px-2 py-2 text-xs transition hover:bg-[#F5FAF6]">
                              <span className="flex min-w-0 items-center gap-2">
                                <input type="checkbox" checked={marcado} onChange={(e) => {
                                  const base: Record<string, boolean> = {};
                                  itemsSinPagar.forEach((x) => { base[x.idUnico] = haySeleccionManualPago ? !!seleccionadosPago[x.idUnico] : true; });
                                  base[it.idUnico] = e.target.checked;
                                  setSeleccionadosPago(base);
                                }} className="h-4 w-4 accent-[#78A997]" />
                                <span className="min-w-0">
                                  <span className="block truncate font-bold text-[#594B56]">{it.productoNombre}</span>
                                  <span className="block truncate text-[10px] text-[#A18B99]">{it.goTitulo} · {it.detalleSlot}</span>
                                </span>
                              </span>
                              <span className="shrink-0 font-black text-[#5B7466]">${it.precioTotal.toFixed(2)}</span>
                            </label>
                          );
                        })}
                        <input type="text" placeholder="Nombre del titular de la cuenta que transfiere" value={titularTransferencia} onChange={(e) => setTitularTransferencia(e.target.value)} className="mt-1 w-full rounded-xl border border-[#DCE9E0] bg-white px-3 py-2.5 text-xs outline-none focus:border-[#78A997]" />
                      </div>
                      <p className="text-[11px] leading-5 text-[#78877E]">Transfiere al Banco Pichincha <strong>(2213367970 — Isabel Revollar)</strong> y envía tu comprobante por WhatsApp.</p>
                      <a href={abrirChatLia(
                        '¡Hola, Lia! Quiero reportar el pago de mis pedidos en hyuneatelier:\n\n' +
                          '• *Nombre:* ' + (nombreJoiner || usuarioEmail) + '\n' +
                          '• *Titular transferencia:* ' + (titularTransferencia || nombreJoiner || usuarioEmail) + '\n' +
                          '• *Instagram:* ' + (instagramJoiner || 'No registrado') + '\n' +
                          '• *Correo:* ' + usuarioEmail + '\n\n' +
                          '*Artículos a pagar:*\n' +
                          itemsAPagarHoy.map((i) => '• [' + i.goTitulo + '] ' + i.productoNombre + ' — $' + i.precioTotal.toFixed(2)).join('\n') +
                          (totalAbonadoPendientes > 0 ? '\n• *Abonado anteriormente:* -$' + totalAbonadoPendientes.toFixed(2) : '') +
                          '\n\n• *Total Transferido:* $' + totalPendientePagar.toFixed(2) + ' USD\n\n' +
                          'Confirmo que sigo a @atelierdehyun y adjunto mi comprobante.'
                      )} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#6EAA8D] px-4 py-3.5 text-xs font-black text-white shadow-sm transition hover:bg-[#5D987C]">
                        💬 Enviar resumen y comprobante · ${totalPendientePagar.toFixed(2)}
                      </a>
                    </div>
                  </section>
                )}

                {grupos.length === 0 ? (
                  <div className="rounded-[26px] border border-dashed border-[#E8D5E0] bg-white px-6 py-12 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFF0F6] text-2xl">🧸</div>
                    <h3 className="mt-3 text-sm font-black text-[#6B5664]">Todavía no tienes apartados</h3>
                    <p className="mt-1 text-xs text-[#A18B99]">Cuando reserves algo en un GO o en la tienda, aparecerá aquí.</p>
                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                      <Link href="/gos" className="rounded-full bg-[#D982A7] px-4 py-2.5 text-xs font-black text-white">Explorar GOs</Link>
                      <Link href="/shop" className="rounded-full border border-[#EAD7E2] bg-white px-4 py-2.5 text-xs font-black text-[#A96686]">Visitar tienda</Link>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {grupos.map((grupo) => (
                      <article key={grupo.titulo} className="overflow-hidden rounded-[26px] border border-[#EFDFE8] bg-white shadow-[0_4px_18px_rgba(180,120,150,0.045)]">
                        <div className={`flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3.5 sm:px-5 ${grupo.origen === 'SHOP' ? 'border-[#DDE9F3] bg-[#F1F7FC]' : 'border-[#F1DFE8] bg-[#FFF3F8]'}`}>
                          <div className="flex items-center gap-2.5">
                            <span className={`flex h-9 w-9 items-center justify-center rounded-xl text-base ${grupo.origen === 'SHOP' ? 'bg-white text-[#7398B4]' : 'bg-white text-[#C47799]'}`}>{grupo.origen === 'SHOP' ? '🛍️' : '🧸'}</span>
                            <div>
                              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#A38B99]">{grupo.origen === 'SHOP' ? 'Tienda' : 'Group Order'}</p>
                              <h3 className="text-sm font-black text-[#594553]">{grupo.titulo}</h3>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-black text-[#594553]">${grupo.totalGrupo.toFixed(2)} USD</p>
                            <p className="text-[10px] text-[#A18B99]">{grupo.items.length} artículo(s)</p>
                          </div>
                        </div>
                        <div className="divide-y divide-[#F4EAF0] px-3 sm:px-5">
                          {grupo.items.map((item) => (
                            <div key={item.idUnico} className="flex items-start gap-3 py-4">
                              {item.imagenUrl ? <img src={item.imagenUrl} alt="" className="h-16 w-16 shrink-0 rounded-2xl border border-[#F0E5EB] bg-white object-contain p-1" /> : <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#FFF3F8] text-xl">🧸</div>}
                              <div className="min-w-0 flex-1">
                                <p className="break-words text-xs font-black text-[#554451]">{item.productoNombre}</p>
                                <p className="mt-1 text-[11px] font-semibold text-[#B87595]">{item.detalleSlot}</p>
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                  <span className={`rounded-full px-2.5 py-1 text-[9px] font-black ${item.estadoPago === 'Pagado' ? 'bg-[#E7F4EC] text-[#54856D]' : 'bg-[#FFF4DF] text-[#A27B32]'}`}>{item.estadoPago === 'Pagado' ? '✓ Pagado' : 'Pago: ' + item.estadoPago}</span>
                                  <span className={`rounded-full px-2.5 py-1 text-[9px] font-black ${item.estadoConfirmacion === 'Confirmado' ? 'bg-[#EAF2FA] text-[#6686A5]' : item.estadoConfirmacion === 'Cancelado' ? 'bg-[#FCEAEC] text-[#B45F70]' : 'bg-[#F2EEF2] text-[#827481]'}`}>{item.estadoConfirmacion}</span>
                                  {Number(item.montoAbonado || 0) > 0 && item.estadoPago !== 'Pagado' && <span className="rounded-full bg-[#E9F5EF] px-2.5 py-1 text-[9px] font-black text-[#578A73]">Abono: ${Number(item.montoAbonado).toFixed(2)}</span>}
                                  {item.origen === 'GO' && item.estadoLogistica && <span className="rounded-full bg-[#F0EDFA] px-2.5 py-1 text-[9px] font-black text-[#8173A7]">✈️ {item.estadoLogistica}</span>}
                                </div>
                              </div>
                              <p className="shrink-0 pt-1 text-xs font-black text-[#594553]">${item.precioTotal.toFixed(2)}</p>
                            </div>
                          ))}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-4">
                <div className="rounded-[26px] border border-[#DCEBE2] bg-gradient-to-br from-[#EEF8F2] via-white to-[#F5FAF6] p-5 shadow-sm sm:p-6">
                  <span className="rounded-full bg-white px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-[#67917C]">Tus compras listas</span>
                  <h2 className="mt-2 text-xl font-black text-[#435B4E]">Mi bodega</h2>
                  <p className="mt-1 max-w-xl text-xs leading-5 text-[#82978B]">Selecciona los artículos pagados que ya llegaron a Hyuneatelier. Puedes reunir varios pedidos en un solo envío.</p>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className="rounded-2xl border border-white bg-white/80 p-3">
                      <p className="text-xl font-black text-[#578D73]">{itemsPagadosEnBodega.length}</p>
                      <p className="text-[9px] font-bold uppercase tracking-wide text-[#8BA194]">Listos para enviar</p>
                    </div>
                    <div className="rounded-2xl border border-white bg-white/80 p-3">
                      <p className="text-xl font-black text-[#9A8AB9]">{itemsPagadosEnCamino.length}</p>
                      <p className="text-[9px] font-bold uppercase tracking-wide text-[#8BA194]">En camino</p>
                    </div>
                  </div>
                </div>

                <section className="rounded-[26px] border border-[#E4EDE7] bg-white p-4 shadow-sm sm:p-5">
                  {itemsPagadosEnBodega.length > 0 && (
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-[#F3F9F5] p-3">
                      <div className="flex gap-2">
                        <button type="button" onClick={() => {
                          const todos: Record<string, boolean> = {};
                          itemsPagadosEnBodega.forEach((it) => { todos[it.idUnico] = true; });
                          setSeleccionadosEnvio(todos);
                        }} className="rounded-lg bg-[#78A997] px-3 py-2 text-[10px] font-black text-white">Seleccionar todos</button>
                        <button type="button" onClick={() => setSeleccionadosEnvio({})} className="rounded-lg border border-[#DDE9E1] bg-white px-3 py-2 text-[10px] font-bold text-[#71877A]">Limpiar</button>
                      </div>
                      <span className="text-[11px] font-black text-[#5B9076]">{itemsMarcados.length} seleccionado(s)</span>
                    </div>
                  )}

                  <div className="space-y-2">
                    <h3 className="text-xs font-black text-[#5C7465]">Artículos disponibles</h3>
                    {itemsPagadosEnBodega.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-[#DCE9E0] bg-[#F8FBF9] px-5 py-8 text-center">
                        <span className="text-2xl">📦</span>
                        <p className="mt-2 text-xs font-black text-[#71877A]">Todavía no tienes artículos listos para enviar</p>
                        <p className="mt-1 text-[10px] leading-5 text-[#9AA99F]">Cuando tus compras estén pagadas y lleguen a Hyuneatelier, aparecerán aquí.</p>
                      </div>
                    ) : (
                      itemsPagadosEnBodega.map((item) => {
                        const marcado = !!seleccionadosEnvio[item.idUnico];
                        return (
                          <label key={item.idUnico} className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-3 transition ${marcado ? 'border-[#9FC9B0] bg-[#F0F8F3]' : 'border-[#E9EEE9] bg-[#FBFDFC] hover:border-[#C7DDD0]'}`}>
                            <input type="checkbox" checked={marcado} onChange={(e) => setSeleccionadosEnvio((prev) => ({ ...prev, [item.idUnico]: e.target.checked }))} className="h-4 w-4 shrink-0 accent-[#78A997]" />
                            {item.imagenUrl ? <img src={item.imagenUrl} alt="" className="h-12 w-12 shrink-0 rounded-xl border border-[#E7EDE8] bg-white object-contain p-1" /> : <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-lg">🧸</span>}
                            <span className="min-w-0 flex-1">
                              <span className="block text-[9px] font-black uppercase tracking-wide text-[#91A398]">{item.goTitulo}</span>
                              <span className="mt-0.5 block truncate text-xs font-black text-[#53665A]">{item.productoNombre}</span>
                              <span className="block text-[10px] text-[#7FA18C]">{item.detalleSlot}</span>
                            </span>
                            <span className="shrink-0 rounded-full bg-[#E1F1E7] px-2.5 py-1 text-[9px] font-black text-[#54856D]">Listo ✓</span>
                          </label>
                        );
                      })
                    )}
                  </div>

                  {itemsPagadosEnCamino.length > 0 && (
                    <div className="mt-5 space-y-2 border-t border-[#EDF1ED] pt-4">
                      <h3 className="text-xs font-black text-[#8A80A8]">En camino · todavía no disponibles</h3>
                      {itemsPagadosEnCamino.map((item) => (
                        <div key={item.idUnico} className="flex items-center gap-3 rounded-2xl border border-[#E9E6F1] bg-[#FAF9FC] p-3">
                          {item.imagenUrl ? <img src={item.imagenUrl} alt="" className="h-11 w-11 shrink-0 rounded-xl border border-[#ECE8F2] bg-white object-contain p-1" /> : <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white">✈️</span>}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-bold text-[#6F6682]">{item.productoNombre}</p>
                            <p className="text-[10px] text-[#9A91AA]">{item.goTitulo} · {item.detalleSlot}</p>
                          </div>
                          <span className="rounded-full bg-[#F0ECF8] px-2.5 py-1 text-[9px] font-black text-[#8276A5]">{item.estadoLogistica || 'En camino'}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {itemsPagadosEnBodega.length > 0 && (
                    <form onSubmit={handleSolicitarEnvioAcumulado} className="mt-5 space-y-4 border-t border-[#EDF1ED] pt-5">
                      <div>
                        <h3 className="text-sm font-black text-[#52685A]">Solicitar mi envío</h3>
                        <p className="mt-1 text-[10px] leading-4 text-[#94A197]">Completa los datos de entrega. Se enviará el resumen de tu solicitud por WhatsApp.</p>
                      </div>
                      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                        <input type="text" required placeholder="Nombre de quien recibe" value={envioNombre} onChange={(e) => setEnvioNombre(e.target.value)} className="w-full rounded-xl border border-[#DFEAE2] bg-[#FBFDFC] px-3 py-3 text-xs outline-none focus:border-[#78A997]" />
                        <input type="tel" required placeholder="Teléfono / WhatsApp" value={envioTelefono} onChange={(e) => setEnvioTelefono(e.target.value)} className="w-full rounded-xl border border-[#DFEAE2] bg-[#FBFDFC] px-3 py-3 text-xs outline-none focus:border-[#78A997]" />
                        <input type="text" required placeholder="Ciudad / Provincia" value={envioCiudad} onChange={(e) => setEnvioCiudad(e.target.value)} className="w-full rounded-xl border border-[#DFEAE2] bg-[#FBFDFC] px-3 py-3 text-xs outline-none focus:border-[#78A997]" />
                        <select value={envioMetodo} onChange={(e) => setEnvioMetodo(e.target.value)} className="w-full rounded-xl border border-[#DFEAE2] bg-[#FBFDFC] px-3 py-3 text-xs font-bold text-[#607468] outline-none focus:border-[#78A997]">
                          <option value="Quito (+$3.50)">Quito (+$3.50)</option>
                          <option value="Otras Provincias (+$6.50)">Otras Provincias (+$6.50)</option>
                          <option value="Perú Internacional ($0.00)">Perú Internacional ($0.00)</option>
                          <option value="Retiro en Cumbayá ($0.00)">Retiro en Cumbayá ($0.00)</option>
                        </select>
                      </div>
                      <input type="text" required placeholder="Dirección exacta y referencia" value={envioDireccion} onChange={(e) => setEnvioDireccion(e.target.value)} className="w-full rounded-xl border border-[#DFEAE2] bg-[#FBFDFC] px-3 py-3 text-xs outline-none focus:border-[#78A997]" />
                      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#DDEBE2] bg-[#F2F9F4] p-3.5">
                        <div>
                          <p className="text-[10px] font-bold text-[#7E9384]">{itemsMarcados.length} artículo(s) seleccionados</p>
                          <p className="text-xs font-black text-[#52685A]">Costo de envío</p>
                        </div>
                        <p className="text-lg font-black text-[#5B9076]">${costoEnvioElegido.toFixed(2)} USD</p>
                      </div>
                      <button type="submit" disabled={enviandoSolicitud || itemsMarcados.length === 0} className="w-full rounded-xl bg-[#78A997] px-4 py-3.5 text-xs font-black text-white shadow-sm transition hover:bg-[#639781] disabled:cursor-not-allowed disabled:opacity-50">
                        {enviandoSolicitud ? 'Enviando solicitud…' : '🚚 Solicitar envío y continuar por WhatsApp'}
                      </button>
                      {itemsMarcados.length === 0 && <p className="text-center text-[10px] text-[#A18B99]">Selecciona al menos un artículo para continuar.</p>}
                    </form>
                  )}
                </section>

                {solicitudesPrevias.length > 0 && (
                  <section className="rounded-[26px] border border-[#E7E0EF] bg-white p-4 shadow-sm sm:p-5">
                    <h3 className="text-sm font-black text-[#655A79]">Historial de envíos</h3>
                    <p className="mt-1 text-[10px] text-[#A098AA]">Consulta tus solicitudes anteriores y sus números de guía.</p>
                    <div className="mt-3 space-y-2.5">
                      {solicitudesPrevias.map((sol) => (
                        <div key={sol.id} className="rounded-2xl border border-[#ECE7F1] bg-[#FBFAFD] p-3.5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-xs font-black text-[#645A75]">{sol.metodo_envio} · {sol.ciudad}</span>
                            <span className={`rounded-full px-2.5 py-1 text-[9px] font-black ${sol.estado_despacho === 'Enviado' ? 'bg-[#E6F3EA] text-[#54856D]' : 'bg-[#FFF4DF] text-[#A27B32]'}`}>{sol.estado_despacho}</span>
                          </div>
                          <p className="mt-2 whitespace-pre-line text-[10px] leading-5 text-[#8C8495]">{sol.articulos_incluidos}</p>
                          {sol.guia_rastreo && <p className="mt-2 rounded-xl bg-[#F0EDFA] px-3 py-2 text-[10px] font-black text-[#7D70A1]">🔎 Guía de rastreo: {sol.guia_rastreo}</p>}
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}
          </section>
        </div>

        <footer className="pb-4 pt-2 text-center text-[10px] text-[#B49EAC]">
          Hecho con cariño · hyuneatelier ♡
        </footer>
      </main>
    </div>
  );
}
