'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface VarianteShop {
  nombre: string;
  precio: number;
  stock: number;
}

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
  era?: string | null;
  tipo_pc?: string | null;
  destacado?: boolean;
  badge_especial?: string | null;
  imagen_producto: string | null;
  fotos_extra?: string[] | null;
  cantidad_disponible: number;
  variantes?: VarianteShop[] | null;
}

interface ItemCarrito {
  keyUnica: string;
  producto: ProductoShop;
  varianteNombre?: string;
  precioUnitario: number;
  maxStock: number;
  cantidad: number;
}

export default function AtelierShop() {
  const router = useRouter();
  const [productos, setProductos] = useState<ProductoShop[]>([]);
  const [fotosIntegrantes, setFotosIntegrantes] = useState<Record<string, string>>({});
  const [filtroGrupo, setFiltroGrupo] = useState<string>('TODOS');
  const [filtroIntegrante, setFiltroIntegrante] = useState<string>('TODOS');
  const [filtroEra, setFiltroEra] = useState<string>('TODOS');
  const [filtroTipoPc, setFiltroTipoPc] = useState<string>('TODOS');
  const [busqueda, setBusqueda] = useState('');
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [usuarioEmail, setUsuarioEmail] = useState('');
  const [perfilCliente, setPerfilCliente] = useState<{ nombre: string; ig: string }>({ nombre: '', ig: '' });

  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
  const [mostrarCarrito, setMostrarCarrito] = useState(false);
  const [mostrarGuia, setMostrarGuia] = useState(false);
  const [wishlistIds, setWishlistIds] = useState<number[]>([]);
const [soloWishlist, setSoloWishlist] = useState(false);

  const [productoDetalle, setProductoDetalle] = useState<ProductoShop | null>(null);
  const [varianteSeleccionada, setVarianteSeleccionada] = useState<VarianteShop | null>(null);
  const [fotoActivaDetalle, setFotoActivaDetalle] = useState<string>('');
  async function cargarTienda() {
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
        setPerfilCliente({
               const { data: dataWish } = await supabase
       .from('wishlist_joiners')
       .select('producto_id')
       .eq('user_email', mail);
     setWishlistIds((dataWish || []).map((w: any) => Number(w.producto_id)));
          nombre: perfil?.nombre_completo || mail.split('@').at(0) || 'Joiner',
          ig: perfil?.usuario_red || '',
        });
      }

      const [{ data: dataProds }, { data: dataFotos }] = await Promise.all([
        supabase.from('tienda_productos').select('*').order('id', { ascending: false }),
        supabase.from('integrantes_fotos').select('*'),
      ]);

      setProductos(dataProds || []);
      const mapaFotos: Record<string, string> = {};
      (dataFotos || []).forEach((f: any) => {
        if (f.nombre && f.imagen_url) mapaFotos[f.nombre.toLowerCase().trim()] = f.imagen_url;
      });
      setFotosIntegrantes(mapaFotos);
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

  const prodsDelGrupo = filtroGrupo === 'TODOS'
    ? productos
    : productos.filter((p) => (p.grupo || p.due_date || 'Otros').toUpperCase() === filtroGrupo);

  const integrantesDisponibles = Array.from(new Set(prodsDelGrupo.map((p) => p.integrante || 'Grupal / Todos')));
  const erasDisponibles = Array.from(
    new Set(prodsDelGrupo.map((p) => (p.era || '').toUpperCase().trim()).filter(Boolean))
  );
  const tiposPcDisponibles = Array.from(
    new Set(prodsDelGrupo.map((p) => p.tipo_pc || p.categoria || 'Álbum PC'))
  );

  const productosFiltrados = prodsDelGrupo.filter((p) => {
    const integProd = p.integrante || 'Grupal / Todos';
    const eraProd = (p.era || '').toUpperCase().trim();
    const tipoProd = p.tipo_pc || p.categoria || 'Álbum PC';
    if (filtroIntegrante !== 'TODOS' && integProd !== filtroIntegrante) return false;
    if (filtroEra !== 'TODOS' && eraProd !== filtroEra) return false;
    if (filtroTipoPc !== 'TODOS' && tipoProd !== filtroTipoPc) return false;
    if (busqueda && !p.nombre_producto.toLowerCase().includes(busqueda.toLowerCase())) return false;
        if (soloWishlist && !wishlistIds.includes(p.id)) return false;

    return true;
    
  });

  const productosDestacados = productos.filter(
    (p) => p.destacado && p.estado_pago !== 'SOLD OUT' && p.cantidad_disponible > 0
  );

  const relacionadosMismaEra = productoDetalle
    ? productos.filter((otro) => {
        if (otro.id === productoDetalle.id) return false;
        const mismoGrupo = (otro.grupo || '').toUpperCase() === (productoDetalle.grupo || '').toUpperCase();
        if (!mismoGrupo) return false;
        if (productoDetalle.era && otro.era) {
          return otro.era.toUpperCase().trim() === productoDetalle.era.toUpperCase().trim();
        }
        const ignorar = ['PC', 'PHOTOCARD', 'POB', 'CARD', 'VER', 'DE', 'LA', 'EL', 'THE', 'AND'];
        const palabrasBase = productoDetalle.nombre_producto
          .toUpperCase()
          .split(/[\s\-:]+/)
          .filter((w) => w.length >= 3 && !ignorar.includes(w));
        return palabrasBase.some((w) => otro.nombre_producto.toUpperCase().includes(w));
      }).slice(0, 8)
    : [];
  async function toggleWishlist(prodId: number) {
    if (!usuarioEmail) return alert('Inicia sesión para guardar en tu Wishlist 🩷');
    const yaEsta = wishlistIds.includes(prodId);
    if (yaEsta) {
      setWishlistIds((prev) => prev.filter((id) => id !== prodId));
      await supabase
        .from('wishlist_joiners')
        .delete()
        .eq('user_email', usuarioEmail)
        .eq('producto_id', prodId);
    } else {
      setWishlistIds((prev) => [...prev, prodId]);
      await supabase
        .from('wishlist_joiners')
        .insert([{ user_email: usuarioEmail, producto_id: prodId }]);
    }
  }

  function abrirModalProducto(prod: ProductoShop) {
    setProductoDetalle(prod);
    setFotoActivaDetalle(prod.imagen_producto || '');
    const vars = Array.isArray(prod.variantes) ? prod.variantes : [];
    const primeraDisponible = vars.find((v) => v.stock > 0) || vars.at(0) || null;
    setVarianteSeleccionada(primeraDisponible);
  }

  function agregarAlCarrito(prod: ProductoShop, variante?: VarianteShop | null) {
    if (!usuarioEmail) return alert('Inicia sesión primero para agregar productos al carrito 🎀');
    const tieneVariantes = Array.isArray(prod.variantes) && prod.variantes.length > 0;
    if (tieneVariantes && !variante) { abrirModalProducto(prod); return; }

    const keyUnica = variante ? prod.id + '__' + variante.nombre : String(prod.id);
    const precioUnit = variante ? Number(variante.precio) : Number(prod.precio);
    const maxStock = variante ? Number(variante.stock) : Number(prod.cantidad_disponible);
    if (maxStock <= 0) return alert('Esta opción ya se agotó 🌸');

    setCarrito((prev) => {
      const existe = prev.find((i) => i.keyUnica === keyUnica);
      if (existe) {
        if (existe.cantidad >= maxStock) { alert('Ya agregaste el máximo stock disponible 🌸'); return prev; }
        return prev.map((i) => (i.keyUnica === keyUnica ? { ...i, cantidad: i.cantidad + 1 } : i));
      }
      return [...prev, { keyUnica, producto: prod, varianteNombre: variante?.nombre, precioUnitario: precioUnit, maxStock, cantidad: 1 }];
    });
    setProductoDetalle(null);
    setMostrarCarrito(true);
  }

  function cambiarCantidadCarrito(keyUnica: string, delta: number) {
    setCarrito((prev) =>
      prev.map((item) => {
        if (item.keyUnica !== keyUnica) return item;
        const nuevaCant = item.cantidad + delta;
        if (nuevaCant > item.maxStock) return item;
        return { ...item, cantidad: nuevaCant };
      }).filter((item) => item.cantidad > 0)
    );
  }

  const totalItemsCarrito = carrito.reduce((acc, i) => acc + i.cantidad, 0);
  const subtotalCarrito = carrito.reduce((acc, i) => acc + i.precioUnitario * i.cantidad, 0);

  async function enviarDirectoAMisPedidos() {
    if (carrito.length === 0) return;
    setProcesando(true);

    const porProd: Record<number, ItemCarrito[]> = {};
    carrito.forEach((it) => { if (!porProd[it.producto.id]) porProd[it.producto.id] = []; porProd[it.producto.id].push(it); });

    for (const [prodIdStr, itemsProd] of Object.entries(porProd)) {
      const prodId = Number(prodIdStr);
      const { data: prodDb } = await supabase.from('tienda_productos').select('*').eq('id', prodId).single();
      if (!prodDb) continue;
      const varsDb: VarianteShop[] = Array.isArray(prodDb.variantes) ? [...prodDb.variantes] : [];
      if (varsDb.length > 0) {
        itemsProd.forEach((it) => {
          const idx = varsDb.findIndex((v) => v.nombre === it.varianteNombre);
          if (idx >= 0) varsDb[idx].stock = Math.max(0, Number(varsDb[idx].stock) - it.cantidad);
        });
        const stockRestanteTotal = varsDb.reduce((s, v) => s + Number(v.stock), 0);
        await supabase.from('tienda_productos').update({ variantes: varsDb, cantidad_disponible: stockRestanteTotal, estado_pago: stockRestanteTotal === 0 ? 'SOLD OUT' : prodDb.estado_pago }).eq('id', prodId);
      } else {
        const cantComprada = itemsProd.reduce((s, i) => s + i.cantidad, 0);
        const nuevoStock = Math.max(0, Number(prodDb.cantidad_disponible) - cantComprada);
        await supabase.from('tienda_productos').update({ cantidad_disponible: nuevoStock, estado_pago: nuevoStock === 0 ? 'SOLD OUT' : prodDb.estado_pago }).eq('id', prodId);
      }
    }

    const resumenArticulos = carrito.map((i) => i.cantidad + 'x ' + i.producto.nombre_producto + (i.varianteNombre ? ' [' + i.varianteNombre + ']' : '') + ' ($' + (i.precioUnitario * i.cantidad).toFixed(2) + ')').join(' + ');
    const primeraFoto = carrito.at(0)?.producto.imagen_producto || null;

    await supabase.from('pedidos').insert([{
      user_email: usuarioEmail.toLowerCase().trim(),
      tipo_servicio: 'SHOP',
      producto_nombre: resumenArticulos,
      imagen_producto: primeraFoto,
      total_pagar: subtotalCarrito,
      estado_pago: 'Sin pagar',
      estado_confirmacion: 'Pendiente',
      estado_envio: 'En bodega',
      detalles: (perfilCliente.ig ? 'IG: ' + perfilCliente.ig + ' | ' : '') + 'Nombre: ' + perfilCliente.nombre + ' | En bodega',
    }]);

    setCarrito([]);
    setMostrarCarrito(false);
    setProcesando(false);
    router.push('/mi-escritorio');
  }
  if (loading) return <div className="min-h-screen bg-[#FAF8F9] flex items-center justify-center font-mono text-xs text-zinc-400">✧ cargando Hyune Atelier Shop... 🛍️</div>;

  return (
    <div className="min-h-screen bg-[#FAF8F9] font-sans text-zinc-800 pb-16">
      <div className="bg-white border-b border-zinc-200/80 px-4 py-3 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto flex flex-wrap justify-between items-center gap-2">
          <Link href="/gos" className="text-xs font-semibold text-zinc-500 hover:text-pink-600">← Ver Group Orders</Link>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setMostrarGuia(true)} className="text-xs font-bold text-pink-600 bg-pink-50 border border-pink-200 px-3 py-1.5 rounded-full hover:bg-pink-100">
              ❓ ¿Cómo comprar?
            </button>
            <Link href="/mi-escritorio" className="text-xs font-bold text-zinc-600 hover:text-pink-600">Mis Pedidos / Bodega</Link>
            <button type="button" onClick={() => setMostrarCarrito(true)} className="bg-pink-600 hover:bg-pink-700 text-white text-xs font-extrabold px-3.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-2xs">
              <span>🛒 Carrito</span>
              <span className="bg-white text-pink-600 px-1.5 rounded-full text-[11px]">{totalItemsCarrito}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pt-6 space-y-5">
        <div className="bg-white border border-zinc-200/80 rounded-3xl p-6 text-center space-y-4 shadow-2xs">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-zinc-900 uppercase">Hyune Atelier Shop</h1>

          <div className="flex flex-wrap justify-center gap-1.5">
            <button
              type="button"
              onClick={() => { setFiltroGrupo('TODOS'); setFiltroIntegrante('TODOS'); setFiltroEra('TODOS'); }}
              className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold transition-all ${filtroGrupo === 'TODOS' ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600'}`}
            >
              Todos los Grupos
            </button>
            {gruposUnicos.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => { setFiltroGrupo(g); setFiltroIntegrante('TODOS'); setFiltroEra('TODOS'); }}
                className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold transition-all ${filtroGrupo === g ? 'bg-pink-600 text-white' : 'bg-pink-50 text-pink-700'}`}
              >
                {g}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-start sm:justify-center gap-3 overflow-x-auto py-2 px-1">
            <button type="button" onClick={() => setFiltroIntegrante('TODOS')} className="flex flex-col items-center gap-1.5 shrink-0">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center text-xs font-black border-2 transition-all ${filtroIntegrante === 'TODOS' ? 'border-pink-600 bg-pink-600 text-white scale-105 shadow-sm' : 'border-zinc-200 bg-zinc-50 text-zinc-600'}`}>
                ALL
              </div>
              <span className={`text-[11px] font-bold ${filtroIntegrante === 'TODOS' ? 'text-pink-600' : 'text-zinc-500'}`}>Todos</span>
            </button>

            {integrantesDisponibles.map((integ) => {
              const fotoMember = fotosIntegrantes[integ.toLowerCase().trim()];
              const activo = filtroIntegrante === integ;
              return (
                <button key={integ} type="button" onClick={() => setFiltroIntegrante(activo ? 'TODOS' : integ)} className="flex flex-col items-center gap-1.5 shrink-0 group">
                  <div className={`w-14 h-14 rounded-full overflow-hidden flex items-center justify-center border-2 transition-all ${activo ? 'border-pink-600 ring-2 ring-pink-200 scale-105 shadow-sm' : 'border-zinc-200 bg-pink-50/60 group-hover:border-pink-400'}`}>
                    {fotoMember ? (
                      <img src={fotoMember} alt={integ} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-sm font-black text-pink-600">{integ.slice(0, 2).toUpperCase()}</span>
                    )}
                  </div>
                  <span className={`text-[11px] font-bold max-w-[68px] truncate ${activo ? 'text-pink-600' : 'text-zinc-600'}`}>{integ}</span>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-left">
            <input type="text" placeholder="🔍 Buscar por nombre..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="border border-zinc-200 rounded-xl px-3.5 py-2 text-xs bg-zinc-50" />
            <select value={filtroEra} onChange={(e) => setFiltroEra(e.target.value)} className="border border-zinc-200 rounded-xl px-3 py-2 text-xs bg-zinc-50 font-bold">
              <option value="TODOS">💿 Era / Serie: Todas</option>
              {erasDisponibles.map((er) => <option key={er} value={er}>{er}</option>)}
            </select>
            <select value={filtroTipoPc} onChange={(e) => setFiltroTipoPc(e.target.value)} className="border border-zinc-200 rounded-xl px-3 py-2 text-xs bg-zinc-50 font-bold">
              <option value="TODOS">🃏 Tipo: Todos (Álbum, POB, Merch)</option>
              {tiposPcDisponibles.map((tp) => <option key={tp} value={tp}>{tp}</option>)}
            </select>
          </div>
        </div>

        {productosDestacados.length > 0 && (
          <div className="bg-gradient-to-r from-amber-50 via-pink-50 to-indigo-50 border-2 border-amber-200/80 rounded-3xl p-5 space-y-3 shadow-2xs">
            <div className="flex flex-wrap justify-between items-center gap-2">
              <div>
                <span className="text-[10px] font-black uppercase bg-amber-400 text-zinc-950 px-2.5 py-0.5 rounded-full">✨ Vitrina Especial</span>
                <h2 className="text-base font-black text-zinc-900 mt-1">Picks del Atelier & Piezas Recomendadas</h2>
              </div>
              <span className="text-[11px] font-semibold text-zinc-500">¡Agrégalos a tus pedidos sin pagar envío extra!</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {productosDestacados.slice(0, 4).map((dest) => {
                const tieneVarsDest = Array.isArray(dest.variantes) && dest.variantes.length > 0;
                return (
                  <div key={dest.id} className="bg-white border border-amber-200 rounded-2xl p-2.5 flex flex-col justify-between shadow-2xs hover:shadow-md transition-all">
                    <div>
                      <div onClick={() => abrirModalProducto(dest)} className="w-full h-32 bg-zinc-50 rounded-xl overflow-hidden relative cursor-pointer mb-2">
                        {dest.imagen_producto && <img src={dest.imagen_producto} alt="" className="w-full h-full object-cover" />}
                        <span className="absolute top-1.5 left-1.5 bg-amber-400 text-zinc-950 text-[9px] font-black px-2 py-0.5 rounded-full shadow-2xs">
                          {dest.badge_especial || '✨ Destacado'}
                        </span>
                      </div>
                      <p className="text-[10px] font-bold text-pink-600 uppercase truncate">{dest.grupo} {dest.integrante ? `· ${dest.integrante}` : ''}</p>
                      <h3 onClick={() => abrirModalProducto(dest)} className="text-xs font-extrabold text-zinc-900 line-clamp-1 cursor-pointer">{dest.nombre_producto}</h3>
                    </div>
                    <div className="flex justify-between items-center pt-2 mt-2 border-t border-zinc-100">
                      <span className="text-xs font-black text-zinc-900">${Number(dest.precio).toFixed(2)}</span>
                      <button type="button" onClick={() => (tieneVarsDest ? abrirModalProducto(dest) : agregarAlCarrito(dest, null))} className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-pink-600 text-white text-[10px] font-bold">
                        {tieneVarsDest ? 'Ver' : '+ Llevar'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {productosFiltrados.map((p) => {
            const tieneVars = Array.isArray(p.variantes) && p.variantes.length > 0;
            return (
              <div key={p.id} className="bg-white border border-zinc-200/80 rounded-2xl p-3.5 flex flex-col justify-between hover:shadow-md transition-all group">
                <div>
                  <div onClick={() => abrirModalProducto(p)} className="w-full h-44 bg-zinc-50 rounded-xl overflow-hidden border border-zinc-100 relative cursor-pointer flex items-center justify-center">
                    {p.imagen_producto ? <img src={p.imagen_producto} alt={p.nombre_producto} className="w-full h-full object-cover group-hover:scale-105 transition-transform" /> : <span className="text-2xl">🛍️</span>}
                    <span className="absolute top-2 left-2 bg-white/95 text-[10px] font-extrabold px-2 py-0.5 rounded-full text-zinc-700 border border-zinc-200">
                      {p.badge_especial || p.tipo_pc || p.categoria || 'Álbum PC'}
                    </span>
                    {p.estado_pago === 'SOLD OUT' || p.cantidad_disponible <= 0 ? (
                      <span className="absolute inset-0 bg-zinc-950/60 text-white text-xs font-black flex items-center justify-center uppercase">SOLD OUT</span>
                    ) : p.cantidad_disponible === 1 ? (
                      <span className="absolute bottom-2 right-2 bg-rose-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-md shadow-2xs">🔥 Última unidad</span>
                    ) : (
                      <span className="absolute bottom-2 right-2 bg-zinc-900/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-md">Stock: {p.cantidad_disponible}</span>
                    )}
                  </div>
                  <div className="pt-3 space-y-1">
                    <div className="flex flex-wrap gap-1 text-[10px] font-bold text-pink-600 uppercase">
                      <span>{p.grupo || p.due_date}</span>
                      {p.integrante && p.integrante !== 'Grupal / Todos' && <span>· {p.integrante}</span>}
                      {p.era && <span className="bg-pink-50 text-pink-700 px-1.5 rounded">{p.era}</span>}
                    </div>
                    <h2 onClick={() => abrirModalProducto(p)} className="text-xs font-extrabold text-zinc-900 line-clamp-2 cursor-pointer hover:text-pink-600">{p.nombre_producto}</h2>
                  </div>
                </div>
                <div className="pt-3 mt-3 border-t border-zinc-100 flex justify-between items-center">
                  <span className="text-sm font-black text-zinc-900">{tieneVars ? `Desde $${Number(p.precio).toFixed(2)}` : `$${Number(p.precio).toFixed(2)}`}</span>
                  <button
                    type="button"
                    disabled={p.estado_pago === 'SOLD OUT' || p.cantidad_disponible <= 0}
                    onClick={() => (tieneVars ? abrirModalProducto(p) : agregarAlCarrito(p, null))}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold ${p.estado_pago === 'SOLD OUT' || p.cantidad_disponible <= 0 ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed' : 'bg-pink-600 hover:bg-pink-700 text-white'}`}
                  >
                    {tieneVars ? 'Elegir' : '+ Agregar'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {productoDetalle && (
        <div className="fixed inset-0 bg-zinc-950/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold uppercase text-pink-600 bg-pink-50 px-2.5 py-0.5 rounded-full">
                  {productoDetalle.grupo} {productoDetalle.era ? `· ${productoDetalle.era}` : ''} · {productoDetalle.tipo_pc || productoDetalle.categoria}
                </span>
                <h3 className="text-base font-extrabold text-zinc-900 mt-1">{productoDetalle.nombre_producto}</h3>
              </div>
              <button type="button" onClick={() => setProductoDetalle(null)} className="text-zinc-400 font-bold text-sm">✕</button>
            </div>

            <div className="w-full h-60 bg-zinc-50 rounded-2xl border overflow-hidden flex items-center justify-center">
              {fotoActivaDetalle ? <img src={fotoActivaDetalle} alt="" className="max-h-full max-w-full object-contain" /> : <span className="text-4xl">🛍️</span>}
            </div>

            {Array.isArray(productoDetalle.variantes) && productoDetalle.variantes.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-extrabold text-zinc-700">Elige una opción / photocard:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {productoDetalle.variantes.map((v, idx) => (
                    <button
                      key={idx}
                      type="button"
                      disabled={v.stock <= 0}
                      onClick={() => setVarianteSeleccionada(v)}
                      className={`p-2.5 rounded-xl border text-left text-xs flex justify-between items-center ${v.stock <= 0 ? 'bg-zinc-100 text-zinc-400' : varianteSeleccionada?.nombre === v.nombre ? 'bg-pink-50 border-pink-600 font-bold' : 'bg-white border-zinc-200'}`}
                    >
                      <div>
                        <p className="font-bold">{v.nombre}</p>
                        <p className="text-[10px] text-zinc-500">{v.stock > 0 ? `Stock: ${v.stock}` : 'Agotado'}</p>
                      </div>
                      <span className="font-black text-pink-600">${Number(v.precio).toFixed(2)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <p className="text-xs text-zinc-600">{productoDetalle.descripcion || 'Artículo disponible en Hyune Atelier Shop.'}</p>

            {relacionadosMismaEra.length > 0 && (
              <div className="bg-pink-50/50 border border-pink-200/80 rounded-2xl p-3 space-y-2">
                <p className="text-[11px] font-extrabold text-pink-700">
                  🃏 Más de esta misma Serie / Beneficio ({productoDetalle.era || productoDetalle.tipo_pc || 'Colección'}):
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {relacionadosMismaEra.map((rel) => (
                    <button key={rel.id} type="button" onClick={() => abrirModalProducto(rel)} className="bg-white border border-pink-100 rounded-xl p-1.5 text-left hover:border-pink-400 transition-all">
                      <div className="w-full h-16 bg-zinc-50 rounded-lg overflow-hidden mb-1">
                        {rel.imagen_producto && <img src={rel.imagen_producto} alt="" className="w-full h-full object-cover" />}
                      </div>
                      <p className="text-[10px] font-extrabold text-pink-600 truncate">{rel.integrante || 'Integrante'}</p>
                      <p className="text-[10px] font-bold text-zinc-800">${Number(rel.precio).toFixed(2)}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between items-center pt-2 border-t">
              <span className="text-lg font-black text-zinc-900">
                ${Number(varianteSeleccionada ? varianteSeleccionada.precio : productoDetalle.precio).toFixed(2)} USD
              </span>
              <button
                type="button"
                disabled={productoDetalle.estado_pago === 'SOLD OUT' || productoDetalle.cantidad_disponible <= 0 || (varianteSeleccionada !== null && varianteSeleccionada.stock <= 0)}
                onClick={() => agregarAlCarrito(productoDetalle, varianteSeleccionada)}
                className="px-5 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold"
              >
                + Agregar al carrito 🛒
              </button>
            </div>
          </div>
        </div>
      )}
      {mostrarGuia && (
        <div className="fixed inset-0 bg-zinc-950/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-pink-200 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-base font-black text-zinc-900">🎀 ¿Cómo funciona Hyune Atelier?</h3>
              <button type="button" onClick={() => setMostrarGuia(false)} className="text-zinc-400 font-bold text-sm">✕</button>
            </div>
            <div className="space-y-2.5 text-xs text-zinc-700">
              <div className="bg-pink-50/70 p-3 rounded-2xl border border-pink-100">
                <p className="font-extrabold text-pink-700">1. Elige tus piezas estilo Pocamarket 🃏</p>
                <p>Filtra por grupo o toca la foto de tu integrante favorito. Agrega todo al carrito y envíalo directo a <strong>Mis Pedidos</strong>.</p>
              </div>
              <div className="bg-zinc-50 p-3 rounded-2xl border">
                <p className="font-extrabold text-zinc-900">2. Paga desde Mis Pedidos 💳</p>
                <p>Entra a <strong>Mis Pedidos / Bodega</strong>, revisa el total sumado, transfiere y envía tu comprobante e Instagram por WhatsApp.</p>
              </div>
              <div className="bg-zinc-50 p-3 rounded-2xl border">
                <p className="font-extrabold text-zinc-900">3. Acumula en tu Bodega sin envíos extra 📦</p>
                <p>Tus compras confirmadas se guardan en tu bodega. Puedes seguir comprando otros días sin pagar envío cada vez.</p>
              </div>
              <div className="bg-emerald-50/70 p-3 rounded-2xl border border-emerald-200">
                <p className="font-extrabold text-emerald-800">4. Pide un solo envío cuando quieras 🚚</p>
                <p>Cuando quieras recibir tu paquete en casa, selecciona tus artículos en bodega y solicita un único envío nacional.</p>
              </div>
            </div>
            <button type="button" onClick={() => setMostrarGuia(false)} className="w-full py-3 bg-zinc-900 text-white font-extrabold text-xs rounded-xl">
              ¡Entendido, ir a comprar! ✨
            </button>
          </div>
        </div>
      )}

      {mostrarCarrito && (
        <div className="fixed inset-0 bg-zinc-950/50 backdrop-blur-xs flex justify-end z-50">
          <div className="bg-white w-full max-w-md h-full overflow-y-auto p-5 flex flex-col justify-between shadow-2xl">
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b pb-3">
                <h3 className="text-base font-black text-zinc-900">🛒 Tu Carrito ({totalItemsCarrito})</h3>
                <button type="button" onClick={() => setMostrarCarrito(false)} className="text-zinc-400 font-bold text-sm">✕</button>
              </div>
              {carrito.length === 0 ? (
                <p className="text-xs text-zinc-400 text-center py-12">Tu carrito está vacío 🌸</p>
              ) : (
                <>
                  <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                    {carrito.map((item) => (
                      <div key={item.keyUnica} className="flex items-center justify-between gap-2 bg-zinc-50 border p-2.5 rounded-2xl text-xs">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {item.producto.imagen_producto && <img src={item.producto.imagen_producto} alt="" className="w-11 h-11 rounded-xl object-cover border shrink-0" />}
                          <div className="truncate">
                            <p className="font-bold text-zinc-900 truncate">{item.producto.nombre_producto}</p>
                            {item.varianteNombre && <p className="text-[10px] font-bold text-indigo-600">{item.varianteNombre}</p>}
                            <p className="text-pink-600 font-extrabold">${(item.precioUnitario * item.cantidad).toFixed(2)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 bg-white border rounded-xl px-2 py-1 shrink-0">
                          <button type="button" onClick={() => cambiarCantidadCarrito(item.keyUnica, -1)} className="font-black text-zinc-500 px-1">-</button>
                          <span className="font-bold">{item.cantidad}</span>
                          <button type="button" onClick={() => cambiarCantidadCarrito(item.keyUnica, 1)} className="font-black text-pink-600 px-1">+</button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {productosDestacados.filter((d) => !carrito.some((c) => c.producto.id === d.id)).length > 0 && (
                    <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-2.5 space-y-2">
                      <p className="text-[10px] font-extrabold text-amber-900">✨ ¿Aprovechas tu envío acumulado? Mira esto:</p>
                      <div className="space-y-1.5">
                        {productosDestacados
                          .filter((d) => !carrito.some((c) => c.producto.id === d.id))
                          .slice(0, 2)
                          .map((sug) => (
                            <div key={sug.id} className="bg-white border rounded-xl p-1.5 flex items-center justify-between gap-2 text-[11px]">
                              <div className="flex items-center gap-2 min-w-0">
                                {sug.imagen_producto && <img src={sug.imagen_producto} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />}
                                <div className="truncate">
                                  <p className="font-bold text-zinc-800 truncate">{sug.nombre_producto}</p>
                                  <p className="text-[10px] text-pink-600 font-extrabold">${Number(sug.precio).toFixed(2)} · {sug.badge_especial || '✨ Recomendado'}</p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => (Array.isArray(sug.variantes) && sug.variantes.length > 0 ? abrirModalProducto(sug) : agregarAlCarrito(sug, null))}
                                className="px-2.5 py-1 rounded-lg bg-pink-600 text-white text-[10px] font-bold shrink-0"
                              >
                                + Añadir
                              </button>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-3 border-t pt-3">
                    <div className="bg-pink-50 border border-pink-100 rounded-2xl p-3.5 flex justify-between items-center text-sm font-black">
                      <span>Total Artículos:</span>
                      <span className="text-pink-600">${subtotalCarrito.toFixed(2)} USD</span>
                    </div>
                    <p className="text-[11px] text-zinc-500 text-center">
                      Se guardará directo en <strong>Mis Pedidos</strong> para que sumes todo y envíes tu pago por WhatsApp ✨
                    </p>
                    <button
                      type="button"
                      disabled={procesando}
                      onClick={enviarDirectoAMisPedidos}
                      className="w-full py-3.5 bg-zinc-950 hover:bg-pink-600 text-white font-black text-xs uppercase rounded-xl transition-all"
                    >
                      {procesando ? 'Guardando...' : `✨ Agregar a Mis Pedidos ($${subtotalCarrito.toFixed(2)}) ➔`}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
