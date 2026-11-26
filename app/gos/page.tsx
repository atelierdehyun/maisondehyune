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

  async function abrirGo(goId: number, forzarRecarga = false) {
    setGoSeleccionado(goId);
    const yaCargados = productos.filter((p) => Number(p.go_id) === Number(goId));
    if (yaCargados.length > 0 && !forzarRecarga) {
      setProductoSeleccionado(yaCargados.id);
      return;
    }
    const { data: dProds } = await supabase.from('productos').select('*').eq('go_id', goId);
    const lista = dProds || [];
    setProductos((prev) => [...prev.filter((p) => Number(p.go_id) !== Number(goId)), ...lista]);
    setProductoSeleccionado(lista.length > 0 ? lista.id : null);
  }
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
      const { data: dGos } = await supabase.from('gos').select('*');
      setGos(dGos || []);
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const goParam = Number(params.get('go'));
        if (goParam && dGos?.some((g: any) => Number(g.id) === goParam)) {
          await abrirGo(goParam);
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

  const activeGo = gos.find((g) => Number(g.id) === Number(goSeleccionado));
  const productosDelGo = productos.filter((p) => Number(p.go_id) === Number(goSeleccionado));
  const activeProducto = productos.find((p) => Number(p.id) === Number(productoSeleccionado)) || productosDelGo || null;
  function cambiarCantidadEnBolsa(prod: Producto, integrante: string, delta: number, stockDisponibles: number) {
    if (!usuarioEmail) {
      setMessage('Inicia sesión primero para apartar slots 🎀');
      return;
    }
    setMessage('');
    const keyUnica = prod.id + '-' + integrante;
    const goTitulo = gos.find((g) => Number(g.id) === Number(prod.go_id))?.title || 'Group Order';

    setCarritoGlobal((prev) => {
      const existe = prev.find((i) => i.keyUnica === keyUnica);
      if (existe) {
        const nuevaCant = existe.cantidad + delta;
        if (nuevaCant <= 0) return prev.filter((i) => i.keyUnica !== keyUnica);
        if (nuevaCant > stockDisponibles) return prev;
        return prev.map((i) => (i.keyUnica === keyUnica ? { ...i, cantidad: nuevaCant } : i));
      }
      if (delta <= 0 || stockDisponibles <= 0) return prev;
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
    try {
      const mailLimpio = usuarioEmail.toLowerCase().trim();
      const { firebaseAuth } = await import('@/lib/firebaseClient');
      await firebaseAuth.authStateReady();
      const token = await firebaseAuth.currentUser?.getIdToken();
      if (!token) throw new Error('Tu sesión expiró. Inicia sesión nuevamente.');

      const claimResponse = await fetch('/api/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          items: carritoGlobal.map((item) => ({
            productId: item.productoId,
            integrante: item.integrante,
            cantidad: item.cantidad,
            goTitulo: item.goTitulo,
            productoNombre: item.productoNombre,
          })),
          profile: {
            user_email: mailLimpio,
            nombre_completo: formNombre.trim(),
            usuario_red: '@' + formInstagram.replace('@', ''),
            telefono: formTelefono.trim(),
          },
        }),
      });
      const claimResult = await claimResponse.json();
      if (!claimResponse.ok) {
        alert(
          claimResult.error?.startsWith('OUT_OF_STOCK:')
            ? 'Ese slot ya no tiene suficientes unidades disponibles. Actualiza la página y vuelve a intentarlo.'
            : claimResult.error || 'No se pudo guardar tu claim.'
        );
        setProductos([]);
        if (goSeleccionado) await abrirGo(goSeleccionado, true);
        return;
      }

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

      const paramsWsp = new URLSearchParams({ phone: '593999530327', text: mensajeWsp });
      setDatosUltimoClaim({
        desglose: desgloseTexto,
        total: totalDineroBolsa,
        urlWhatsapp: 'https://whatsapp.com?' + paramsWsp.toString(),
      });

      setCarritoGlobal([]);
      setMostrarBolsa(false);
      setMostrarModuloPago(true);
      setProductos([]);
      if (goSeleccionado) await abrirGo(goSeleccionado, true);
    } catch (err: any) {
      alert(err?.message || 'No se pudo guardar tu claim.');
    } finally {
      setProcesando(false);
    }
  }
  async function handleCancelarClaimAdmin(prod: Producto, slotName: string, mail: string) {
    if (!confirm('¿Liberar este slot?')) return;
    const claimsCopia = { ...(prod.claims_integrantes || {}) };
    if (claimsCopia[slotName]) {
      delete claimsCopia[slotName][mail];
      if (Object.keys(claimsCopia[slotName]).length === 0) delete claimsCopia[slotName];
    }
    await supabase.from('productos').update({ claims_integrantes: claimsCopia }).eq('id', prod.id);
    setProductos([]);
    if (goSeleccionado) await abrirGo(goSeleccionado, true);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFF0F4] flex items-center justify-center font-sans text-xs text-[#A66C8D]">
        ✧ preparando tus Group Orders... 🧸
      </div>
    );
  }

  const slotsDisponiblesList = activeProducto
    ? (activeProducto.lista_slots || '').split(',').map((s) => s.trim()).filter(Boolean)
    : [];
  const slotsFinales = slotsDisponiblesList.length > 0 ? slotsDisponiblesList : Object.keys(activeProducto?.stock_slots || {});

  return (
    <div className="min-h-screen bg-[#FFF0F4] font-sans text-[#594653] pb-32">
      <div className="bg-white/90 border-b border-[#F1D8E5] px-4 py-3 sticky top-0 z-30 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto flex flex-wrap justify-between items-center gap-2">
          <div className="flex items-center gap-3">
            <Link href="/shop" className="text-xs font-bold text-[#A66C8D] hover:text-[#D45D98]">🛍️ Ir a Tienda</Link>
            <Link href="/mi-escritorio" className="text-xs font-bold text-[#A66C8D] hover:text-[#D45D98]">👤 Mi Cuenta</Link>
            {usuarioEmail === correoAdmin && <Link href="/admin" className="text-xs font-bold text-[#8A78AE]">👑 Admin</Link>}
          </div>
          <button type="button" onClick={() => setMostrarBolsa(true)} className="bg-[#D96B9F] hover:bg-[#C85B90] text-white text-xs font-extrabold px-4 py-2 rounded-full flex items-center gap-2 shadow-2xs">
            <span>🧸 Mis Claims ({totalUnidadesBolsa})</span>
            <span className="bg-white text-[#C85B90] px-2 py-0.5 rounded-full text-[11px]">${totalDineroBolsa.toFixed(2)}</span>
          </button>
        </div>
      </div>
      <div className="mx-auto max-w-5xl px-4 pt-6 pb-2">
        <div className="rounded-[26px] border border-[#F0D7E4] bg-gradient-to-r from-[#FCEAF2] via-white to-[#F0F8F4] px-5 py-5 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#C47A9C]">hyuneatelier · comunidad</p>
          <h1 className="mt-1 text-2xl font-black text-[#493744] sm:text-3xl">Group Orders <span className="text-[#D889AA]">♡</span></h1>
          <p className="mt-1 text-xs leading-5 text-[#806B79]">Encuentra tu catálogo, elige tus integrantes y reúne tus claims en un solo lugar.</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 pt-6">
        {!goSeleccionado ? (
          <div className="bg-white/95 border border-[#F0D7E4] rounded-[28px] p-5 sm:p-6 shadow-sm space-y-5">
            <div className="flex flex-wrap justify-between items-center gap-3">
              <div>
                <h1 className="text-xl font-black text-[#493744]">Group Orders disponibles</h1>
                <p className="text-xs text-[#8D7885]">Explora los catálogos, elige tus integrantes y reúne todos tus slots en una sola confirmación ✨</p>
              </div>
              <div className="flex gap-1.5 bg-[#FFF0F5] p-1 rounded-xl border border-[#F4DCE8]">
                {(['stray kids', 'enhypen', 'otros'] as const).map((b) => (
                  <button key={b} type="button" onClick={() => setBandaSeleccionada(b)} className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold uppercase ${bandaSeleccionada === b ? 'bg-[#D96B9F] text-white shadow-sm' : 'text-[#A78D9B]'}`}>
                    {b}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 min-[420px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
              {gosFiltrados.map((g) => (
                <button key={g.id} type="button" onClick={() => abrirGo(g.id)} className="min-w-0 h-full p-3 sm:p-4 rounded-2xl border border-[#F3DFE9] text-left bg-white hover:border-[#E5A9C5] hover:shadow-md transition-all flex flex-col gap-3">
                  <div className="w-full aspect-[4/3] bg-[#FFF7FA] rounded-xl flex items-center justify-center p-2 border border-pink-50">
                    {g.imagen_general ? <img src={g.imagen_general} alt={g.title} className="block w-full h-full object-contain" /> : <span className="text-xs text-zinc-300 font-bold">Sin fotografía</span>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-black uppercase text-zinc-900 leading-snug break-words">{g.title}</p>
                    <p className="text-[10px] text-[#D96B9F] font-bold mt-1">Ver catálogo →</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            <div className="md:col-span-5 flex flex-col gap-3">
              <button type="button" onClick={() => { setGoSeleccionado(null); setProductoSeleccionado(null); }} className="w-full py-2.5 bg-white text-[#725D6B] font-bold text-xs uppercase rounded-xl border border-[#EEDCE6]">
                ⬅️ Ver otros catálogos
              </button>
              <div className="bg-white rounded-2xl p-4 border border-[#EEDCE6]/80 flex flex-col gap-3 shadow-2xs">
                <div className="w-full min-h-[220px] max-h-[440px] bg-[#FFF9FC] rounded-xl flex items-center justify-center p-3 border overflow-hidden">
                  {(activeProducto?.imagen_producto || activeGo?.imagen_general) && <img src={activeProducto?.imagen_producto || activeGo?.imagen_general || ''} alt="" className="block w-full h-full max-h-[400px] object-contain rounded-lg" />}
                </div>
                <div>
                  <span className="bg-[#D96B9F] text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase">{activeGo?.status || 'ABIERTO'}</span>
                  <h3 className="text-base font-black text-[#594653] uppercase mt-1">{activeGo?.title}</h3>
                  {activeProducto?.descripcion && <p className="text-xs text-zinc-600 bg-[#FFF9FC] p-3 rounded-xl border mt-2 whitespace-pre-line">{activeProducto.descripcion}</p>}
                </div>
              </div>
              {message && <p className="text-xs font-bold text-center text-[#C85B90] bg-[#FFF0F5] py-2 rounded-xl border border-[#F0D0E0]">{message}</p>}
            </div>
            <div className="md:col-span-7 flex flex-col gap-4">
              <div className="bg-white border border-[#EEDCE6]/80 rounded-2xl p-4 space-y-3 shadow-2xs">
                <p className="text-[11px] font-bold text-[#A995A1] uppercase">Productos de este GO</p>
                <div className="flex flex-wrap gap-2">
                  {productosDelGo.map((p) => (
                    <button key={p.id} type="button" onClick={() => setProductoSeleccionado(p.id)} className={`px-3 py-2 rounded-xl text-xs font-extrabold border ${Number(activeProducto?.id) === Number(p.id) ? 'bg-[#D96B9F] text-white shadow-sm border-zinc-950' : 'bg-[#FFF9FC] text-[#725D6B] border-[#EEDCE6]'}`}>
                      {p.nombre_producto} (${Number(p.precio).toFixed(2)})
                    </button>
                  ))}
                </div>
              </div>

              {activeProducto && (
                <div className="bg-white p-5 rounded-2xl border border-[#EEDCE6]/80 space-y-4 shadow-2xs">
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="text-xs font-extrabold text-[#594653] uppercase">Elige tus slots — {activeProducto.nombre_producto}</span>
                    <span className="text-xs font-black text-[#C85B90]">${Number(activeProducto.precio).toFixed(2)} USD c/u</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pr-1">
                    {slotsFinales.map((int) => {
                      const totalC = activeProducto.claims_integrantes?.[int] ? Object.values(activeProducto.claims_integrantes[int]).reduce((a, b) => a + Number(b || 0), 0) : 0;
                      const stockBase = activeProducto.stock_slots?.[int] ?? (activeProducto as any).cantidad_disponible ?? 0;
                      const stockD = Math.max(0, Number(stockBase) - totalC);
                      const enCarrito = carritoGlobal.find((i) => i.keyUnica === activeProducto.id + '-' + int)?.cantidad || 0;
                      return (
                        <div key={int} className="bg-[#FFF9FC]/70 p-3 rounded-xl border border-[#EEDCE6]/80 flex justify-between items-center">
                          <div>
                            <p className="text-xs font-black uppercase text-[#594653]">{int}</p>
                            <p className="text-[10px] font-mono text-[#A995A1]">Disponibles: {stockD}</p>
                          </div>
                          {stockD === 0 ? (
                            <span className="text-[10px] text-[#A995A1] font-bold bg-white border px-2.5 py-1 rounded-lg">🔒 AGOTADO</span>
                          ) : (
                            <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-xl border">
                              <button type="button" onClick={() => cambiarCantidadEnBolsa(activeProducto, int, -1, stockD)} className="font-black text-zinc-500 px-1">-</button>
                              <span className="font-bold font-mono text-[#C85B90] text-xs w-4 text-center">{enCarrito}</span>
                              <button type="button" onClick={() => cambiarCantidadEnBolsa(activeProducto, int, 1, stockD)} className="font-black text-[#C85B90] px-1">+</button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {totalUnidadesBolsa > 0 && (
                    <button type="button" onClick={() => setMostrarBolsa(true)} className="w-full py-3 bg-[#D96B9F] hover:bg-[#C85B90] text-white rounded-xl text-xs font-black uppercase">
                      🛒 Ver mis {totalUnidadesBolsa} claims y confirmar (${totalDineroBolsa.toFixed(2)} USD)
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {mostrarBolsa && (
        <div className="fixed inset-0 bg-[#D96B9F]/50 backdrop-blur-xs flex justify-end z-50">
          <div className="bg-white w-full max-w-md h-full overflow-y-auto p-5 flex flex-col justify-between shadow-2xl">
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b pb-3">
                <h3 className="text-base font-black text-zinc-900">🧸 Tu Carrito de Claims ({totalUnidadesBolsa})</h3>
                <button type="button" onClick={() => setMostrarBolsa(false)} className="text-[#A995A1] font-bold text-sm">✕</button>
              </div>
              {carritoGlobal.length === 0 ? (
                <p className="text-xs text-[#A995A1] text-center py-12">Aún no has agregado ningún slot 🌸</p>
              ) : (
                <>
                  <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                    {carritoGlobal.map((item) => (
                      <div key={item.keyUnica} className="flex items-center justify-between gap-2 bg-[#FFF9FC] border p-2.5 rounded-2xl text-xs">
                        <div className="truncate">
                          <p className="font-bold text-zinc-900 truncate">{item.productoNombre} — <span className="text-[#C85B90]">{item.integrante}</span> ({item.cantidad})</p>
                          <p className="font-extrabold text-[#725D6B]">${(item.precioUnitario * item.cantidad).toFixed(2)} USD</p>
                        </div>
                        <button type="button" onClick={() => setCarritoGlobal((prev) => prev.filter((x) => x.keyUnica !== item.keyUnica))} className="text-rose-500 font-bold text-xs px-2">✕</button>
                      </div>
                    ))}
                  </div>
                  <form onSubmit={handleConfirmarTodoElCarrito} className="space-y-2.5 border-t pt-3">
                    <input type="text" required placeholder="Nombre Completo" value={formNombre} onChange={(e) => setFormNombre(e.target.value)} className="border rounded-xl px-3 py-2 text-xs bg-[#FFF9FC] w-full" />
                    <input type="text" required placeholder="Instagram (sin @)" value={formInstagram} onChange={(e) => setFormInstagram(e.target.value)} className="border rounded-xl px-3 py-2 text-xs bg-[#FFF9FC] w-full font-bold text-[#C85B90]" />
                    <input type="tel" required placeholder="Teléfono / WhatsApp" value={formTelefono} onChange={(e) => setFormTelefono(e.target.value)} className="border rounded-xl px-3 py-2 text-xs bg-[#FFF9FC] w-full" />
                    <input type="text" required placeholder="Ciudad / Provincia" value={formCiudad} onChange={(e) => setFormCiudad(e.target.value)} className="border rounded-xl px-3 py-2 text-xs bg-[#FFF9FC] w-full" />
                    <input type="text" required placeholder="Dirección exacta" value={formDireccion} onChange={(e) => setFormDireccion(e.target.value)} className="border rounded-xl px-3 py-2 text-xs bg-[#FFF9FC] w-full" />
                    <select value={formMetodoEnvio} onChange={(e) => setFormMetodoEnvio(e.target.value)} className="border rounded-xl px-3 py-2 text-xs bg-[#FFF9FC] font-bold w-full">
                      <option value="Servientrega a Domicilio">🚚 Servientrega a Domicilio</option>
                      <option value="Retiro Físico en Cumbayá">🍰 Retiro Físico en Cumbayá</option>
                    </select>
                    <button type="submit" disabled={procesando} className="w-full py-3 bg-[#D96B9F] text-white font-black text-xs uppercase rounded-xl">
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
        <div className="fixed inset-0 bg-[#D96B9F]/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-[#F0D0E0] rounded-3xl p-6 max-w-md w-full space-y-3 shadow-xl text-center">
            <h4 className="text-sm font-black text-[#C85B90] uppercase">✨ ¡Tus apartados ya están registrados! 🐻</h4>
            <div className="bg-[#FFF9FC] p-4 rounded-2xl text-left text-xs space-y-1.5 text-[#725D6B] border">
              <p><strong>🏦 Banco Pichincha (Ahorros):</strong> #2213367970</p>
              <p><strong>👤 Titular:</strong> Isabel Revollar — <strong>CI:</strong> 1752806388</p>
              <p className="whitespace-pre-line text-[11px] bg-white p-2.5 rounded-lg border mt-1">{datosUltimoClaim.desglose}</p>
              <p className="text-sm font-black text-[#C85B90] pt-1">Total a transferir: ${datosUltimoClaim.total.toFixed(2)} USD</p>
            </div>
            <Link href="/mi-escritorio" className="w-full py-3 bg-[#D96B9F] text-white font-extrabold text-xs uppercase rounded-xl block">
              💳 Ir a Mi Cuenta para subir comprobante
            </Link>
            <button type="button" onClick={() => setMostrarModuloPago(false)} className="w-full py-2 text-xs font-bold text-[#A995A1]">
              Seguir viendo catálogos
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
