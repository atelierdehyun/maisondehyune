'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
const correoAdmin = 'liahwang1852@gmail.com';

type Go = {
  id: number;
  title: string;
  status: string;
  group_name: string;
  imagen_general: string | null;
};

type Producto = {
  id: number;
  go_id: number;
  nombre_producto: string;
  precio: number;
  lista_slots: string | null;
  imagen_producto: string | null;
  stock_slots: { [key: string]: number } | null;
  claims_integrantes: { [key: string]: { [email: string]: number } } | null;
  descripcion?: string;
};

type ItemCarritoGo = {
  keyUnica: string;
  productoId: number;
  goTitulo: string;
  productoNombre: string;
  imagenUrl: string | null;
  integrante: string;
  precioUnitario: number;
  cantidad: number;
};
export default function Masterlist() {
  const [bandaSeleccionada, setBandaSeleccionada] = useState<'stray kids' | 'enhypen' | 'otros'>('stray kids');
  const [gos, setGos] = useState<Go[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [usuarioEmail, setUsuarioEmail] = useState('');
  const [message, setMessage] = useState('');
  const [goSeleccionado, setGoSeleccionado] = useState<number | null>(null);
  const [productoSeleccionado, setProductoSeleccionado] = useState<number | null>(null);

  const [carritoGlobal, setCarritoGlobal] = useState<ItemCarritoGo[]>([]);
  const [mostrarBolsa, setMostrarBolsa] = useState(false);
  const [mostrarModuloPago, setMostrarModuloPago] = useState(false);
  const [datosUltimoClaim, setDatosUltimoClaim] = useState<any>(null);

  const [formNombre, setFormNombre] = useState('');
  const [formInstagram, setFormInstagram] = useState('');
  const [formTelefono, setFormTelefono] = useState('');
  const [formCiudad, setFormCiudad] = useState('');
  const [formDireccion, setFormDireccion] = useState('');
  const [formMetodoEnvio, setFormMetodoEnvio] = useState('Servientrega a Domicilio');
  const [procesando, setProcesando] = useState(false);

  async function inicializarPagina() {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) {
        const mail = session.user.email.toLowerCase().trim();
        setUsuarioEmail(mail);
        const { data: perfil } = await supabase
          .from('perfiles_joiners')
          .select('*')
          .eq('user_email', mail)
          .maybeSingle();
        if (perfil?.nombre_completo) setFormNombre(perfil.nombre_completo);
        if (perfil?.usuario_red) setFormInstagram(perfil.usuario_red.replace('@', ''));
        if (perfil?.telefono) setFormTelefono(perfil.telefono);
      }
      const [{ data: dGos }, { data: dProds }] = await Promise.all([
        supabase.from('gos').select('*'),
        supabase.from('productos').select('*'),
      ]);
      setGos(dGos || []);
      setProductos(dProds || []);
         if (typeof window !== 'undefined') {
     const params = new URLSearchParams(window.location.search);
     const goParam = Number(params.get('go'));
     if (goParam && dGos?.some((g: any) => g.id === goParam)) {
       setGoSeleccionado(goParam);
       const firstP = (dProds || []).find((p: any) => p.go_id === goParam);
       setProductoSeleccionado(firstP ? firstP.id : null);
     }
   }

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    inicializarPagina();
  }, []);
    const gosFiltrados = gos.filter((g) => {
      if (g.status === 'HIDDEN') return false;
    const n = (g.group_name || '').toLowerCase().replace(/\s+/g, '');
    return bandaSeleccionada === 'stray kids'
      ? n.includes('straykids') || n.includes('skz')
      : bandaSeleccionada === 'enhypen'
      ? n.includes('enhypen')
      : !n.includes('straykids') && !n.includes('skz') && !n.includes('enhypen');
  });


  const activeGo = gos.find((g) => g.id === goSeleccionado);
  const productosDelGo = productos.filter((p) => p.go_id === goSeleccionado);
  const activeProducto = productos.find((p) => p.id === productoSeleccionado);

  function cambiarCantidadEnBolsa(prod: Producto, integrante: string, delta: number, stockDisponibles: number) {
    if (!usuarioEmail) {
      setMessage('Inicia sesión primero para apartar slots 🎀');
      return;
    }
    setMessage('');
    const keyUnica = prod.id + '-' + integrante;
    const goTitulo = gos.find((g) => g.id === prod.go_id)?.title || 'Group Order';

    setCarritoGlobal((prev) => {
      const existe = prev.find((i) => i.keyUnica === keyUnica);
      if (existe) {
        const nuevaCant = existe.cantidad + delta;
        if (nuevaCant <= 0) return prev.filter((i) => i.keyUnica !== keyUnica);
        if (nuevaCant > stockDisp) return prev;
        return prev.map((i) => (i.keyUnica === keyUnica ? { ...i, cantidad: nuevaCant } : i));
      }
      if (delta <= 0 || stockDisp <= 0) return prev;
      return [
        ...prev,
        {
          keyUnica,
          productoId: prod.id,
          goTitulo,
          productoNombre: prod.nombre_producto,
          imagenUrl: prod.imagen_producto || null,
          integrante,
          precioUnitario: Number(prod.precio || 0),
          cantidad: 1,
        },
      ];
    });
  }

  const totalUnidadesBolsa = carritoGlobal.reduce((acc, i) => acc + i.cantidad, 0);
  const totalDineroBolsa = carritoGlobal.reduce((acc, i) => acc + i.precioUnitario * i.cantidad, 0);
  async function handleConfirmarTodoElCarrito(e: React.FormEvent) {
    e.preventDefault();
    if (!usuarioEmail) return alert('Inicia sesión primero 🎀');
    if (carritoGlobal.length === 0) return;
    if (!formNombre || !formInstagram || !formTelefono || !formCiudad || !formDireccion) {
      return alert('Completa todos tus datos de envío e Instagram 🧸🌸');
    }

    setProcesando(true);
    const mailLimpio = usuarioEmail.toLowerCase().trim();

    const porProducto: Record<number, ItemCarritoGo[]> = {};
    carritoGlobal.forEach((item) => {
      if (!porProducto[item.productoId]) porProducto[item.productoId] = [];
      porProducto[item.productoId].push(item);
    });

    const ahoraIso = new Date().toISOString();

    for (const [prodIdStr, itemsProd] of Object.entries(porProducto)) {
      const prodId = Number(prodIdStr);
      const { data: prodActual } = await supabase.from('productos').select('claims_integrantes').eq('id', prodId).single();
      const claimsActuales = { ...(prodActual?.claims_integrantes || {}) };

      for (const it of itemsProd) {
        const slotActual = typeof claimsActuales[it.integrante] === 'object' && claimsActuales[it.integrante] !== null
          ? { ...claimsActuales[it.integrante] }
          : {};
        slotActual[mailLimpio] = (Number(slotActual[mailLimpio]) || 0) + it.cantidad;
        claimsActuales[it.integrante] = slotActual;

        await supabase.from('seguimiento_claims').upsert({
          claim_key: prodId + '-' + it.integrante,
          user_email: mailLimpio,
          go_title: it.goTitulo,
          producto_nombre: it.productoNombre,
          integrante: it.integrante,
          estado_confirmacion: 'Pendiente',
          estado_pago: 'Sin pagar',
          created_at: ahoraIso,
        });
      }

      await supabase.from('productos').update({ claims_integrantes: claimsActuales }).eq('id', prodId);
    }

    await supabase.from('perfiles_joiners').upsert({
      user_email: mailLimpio,
      nombre_completo: formNombre.trim(),
      usuario_red: '@' + formInstagram.replace('@', ''),
      telefono: formTelefono.trim(),
    });

    const desgloseTexto = carritoGlobal
      .map((i) => '• [' + i.goTitulo + '] ' + i.productoNombre + ' — ' + i.integrante + ' (' + i.cantidad + ' und): $' + (i.precioUnitario * i.cantidad).toFixed(2))
      .join('\n');

    const mensajeWsp =
      '¡Holis, Lia! Acabo de apartar slots en la web 🐻✨\n\n' +
      '💌 *Joiner:* ' + formNombre + ' (@' + formInstagram.replace('@', '') + ')\n' +
      '📱 *Contacto:* ' + formTelefono + '\n' +
      '📍 *Destino:* ' + formCiudad + ' — ' + formDireccion + '\n' +
      '🚚 *Método:* ' + formMetodoEnvio + '\n\n' +
      '📋 *Desglose de slots:*\n' + desgloseTexto + '\n\n' +
      '💰 *Total a pagar:* $' + totalDineroBolsa.toFixed(2) + ' USD\n\n' +
      'Confirmo que sigo a @hyuneatelier y adjunto mi comprobante por aquí. 💗';

    setDatosUltimoClaim({
      desglose: desgloseTexto,
      total: totalDineroBolsa,
      urlWhatsapp: 'https://wa.me/593999530327?text=' + encodeURIComponent(mensajeWsp),
    });

    setCarritoGlobal([]);
    setMostrarBolsa(false);
    setMostrarModuloPago(true);
    setProcesando(false);
    inicializarPagina();
  }

  async function handleCancelarClaimAdmin(prod: Producto, slotName: string, mail: string) {
    if (!confirm('¿Liberar este slot?')) return;
    const claimsCopia = { ...(prod.claims_integrantes || {}) };
    if (claimsCopia[slotName]) {
      delete claimsCopia[slotName][mail];
      if (Object.keys(claimsCopia[slotName]).length === 0) delete claimsCopia[slotName];
    }
    await supabase.from('productos').update({ claims_integrantes: claimsCopia }).eq('id', prod.id);
    inicializarPagina();
  }
  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F9] flex items-center justify-center font-mono text-xs text-zinc-400">
        ✧ preparando tus Group Orders... 🧸
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F9] font-sans text-zinc-800 pb-20">
      <div className="bg-white border-b border-zinc-200/80 px-4 py-3 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto flex flex-wrap justify-between items-center gap-2">
          <div className="flex items-center gap-3">
            <Link href="/shop" className="text-xs font-bold text-zinc-600 hover:text-pink-600">🛍️ Ir a Tienda</Link>
            <Link href="/mi-escritorio" className="text-xs font-bold text-zinc-600 hover:text-pink-600">👤 Mi Cuenta</Link>
            {usuarioEmail === correoAdmin && <Link href="/admin" className="text-xs font-bold text-purple-600">👑 Admin</Link>}
          </div>

          <button type="button" onClick={() => setMostrarBolsa(true)} className="bg-pink-600 hover:bg-pink-700 text-white text-xs font-extrabold px-4 py-2 rounded-full flex items-center gap-2 shadow-2xs">
            <span>🧸 Mis Claims ({totalUnidadesBolsa})</span>
            <span className="bg-white text-pink-600 px-2 py-0.5 rounded-full text-[11px]">${totalDineroBolsa.toFixed(2)}</span>
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 pt-6">
        {!goSeleccionado ? (
          <div className="bg-white border border-zinc-200/80 rounded-3xl p-6 shadow-2xs space-y-5">
            <div className="flex flex-wrap justify-between items-center gap-3">
              <div>
                <h1 className="text-xl font-black uppercase text-zinc-900">Group Orders disponibles</h1>
                <p className="text-xs text-zinc-500">Explora los catálogos, elige tus integrantes y reúne todos tus slots en una sola confirmación ✨</p>
              </div>
              <div className="flex gap-1.5 bg-zinc-100 p-1 rounded-xl">
                {(['stray kids', 'enhypen', 'otros'] as const).map((b) => (
                  <button key={b} type="button" onClick={() => setBandaSeleccionada(b)} className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold uppercase ${bandaSeleccionada === b ? 'bg-zinc-950 text-white' : 'text-zinc-500'}`}>
                    {b}
                  </button>
                ))}
              </div>
            </div>

            {gosFiltrados.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-pink-200 bg-pink-50/50 px-5 py-10 text-center sm:col-span-3 md:col-span-4">
                <p className="text-2xl mb-2">🧸</p>
                <p className="text-sm font-extrabold text-zinc-800">No hay catálogos disponibles en esta categoría</p>
                <p className="text-xs text-zinc-500 mt-1">Prueba otra pestaña para ver más Group Orders.</p>
              </div>
            ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {gosFiltrados.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => {
                    setGoSeleccionado(g.id);
                    const firstP = productos.find((p) => p.go_id === g.id);
                    setProductoSeleccionado(firstP ? firstP.id : null);
                  }}
                  className="p-3.5 sm:p-4 rounded-2xl border border-pink-100 text-left bg-white hover:border-pink-300 hover:shadow-md transition-all flex flex-col justify-between focus:outline-none focus:ring-2 focus:ring-pink-200"
                >
                  <div className="w-full h-36 sm:h-40 bg-[#FAF8F9] rounded-xl flex items-center justify-center overflow-hidden mb-3 border border-pink-50">
                    {g.imagen_general ? <img src={g.imagen_general} alt="GO" className="max-h-full max-w-full object-contain" /> : <span className="text-xs text-zinc-300 font-bold">Sin fotografía</span>}
                  </div>
                  <p className="text-xs sm:text-sm font-black uppercase text-zinc-900 line-clamp-2 leading-snug">{g.title}</p>
                </button>
              ))}
            </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            <div className="md:col-span-5 flex flex-col gap-3">
              <button type="button" onClick={() => { setGoSeleccionado(null); setProductoSeleccionado(null); }} className="w-full py-2.5 bg-white text-zinc-700 font-bold text-xs uppercase rounded-xl border border-zinc-200 hover:border-pink-300">
                ⬅️ Ver otros catálogos (tu carrito se mantiene)
              </button>
              <div className="bg-white rounded-2xl p-4 border border-zinc-200/80 flex flex-col gap-3 shadow-2xs">
                <div className="w-full h-52 bg-zinc-50 rounded-xl flex items-center justify-center p-2 border">
                  <img src={activeProducto?.imagen_producto || activeGo?.imagen_general || ''} alt="Preview" className="max-h-full object-contain rounded-lg" />
                </div>
                <div>
                  <span className="bg-pink-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase">{activeGo?.status || 'ABIERTO'}</span>
                  <h3 className="text-base font-black text-zinc-900 uppercase mt-1">{activeGo?.title}</h3>
                  <button
  type="button"
  onClick={() => {
    const urlGo = window.location.origin + '/gos?go=' + activeGo?.id;
    navigator.clipboard.writeText(urlGo);
    alert('🔗 ¡Link directo de este GO copiado! Listo para pegar en tus historias ✨\n\n' + urlGo);
  }}
  className="mt-2 inline-flex items-center gap-1.5 bg-pink-50 hover:bg-pink-100 text-pink-700 border border-pink-200 text-[11px] font-extrabold px-3 py-1.5 rounded-xl"
>
  🔗 Copiar link directo de este GO
</button>

                  {activeProducto?.descripcion && <p className="text-xs text-zinc-600 bg-zinc-50 p-3 rounded-xl border mt-2 whitespace-pre-line">{activeProducto.descripcion}</p>}
                </div>
              </div>
              {message && <p className="text-xs font-bold text-center text-pink-600 bg-pink-50 py-2 rounded-xl border border-pink-200">{message}</p>}
            </div>

            <div className="md:col-span-7 flex flex-col gap-4">
              <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 space-y-3 shadow-2xs">
                <p className="text-[11px] font-bold text-zinc-400 uppercase">Productos de este GO</p>
                <div className="flex flex-wrap gap-2">
                  {productosDelGo.map((p) => (
                    <button key={p.id} type="button" onClick={() => setProductoSeleccionado(p.id)} className={`px-3 py-2 rounded-xl text-xs font-extrabold border ${productoSeleccionado === p.id ? 'bg-zinc-950 text-white border-zinc-950' : 'bg-zinc-50 text-zinc-700 border-zinc-200'}`}>
                      {p.nombre_producto} (${p.precio})
                    </button>
                  ))}
                </div>
              </div>

              {activeProducto && (
                <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 space-y-4 shadow-2xs">
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="text-xs font-extrabold text-zinc-900 uppercase">Elige tus slots — {activeProducto.nombre_producto}</span>
                    <span className="text-xs font-black text-pink-600">${activeProducto.precio} USD c/u</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[320px] overflow-y-auto pr-1">
                    {activeProducto.lista_slots?.split(',').map((s) => s.trim()).map((int) => {
                      const totalC = activeProducto.claims_integrantes?.[int] ? Object.values(activeProducto.claims_integrantes[int]).reduce((a, b) => a + b, 0) : 0;
                      const stockD = Math.max(0, (activeProducto.stock_slots?.[int] ?? 0) - totalC);
                      const enCarrito = carritoGlobal.find((i) => i.keyUnica === activeProducto.id + '-' + int)?.cantidad || 0;
                      return (
                        <div key={int} className="bg-zinc-50/70 p-3 rounded-xl border border-zinc-200/80 flex justify-between items-center">
                          <div>
                            <p className="text-xs font-black uppercase text-zinc-800">{int}</p>
                            <p className="text-[10px] font-mono text-zinc-400">Disponibles: {stockD}</p>
                          </div>
                          {stockD === 0 ? (
                            <span className="text-[10px] text-zinc-400 font-bold bg-white border px-2.5 py-1 rounded-lg">🔒 AGOTADO</span>
                          ) : (
                            <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-xl border">
                              <button type="button" onClick={() => cambiarCantidadEnBolsa(activeProducto, int, -1, stockD)} className="font-black text-zinc-500 px-1">-</button>
                              <span className="font-bold font-mono text-pink-600 text-xs w-4 text-center">{enCarrito}</span>
                              <button type="button" onClick={() => cambiarCantidadEnBolsa(activeProducto, int, 1, stockD)} className="font-black text-pink-600 px-1">+</button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {totalUnidadesBolsa > 0 && (
                    <button type="button" onClick={() => setMostrarBolsa(true)} className="w-full py-3 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-black uppercase">
                      🛒 Ver mis {totalUnidadesBolsa} claims y confirmar (${totalDineroBolsa.toFixed(2)} USD)
                    </button>
                  )}
                </div>
              )}

              {usuarioEmail === correoAdmin && activeProducto?.claims_integrantes && Object.keys(activeProducto.claims_integrantes).length > 0 && (
                <div className="bg-white border rounded-2xl p-4 space-y-2">
                  <h3 className="text-[11px] font-bold text-zinc-400 uppercase text-center">Panel de administración 👑</h3>
                  {Object.keys(activeProducto.claims_integrantes).map((sName) =>
                    Object.entries(activeProducto.claims_integrantes?.[sName] || {}).map(([mail, cant]) => (
                      <div key={sName + '-' + mail} className="bg-zinc-50 border rounded-xl p-2.5 flex justify-between items-center text-xs">
                        <div>
                          <p className="font-bold uppercase text-zinc-800">Slot: {sName}</p>
                          <p className="text-zinc-500 font-mono text-[10px]">{mail} ({cant} und)</p>
                        </div>
                        <button type="button" onClick={() => handleCancelarClaimAdmin(activeProducto, sName, mail)} className="text-[10px] bg-rose-100 text-rose-700 font-bold px-2.5 py-1 rounded-lg">Liberar</button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      {mostrarBolsa && (
        <div className="fixed inset-0 bg-zinc-950/50 backdrop-blur-xs flex justify-end z-50">
          <div className="bg-white w-full max-w-md h-full overflow-y-auto p-5 flex flex-col justify-between shadow-2xl">
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b pb-3">
                <h3 className="text-base font-black text-zinc-900">🧸 Tu Carrito de Claims ({totalUnidadesBolsa})</h3>
                <button type="button" onClick={() => setMostrarBolsa(false)} className="text-zinc-400 hover:text-zinc-800 font-bold text-sm">✕</button>
              </div>

              {carritoGlobal.length === 0 ? (
                <p className="text-xs text-zinc-400 text-center py-12">Aún no has agregado ningún slot 🌸</p>
              ) : (
                <>
                  <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                    {carritoGlobal.map((item) => (
                      <div key={item.keyUnica} className="flex items-center justify-between gap-2 bg-zinc-50 border border-zinc-200/80 p-2.5 rounded-2xl text-xs">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {item.imagenUrl ? <img src={item.imagenUrl} alt="" className="w-11 h-11 rounded-xl object-cover border shrink-0" /> : <span className="w-11 h-11 rounded-xl bg-white flex items-center justify-center shrink-0">🧸</span>}
                          <div className="truncate">
                            <p className="text-[10px] font-bold text-zinc-400 truncate">{item.goTitulo}</p>
                            <p className="font-bold text-zinc-900 truncate">{item.productoNombre} — <span className="text-pink-600">{item.integrante}</span></p>
                            <p className="font-extrabold text-zinc-700">${(item.precioUnitario * item.cantidad).toFixed(2)} USD</p>
                          </div>
                        </div>
                        <button type="button" onClick={() => setCarritoGlobal((prev) => prev.filter((x) => x.keyUnica !== item.keyUnica))} className="text-rose-500 font-bold text-xs px-2">✕</button>
                      </div>
                    ))}
                  </div>

                  <form onSubmit={handleConfirmarTodoElCarrito} className="space-y-2.5 border-t pt-3">
                    <p className="text-[11px] font-bold uppercase text-zinc-400">Tus datos de compra</p>
                    <div className="grid grid-cols-2 gap-2">
                      <input type="text" required placeholder="Nombre Completo" value={formNombre} onChange={(e) => setFormNombre(e.target.value)} className="border rounded-xl px-3 py-2 text-xs bg-zinc-50" />
                      <input type="text" required placeholder="Instagram (sin @)" value={formInstagram} onChange={(e) => setFormInstagram(e.target.value)} className="border rounded-xl px-3 py-2 text-xs bg-zinc-50 font-bold text-pink-600" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input type="tel" required placeholder="Teléfono / WhatsApp" value={formTelefono} onChange={(e) => setFormTelefono(e.target.value)} className="border rounded-xl px-3 py-2 text-xs bg-zinc-50" />
                      <input type="text" required placeholder="Ciudad / Provincia" value={formCiudad} onChange={(e) => setFormCiudad(e.target.value)} className="border rounded-xl px-3 py-2 text-xs bg-zinc-50" />
                    </div>
                    <input type="text" required placeholder="Dirección exacta" value={formDireccion} onChange={(e) => setFormDireccion(e.target.value)} className="border rounded-xl px-3 py-2 text-xs bg-zinc-50 w-full" />
                    <select value={formMetodoEnvio} onChange={(e) => setFormMetodoEnvio(e.target.value)} className="border rounded-xl px-3 py-2 text-xs bg-zinc-50 font-bold w-full">
                      <option value="Servientrega a Domicilio">🚚 Servientrega a Domicilio</option>
                      <option value="Retiro Físico en Cumbayá">🍰 Retiro Físico en Cumbayá</option>
                    </select>
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-[11px] text-amber-900 font-semibold">
                      ⚠️ Importante: Si no me sigues en Instagram <strong>@hyuneatelier</strong>, no tomaré en cuenta el pedido, ya que es necesario para proofs.
                    </div>
                    <div className="bg-pink-50/80 border border-pink-200 rounded-2xl p-3.5 flex justify-between items-center text-sm font-black">
                      <span>Total a transferir:</span>
                      <span className="text-pink-600">${totalDineroBolsa.toFixed(2)} USD</span>
                    </div>
                    <button type="submit" disabled={procesando} className="w-full py-3 bg-zinc-950 hover:bg-zinc-800 text-white font-black text-xs uppercase rounded-xl">
                      {procesando ? 'Guardando claims...' : '🔒 Confirmar mis apartados ($' + totalDineroBolsa.toFixed(2) + ')'}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {mostrarModuloPago && datosUltimoClaim && (
        <div className="fixed inset-0 bg-zinc-950/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-pink-200 rounded-3xl p-6 max-w-md w-full space-y-3 shadow-xl text-center">
            <h4 className="text-sm font-black text-pink-600 uppercase">✨ ¡Tus apartados están registrados! 🐻</h4>
            <div className="bg-zinc-50 p-4 rounded-2xl text-left text-xs space-y-1.5 text-zinc-700 border">
              <p><strong>🏦 Banco Pichincha (Ahorros):</strong> #2213367970</p>
              <p><strong>👤 Titular:</strong> Isabel Revollar — <strong>CI:</strong> 1752806388</p>
              <p className="whitespace-pre-line text-[11px] bg-white p-2.5 rounded-lg border mt-1">{datosUltimoClaim.desglose}</p>
              <p className="text-sm font-black text-pink-600 pt-1">Total a transferir: ${datosUltimoClaim.total.toFixed(2)} USD</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-[11px] text-amber-900 font-semibold">
              ⚠️ Importante: Si no me sigues en Instagram <strong>@hyuneatelier</strong>, no tomaré en cuenta el pedido, ya que es una regla obligatoria.
            </div>
            <a
              href={datosUltimoClaim.urlWhatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase rounded-xl block"
            >
              💬 Enviar comprobante por WhatsApp 🍰
            </a>
            <button
              type="button"
              onClick={() => setMostrarModuloPago(false)}
              className="w-full py-2 text-xs font-bold text-zinc-400 hover:text-zinc-700"
            >
              Cerrar ventana
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
