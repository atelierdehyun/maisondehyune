'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const PRECIOS_ENVIO: Record<string, number> = {
  'Quito ($3.50)': 3.5,
  'Provincias ($6.50)': 6.5,
  'Selva o Galápagos ($7.50)': 7.5,
};

function abrirChatLia(texto: string) {
  const miNumero = ['593', '999', '530', '327'].join('');
  const datos = new URLSearchParams({ phone: miNumero, text: texto });
  return 'https://whatsapp.com?' + datos.toString();
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
  const [avisosGo, setAvisosGo] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [seleccionadosPago, setSeleccionadosPago] = useState<Record<string, boolean>>({});
  const [titularTransferencia, setTitularTransferencia] = useState('');
  const [montoAbono, setMontoAbono] = useState('');
  const [comprobanteFile, setComprobanteFile] = useState<File | null>(null);
  const [subiendoComprobante, setSubiendoComprobante] = useState(false);
  const [mensajeComprobante, setMensajeComprobante] = useState('');

  const [seleccionadosEnvio, setSeleccionadosEnvio] = useState<Record<string, boolean>>({});
  const [envioNombre, setEnvioNombre] = useState('');
  const [envioTelefono, setEnvioTelefono] = useState('');
  const [envioCiudad, setEnvioCiudad] = useState('');
  const [envioDireccion, setEnvioDireccion] = useState('');
  const [envioMetodo, setEnvioMetodo] = useState('Quito ($3.50)');
  const [enviandoSolicitud, setEnviandoSolicitud] = useState(false);
  const [urlWhatsappEnvio, setUrlWhatsappEnvio] = useState('');
  async function cargarMisPedidos() {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const email = session?.user?.email?.toLowerCase().trim() || '';
      setUsuarioEmail(email);

      if (email && session?.access_token) {
        try {
          const response = await fetch('/api/joiner/updates', {
            headers: { Authorization: `Bearer ${session.access_token}` },
            cache: 'no-store',
          });
          const payload = await response.json();
          setAvisosGo(response.ok && Array.isArray(payload.data) ? payload.data : []);
        } catch {
          setAvisosGo([]);
        }

        const [{ data: perfil }, { data: segs }, { data: peds }, { data: sols }, { data: wishRows }] = await Promise.all([
          supabase.from('perfiles_joiners').select('*').eq('user_email', email).maybeSingle(),
          supabase.from('seguimiento_claims').select('*').eq('user_email', email),
          supabase.from('pedidos').select('*').eq('user_email', email).order('id', { ascending: false }),
          supabase.from('solicitudes_envio').select('*').eq('user_email', email).order('id', { ascending: false }),
          supabase.from('wishlist_joiners').select('producto_id').eq('user_email', email),
        ]);

        let prods: any[] = [];
        const { data: todosProdsUsuario } = await supabase
          .from('productos')
          .select('id, nombre_producto, precio, go_id, imagen_producto, due_date, claims_integrantes, gos(title, estado_logistica)');

        if (Array.isArray(todosProdsUsuario)) {
          prods = todosProdsUsuario.filter((p: any) => {
            const claims = p?.claims_integrantes;
            if (!claims || typeof claims !== 'object') return false;
            return Object.values(claims).some((slotVal: any) => {
              if (!slotVal) return false;
              if (typeof slotVal === 'string') return slotVal.toLowerCase().trim() === email;
              if (typeof slotVal === 'object') {
                return Object.entries(slotVal).some(
                  ([mail, qty]) => mail.toLowerCase().trim() === email && Number(qty) > 0
                );
              }
              return false;
            });
          });
        }
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
                  idUnico: claimKey, origen: 'GO', goTitulo: goTitle,
                  productoNombre: p.nombre_producto || 'Artículo GO', imagenUrl: p.imagen_producto || null,
                  detalleSlot: integrante, cantidad: 1, precioTotal: Number(p.precio || 0),
                  dueDate: p.due_date || null, estadoConfirmacion: seg?.estado_confirmacion || 'Pendiente',
                  estadoPago: seg?.estado_pago || 'Sin pagar', fechaPago: seg?.fecha_pago || '',
                  montoAbonado: Number(seg?.monto_abonado || 0), estadoLogistica: goEstadoLog,
                });
                            } else if (typeof dataClaim === 'object' && dataClaim !== null) {
                const totalPorCorreo = Object.entries(dataClaim).reduce((acc, [mailC, cant]: [string, any]) => {
                  if (String(mailC).toLowerCase().trim() === email && Number(cant) > 0) {
                    return acc + Number(cant);
                  }
                  return acc;
                }, 0);

                if (totalPorCorreo > 0) {
                  agregarItem(goTitle, 'GO', {
                    idUnico: claimKey + '-' + email,
                    origen: 'GO',
                    goTitulo: goTitle,
                    productoNombre: p.nombre_producto || 'Artículo GO',
                    imagenUrl: p.imagen_producto || null,
                    detalleSlot: integrante,
                    cantidad: totalPorCorreo,
                    precioTotal: Number(p.precio || 0) * totalPorCorreo,
                    dueDate: p.due_date || null,
                    estadoConfirmacion: seg?.estado_confirmacion || 'Pendiente',
                    estadoPago: seg?.estado_pago || 'Sin pagar',
                    fechaPago: seg?.fecha_pago || '',
                    montoAbonado: Number(seg?.monto_abonado || 0),
                    estadoLogistica: goEstadoLog,
                  });
                }
              }
            });
          });
        }

        if (Array.isArray(peds)) {
          peds.forEach((ped: any) => {
            agregarItem('Tienda / Shop', 'SHOP', {
              idUnico: 'shop-' + ped.id, origen: 'SHOP', goTitulo: 'Tienda / Shop',
              productoNombre: ped.producto_nombre || ped.detalles || 'Compra Tienda',
              imagenUrl: ped.imagen_producto || null, detalleSlot: ped.estado_envio || 'En bodega',
              cantidad: 1, precioTotal: Number(ped.total_pagar || 0), dueDate: null,
              estadoConfirmacion: ped.estado_confirmacion || 'Pendiente',
              estadoPago: ped.estado_pago || 'Sin pagar', fechaPago: ped.fecha_pago || '',
              estadoEnvio: ped.estado_envio || 'En bodega', montoAbonado: Number(ped.monto_abonado || 0),
            });
          });
        }
        setGrupos(Object.values(mapaGrupos));
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }

  useEffect(() => { cargarMisPedidos(); }, []);
  async function handleGuardarMiPerfil(e: React.FormEvent) {
    e.preventDefault();
    if (!usuarioEmail || !nombreJoiner.trim()) return;
    setGuardandoNombre(true);
    const { error } = await supabase.from('perfiles_joiners').upsert(
      {
        user_email: usuarioEmail.toLowerCase().trim(),
        nombre_completo: nombreJoiner.trim(),
        usuario_red: instagramJoiner.trim() ? '@' + instagramJoiner.replace('@', '').trim() : '',
        telefono: envioTelefono.trim(),
      },
      { onConflict: 'user_email' }
    );
    setGuardandoNombre(false);
    if (error) alert('Error al guardar: ' + error.message);
    else { alert('✅ ¡Tus datos quedaron guardados!'); cargarMisPedidos(); }
  }

  const todosLosItems = grupos.flatMap((g) => g.items);
  const itemsPagadosTodos = todosLosItems.filter(
    (i) => i.estadoPago === 'Pagado' && i.estadoConfirmacion !== 'Cancelado' && i.estadoEnvio !== 'Enviado'
  );
  const itemsPagadosEnBodega = itemsPagadosTodos.filter((i) => i.origen === 'SHOP' || i.estadoLogistica === 'Llegó a hyuneatelier');
  const itemsPagadosEnCamino = itemsPagadosTodos.filter((i) => i.origen === 'GO' && i.estadoLogistica !== 'Llegó a hyuneatelier');
  const itemsMarcados = itemsPagadosEnBodega.filter((i) => seleccionadosEnvio[i.idUnico]);
  const costoEnvioElegido = PRECIOS_ENVIO[envioMetodo] ?? 0;

  async function handleSolicitarEnvioAcumulado(e: React.FormEvent) {
    e.preventDefault();
    if (itemsMarcados.length === 0) return alert('Marca al menos 1 artículo pagado que ya haya llegado 📦');
    const scopesSeleccionados = new Set(itemsMarcados.map((item) => item.origen));
    if (scopesSeleccionados.size > 1) return alert('GO y Shop tienen envíos independientes. Solicita primero una sección y luego la otra.');
    if (!envioNombre || !envioTelefono || !envioCiudad || !envioDireccion) return alert('Completa todos tus datos de dirección y teléfono 🚚');

    setEnviandoSolicitud(true);
    const listaTexto = itemsMarcados.map((i) => '• [' + i.goTitulo + '] ' + i.productoNombre + ' (' + i.detalleSlot + ')').join('\n');

    const { error } = await supabase.from('solicitudes_envio').insert([{
      user_email: usuarioEmail,
      tipo_servicio: itemsMarcados.origen,
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
      const urlWsp = abrirChatLia(msgWsp);
      setUrlWhatsappEnvio(urlWsp);
      setSeleccionadosEnvio({});
      await cargarMisPedidos();
      window.location.href = urlWsp;
    } else alert('Error: ' + error.message);
    setEnviandoSolicitud(false);
  }
  if (loading) {
    return <div className="min-h-screen bg-[#FAF8F9] flex items-center justify-center font-mono text-xs text-zinc-400">✧ cargando tu cuenta y bodega... 🎀</div>;
  }

  if (!usuarioEmail) {
    return (
      <div className="min-h-screen bg-[#FAF8F9] flex flex-col items-center justify-center p-4 gap-4">
        <p className="text-sm font-bold text-zinc-700">Inicia sesión para ver tus compras y bodega 🎀</p>
        <Link href="/joiner-login" className="px-6 py-2.5 rounded-full bg-pink-600 text-white text-xs font-bold">Iniciar sesión ➔</Link>
      </div>
    );
  }

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const itemsCancelados = todosLosItems.filter((i) => i.estadoConfirmacion === 'Cancelado');
  const itemsUrgentes = todosLosItems.filter((i) => {
    if (i.estadoPago === 'Pagado' || i.estadoConfirmacion === 'Cancelado' || !i.dueDate) return false;
    const limite = new Date(i.dueDate + 'T00:00:00');
    return Math.ceil((limite.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24)) <= 3;
  });

  const inicialAvatar = (nombreJoiner || usuarioEmail).slice(0, 2).toUpperCase();
  const itemsSinPagar = todosLosItems.filter((i) => i.estadoPago !== 'Pagado' && i.estadoConfirmacion !== 'Cancelado');
  const haySeleccionManualPago = Object.values(seleccionadosPago).some(Boolean);
  const itemsAPagarHoy = haySeleccionManualPago ? itemsSinPagar.filter((i) => seleccionadosPago[i.idUnico]) : itemsSinPagar;
  const totalAbonadoPendientes = itemsAPagarHoy.reduce((acc, i) => acc + Number(i.montoAbonado || 0), 0);
  const totalPendientePagar = Math.max(0, itemsAPagarHoy.reduce((acc, i) => acc + i.precioTotal, 0) - totalAbonadoPendientes);
  const importeTransferencia = montoAbono.trim() === '' ? totalPendientePagar : Number(montoAbono);
  const importeValido = Number.isFinite(importeTransferencia) && importeTransferencia > 0 && importeTransferencia <= totalPendientePagar + 0.005;

  return (
    <div className="min-h-screen bg-[#FFF9FC] font-sans text-[#51434D] pb-24">
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
            <Link href="/gos" className="rounded-full border border-[#EADCE5] bg-white px-3 py-2 text-[#8B647A]">🧸 Explorar GOs</Link>
            <Link href="/shop" className="rounded-full border border-[#EADCE5] bg-white px-3 py-2 text-[#8B647A]">🛍️ Tienda</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        <section className="relative overflow-hidden rounded-[28px] border border-[#F0D7E4] bg-gradient-to-br from-[#FCEAF2] via-[#FFF5F8] to-[#F0F8F4] p-5 shadow-sm sm:p-7">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div className="max-w-xl">
              <span className="inline-flex rounded-full border border-[#EBC9D9] bg-white/75 px-3 py-1 text-[10px] font-black uppercase text-[#B76C90]">Tu espacio personal</span>
              <h1 className="mt-3 text-2xl font-black text-[#493744] sm:text-3xl">{nombreJoiner.trim().split(' ') || 'bienvenida'}! <span className="text-[#D889AA]">♡</span></h1>
              <p className="mt-2 text-xs leading-6 text-[#806B79]">Revisa tus apartados, sube tus comprobantes y reúne tus compras para pedir envío.</p>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:min-w-[330px]">
              <div className="rounded-2xl border border-white/80 bg-white/75 p-3 text-center"><p className="text-xl font-black text-[#B9688D]">{todosLosItems.length}</p><p className="text-[9px] font-bold uppercase text-[#967E8D]">Pedidos</p></div>
              <div className="rounded-2xl border border-white/80 bg-white/75 p-3 text-center"><p className="text-xl font-black text-[#57927E]">{itemsPagadosEnBodega.length}</p><p className="text-[9px] font-bold uppercase text-[#967E8D]">En bodega</p></div>
              <div className="rounded-2xl border border-white/80 bg-white/75 p-3 text-center"><p className="text-xl font-black text-[#B18C45]">{itemsSinPagar.length}</p><p className="text-[9px] font-bold uppercase text-[#967E8D]">Por pagar</p></div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-2 gap-2 rounded-2xl border border-[#F0DFE8] bg-white p-1.5 shadow-sm sm:inline-grid sm:min-w-[390px]">
          <button type="button" onClick={() => setVista('pedidos')} className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-extrabold ${vista === 'pedidos' ? 'bg-[#D982A7] text-white' : 'text-[#94798A]'}`}>
            📋 Mis pedidos ({todosLosItems.length})
          </button>
          <button type="button" onClick={() => setVista('bodega')} className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-extrabold ${vista === 'bodega' ? 'bg-[#78A997] text-white' : 'text-[#94798A]'}`}>
            📦 Mi bodega ({itemsPagadosEnBodega.length})
          </button>
        </div>

        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12 lg:gap-6">
          <aside className="space-y-4 lg:col-span-4">
            <section className="rounded-[26px] border border-[#F0DFE8] bg-white p-4 shadow-sm space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#D982A7] text-sm font-black text-white">{inicialAvatar}</div>
                <div className="min-w-0"><h2 className="truncate text-sm font-black text-[#493744]">{nombreJoiner || 'Tu perfil'}</h2><p className="truncate text-[11px] text-[#9B8492]">{usuarioEmail}</p></div>
              </div>
              <form onSubmit={handleGuardarMiPerfil} className="space-y-2.5">
                <input type="text" placeholder="Nombre y apellido" value={nombreJoiner} onChange={(e) => setNombreJoiner(e.target.value)} className="w-full rounded-xl border border-[#EADDE5] bg-[#FFFBFD] px-3 py-2.5 text-xs" />
                <input type="text" placeholder="Instagram (ej. @cami_skz)" value={instagramJoiner} onChange={(e) => setInstagramJoiner(e.target.value)} className="w-full rounded-xl border border-[#EADDE5] bg-[#FFFBFD] px-3 py-2.5 text-xs" />
                <input type="tel" placeholder="Teléfono / WhatsApp" value={envioTelefono} onChange={(e) => setEnvioTelefono(e.target.value)} className="w-full rounded-xl border border-[#EADDE5] bg-[#FFFBFD] px-3 py-2.5 text-xs" />
                <button type="submit" disabled={guardandoNombre} className="w-full rounded-xl bg-[#D982A7] px-4 py-2.5 text-xs font-black text-white">{guardandoNombre ? 'Guardando…' : 'Guardar cambios'}</button>
              </form>
            </section>
            <section className="rounded-[26px] border border-[#E7DDF0] bg-[#F8F5FC] p-4 text-[11px] text-[#71677F] space-y-1">
              <h3 className="text-xs font-black text-[#786A9A]">🏦 Datos para transferencias</h3>
              <p><strong>Banco Pichincha · Ahorros:</strong> 2213367970</p>
              <p>Titular: Isabel Revollar · CI: 1752806388</p>
              <p className="mt-2 rounded-xl bg-white p-2 text-[10px]">Recuerda seguir a <strong>@atelierdehyun</strong> en Instagram para enviar tus proofs.</p>
            </section>
          </aside>
          <section className="min-w-0 space-y-4 lg:col-span-8">
            {vista === 'pedidos' ? (
              <>
                {itemsSinPagar.length > 0 && (
                  <section className="rounded-[26px] border border-[#CFE6D9] bg-gradient-to-br from-[#F0FAF4] via-white to-[#FFF8F0] p-4 sm:p-5 shadow-sm space-y-3">
                    <h3 className="text-lg font-black text-[#435B4E]">Saldo pendiente: ${totalPendientePagar.toFixed(2)} USD</h3>
                    <div className="space-y-2 rounded-2xl border border-[#E2EEE6] bg-white/80 p-3">
                      {itemsSinPagar.map((it) => {
                        const marcado = haySeleccionManualPago ? !!seleccionadosPago[it.idUnico] : true;
                        return (
                          <label key={it.idUnico} className="flex cursor-pointer items-center justify-between gap-3 rounded-xl px-2 py-1.5 text-xs">
                            <span className="flex min-w-0 items-center gap-2">
                              <input type="checkbox" checked={marcado} onChange={(e) => {
                                const base: Record<string, boolean> = {};
                                itemsSinPagar.forEach((x) => { base[x.idUnico] = haySeleccionManualPago ? !!seleccionadosPago[x.idUnico] : true; });
                                base[it.idUnico] = e.target.checked;
                                setSeleccionadosPago(base);
                              }} className="h-4 w-4 accent-[#78A997]" />
                              <span className="truncate font-bold text-[#594B56]">{it.productoNombre} ({it.goTitulo})</span>
                            </span>
                            <span className="shrink-0 font-black text-[#5B7466]">${it.precioTotal.toFixed(2)}</span>
                          </label>
                        );
                      })}
                    </div>
                    <input type="text" placeholder="Nombre del titular de la cuenta que transfiere" value={titularTransferencia} onChange={(e) => setTitularTransferencia(e.target.value)} className="w-full rounded-xl border border-[#DCE9E0] bg-white px-3 py-2.5 text-xs" />
                    <input type="number" step="0.01" value={montoAbono} onChange={(e) => setMontoAbono(e.target.value)} placeholder={'Monto a abonar (ej. ' + totalPendientePagar.toFixed(2) + ')'} className="w-full rounded-xl border border-[#DCE9E0] bg-white px-3 py-2.5 text-xs" />

                    <div className="rounded-2xl border border-[#DCE9E0] bg-white p-3 space-y-2">
                      <label className="block text-[11px] font-extrabold text-[#5B7466]">Adjuntar comprobante · Foto o PDF</label>
                      <input type="file" accept="image/*,application/pdf" onChange={(e) => { setComprobanteFile(e.target.files ? e.target.files.item(0) : null); setMensajeComprobante(''); }} className="block w-full text-[11px]" />
                      <button type="button" disabled={!comprobanteFile || subiendoComprobante || !importeValido} onClick={async () => {
                        if (!comprobanteFile || !importeValido) return;
                        const sessionResult = await supabase.auth.getSession();
                        const token = sessionResult.data.session?.access_token;
                        if (!token) { alert('Inicia sesión nuevamente.'); return; }
                        setSubiendoComprobante(true); setMensajeComprobante('');
                        try {
                          let archivoFinal: File | Blob = comprobanteFile;
                          let nombreFinal = comprobanteFile.name;
                          if (comprobanteFile.type.startsWith('image/')) {
                            try {
                              const bmp = await createImageBitmap(comprobanteFile);
                              const scale = bmp.width > 1400 ? 1400 / bmp.width : 1;
                              const canvas = document.createElement('canvas');
                              canvas.width = Math.round(bmp.width * scale);
                              canvas.height = Math.round(bmp.height * scale);
                              const ctx = canvas.getContext('2d');
                              if (ctx) {
                                ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
                                const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.82));
                                if (blob) { archivoFinal = blob; nombreFinal = 'comprobante.jpg'; }
                              }
                            } catch {}
                          }
                          const scopes = new Set(itemsAPagarHoy.map((i) => i.origen));
                          const resumenGos = Array.from(new Set(itemsAPagarHoy.map((i) => i.goTitulo))).join(' + ');
                          const form = new FormData();
                          form.append('file', archivoFinal, nombreFinal);
                          form.append('scope', scopes.has('GO') ? 'GO' : 'SHOP');
                          form.append('amount', String(importeTransferencia));
                          form.append('goTitle', resumenGos || 'Pedido hyuneatelier');
                          if (titularTransferencia.trim()) form.append('payerName', titularTransferencia.trim());
                          const response = await fetch('/api/proofs', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form });
                          const raw = await response.text();
                          let resJson: any = {};
                          try { resJson = JSON.parse(raw); } catch { throw new Error('Foto muy pesada o error de red. Intenta con captura de pantalla.'); }
                          if (!response.ok) throw new Error(resJson.error || 'No se pudo subir el comprobante.');
                          setMensajeComprobante('Comprobante recibido. Ya puedes avisarnos por WhatsApp ♡');
                          setComprobanteFile(null);
                        } catch (err: any) { setMensajeComprobante('⚠️ ' + (err?.message || 'Error al subir comprobante.')); } finally { setSubiendoComprobante(false); }
                      }} className="w-full rounded-xl bg-[#6EAA8D] px-4 py-2.5 text-xs font-black text-white disabled:opacity-50">
                        {subiendoComprobante ? 'Subiendo comprobante…' : '1. Subir comprobante privado'}
                      </button>
                      {mensajeComprobante && <p className="text-[11px] font-bold text-[#5B7466]">{mensajeComprobante}</p>}
                    </div>

                    {mensajeComprobante.includes('Comprobante recibido') && (
                      <a href={abrirChatLia('¡Hola, Lia! Ya subí mi comprobante de pago en hyuneatelier:\n• Nombre: ' + (nombreJoiner || usuarioEmail) + '\n• Titular: ' + (titularTransferencia || nombreJoiner || usuarioEmail) + '\n• Importe: $' + importeTransferencia.toFixed(2) + ' USD\n• Correo: ' + usuarioEmail)} className="flex w-full items-center justify-center rounded-xl bg-[#6EAA8D] px-4 py-3.5 text-xs font-black text-white">
                        💬 2. Avisar por WhatsApp · ${importeTransferencia.toFixed(2)}
                      </a>
                    )}
                  </section>
                )}
                <div className="space-y-4">
                  {grupos.map((grupo) => (
                    <article key={grupo.titulo} className="rounded-[26px] border border-[#EFDFE8] bg-white p-4 shadow-sm space-y-2">
                      <div className="flex justify-between items-center border-b border-[#F4EAF0] pb-2">
                        <h3 className="text-sm font-black text-[#594553]">{grupo.titulo}</h3>
                        <span className="text-sm font-black text-[#594553]">${grupo.totalGrupo.toFixed(2)} USD</span>
                      </div>
                      {grupo.items.map((item) => (
                        <div key={item.idUnico} className="flex items-center justify-between gap-3 py-2 text-xs">
                          <div>
                            <p className="font-black text-[#554451]">
  {item.productoNombre} {item.cantidad > 1 ? `(x${item.cantidad})` : ''}
</p>
                            <p className="text-[11px] text-[#B87595]">{item.detalleSlot} · {item.estadoPago}</p>
                          </div>
                          <span className="font-black">${item.precioTotal.toFixed(2)}</span>
                        </div>
                      ))}
                    </article>
                  ))}
                </div>
              </>
            ) : (
              <section className="rounded-[26px] border border-[#E4EDE7] bg-white p-4 sm:p-5 shadow-sm space-y-4">
                <h2 className="text-lg font-black text-[#435B4E]">📦 Mi bodega ({itemsPagadosEnBodega.length} listos)</h2>
                {itemsPagadosEnBodega.map((item) => {
                  const marcado = !!seleccionadosEnvio[item.idUnico];
                  return (
                    <label key={item.idUnico} className="flex cursor-pointer items-center gap-3 rounded-2xl border border-[#E9EEE9] p-3 text-xs">
                      <input type="checkbox" checked={marcado} onChange={(e) => setSeleccionadosEnvio((prev) => ({ ...prev, [item.idUnico]: e.target.checked }))} className="h-4 w-4 accent-[#78A997]" />
                      <span className="flex-1 font-bold">{item.productoNombre} ({item.goTitulo})</span>
                      <span className="rounded-full bg-[#E1F1E7] px-2.5 py-1 text-[9px] font-black text-[#54856D]">Listo ✓</span>
                    </label>
                  );
                })}
                {itemsPagadosEnCamino.length > 0 && (
                  <div className="pt-3 border-t space-y-1 text-xs text-zinc-500">
                    <p className="font-bold">En camino ({itemsPagadosEnCamino.length}):</p>
                    {itemsPagadosEnCamino.map((item) => <p key={item.idUnico}>✈️ {item.productoNombre} — {item.estadoLogistica}</p>)}
                  </div>
                )}
                {itemsPagadosEnBodega.length > 0 && (
                  <form onSubmit={handleSolicitarEnvioAcumulado} className="space-y-3 pt-4 border-t">
                    <input type="text" required placeholder="Nombre quien recibe *" value={envioNombre} onChange={(e) => setEnvioNombre(e.target.value)} className="w-full rounded-xl border px-3 py-2.5 text-xs" />
                    <input type="tel" required placeholder="Teléfono / WhatsApp *" value={envioTelefono} onChange={(e) => setEnvioTelefono(e.target.value)} className="w-full rounded-xl border px-3 py-2.5 text-xs" />
                    <input type="text" required placeholder="Ciudad / Provincia *" value={envioCiudad} onChange={(e) => setEnvioCiudad(e.target.value)} className="w-full rounded-xl border px-3 py-2.5 text-xs" />
                    <select value={envioMetodo} onChange={(e) => setEnvioMetodo(e.target.value)} className="w-full rounded-xl border px-3 py-2.5 text-xs font-bold">
                      <option value="Quito ($3.50)">Quito ($3.50)</option>
                      <option value="Provincias ($6.50)">Provincias ($6.50)</option>
                      <option value="Selva o Galápagos ($7.50)">Selva o Galápagos ($7.50)</option>
                    </select>
                    <textarea required rows={2} placeholder="Dirección exacta *" value={envioDireccion} onChange={(e) => setEnvioDireccion(e.target.value)} className="w-full rounded-xl border px-3 py-2.5 text-xs" />
                    <button type="submit" disabled={enviandoSolicitud || itemsMarcados.length === 0} className="w-full rounded-full bg-[#78A997] py-3.5 text-xs font-black uppercase text-white">
                      {enviandoSolicitud ? 'Enviando…' : 'Confirmar solicitud de envío ♡'}
                    </button>
                    {urlWhatsappEnvio && <a href={urlWhatsappEnvio} className="block text-center rounded-full bg-[#25D366] py-3.5 text-xs font-black uppercase text-white">💬 Abrir WhatsApp ➔</a>}
                  </form>
                )}
              </section>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
