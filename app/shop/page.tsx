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
          nombre: perfil?.nombre_completo || mail.split('@').at(0) || 'Joiner',
          ig: perfil?.usuario_red || '',
        });

        const { data: dataWish } = await supabase
          .from('wishlist_joiners')
          .select('producto_id')
          .eq('user_email', mail);
        setWishlistIds((dataWish || []).map((w: any) => Number(w.producto_id)));
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
    if (busqueda) {
      const termino = busqueda.toLowerCase().trim();
      const camposBusqueda = [
        p.nombre_producto,
        p.grupo,
        p.integrante,
        p.era,
        p.tipo_pc,
        p.categoria,
        p.badge_especial,
        p.descripcion,
        p.due_date,
      ].filter(Boolean).join(' ').toLowerCase();
      if (!camposBusqueda.includes(termino)) return false;
    }
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
    if (!usuarioEmail) { alert('Inicia sesión para realizar tu pedido.'); router.push('/joiner-login?redirect=/shop'); return; }
    setProcesando(true);
    try {
      const token = await (await import('@/lib/firebaseClient')).firebaseAuth.currentUser?.getIdToken();
      const response = await fetch('/api/shop/order', {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ items: carrito.map(i => ({ productId: i.producto.id, variantName: i.varianteNombre, quantity: i.cantidad, name: i.producto.nombre_producto, price: i.precioUnitario, image: i.producto.imagen_producto })), name: perfilCliente.nombre, instagram: perfilCliente.ig }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error === 'OUT_OF_STOCK' ? 'Uno de los artículos ya no tiene suficiente stock. Actualiza la tienda.' : result.error || 'No se pudo registrar el pedido.');
      setCarrito([]); setMostrarCarrito(false); router.push('/mi-escritorio');
    } catch (error:any) { alert(error.message || 'No se pudo completar el pedido.'); }
    finally { setProcesando(false); }
  }

  if (loading) return <div className="min-h-screen bg-[#FFF7FA] flex items-center justify-center text-sm font-semibold text-[#B84B7B]">Preparando tu tienda ✦</div>;

  const todasFotosDetalle = [productoDetalle?.imagen_producto, ...(productoDetalle?.fotos_extra || [])].filter(Boolean) as string[];

  return (
    <main className="min-h-screen overflow-x-clip bg-[#FFF8FA] text-[#3F3540] pb-28 selection:bg-pink-200">
      {/* Identidad de la tienda: no repetimos el menú global del sitio */}
      <header className="sticky top-0 z-40 border-b border-[#F3DCE7] bg-[#FFF9FB]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/shop" className="flex min-w-0 items-center gap-2" aria-label="Hyuneatelier Shop">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#F9DCE9] text-[#B83E78] text-lg">♡</span>
            <span className="leading-tight">
              <span className="block text-[19px] font-extrabold tracking-[-0.06em] text-[#B83E78]">hyuneatelier</span>
              <span className="block text-[8px] font-bold tracking-[0.24em] text-[#A98A9B]">K-POP COLLECTIBLES</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setMostrarGuia(true)} className="rounded-full border border-[#F0D5E2] bg-white px-3 py-2 text-[11px] font-bold text-[#A83D72] shadow-sm">¿Cómo comprar?</button>
            <button type="button" onClick={() => setMostrarCarrito(true)} className="relative flex h-10 w-10 items-center justify-center rounded-full bg-[#C43D7D] text-white shadow-sm" aria-label="Abrir carrito">
              <span className="text-base">♧</span>
              {totalItemsCarrito > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-[#FFF9FB] bg-[#F4D36E] px-1 text-[10px] font-black text-[#59472A]">{totalItemsCarrito}</span>}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl space-y-5 px-3 pt-4 sm:px-6 sm:pt-8">
        <section className="overflow-hidden rounded-[28px] border border-[#F2D8E5] bg-gradient-to-br from-[#FCEAF2] via-[#FFF9F5] to-[#EAF5EF] p-4 shadow-[0_8px_30px_rgba(190,104,146,0.07)] sm:p-7">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="mb-1 text-[9px] font-extrabold uppercase tracking-[0.24em] text-[#B87998]">THE ATELIER EDIT</p>
              <h1 className="text-[25px] font-extrabold tracking-[-0.045em] text-[#B83E78] sm:text-3xl">Hyuneatelier Shop<span className="ml-1 text-[#D9AFC3]">♡</span></h1>
              <p className="mt-1 text-[10px] font-medium tracking-[0.12em] text-[#8F7885]">K-POP COLLECTIBLES · PHOTOCARDS · MERCH</p>
            </div>
            <button type="button" onClick={() => setMostrarGuia(true)} className="rounded-xl border border-white/90 bg-white/75 px-3 py-2 text-[10px] font-bold text-[#9C6480] shadow-sm">Guía de compra ↗</button>
          </div>

          <div className="mb-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button type="button" onClick={() => { setFiltroGrupo('TODOS'); setFiltroIntegrante('TODOS'); setFiltroEra('TODOS'); setFiltroTipoPc('TODOS'); }} className={`shrink-0 rounded-xl px-4 py-2.5 text-[11px] font-extrabold transition ${filtroGrupo === 'TODOS' ? 'bg-[#C43D7D] text-white shadow-sm' : 'border border-white bg-white/80 text-[#806B77]'}`}>Todos los grupos</button>
            {gruposUnicos.map((g, i) => (
              <button key={g} type="button" onClick={() => { setFiltroGrupo(g); setFiltroIntegrante('TODOS'); setFiltroEra('TODOS'); setFiltroTipoPc('TODOS'); }} className={`shrink-0 rounded-xl px-4 py-2.5 text-[11px] font-extrabold transition ${filtroGrupo === g ? 'bg-[#C43D7D] text-white shadow-sm' : `border border-white ${i % 3 === 0 ? 'bg-[#FCE4EE]' : i % 3 === 1 ? 'bg-[#E7F2E9]' : 'bg-[#FFF0CC]'} text-[#806B77]`}`}>{g}</button>
            ))}
          </div>

          <div className="mb-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#987B8B]">Shop by member</p>
              <span className="text-[10px] text-[#A98A9B]">Desliza para ver más →</span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <button type="button" onClick={() => setFiltroIntegrante('TODOS')} className="flex w-[62px] shrink-0 flex-col items-center gap-1.5">
                <span className={`flex h-[54px] w-[54px] items-center justify-center rounded-full border-2 text-[11px] font-black ${filtroIntegrante === 'TODOS' ? 'border-[#C43D7D] bg-[#C43D7D] text-white' : 'border-white bg-[#FCE4EE] text-[#B83E78]'}`}>ALL</span>
                <span className={`text-[10px] font-bold ${filtroIntegrante === 'TODOS' ? 'text-[#B83E78]' : 'text-[#806F79]'}`}>Todos</span>
              </button>
              {integrantesDisponibles.map((integ) => {
                const fotoMember = fotosIntegrantes[integ.toLowerCase().trim()];
                const activo = filtroIntegrante === integ;
                return <button key={integ} type="button" onClick={() => setFiltroIntegrante(activo ? 'TODOS' : integ)} className="flex w-[62px] shrink-0 flex-col items-center gap-1.5">
                  <span className={`h-[54px] w-[54px] overflow-hidden rounded-full border-2 bg-white p-[2px] ${activo ? 'border-[#C43D7D] ring-2 ring-[#F4C9DC]' : 'border-white shadow-sm'}`}>
                    {fotoMember ? <img src={fotoMember} alt={integ} loading="lazy" decoding="async" className="h-full w-full rounded-full object-cover"/> : <span className="flex h-full w-full items-center justify-center rounded-full bg-[#EAF3EC] text-xs font-black text-[#668A73]">{integ.slice(0,2).toUpperCase()}</span>}
                  </span>
                  <span className={`max-w-[62px] truncate text-[10px] font-bold ${activo ? 'text-[#B83E78]' : 'text-[#806F79]'}`}>{integ}</span>
                </button>;
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1.3fr_1fr_1fr]">
            <label className="col-span-2 flex min-h-[50px] min-w-0 items-center gap-3 rounded-[18px] border border-[#F0DCE6] bg-white px-4 py-3 shadow-[0_3px_12px_rgba(177,112,143,0.05)] sm:col-span-1">
              <span className="shrink-0 text-lg leading-none text-[#C45A8A]">⌕</span>
              <input type="search" placeholder="Buscar photocards, álbumes, integrantes..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="min-w-0 flex-1 bg-transparent text-[13px] text-[#51444D] outline-none placeholder:text-[#B7A8B0]"/>
              {busqueda && <button type="button" aria-label="Borrar búsqueda" onClick={() => setBusqueda('')} className="shrink-0 rounded-full bg-[#F9EAF1] px-2 py-1 text-xs font-bold text-[#A85A7D]">✕</button>}
            </label>

            <label className="relative flex min-h-[76px] min-w-0 flex-col justify-center gap-1.5 rounded-[18px] border border-[#D8E9DC] bg-[#F1F8F1] px-3 py-2.5 shadow-[0_3px_12px_rgba(116,157,125,0.06)]">
              <span className="flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-[0.13em] text-[#66866D]">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/80 text-[11px]">◉</span> Era / Serie
              </span>
              <select aria-label="Filtrar por era o serie" value={filtroEra} onChange={(e) => setFiltroEra(e.target.value)} className="w-full min-w-0 appearance-none truncate bg-transparent pr-5 text-[12px] font-bold text-[#45664D] outline-none">
                <option value="TODOS">Todas las eras</option>
                {erasDisponibles.map((er) => <option key={er} value={er}>{er}</option>)}
              </select>
              <span className="pointer-events-none absolute bottom-[17px] right-3 text-[11px] text-[#66866D]">⌄</span>
            </label>

            <label className="relative flex min-h-[76px] min-w-0 flex-col justify-center gap-1.5 rounded-[18px] border border-[#F0E2BC] bg-[#FFF8E9] px-3 py-2.5 shadow-[0_3px_12px_rgba(190,157,91,0.06)]">
              <span className="flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-[0.13em] text-[#9B8047]">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/80 text-[11px]">▧</span> Tipo
              </span>
              <select aria-label="Filtrar por tipo de producto" value={filtroTipoPc} onChange={(e) => setFiltroTipoPc(e.target.value)} className="w-full min-w-0 appearance-none truncate bg-transparent pr-5 text-[12px] font-bold text-[#796338] outline-none">
                <option value="TODOS">Todos los tipos</option>
                {tiposPcDisponibles.map((tp) => <option key={tp} value={tp}>{tp}</option>)}
              </select>
              <span className="pointer-events-none absolute bottom-[17px] right-3 text-[11px] text-[#9B8047]">⌄</span>
            </label>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[10px] font-medium text-[#9A8490]">{productosFiltrados.length} {productosFiltrados.length === 1 ? 'pieza' : 'piezas'} en el catálogo</span>
            <button type="button" onClick={() => setSoloWishlist(!soloWishlist)} className={`rounded-full px-3 py-1.5 text-[10px] font-bold ${soloWishlist ? 'bg-[#C43D7D] text-white' : 'border border-[#F0D5E2] bg-white/80 text-[#A83D72]'}`}>{soloWishlist ? '♥ Wishlist activa' : `♡ Wishlist (${wishlistIds.length})`}</button>
          </div>
        </section>

        {productosDestacados.length > 0 && !soloWishlist && (
          <section className="space-y-3">
            <div className="flex items-end justify-between px-1"><div><p className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-[#B98A56]">CURATED FOR YOU</p><h2 className="text-lg font-black tracking-tight text-[#594A53]">Picks del Atelier</h2></div><span className="rounded-full bg-[#FFF0CC] px-3 py-1.5 text-[9px] font-bold text-[#927641]">Special selection</span></div>
            <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {productosDestacados.slice(0,6).map((dest) => <button key={dest.id} type="button" onClick={() => abrirModalProducto(dest)} className="w-[148px] shrink-0 overflow-hidden rounded-[20px] border border-[#F1DFE7] bg-white p-2 text-left shadow-[0_4px_16px_rgba(160,100,130,0.06)]">
                <div className="relative aspect-[4/5] overflow-hidden rounded-[14px] bg-[#F7F1F4]">{dest.imagen_producto && <img src={dest.imagen_producto} alt={dest.nombre_producto} loading="lazy" decoding="async" className="h-full w-full object-cover"/>}<span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-1 text-[8px] font-extrabold text-[#A83D72]">{dest.badge_especial || 'Atelier pick'}</span></div>
                <p className="mt-2 truncate text-[9px] font-bold uppercase tracking-wide text-[#B45A83]">{dest.grupo} {dest.integrante ? `· ${dest.integrante}` : ''}</p><p className="mt-0.5 line-clamp-2 min-h-[30px] text-[11px] font-bold text-[#51444D]">{dest.nombre_producto}</p><p className="mt-1 text-[12px] font-black text-[#C43D7D]">${Number(dest.precio).toFixed(2)}</p>
              </button>)}
            </div>
          </section>
        )}

        <section className="space-y-3">
          <div className="flex items-end justify-between px-1"><div><p className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-[#B98A9D]">THE COLLECTION</p><h2 className="text-lg font-black tracking-tight text-[#594A53]">{soloWishlist ? 'Tu Wishlist' : 'Explora el catálogo'}</h2></div><span className="text-[10px] text-[#A98A9B]">{productosFiltrados.length} resultados</span></div>
          {productosFiltrados.length === 0 ? <div className="rounded-[24px] border border-dashed border-[#EBCEDC] bg-white/70 px-5 py-12 text-center"><p className="text-2xl text-[#D58EAF]">♡</p><p className="mt-2 text-sm font-bold text-[#806F79]">No encontramos productos</p><p className="mt-1 text-xs text-[#A98A9B]">Prueba cambiando los filtros o la búsqueda.</p><button type="button" onClick={() => {setFiltroGrupo('TODOS');setFiltroIntegrante('TODOS');setFiltroEra('TODOS');setFiltroTipoPc('TODOS');setBusqueda('');setSoloWishlist(false);}} className="mt-4 rounded-xl bg-[#C43D7D] px-4 py-2 text-xs font-bold text-white">Limpiar filtros</button></div> :
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 sm:gap-4">
            {productosFiltrados.map((p) => {
              const tieneVars = Array.isArray(p.variantes) && p.variantes.length > 0;
              const agotado = p.estado_pago === 'SOLD OUT' || p.cantidad_disponible <= 0;
              return <article key={p.id} className="group min-w-0 overflow-hidden rounded-[22px] border border-[#F1E2E9] bg-white p-2 shadow-[0_5px_20px_rgba(160,100,130,0.045)] transition duration-200 hover:shadow-[0_8px_24px_rgba(160,100,130,0.09)]">
                <div className="relative">
                  <button type="button" onClick={() => abrirModalProducto(p)} className="relative block w-full overflow-hidden rounded-[16px] bg-[#F6F0F3] text-left">
                    <div className="aspect-[4/5] w-full">{p.imagen_producto ? <img src={p.imagen_producto} alt={p.nombre_producto} loading="lazy" decoding="async" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"/> : <div className="flex h-full items-center justify-center text-3xl text-[#D5A8BD]">♡</div>}</div>
                    {agotado && <span className="absolute inset-0 flex items-center justify-center bg-[#45343F]/40 text-[10px] font-extrabold tracking-[0.14em] text-white">SOLD OUT</span>}
                    {!agotado && p.cantidad_disponible === 1 && <span className="absolute bottom-2 left-2 rounded-full bg-[#C43D7D] px-2.5 py-1 text-[8px] font-bold text-white shadow-sm">Última unidad</span>}
                  </button>
                  <button type="button" onClick={() => toggleWishlist(p.id)} aria-label="Guardar en wishlist" className={`absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full border border-white/80 shadow-sm backdrop-blur-md transition ${wishlistIds.includes(p.id) ? 'bg-[#FCE5EF]/95 text-[#C43D7D]' : 'bg-white/90 text-[#9B7F8D]'}`}>{wishlistIds.includes(p.id) ? '♥' : '♡'}</button>
                  <span className="absolute left-2 top-2 max-w-[68%] truncate rounded-full bg-[#FFFCFD]/95 px-2.5 py-1 text-[8px] font-bold text-[#856779] shadow-sm">{p.badge_especial || p.tipo_pc || p.categoria || 'Photocard'}</span>
                </div>
                <div className="px-1 pb-1 pt-2.5">
                  <div className="flex min-h-[15px] items-center gap-1 overflow-hidden text-[8px] font-extrabold uppercase tracking-[0.11em] text-[#B45A83]"><span className="truncate">{p.grupo || p.due_date}</span>{p.integrante && p.integrante !== 'Grupal / Todos' && <span className="truncate text-[#7E9A83]">· {p.integrante}</span>}</div>
                  <button type="button" onClick={() => abrirModalProducto(p)} className="mt-1.5 line-clamp-2 min-h-[36px] w-full text-left text-[11px] font-bold leading-[1.35] text-[#51444D]">{p.nombre_producto}</button>
                  {p.era && <p className="mt-1 truncate text-[9px] text-[#9B8992]">{p.era}</p>}
                  <div className="mt-2 flex min-h-[34px] items-center justify-between gap-1 border-t border-[#F4EAF0] pt-2">
                    <span className="text-[13px] font-extrabold tracking-tight text-[#C43D7D]">{tieneVars ? `Desde $${Number(p.precio).toFixed(2)}` : `$${Number(p.precio).toFixed(2)}`}</span>
                    <span className={`shrink-0 rounded-full px-2 py-1 text-[8px] font-bold ${agotado ? 'bg-[#F3F0F2] text-[#A99DA4]' : 'bg-[#EDF5EE] text-[#6F9276]'}`}>{agotado ? 'Agotado' : `Stock ${p.cantidad_disponible}`}</span>
                  </div>
                  <button type="button" disabled={agotado} onClick={() => (tieneVars ? abrirModalProducto(p) : agregarAlCarrito(p, null))} className={`mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-[13px] py-2.5 text-[10px] font-extrabold transition ${agotado ? 'bg-[#F2EFF1] text-[#B7ADB3]' : 'bg-[#F9E7EF] text-[#B43D77] active:scale-[0.98] hover:bg-[#F4D9E5]'}`}>{agotado ? 'No disponible' : tieneVars ? 'Elegir opción  ↗' : 'Añadir al carrito  +'}</button>
                </div>
              </article>;
            })}
          </div>}
        </section>
      </div>

      {/* Navegación inferior pensada para pulgar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[#F0DCE6] bg-white/95 px-2 pt-2 shadow-[0_-6px_24px_rgba(140,90,115,0.08)] backdrop-blur-xl" style={{paddingBottom:'max(env(safe-area-inset-bottom), 8px)'}}>
        <div className="mx-auto grid max-w-xl grid-cols-5 gap-1">
          <Link href="/shop" className="flex flex-col items-center gap-1 rounded-xl py-1.5 text-[#C43D7D]"><span className="text-[19px]">▤</span><span className="text-[9px] font-extrabold">Tienda</span></Link>
          <Link href="/gos" className="flex flex-col items-center gap-1 rounded-xl py-1.5 text-[#8E7C86]"><span className="text-[19px]">🎀</span><span className="text-[9px] font-bold">GOs</span></Link>
          <button type="button" onClick={() => setSoloWishlist(!soloWishlist)} className={`flex flex-col items-center gap-1 rounded-xl py-1.5 ${soloWishlist ? 'text-[#C43D7D]' : 'text-[#8E7C86]'}`}><span className="text-[19px]">♡</span><span className="text-[9px] font-bold">Wishlist</span></button>
          <Link href="/mi-escritorio" className="flex flex-col items-center gap-1 rounded-xl py-1.5 text-[#8E7C86]"><span className="text-[19px]">📦</span><span className="text-[9px] font-bold">Bodega</span></Link>
          <button type="button" onClick={() => setMostrarCarrito(true)} className="relative flex flex-col items-center gap-1 rounded-xl py-1.5 text-[#8E7C86]"><span className="text-[19px]">🛒</span><span className="text-[9px] font-bold">Carrito{totalItemsCarrito > 0 ? ` (${totalItemsCarrito})` : ''}</span></button>
        </div>
      </nav>

      {productoDetalle && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center overflow-hidden bg-[#34232D]/55 backdrop-blur-sm sm:items-center sm:p-5" onClick={() => setProductoDetalle(null)}>
          <div className="relative box-border max-h-[94dvh] w-full min-w-0 max-w-[100vw] overflow-x-hidden overflow-y-auto overscroll-contain rounded-t-[28px] border border-[#F1DCE6] bg-[#FFFAFC] shadow-2xl sm:max-w-xl sm:rounded-[28px]" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 z-20 flex min-w-0 items-center justify-between gap-3 border-b border-[#F2E5EB] bg-[#FFFAFC]/95 px-4 py-3 backdrop-blur">
              <span className="min-w-0 truncate text-[9px] font-extrabold uppercase tracking-[0.18em] text-[#B45A83]">{productoDetalle.grupo} {productoDetalle.era ? `· ${productoDetalle.era}` : ''}</span>
              <button type="button" aria-label="Cerrar detalle del producto" onClick={() => setProductoDetalle(null)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F7EAF0] text-[#8F7482]">✕</button>
            </div>
            <div className="box-border grid w-full min-w-0 grid-cols-1 gap-4 p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] sm:p-5">
              <div className="min-w-0 space-y-2">
                <div className="flex w-full min-w-0 items-center justify-center overflow-hidden rounded-[20px] bg-[#F3EDF0]">
                  {fotoActivaDetalle ? <img src={fotoActivaDetalle} alt={productoDetalle.nombre_producto} className="block h-auto max-h-[48dvh] w-full max-w-full object-contain sm:max-h-[440px]"/> : <div className="flex h-64 w-full items-center justify-center text-4xl text-[#D5A8BD]">♡</div>}
                </div>
                {todasFotosDetalle.length > 1 && <div className="flex w-full min-w-0 gap-2 overflow-x-auto overscroll-x-contain pb-1">{todasFotosDetalle.map((foto, i) => <button key={`${foto}-${i}`} type="button" onClick={() => setFotoActivaDetalle(foto)} className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 ${fotoActivaDetalle === foto ? 'border-[#C43D7D]' : 'border-transparent'}`}><img loading="lazy" decoding="async" src={foto} alt="Vista del producto" className="h-full w-full object-cover"/></button>)}</div>}
              </div>
              <div className="flex min-w-0 flex-col gap-3">
                <div className="min-w-0"><p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-[#B45A83]">{productoDetalle.integrante || productoDetalle.tipo_pc || 'COLLECTIBLE'}</p><h2 className="mt-1 break-words text-xl font-black leading-tight tracking-tight text-[#493B44]">{productoDetalle.nombre_producto}</h2><p className="mt-2 text-sm font-black text-[#C43D7D]">${Number(varianteSeleccionada ? varianteSeleccionada.precio : productoDetalle.precio).toFixed(2)} USD</p></div>
                <p className="break-words text-xs leading-relaxed text-[#82727B]">{productoDetalle.descripcion || 'Artículo disponible en Hyune Atelier Shop.'}</p>
                {Array.isArray(productoDetalle.variantes) && productoDetalle.variantes.length > 0 && <div className="min-w-0 space-y-2"><p className="text-[10px] font-extrabold uppercase tracking-wide text-[#806B77]">Elige tu opción / photocard</p><div className="grid min-w-0 grid-cols-2 gap-2">{productoDetalle.variantes.map((v, idx) => <button key={idx} type="button" disabled={v.stock <= 0} onClick={() => setVarianteSeleccionada(v)} className={`min-w-0 rounded-2xl border p-3 text-left transition ${v.stock <= 0 ? 'border-[#E9E3E7] bg-[#F3F0F2] text-[#B7ADB3]' : varianteSeleccionada?.nombre === v.nombre ? 'border-[#C43D7D] bg-[#FCEAF2] text-[#553E4B] ring-1 ring-[#E9AFC8]' : 'border-[#EDE1E7] bg-white text-[#594A53]'}`}><span className="block break-words text-[11px] font-bold">{v.nombre}</span><span className="mt-1 block text-[9px]">{v.stock > 0 ? `Stock: ${v.stock}` : 'Agotado'}</span><span className="mt-1 block text-[12px] font-black text-[#C43D7D]">${Number(v.precio).toFixed(2)}</span></button>)}</div></div>}
                {relacionadosMismaEra.length > 0 && <div className="box-border w-full min-w-0 overflow-hidden rounded-2xl border border-[#E4EEDF] bg-[#F3F8F1] p-3"><p className="mb-2 text-[10px] font-extrabold text-[#66836B]">Más de esta serie</p><div className="flex w-full min-w-0 gap-2 overflow-x-auto overscroll-x-contain pb-1">{relacionadosMismaEra.map((rel) => <button key={rel.id} type="button" onClick={() => abrirModalProducto(rel)} className="w-[74px] shrink-0 text-left"><span className="block aspect-square overflow-hidden rounded-xl bg-white">{rel.imagen_producto && <img loading="lazy" decoding="async" src={rel.imagen_producto} alt="" className="h-full w-full object-cover"/>}</span><span className="mt-1 block truncate text-[9px] font-bold text-[#66836B]">{rel.integrante || 'Ver'}</span><span className="text-[10px] font-black text-[#594A53]">${Number(rel.precio).toFixed(2)}</span></button>)}</div></div>}
                <button type="button" disabled={productoDetalle.estado_pago === 'SOLD OUT' || productoDetalle.cantidad_disponible <= 0 || (varianteSeleccionada !== null && varianteSeleccionada.stock <= 0)} onClick={() => agregarAlCarrito(productoDetalle, varianteSeleccionada)} className="mt-auto w-full rounded-2xl bg-[#C43D7D] px-4 py-3.5 text-xs font-extrabold text-white shadow-sm disabled:bg-[#D8CDD3]">Añadir al carrito · ${Number(varianteSeleccionada ? varianteSeleccionada.precio : productoDetalle.precio).toFixed(2)}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {mostrarGuia && <div className="fixed inset-0 z-[70] flex items-end justify-center bg-[#34232D]/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={() => setMostrarGuia(false)}><div className="w-full max-w-md space-y-4 rounded-t-[28px] bg-[#FFFAFC] p-5 shadow-2xl sm:rounded-[28px]" onClick={(e) => e.stopPropagation()}><div className="flex items-center justify-between"><div><p className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-[#B45A83]">A LITTLE GUIDE</p><h3 className="text-lg font-black text-[#51414B]">¿Cómo comprar?</h3></div><button type="button" onClick={() => setMostrarGuia(false)} className="h-8 w-8 rounded-full bg-[#F7EAF0]">✕</button></div><div className="space-y-2 text-xs leading-relaxed text-[#766771]"><div className="rounded-2xl bg-[#FCEAF2] p-3"><b className="text-[#A83D72]">01 · Elige tus piezas</b><p>Filtra por grupo o integrante, selecciona tus photocards y agrégalas al carrito.</p></div><div className="rounded-2xl bg-[#F1F7F0] p-3"><b className="text-[#66836B]">02 · Revisa tus pedidos</b><p>Envía el carrito a Mis Pedidos para revisar el total y coordinar el pago.</p></div><div className="rounded-2xl bg-[#FFF5DF] p-3"><b className="text-[#927641]">03 · Acumula en bodega</b><p>Tus compras confirmadas se guardan en tu bodega para que puedas combinar envíos.</p></div></div><button type="button" onClick={() => setMostrarGuia(false)} className="w-full rounded-2xl bg-[#C43D7D] py-3 text-xs font-extrabold text-white">¡Entendido!</button></div></div>}

      {mostrarCarrito && <div className="fixed inset-0 z-[80] flex justify-end bg-[#34232D]/50 backdrop-blur-sm" onClick={() => setMostrarCarrito(false)}><div className="flex h-full w-full max-w-md flex-col bg-[#FFFAFC] shadow-2xl" onClick={(e) => e.stopPropagation()}><div className="flex items-center justify-between border-b border-[#F0DFE7] px-5 py-4"><div><p className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-[#B45A83]">YOUR BAG</p><h3 className="text-lg font-black text-[#51414B]">Carrito ({totalItemsCarrito})</h3></div><button type="button" onClick={() => setMostrarCarrito(false)} className="h-9 w-9 rounded-full bg-[#F7EAF0]">✕</button></div><div className="flex-1 space-y-3 overflow-y-auto p-4">{carrito.length === 0 ? <div className="py-16 text-center"><p className="text-3xl text-[#D58EAF]">♡</p><p className="mt-2 text-sm font-bold text-[#806F79]">Tu carrito está vacío</p><p className="mt-1 text-xs text-[#A98A9B]">Encuentra algo que te encante.</p></div> : <>{carrito.map((item) => <div key={item.keyUnica} className="flex items-center gap-3 rounded-2xl border border-[#F0E2E9] bg-white p-3"><div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[#F4EDF1]">{item.producto.imagen_producto && <img loading="lazy" decoding="async" src={item.producto.imagen_producto} alt="" className="h-full w-full object-cover"/>}</div><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-[#51444D]">{item.producto.nombre_producto}</p>{item.varianteNombre && <p className="text-[10px] text-[#9A8490]">{item.varianteNombre}</p>}<p className="mt-1 text-xs font-black text-[#C43D7D]">${(item.precioUnitario * item.cantidad).toFixed(2)}</p></div><div className="flex items-center gap-2 rounded-xl bg-[#F9EFF4] px-2 py-1"><button type="button" onClick={() => cambiarCantidadCarrito(item.keyUnica,-1)} className="px-1 font-bold">−</button><span className="text-xs font-bold">{item.cantidad}</span><button type="button" onClick={() => cambiarCantidadCarrito(item.keyUnica,1)} className="px-1 font-bold text-[#C43D7D]">+</button></div></div>)}
        {productosDestacados.filter((d) => !carrito.some((c) => c.producto.id === d.id)).length > 0 && <div className="rounded-2xl border border-[#F0E1B9] bg-[#FFF8E8] p-3"><p className="mb-2 text-[10px] font-extrabold text-[#927641]">También podría gustarte</p>{productosDestacados.filter((d) => !carrito.some((c) => c.producto.id === d.id)).slice(0,2).map((sug) => <div key={sug.id} className="flex items-center gap-2 border-t border-[#F0E8D3] py-2"><div className="h-10 w-10 overflow-hidden rounded-lg bg-white">{sug.imagen_producto && <img loading="lazy" decoding="async" src={sug.imagen_producto} alt="" className="h-full w-full object-cover"/>}</div><p className="min-w-0 flex-1 truncate text-[10px] font-bold">{sug.nombre_producto}</p><button type="button" onClick={() => (Array.isArray(sug.variantes) && sug.variantes.length > 0 ? abrirModalProducto(sug) : agregarAlCarrito(sug,null))} className="rounded-lg bg-white px-2.5 py-1.5 text-[9px] font-bold text-[#A83D72]">Añadir</button></div>)}</div>}</>}</div>
        {carrito.length > 0 && <div className="space-y-3 border-t border-[#F0DFE7] bg-white p-4" style={{paddingBottom:'max(env(safe-area-inset-bottom), 16px)'}}><div className="flex items-center justify-between text-sm"><span className="font-bold text-[#806F79]">Subtotal</span><span className="text-lg font-black text-[#C43D7D]">${subtotalCarrito.toFixed(2)} USD</span></div><p className="text-[10px] leading-relaxed text-[#9A8490]">Se guardará en Mis Pedidos para que puedas revisar el total y coordinar el pago.</p><button type="button" disabled={procesando} onClick={enviarDirectoAMisPedidos} className="w-full rounded-2xl bg-[#C43D7D] py-4 text-xs font-extrabold text-white disabled:opacity-60">{procesando ? 'Guardando...' : `Enviar a Mis Pedidos · $${subtotalCarrito.toFixed(2)}`}</button></div>}</div></div>}
    </main>
  );
}
