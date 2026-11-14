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

export default function AtelierShop() {
  const [productos, setProductos] = useState<ProductoShop[]>([]);
  const [filtroGrupo, setFiltroGrupo] = useState<string>('TODOS');
  const [filtroIntegrante, setFiltroIntegrante] = useState<string>('TODOS');
  const [filtroTipo, setFiltroTipo] = useState<string>('TODOS');
  const [busqueda, setBusqueda] = useState('');
  const [loading, setLoading] = useState(true);
  const [usuarioEmail, setUsuarioEmail] = useState('');

  const [productoDetalle, setProductoDetalle] = useState<ProductoShop | null>(null);
  const [fotoActivaDetalle, setFotoActivaDetalle] = useState<string>('');
  const [mostrarModalCompra, setMostrarModalCompra] = useState(false);
  const [productoAComprar, setProductoAComprar] = useState<ProductoShop | null>(null);
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

  const gruposUnicos = Array.from(
    new Set(productos.map((p) => (p.grupo || p.due_date || 'Otros').toUpperCase()))
  );
  const integrantesUnicos = Array.from(
    new Set(productos.map((p) => p.integrante || 'Grupal / Todos'))
  );
  const tiposUnicos = Array.from(
    new Set(productos.map((p) => p.categoria || 'Merch'))
  );

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
  function abrirVistaProducto(prod: ProductoShop) {
    setProductoDetalle(prod);
    setFotoActivaDetalle(prod.imagen_producto || '');
  }

  function iniciarCompraDirecta(prod: ProductoShop) {
    if (!usuarioEmail) {
      return alert('Por favor inicia sesión primero para comprar en la shop 🎀');
    }
    setProductoDetalle(null);
    setProductoAComprar(prod);
    setMostrarModalCompra(true);
  }

  async function procesarPedidoShop(e: React.FormEvent) {
    e.preventDefault();
    if (!productoAComprar || !formNombre || !formInstagram || !formTelefono || !formCiudad || !formDireccion) {
      return alert('Completa todos los campos e Instagram para tus proofs 🧸🌸');
    }

    setLoading(true);
    const nuevoStock = Math.max(0, productoAComprar.cantidad_disponible - 1);
    const nuevoEstado = nuevoStock === 0 ? 'SOLD OUT' : productoAComprar.estado_pago;

    const { error: errorStock } = await supabase
      .from('tienda_productos')
      .update({ cantidad_disponible: nuevoStock, estado_pago: nuevoEstado })
      .eq('id', productoAComprar.id);

    if (errorStock) {
      setLoading(false);
      return alert('Error procesando stock de la tienda 😭');
    }

    const costoEnvio = PRECIOS_ENVIO[formMetodoEnvio as keyof typeof PRECIOS_ENVIO] || 0;
    const totalFinal = Number(productoAComprar.precio) + costoEnvio;

    await Promise.all([
      supabase.from('pedidos').insert([
        {
          user_email: usuarioEmail.toLowerCase().trim(),
          tipo_servicio: 'SHOP',
          producto_nombre: productoAComprar.nombre_producto,
          imagen_producto: productoAComprar.imagen_producto || null,
          total_pagar: totalFinal,
          estado_pago: 'Sin pagar',
          estado_confirmacion: 'Pendiente',
          detalles: `IG: @${formInstagram} | Tlf: ${formTelefono} | Nombre: ${formNombre} | Ciudad: ${formCiudad} | Dir: ${formDireccion} | Envío: ${formMetodoEnvio.toUpperCase()} ($${costoEnvio})`,
        },
      ]),
      supabase.from('perfiles_joiners').upsert({
        user_email: usuarioEmail.toLowerCase().trim(),
        nombre_completo: formNombre.trim(),
        usuario_red: `@${formInstagram.replace('@', '')}`,
      }),
    ]);

    setDatosExito({
      producto: productoAComprar.nombre_producto,
      total: totalFinal,
    });
    setMostrarModalCompra(false);
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
      <div className="bg-white border-b border-zinc-200/80 px-4 py-3">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <Link href="/gos" className="text-xs font-semibold text-zinc-500 hover:text-pink-600">
            ← Ver Group Orders
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/mi-escritorio" className="text-xs font-bold text-pink-600 hover:underline">
              Mi Cuenta
            </Link>
            <span className="text-[11px] bg-zinc-900 text-white px-3 py-1 rounded-full">
              👤 {usuarioEmail || 'Invitado'}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pt-6 space-y-5">
        <div className="bg-white border border-zinc-200/80 rounded-3xl p-6 text-center space-y-2 shadow-2xs">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-zinc-900 uppercase">
            Hyune Atelier Shop
          </h1>
          <p className="text-xs text-zinc-500 max-w-xl mx-auto">
            Photocards, álbumes, plushies, llaveros y artículos listos para envío inmediato o pago único ✨
          </p>

          {/* Barra de búsqueda y filtros inteligentes */}
          <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-left">
            <input
              type="text"
              placeholder="🔍 Buscar producto..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="border border-zinc-200 rounded-xl px-3.5 py-2 text-xs bg-zinc-50"
            />

            <select
              value={filtroGrupo}
              onChange={(e) => setFiltroGrupo(e.target.value)}
              className="border border-zinc-200 rounded-xl px-3 py-2 text-xs bg-zinc-50 font-bold"
            >
              <option value="TODOS">🎵 Grupo: Todos</option>
              {gruposUnicos.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>

            <select
              value={filtroIntegrante}
              onChange={(e) => setFiltroIntegrante(e.target.value)}
              className="border border-zinc-200 rounded-xl px-3 py-2 text-xs bg-zinc-50 font-bold"
            >
              <option value="TODOS">🪞 Integrante: Todos</option>
              {integrantesUnicos.map((i) => (
                <option key={i} value={i}>{i}</option>
              ))}
            </select>

            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="border border-zinc-200 rounded-xl px-3 py-2 text-xs bg-zinc-50 font-bold"
            >
              <option value="TODOS">🏷️ Categoría: Todas</option>
              {tiposUnicos.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
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
              <div
                key={p.id}
                className="bg-white border border-zinc-200/80 rounded-2xl p-3.5 flex flex-col justify-between hover:shadow-md transition-all group"
              >
                <div>
                  <div
                    onClick={() => abrirVistaProducto(p)}
                    className="w-full h-44 bg-zinc-50 rounded-xl overflow-hidden border border-zinc-100 relative cursor-pointer flex items-center justify-center"
                  >
                    {p.imagen_producto ? (
                      <img
                        src={p.imagen_producto}
                        alt={p.nombre_producto}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <span className="text-2xl">🛍️</span>
                    )}

                    <span className="absolute top-2 left-2 bg-white/90 backdrop-blur-xs text-[10px] font-bold px-2 py-0.5 rounded-full text-zinc-700 border border-zinc-200">
                      {p.categoria || 'Merch'}
                    </span>

                    {p.estado_pago === 'SOLD OUT' || p.cantidad_disponible <= 0 ? (
                      <span className="absolute inset-0 bg-zinc-950/60 text-white text-xs font-black flex items-center justify-center uppercase tracking-wider">
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
                      {p.integrante && p.integrante !== 'Grupal / Todos' && (
                        <span>· {p.integrante}</span>
                      )}
                    </div>
                    <h2
                      onClick={() => abrirVistaProducto(p)}
                      className="text-xs font-extrabold text-zinc-900 line-clamp-2 cursor-pointer hover:text-pink-600"
                    >
                      {p.nombre_producto}
                    </h2>
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-zinc-100 flex justify-between items-center">
                  <span className="text-sm font-black text-zinc-900">
                    ${Number(p.precio).toFixed(2)}
                  </span>
                  <button
                    type="button"
                    disabled={p.estado_pago === 'SOLD OUT' || p.cantidad_disponible <= 0}
                    onClick={() => iniciarCompraDirecta(p)}
                    className={`px-3.5 py-1.5 rounded-xl text-[11px] font-bold transition-colors ${
                      p.estado_pago === 'SOLD OUT' || p.cantidad_disponible <= 0
                        ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
                        : 'bg-pink-600 hover:bg-pink-700 text-white'
                    }`}
                  >
                    Pedir
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
                  <img
                    key={idx}
                    src={url as string}
                    alt=""
                    onClick={() => setFotoActivaDetalle(url as string)}
                    className={`w-14 h-14 rounded-xl object-cover border-2 cursor-pointer ${fotoActivaDetalle === url ? 'border-pink-600' : 'border-zinc-200'}`}
                  />
                ))}
              </div>
            )}

            <p className="text-xs text-zinc-600">{productoDetalle.descripcion || 'Artículo disponible en Hyune Atelier Shop.'}</p>

            <div className="flex justify-between items-center pt-2 border-t">
              <span className="text-lg font-black text-zinc-900">${Number(productoDetalle.precio).toFixed(2)} USD</span>
              <button
                type="button"
                disabled={productoDetalle.estado_pago === 'SOLD OUT' || productoDetalle.cantidad_disponible <= 0}
                onClick={() => iniciarCompraDirecta(productoDetalle)}
                className="px-5 py-2.5 rounded-xl bg-pink-600 text-white text-xs font-bold"
              >
                Comprar ahora 🛍️
              </button>
            </div>
          </div>
        </div>
      )}

      {mostrarModalCompra && productoAComprar && (
        <div className="fixed inset-0 bg-zinc-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form onSubmit={procesarPedidoShop} className="bg-white border rounded-3xl p-5 max-w-md w-full space-y-3 shadow-xl">
            <div className="border-b pb-2 flex justify-between items-center">
              <h3 className="text-xs font-black text-pink-600 uppercase">🛍️ COMPRA: {productoAComprar.nombre_producto}</h3>
              <button type="button" onClick={() => setMostrarModalCompra(false)} className="text-zinc-400 text-xs font-bold">✕</button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input type="text" required placeholder="Nombre Completo" value={formNombre} onChange={(e) => setFormNombre(e.target.value)} className="border rounded-xl px-3 py-2 text-xs bg-zinc-50" />
              <input type="text" required placeholder="Instagram (Sin @)" value={formInstagram} onChange={(e) => setFormInstagram(e.target.value)} className="border rounded-xl px-3 py-2 text-xs bg-zinc-50 font-bold text-pink-600" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input type="tel" required placeholder="Teléfono" value={formTelefono} onChange={(e) => setFormTelefono(e.target.value)} className="border rounded-xl px-3 py-2 text-xs bg-zinc-50" />
              <input type="text" required placeholder="Ciudad / Provincia" value={formCiudad} onChange={(e) => setFormCiudad(e.target.value)} className="border rounded-xl px-3 py-2 text-xs bg-zinc-50" />
            </div>
            <input type="text" required placeholder="Dirección Domicilio" value={formDireccion} onChange={(e) => setFormDireccion(e.target.value)} className="border rounded-xl px-3 py-2 text-xs bg-zinc-50 w-full" />
            <select value={formMetodoEnvio} onChange={(e) => setFormMetodoEnvio(e.target.value)} className="border rounded-xl px-3 py-2 text-xs bg-zinc-50 font-bold w-full">
              <option value="quito">Quito (+$3.50)</option>
              <option value="provincia">Otras Provincias (+$6.50)</option>
              <option value="peru">Perú Internac. ($0.00)</option>
            </select>
            <button type="submit" className="w-full py-2.5 bg-zinc-950 text-white font-bold text-xs uppercase rounded-xl">
              🔒 Confirmar Compra de Tienda
            </button>
          </form>
        </div>
      )}

      {datosExito && (
        <div className="fixed inset-0 bg-zinc-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-pink-200 rounded-3xl p-6 max-w-sm w-full space-y-3 shadow-xl text-center">
            <h4 className="text-sm font-black text-pink-600 uppercase">✨ ¡Compra Registrada! 🫧</h4>
            <div className="bg-zinc-50 p-4 rounded-2xl text-left text-xs space-y-1 text-zinc-700">
              <p><strong>🏦 Cuentas:</strong> Pichincha / Produbanco (Ahorros)</p>
              <p><strong>📦 Artículo:</strong> {datosExito.producto}</p>
              <p><strong>💵 Total (+ Envío):</strong> <span className="text-pink-600 font-black">${datosExito.total.toFixed(2)} USD</span></p>
            </div>
            <a
              href={`https://wa.me{NUMERO_WHATSAPP}?text=${encodeURIComponent(
                `¡Hola, Atelier! Compré en la tienda 🛍️✨\n\n💌 *Nombre:* ${formNombre} (@${formInstagram})\n📱 *Teléfono:* ${formTelefono}\n📍 *Dirección:* ${formCiudad} — ${formDireccion}\n📦 *Artículo:* ${datosExito.producto}\n💰 *Total:* $${datosExito.total.toFixed(2)} USD\n\nAdjunto mi comprobante de pago. 💗`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setDatosExito(null)}
              className="w-full py-2.5 bg-emerald-600 text-white font-bold text-xs uppercase rounded-xl block"
            >
              💬 Enviar Comprobante por WhatsApp
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
