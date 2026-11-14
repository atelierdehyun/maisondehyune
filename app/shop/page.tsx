'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
const NUMERO_WHATSAPP = '593999530327';

const PRECIOS_ENVIO = {
  quito: 3.5,
  provincia: 6.5,
  peru: 0.0,
};

interface ProductoShop {
  id: number;
  nombre_producto: string;
  precio: number;
  descripcion: string | null;
  estado_pago: string;
  due_date: string;
  grupo?: string | null;
  integrante?: string | null;
  categoria?: string | null;
  imagen_producto: string | null;
  fotos_extra?: string[] | null;
  cantidad_disponible: number;
}

interface ItemCarrito {
  producto: ProductoShop;
  cantidad: number;
}

export default function AtelierShop() {
  const [productos, setProductos] = useState<ProductoShop[]>([]);
  const [filtroGrupo, setFiltroGrupo] = useState<string>('TODOS');
  const [filtroIntegrante, setFiltroIntegrante] = useState<string>('TODOS');
  const [filtroTipo, setFiltroTipo] = useState<string>('TODOS');
  const [busqueda, setBusqueda] = useState('');
  const [loading, setLoading] = useState(true);
  const [usuarioEmail, setUsuarioEmail] = useState('');

  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
  const [mostrarCarrito, setMostrarCarrito] = useState(false);
  const [productoDetalle, setProductoDetalle] = useState<ProductoShop | null>(null);
  const [fotoActivaDetalle, setFotoActivaDetalle] = useState<string>('');
  const [formNombre, setFormNombre] = useState('');
  const [formInstagram, setFormInstagram] = useState('');
  const [formTelefono, setFormTelefono] = useState('');
  const [formCiudad, setFormCiudad] = useState('');
  const [formDireccion, setFormDireccion] = useState('');
  const [formMetodoEnvio, setFormMetodoEnvio] = useState('quito');
  const [datosExito, setDatosExito] = useState<any>(null);

  async function cargarTienda() {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) setUsuarioEmail(session.user.email);

      const { data, error } = await supabase
        .from('tienda_productos')
        .select('*')
        .order('id', { ascending: false });
      if (error) throw error;
      setProductos(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargarTienda();
  }, []);

  const gruposUnicos = Array.from(new Set(productos.map((p) => (p.grupo || p.due_date || 'Otros').toUpperCase())));
  const integrantesUnicos = Array.from(new Set(productos.map((p) => p.integrante || 'Grupal / Todos')));
  const tiposUnicos = Array.from(new Set(productos.map((p) => p.categoria || 'Merch')));

  const productosFiltrados = productos.filter((p) => {
    const grupoProd = (p.grupo || p.due_date || 'Otros').toUpperCase();
    const integProd = p.integrante || 'Grupal / Todos';
    const tipoProd = p.categoria || 'Merch';
    if (filtroGrupo !== 'TODOS' && grupoProd !== filtroGrupo) return false;
    if (filtroIntegrante !== 'TODOS' && integProd !== filtroIntegrante) return false;
    if (filtroTipo !== 'TODOS' && tipoProd !== filtroTipo) return false;
    if (busqueda && !p.nombre_producto.toLowerCase().includes(busqueda.toLowerCase())) return false;
    return true;
  });
  function agregarAlCarrito(prod: ProductoShop) {
    if (!usuarioEmail) {
      return alert('Inicia sesión primero para agregar productos al carrito 🎀');
    }
    setCarrito((prev) => {
      const existe = prev.find((i) => i.producto.id === prod.id);
      if (existe) {
        if (existe.cantidad >= prod.cantidad_disponible) {
          alert('Ya agregaste el máximo stock disponible de este artículo 🌸');
          return prev;
        }
        return prev.map((i) =>
          i.producto.id === prod.id ? { ...i, cantidad: i.cantidad + 1 } : i
        );
      }
      return [...prev, { producto: prod, cantidad: 1 }];
    });
    setProductoDetalle(null);
    setMostrarCarrito(true);
  }

  function cambiarCantidadCarrito(prodId: number, delta: number) {
    setCarrito((prev) =>
      prev
        .map((item) => {
          if (item.producto.id !== prodId) return item;
          const nuevaCant = item.cantidad + delta;
          if (nuevaCant > item.producto.cantidad_disponible) return item;
          return { ...item, cantidad: nuevaCant };
        })
        .filter((item) => item.cantidad > 0)
    );
  }

  const totalItemsCarrito = carrito.reduce((acc, i) => acc + i.cantidad, 0);
  const subtotalCarrito = carrito.reduce((acc, i) => acc + Number(i.producto.precio) * i.cantidad, 0);
  const costoEnvioActual = PRECIOS_ENVIO[formMetodoEnvio as keyof typeof PRECIOS_ENVIO] || 0;
  const totalFinalCarrito = subtotalCarrito + costoEnvioActual;
  async function procesarPedidoCarrito(e: React.FormEvent) {
    e.preventDefault();
    if (carrito.length === 0) return;
    if (!formNombre || !formInstagram || !formTelefono || !formCiudad || !formDireccion) {
      return alert('Completa todos los datos de envío e Instagram 🧸🌸');
    }

    setLoading(true);

    for (const item of carrito) {
      const nuevoStock = Math.max(0, item.producto.cantidad_disponible - item.cantidad);
      const nuevoEstado = nuevoStock === 0 ? 'SOLD OUT' : item.producto.estado_pago;
      await supabase
        .from('tienda_productos')
        .update({ cantidad_disponible: nuevoStock, estado_pago: nuevoEstado })
        .eq('id', item.producto.id);
    }

    const resumenArticulos = carrito
      .map((i) => `${i.cantidad}x ${i.producto.nombre_producto} ($${(Number(i.producto.precio) * i.cantidad).toFixed(2)})`)
      .join(' + ');

    const primeraFoto = carrito.at(0)?.producto.imagen_producto || null;

    await Promise.all([
      supabase.from('pedidos').insert([
        {
          user_email: usuarioEmail.toLowerCase().trim(),
          tipo_servicio: 'SHOP',
          producto_nombre: resumenArticulos,
          imagen_producto: primeraFoto,
          total_pagar: totalFinalCarrito,
          estado_pago: 'Sin pagar',
          estado_confirmacion: 'Pendiente',
          detalles: `IG: @${formInstagram} | Tlf: ${formTelefono} | Nombre: ${formNombre} | Ciudad: ${formCiudad} | Dir: ${formDireccion} | Envío: ${formMetodoEnvio.toUpperCase()} ($${costoEnvioActual.toFixed(2)})`,
        },
      ]),
      supabase.from('perfiles_joiners').upsert({
        user_email: usuarioEmail.toLowerCase().trim(),
        nombre_completo: formNombre.trim(),
        usuario_red: `@${formInstagram.replace('@', '')}`,
      }),
    ]);

    setDatosExito({
      resumen: resumenArticulos,
      subtotal: subtotalCarrito,
      envio: costoEnvioActual,
      total: totalFinalCarrito,
    });
    setCarrito([]);
    setMostrarCarrito(false);
    cargarTienda();
  }
  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F9] flex items-center justify-center font-mono text-xs text-zinc-400">
        ✧ cargando Hyune Atelier Shop... 🛍️
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F9] font-sans text-zinc-800 pb-16">
      <div className="bg-white border-b border-zinc-200/80 px-4 py-3 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto flex justify-between items-center gap-2">
          <Link href="/gos" className="text-xs font-semibold text-zinc-500 hover:text-pink-600">
            ← Ver Group Orders
          </Link>

          <div className="flex items-center gap-2.5">
            <Link href="/mi-escritorio" className="text-xs font-bold text-zinc-600 hover:text-pink-600">
              Mi Cuenta
            </Link>

            <button
              type="button"
              onClick={() => setMostrarCarrito(true)}
              className="bg-pink-600 hover:bg-pink-700 text-white text-xs font-extrabold px-3.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-2xs"
            >
              <span>🛒 Carrito</span>
              <span className="bg-white text-pink-600 px-1.5 py-0.2 rounded-full text-[11px]">
                {totalItemsCarrito}
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pt-6 space-y-5">
        <div className="bg-white border border-zinc-200/80 rounded-3xl p-6 text-center space-y-2 shadow-2xs">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-zinc-900 uppercase">
            Hyune Atelier Shop
          </h1>
          <p className="text-xs text-zinc-500 max-w-xl mx-auto">
            Agrega todo lo que quieras a tu carrito y paga un solo envío ✨
          </p>

          <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-left">
            <input
              type="text"
              placeholder="🔍 Buscar producto..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="border border-zinc-200 rounded-xl px-3.5 py-2 text-xs bg-zinc-50"
            />
            <select value={filtroGrupo} onChange={(e) => setFiltroGrupo(e.target.value)} className="border border-zinc-200 rounded-xl px-3 py-2 text-xs bg-zinc-50 font-bold">
              <option value="TODOS">🎵 Grupo: Todos</option>
              {gruposUnicos.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
            <select value={filtroIntegrante} onChange={(e) => setFiltroIntegrante(e.target.value)} className="border border-zinc-200 rounded-xl px-3 py-2 text-xs bg-zinc-50 font-bold">
              <option value="TODOS">🪞 Integrante: Todos</option>
              {integrantesUnicos.map((i) => <option key={i} value={i}>{i}</option>)}
            </select>
            <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} className="border border-zinc-200 rounded-xl px-3 py-2 text-xs bg-zinc-50 font-bold">
              <option value="TODOS">🏷️ Categoría: Todas</option>
              {tiposUnicos.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {productosFiltrados.length === 0 ? (
            <div className="col-span-full bg-white border border-dashed border-zinc-300 rounded-3xl p-12 text-center text-xs text-zinc-400">
              No encontramos artículos con esos filtros 🍰
            </div>
          ) : (
            productosFiltrados.map((p) => (
              <div key={p.id} className="bg-white border border-zinc-200/80 rounded-2xl p-3.5 flex flex-col justify-between hover:shadow-md transition-all group">
                <div>
                  <div
                    onClick={() => { setProductoDetalle(p); setFotoActivaDetalle(p.imagen_producto || ''); }}
                    className="w-full h-44 bg-zinc-50 rounded-xl overflow-hidden border border-zinc-100 relative cursor-pointer flex items-center justify-center"
                  >
                    {p.imagen_producto ? (
                      <img src={p.imagen_producto} alt={p.nombre_producto} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    ) : (
                      <span className="text-2xl">🛍️</span>
                    )}
                    <span className="absolute top-2 left-2 bg-white/90 text-[10px] font-bold px-2 py-0.5 rounded-full text-zinc-700 border border-zinc-200">
                      {p.categoria || 'Merch'}
                    </span>
                    {p.estado_pago === 'SOLD OUT' || p.cantidad_disponible <= 0 ? (
                      <span className="absolute inset-0 bg-zinc-950/60 text-white text-xs font-black flex items-center justify-center uppercase">
                        SOLD OUT
                      </span>
                    ) : (
                      <span className="absolute bottom-2 right-2 bg-zinc-900/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                        Stock: {p.cantidad_disponible}
                      </span>
                    )}
                  </div>

                  <div className="pt-3 space-y-1">
                    <div className="flex flex-wrap gap-1 text-[10px] font-bold text-pink-600 uppercase">
                      <span>{p.grupo || p.due_date || 'K-POP'}</span>
                      {p.integrante && p.integrante !== 'Grupal / Todos' && <span>· {p.integrante}</span>}
                    </div>
                    <h2 onClick={() => { setProductoDetalle(p); setFotoActivaDetalle(p.imagen_producto || ''); }} className="text-xs font-extrabold text-zinc-900 line-clamp-2 cursor-pointer hover:text-pink-600">
                      {p.nombre_producto}
                    </h2>
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-zinc-100 flex justify-between items-center">
                  <span className="text-sm font-black text-zinc-900">${Number(p.precio).toFixed(2)}</span>
                  <button
                    type="button"
                    disabled={p.estado_pago === 'SOLD OUT' || p.cantidad_disponible <= 0}
                    onClick={() => agregarAlCarrito(p)}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold ${
                      p.estado_pago === 'SOLD OUT' || p.cantidad_disponible <= 0
                        ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
                        : 'bg-pink-600 hover:bg-pink-700 text-white'
                    }`}
                  >
                    + Agregar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      {productoDetalle && (
        <div className="fixed inset-0 bg-zinc-950/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-xl">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold uppercase text-pink-600 bg-pink-50 px-2.5 py-0.5 rounded-full">
                  {productoDetalle.grupo || productoDetalle.due_date} · {productoDetalle.categoria || 'Merch'}
                </span>
                <h3 className="text-base font-extrabold text-zinc-900 mt-1">{productoDetalle.nombre_producto}</h3>
              </div>
              <button type="button" onClick={() => setProductoDetalle(null)} className="text-zinc-400 font-bold text-sm">✕</button>
            </div>
            <div className="w-full h-64 bg-zinc-50 rounded-2xl border overflow-hidden flex items-center justify-center">
              {fotoActivaDetalle ? <img src={fotoActivaDetalle} alt="" className="max-h-full max-w-full object-contain" /> : <span className="text-4xl">🛍️</span>}
            </div>
            {productoDetalle.fotos_extra && productoDetalle.fotos_extra.length > 0 && (
              <div className="flex gap-2 overflow-x-auto">
                {[productoDetalle.imagen_producto, ...productoDetalle.fotos_extra].filter(Boolean).map((url, idx) => (
                  <img key={idx} src={url as string} alt="" onClick={() => setFotoActivaDetalle(url as string)} className={`w-14 h-14 rounded-xl object-cover border-2 cursor-pointer ${fotoActivaDetalle === url ? 'border-pink-600' : 'border-zinc-200'}`} />
                ))}
              </div>
            )}
            <p className="text-xs text-zinc-600">{productoDetalle.descripcion || 'Artículo disponible en Hyune Atelier Shop.'}</p>
            <div className="flex justify-between items-center pt-2 border-t">
              <span className="text-lg font-black text-zinc-900">${Number(productoDetalle.precio).toFixed(2)} USD</span>
              <button type="button" disabled={productoDetalle.estado_pago === 'SOLD OUT' || productoDetalle.cantidad_disponible <= 0} onClick={() => agregarAlCarrito(productoDetalle)} className="px-5 py-2.5 rounded-xl bg-pink-600 text-white text-xs font-bold">
                + Agregar al carrito 🛒
              </button>
            </div>
          </div>
        </div>
      )}
      {mostrarCarrito && (
        <div className="fixed inset-0 bg-zinc-950/50 backdrop-blur-xs flex justify-end z-50">
          <div className="bg-white w-full max-w-md h-full overflow-y-auto p-5 flex flex-col justify-between shadow-2xl">
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b pb-3">
                <h3 className="text-base font-black text-zinc-900">🛒 Tu Carrito ({totalItemsCarrito})</h3>
                <button type="button" onClick={() => setMostrarCarrito(false)} className="text-zinc-400 hover:text-zinc-800 font-bold text-sm">✕</button>
              </div>

              {carrito.length === 0 ? (
                <p className="text-xs text-zinc-400 text-center py-12">Tu carrito está vacío 🌸 Agrega productos de la tienda.</p>
              ) : (
                <>
                  <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                    {carrito.map((item) => (
                      <div key={item.producto.id} className="flex items-center justify-between gap-2 bg-zinc-50 border border-zinc-200/80 p-2.5 rounded-2xl text-xs">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {item.producto.imagen_producto ? <img src={item.producto.imagen_producto} alt="" className="w-11 h-11 rounded-xl object-cover border shrink-0" /> : <span className="w-11 h-11 rounded-xl bg-white flex items-center justify-center shrink-0">🛍️</span>}
                          <div className="truncate">
                            <p className="font-bold text-zinc-900 truncate">{item.producto.nombre_producto}</p>
                            <p className="text-pink-600 font-extrabold">${(Number(item.producto.precio) * item.cantidad).toFixed(2)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 bg-white border rounded-xl px-2 py-1 shrink-0">
                          <button type="button" onClick={() => cambiarCantidadCarrito(item.producto.id, -1)} className="font-black text-zinc-500 px-1">-</button>
                          <span className="font-bold">{item.cantidad}</span>
                          <button type="button" onClick={() => cambiarCantidadCarrito(item.producto.id, 1)} className="font-black text-pink-600 px-1">+</button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <form onSubmit={procesarPedidoCarrito} className="space-y-2.5 border-t pt-3">
                    <p className="text-[11px] font-bold uppercase text-zinc-400">Datos de Envío</p>
                    <div className="grid grid-cols-2 gap-2">
                      <input type="text" required placeholder="Nombre Completo" value={formNombre} onChange={(e) => setFormNombre(e.target.value)} className="border rounded-xl px-3 py-2 text-xs bg-zinc-50" />
                      <input type="text" required placeholder="Instagram (sin @)" value={formInstagram} onChange={(e) => setFormInstagram(e.target.value)} className="border rounded-xl px-3 py-2 text-xs bg-zinc-50 font-bold text-pink-600" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input type="tel" required placeholder="Teléfono" value={formTelefono} onChange={(e) => setFormTelefono(e.target.value)} className="border rounded-xl px-3 py-2 text-xs bg-zinc-50" />
                      <input type="text" required placeholder="Ciudad / Provincia" value={formCiudad} onChange={(e) => setFormCiudad(e.target.value)} className="border rounded-xl px-3 py-2 text-xs bg-zinc-50" />
                    </div>
                    <input type="text" required placeholder="Dirección exacta" value={formDireccion} onChange={(e) => setFormDireccion(e.target.value)} className="border rounded-xl px-3 py-2 text-xs bg-zinc-50 w-full" />

                    <div>
                      <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-1">Método de Envío</label>
                      <select value={formMetodoEnvio} onChange={(e) => setFormMetodoEnvio(e.target.value)} className="border rounded-xl px-3 py-2 text-xs bg-zinc-50 font-bold w-full">
                        <option value="quito">Quito (+$3.50)</option>
                        <option value="provincia">Otras Provincias (+$6.50)</option>
                        <option value="peru">Perú Internac. ($0.00)</option>
                      </select>
                    </div>

                    <div className="bg-pink-50/70 border border-pink-100 rounded-2xl p-3.5 space-y-1 text-xs">
                      <div className="flex justify-between text-zinc-600">
                        <span>Subtotal productos:</span>
                        <span className="font-bold">${subtotalCarrito.toFixed(2)} USD</span>
                      </div>
                      <div className="flex justify-between text-zinc-600">
                        <span>Costo de envío:</span>
                        <span className="font-bold">${costoEnvioActual.toFixed(2)} USD</span>
                      </div>
                      <div className="flex justify-between text-sm font-black text-zinc-900 border-t border-pink-200/60 pt-1.5 mt-1">
                        <span>Total + Envío:</span>
                        <span className="text-pink-600">${totalFinalCarrito.toFixed(2)} USD</span>
                      </div>
                    </div>

                    <button type="submit" className="w-full py-3 bg-zinc-950 hover:bg-zinc-800 text-white font-black text-xs uppercase rounded-xl">
                      🔒 Confirmar Pedido (${totalFinalCarrito.toFixed(2)})
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
            {datosExito && (
        <div className="fixed inset-0 bg-zinc-950/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-pink-200 rounded-3xl p-6 max-w-sm w-full space-y-3 shadow-xl text-center">
            <h4 className="text-sm font-black text-pink-600 uppercase">✨ ¡Pedido de Tienda Registrado! 🫧</h4>
            <div className="bg-zinc-50 p-4 rounded-2xl text-left text-xs space-y-1.5 text-zinc-700 border">
              <p><strong>🏦 Banco Pichincha (Ahorros):</strong> #2213367970</p>
              <p><strong>👤 Titular:</strong> Isabel Revollar — <strong>CI:</strong> 1752806388</p>
              <p><strong>📦 Artículos:</strong> {datosExito.resumen}</p>
              <p><strong>Subtotal:</strong> ${datosExito.subtotal.toFixed(2)} + <strong>Envío:</strong> ${datosExito.envio.toFixed(2)}</p>
              <p className="text-sm font-black text-pink-600 pt-1 border-t">Total a transferir: ${datosExito.total.toFixed(2)} USD</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-[11px] text-amber-900 font-semibold">
              ⚠️ Importante: Si no me sigues en Instagram <strong>@atelierdehyun</strong>, no tomaré en cuenta el pedido, ya que es necesario para enviarte tus proofs.
            </div>
            <a
              href={`https://wa.me{encodeURIComponent(
                `¡Hola, Atelier! Hice un pedido en la tienda 🛍️✨\n\n💌 *Nombre:* ${formNombre} (@${formInstagram})\n📱 *Teléfono:* ${formTelefono}\n📍 *Envío:* ${formCiudad} — ${formDireccion}\n📦 *Productos:* ${datosExito.resumen}\n💵 *Subtotal:* $${datosExito.subtotal.toFixed(2)} | *Envío:* $${datosExito.envio.toFixed(2)}\n💰 *Total Final:* $${datosExito.total.toFixed(2)} USD\n\nConfirmo que sigo a @atelierdehyun y adjunto mi comprobante. 💗`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setDatosExito(null)}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase rounded-xl block"
            >
              💬 Enviar Comprobante por WhatsApp
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
