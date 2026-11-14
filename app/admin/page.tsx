'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

type Go = { id: number; title: string; group_name: string };

type ItemTarjeta = {
  idUnico: string;
  claimKeyBase?: string;
  pedidoId?: number;
  origen: 'GO' | 'SHOP';
  goTitulo: string;
  productoNombre: string;
  imagenUrl: string | null;
  detalleSlot: string;
  cantidad: number;
  precioTotal: number;
  estadoConfirmacion: string;
  estadoPago: string;
  fechaPago: string;
};

type TarjetaJoiner = {
  tarjetaId: string;
  correo: string;
  nombreReal: string;
  categoriaTitulo: string;
  origen: 'GO' | 'SHOP';
  items: ItemTarjeta[];
  totalTarjeta: number;
};

type ProductoAdmin = {
  id: number;
  nombre_producto: string;
  precio: number;
  go_id: number;
  cantidad_disponible: number;
  descripcion: string | null;
  lista_slots?: string | null;
  stock_slots?: { [key: string]: number } | null;
  isShop?: boolean;
  estado_pago?: string;
  due_date?: string;
};

export default function AdminPanelPremium() {
  const [pestanaAdmin, setPestanaAdmin] = useState<'joiners' | 'lanzar' | 'items' | 'stock'>('joiners');
  const [usuarioEmail, setUsuarioEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingForm, setLoadingForm] = useState(false);
  const [subiendoImagen, setSubiendoImagen] = useState(false);

  const [tarjetasJoiners, setTarjetasJoiners] = useState<TarjetaJoiner[]>([]);
  const [filtroCategoria, setFiltroCategoria] = useState<string>('TODOS');
  const [filtroEstado, setFiltroEstado] = useState<'TODOS' | 'PENDIENTES' | 'PAGADOS'>('TODOS');
  const [busqueda, setBusqueda] = useState('');
  const [editandoNombreCorreo, setEditandoNombreCorreo] = useState<string | null>(null);
  const [inputNombreTemp, setInputNombreTemp] = useState('');

  const [gosAdmin, setGosAdmin] = useState<Go[]>([]);
  const [productosAdmin, setProductosAdmin] = useState<ProductoAdmin[]>([]);
  const [productosTiendaAdmin, setProductosTiendaAdmin] = useState<ProductoAdmin[]>([]);
  const [inputsStock, setInputsStock] = useState<{ [prodId: number]: { [slot: string]: string } }>({});
  const [idProductoStockSelected, setIdProductoStockSelected] = useState<number | null>(null);
  const correoAdmin = 'liahwang1852@gmail.com';
  const [newGoTitle, setNewGoTitle] = useState('');
  const [newGoGroup, setNewGoGroup] = useState('stray kids');
  const [newGoImage, setNewGoImage] = useState('');
  const [selectedGoId, setSelectedGoId] = useState<number | null>(null);
  const [newProdName, setNewProdName] = useState('');
  const [newProdPrice, setNewProdPrice] = useState('');
  const [newProdSlots, setNewProdSlots] = useState('');
  const [newProdImage, setNewProdImage] = useState('');
  const [newProdQty, setNewProdQty] = useState('1');
  const [newProdDesc, setNewProdDesc] = useState('');

  const [newShopName, setNewShopName] = useState('');
  const [newShopPrice, setNewShopPrice] = useState('');
  const [newShopStatus, setNewShopStatus] = useState('INSTOCK');
  const [newShopImage, setNewShopImage] = useState('');
  const [newShopGroup, setNewShopGroup] = useState('stray kids');
  const [newShopQty, setNewShopQty] = useState('1');
  const [newShopDesc, setNewShopDesc] = useState('');

  const [editandoProducto, setEditandoProducto] = useState<ProductoAdmin | null>(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editQty, setEditQty] = useState('');
  const [editDesc, setEditDesc] = useState('');

  async function uploadImageHandler(e: React.ChangeEvent<HTMLInputElement>, targetForm: 'go' | 'prod' | 'shop') {
    const file = e.target.files?.[0];
    if (!file) return;
    setSubiendoImagen(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const { error } = await supabase.storage.from('fotos-productos').upload(fileName, file);
    if (error) { alert('Error: ' + error.message); setSubiendoImagen(false); return; }
    const { data: { publicUrl } } = supabase.storage.from('fotos-productos').getPublicUrl(fileName);
    if (targetForm === 'go') setNewGoImage(publicUrl);
    else if (targetForm === 'prod') setNewProdImage(publicUrl);
    else setNewShopImage(publicUrl);
    setSubiendoImagen(false);
    alert('¡Imagen cargada! 📸');
  }

  async function cargarDatosHibridos() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email && user.email === correoAdmin) {
        setUsuarioEmail(user.email);

        const [{ data: dataGos }, { data: dataAllProds }, { data: dataSeg }, { data: dataPerfiles }, { data: dataTiendaProds }, { data: dataPedidos }] =
          await Promise.all([
            supabase.from('gos').select('*'),
            supabase.from('productos').select('id, nombre_producto, precio, go_id, cantidad_disponible, descripcion, lista_slots, stock_slots, claims_integrantes, imagen_producto, gos(title)'),
            supabase.from('seguimiento_claims').select('*'),
            supabase.from('perfiles_joiners').select('*'),
            supabase.from('tienda_productos').select('*'),
            supabase.from('pedidos').select('*').order('id', { ascending: false }),
          ]);

        if (dataGos) {
          setGosAdmin(dataGos.map((g: any) => ({ id: g.id, title: g.title, group_name: g.group_name })));
          if (dataGos.length > 0 && !selectedGoId) setSelectedGoId(dataGos[0].id);
        }

        const mapaSeg: Record<string, any> = {};
        if (dataSeg) dataSeg.forEach((s: any) => { mapaSeg[s.claim_key] = s; });

        const mapaNombres: Record<string, string> = {};
        if (dataPerfiles) dataPerfiles.forEach((pf: any) => { if (pf.nombre_completo) mapaNombres[pf.user_email.toLowerCase()] = pf.nombre_completo; });

        const agrupadoPorGoYJoiner: Record<string, TarjetaJoiner> = {};
        const agregarATarjeta = (correoRaw: string, categoria: string, origen: 'GO' | 'SHOP', item: ItemTarjeta, nombreFallback?: string) => {
          const correo = correoRaw.toLowerCase().trim();
          if (nombreFallback && !mapaNombres[correo]) mapaNombres[correo] = nombreFallback;
          const keyTarjeta = `${categoria}__${correo}`;
          if (!agrupadoPorGoYJoiner[keyTarjeta]) {
            agrupadoPorGoYJoiner[keyTarjeta] = {
              tarjetaId: keyTarjeta,
              correo,
              nombreReal: mapaNombres[correo] || correo.split('@')[0],
              categoriaTitulo: categoria,
              origen,
              items: [],
              totalTarjeta: 0,
            };
          }
          agrupadoPorGoYJoiner[keyTarjeta].items.push(item);
          agrupadoPorGoYJoiner[keyTarjeta].totalTarjeta += item.precioTotal;
        };

        if (dataAllProds) {
          setProductosAdmin(dataAllProds);
          const estructura: typeof inputsStock = {};
          dataAllProds.forEach((p: any) => {
            estructura[p.id] = {};
            const listaSlots = p.lista_slots ? String(p.lista_slots) : '';
            const slots = listaSlots ? listaSlots.split(',').map((s: string) => s.trim()) : [];
            slots.forEach((s: string) => { estructura[p.id][s] = String(p.stock_slots?.[s] ?? '0'); });

            const claims = p.claims_integrantes || {};
            const goTitle = p.gos?.title || 'Group Order';
            Object.entries(claims).forEach(([integrante, dataClaim]: [string, any]) => {
              if (!dataClaim) return;
              const claimKey = `${p.id}-${integrante}`;
              const seg = mapaSeg[claimKey];

              if (typeof dataClaim === 'string') {
                agregarATarjeta(dataClaim, goTitle, 'GO', {
                  idUnico: claimKey,
                  claimKeyBase: claimKey,
                  origen: 'GO',
                  goTitulo: goTitle,
                  productoNombre: p.nombre_producto,
                  imagenUrl: p.imagen_producto || null,
                  detalleSlot: integrante,
                  cantidad: 1,
                  precioTotal: Number(p.precio || 0),
                  estadoConfirmacion: seg?.estado_confirmacion || 'Pendiente',
                  estadoPago: seg?.estado_pago || 'Sin pagar',
                  fechaPago: seg?.fecha_pago || '',
                });
              } else if (typeof dataClaim === 'object') {
                Object.entries(dataClaim).forEach(([correoCliente, cant]: [string, any]) => {
                  if (!correoCliente || !cant) return;
                  agregarATarjeta(correoCliente, goTitle, 'GO', {
                    idUnico: `${claimKey}-${correoCliente}`,
                    claimKeyBase: claimKey,
                    origen: 'GO',
                    goTitulo: goTitle,
                    productoNombre: p.nombre_producto,
                    imagenUrl: p.imagen_producto || null,
                    detalleSlot: integrante,
                    cantidad: Number(cant),
                    precioTotal: Number(p.precio || 0) * Number(cant),
                    estadoConfirmacion: seg?.estado_confirmacion || 'Pendiente',
                    estadoPago: seg?.estado_pago || 'Sin pagar',
                    fechaPago: seg?.fecha_pago || '',
                  });
                });
              }
            });
          });
          setInputsStock(estructura);
        }

        if (dataTiendaProds) {
          setProductosTiendaAdmin(dataTiendaProds.map((p: any) => ({
            id: p.id, nombre_producto: p.nombre_producto, precio: p.precio, go_id: 0,
            cantidad_disponible: p.cantidad_disponible, descripcion: p.descripcion,
            estado_pago: p.estado_pago, due_date: p.due_date, isShop: true,
          })));
        }

        if (dataPedidos) {
          dataPedidos.forEach((ped: any) => {
            if (ped.user_email && ped.user_email !== 'STOCK_TIENDA_FISICA') {
              agregarATarjeta(ped.user_email, 'Tienda / Shop', 'SHOP', {
                idUnico: `shop-${ped.id}`,
                pedidoId: ped.id,
                origen: 'SHOP',
                goTitulo: 'Tienda / Shop',
                productoNombre: ped.producto_nombre || ped.detalles || 'Pedido Tienda',
                imagenUrl: ped.imagen_producto || null,
                detalleSlot: ped.detalles || 'Compra directa',
                cantidad: 1,
                precioTotal: Number(ped.total_pagar || 0),
                estadoConfirmacion: ped.estado_confirmacion || 'Pendiente',
                estadoPago: ped.estado_pago || 'Sin pagar',
                fechaPago: ped.fecha_pago || '',
              }, ped.nombre_cliente || ped.user_name);
            }
          });
        }

        setTarjetasJoiners(Object.values(agrupadoPorGoYJoiner));
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }

  useEffect(() => { cargarDatosHibridos(); }, []);
  async function guardarNombreJoiner(correo: string) {
    if (!inputNombreTemp.trim()) { setEditandoNombreCorreo(null); return; }
    await supabase.from('perfiles_joiners').upsert({
      user_email: correo.toLowerCase().trim(),
      nombre_completo: inputNombreTemp.trim(),
    });
    setTarjetasJoiners((prev) =>
      prev.map((t) => (t.correo === correo ? { ...t, nombreReal: inputNombreTemp.trim() } : t))
    );
    setEditandoNombreCorreo(null);
  }

  async function actualizarTarjetaCompleta(tarjeta: TarjetaJoiner, campo: 'estadoConfirmacion' | 'estadoPago' | 'fechaPago', valor: string) {
    const fechaAuto = campo === 'estadoPago' && valor === 'Pagado' ? new Date().toISOString().split('T')[0] : null;

    setTarjetasJoiners((prev) =>
      prev.map((t) => {
        if (t.tarjetaId !== tarjeta.tarjetaId) return t;
        return {
          ...t,
          items: t.items.map((it) => ({
            ...it,
            [campo]: valor,
            fechaPago: fechaAuto && !it.fechaPago ? fechaAuto : campo === 'fechaPago' ? valor : it.fechaPago,
          })),
        };
      })
    );

    for (const item of tarjeta.items) {
      const nuevoConfirm = campo === 'estadoConfirmacion' ? valor : item.estadoConfirmacion;
      const nuevoPago = campo === 'estadoPago' ? valor : item.estadoPago;
      const nuevaFecha = campo === 'fechaPago' ? valor : fechaAuto && !item.fechaPago ? fechaAuto : item.fechaPago;

      if (item.origen === 'GO' && item.claimKeyBase) {
        await supabase.from('seguimiento_claims').upsert({
          claim_key: item.claimKeyBase,
          user_email: tarjeta.correo,
          go_title: tarjeta.categoriaTitulo,
          producto_nombre: item.productoNombre,
          integrante: item.detalleSlot,
          estado_confirmacion: nuevoConfirm,
          estado_pago: nuevoPago,
          fecha_pago: nuevaFecha || null,
        });
      } else if (item.pedidoId) {
        await supabase.from('pedidos').update({
          estado_confirmacion: nuevoConfirm,
          estado_pago: nuevoPago,
          fecha_pago: nuevaFecha || null,
        }).eq('id', item.pedidoId);
      }
    }
  }

  const handleEditInputLocal = (prodId: number, slot: string, valor: string) => {
    setInputsStock((prev) => ({ ...prev, [prodId]: { ...(prev[prodId] || {}), [slot]: valor } }));
  };

  async function handleGuardarStockBD(prodId: number) {
    const inputsProd = inputsStock[prodId] || {};
    const jsonNuevo: { [key: string]: number } = {};
    Object.entries(inputsProd).forEach(([slot, val]) => { jsonNuevo[slot] = Math.max(0, parseInt(val) || 0); });
    const { error } = await supabase.from('productos').update({ stock_slots: jsonNuevo }).eq('id', prodId);
    if (!error) { alert('¡Inventario guardado! ✨'); cargarDatosHibridos(); }
  }

  async function handleCreateGO(e: React.FormEvent) {
    e.preventDefault();
    if (!newGoTitle) return alert('Pon el título 🎀');
    setLoadingForm(true);
    const { error } = await supabase.from('gos').insert([{ title: newGoTitle.toUpperCase(), group_name: newGoGroup.toLowerCase(), status: 'OPEN', imagen_general: newGoImage || null }]);
    setLoadingForm(false);
    if (!error) { alert('¡GO creado! ✨'); setNewGoTitle(''); cargarDatosHibridos(); }
  }

  async function handleCrearProducto(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedGoId || !newProdName || !newProdPrice || !newProdSlots) return alert('Completa todos los datos 🧸');
    setLoadingForm(true);
    const slotsArr = newProdSlots.split(',').map((s) => s.trim());
    const jsonStockInicial: { [key: string]: number } = {};
    slotsArr.forEach((s) => { jsonStockInicial[s] = Number(newProdQty); });
    const { error } = await supabase.from('productos').insert([{
      go_id: selectedGoId, nombre_producto: newProdName.toUpperCase(), precio: Number(newProdPrice),
      lista_slots: newProdSlots, imagen_producto: newProdImage || null, claims_integrantes: {},
      cantidad_disponible: Number(newProdQty), stock_slots: jsonStockInicial, descripcion: newProdDesc || null,
    }]);
    setLoadingForm(false);
    if (!error) { alert('¡Artículo publicado! 📦'); setNewProdName(''); setNewProdPrice(''); setNewProdSlots(''); setNewProdDesc(''); cargarDatosHibridos(); }
  }

  async function handleCrearItemShop(e: React.FormEvent) {
    e.preventDefault();
    if (!newShopName || !newShopPrice) return alert('Llena los datos');
    setLoadingForm(true);
    const { error } = await supabase.from('tienda_productos').insert([{
      nombre_producto: newShopName.toUpperCase(), precio: Number(newShopPrice), cantidad_disponible: Number(newShopQty),
      descripcion: newShopDesc || null, estado_pago: newShopStatus, due_date: newShopGroup, imagen_producto: newShopImage || null,
    }]);
    setLoadingForm(false);
    if (!error) { alert('¡Añadido a la Shop! 🛍️'); setNewShopName(''); setNewShopPrice(''); setNewShopDesc(''); setNewShopImage(''); cargarDatosHibridos(); }
  }
  async function handleEliminarGO(idGo: number) {
    if (!confirm('⚠️ ¿Borrar másterlist entera?')) return;
    const { error } = await supabase.from('gos').delete().eq('id', idGo);
    if (!error) { setSelectedGoId(null); cargarDatosHibridos(); }
  }

  async function handleEliminarProducto(idProd: number, isShop?: boolean) {
    if (!confirm('¿Borrar este ítem?')) return;
    const { error } = await supabase.from(isShop ? 'tienda_productos' : 'productos').delete().eq('id', idProd);
    if (!error) cargarDatosHibridos();
  }

  const iniciarEdicion = (p: ProductoAdmin) => {
    setEditandoProducto(p); setEditName(p.nombre_producto); setEditPrice(String(p.precio));
    setEditQty(String(p.cantidad_disponible)); setEditDesc(p.descripcion || '');
  };

  async function handleGuardarEdicion(e: React.FormEvent) {
    e.preventDefault();
    if (!editandoProducto) return;
    setLoadingForm(true);
    await supabase.from(editandoProducto.isShop ? 'tienda_productos' : 'productos')
      .update({ nombre_producto: editName.toUpperCase(), precio: Number(editPrice), cantidad_disponible: Number(editQty), descripcion: editDesc || null })
      .eq('id', editandoProducto.id);
    setLoadingForm(false); setEditandoProducto(null); cargarDatosHibridos();
  }

  const categoriasDisponibles = Array.from(new Set(tarjetasJoiners.map((t) => t.categoriaTitulo)));

  const tarjetasFiltradas = tarjetasJoiners.filter((t) => {
    if (filtroCategoria !== 'TODOS' && t.categoriaTitulo !== filtroCategoria) return false;
    const estaPagado = t.items.every((i) => i.estadoPago === 'Pagado');
    if (filtroEstado === 'PAGADOS' && !estaPagado) return false;
    if (filtroEstado === 'PENDIENTES' && estaPagado) return false;
    if (busqueda && !t.nombreReal.toLowerCase().includes(busqueda.toLowerCase()) && !t.correo.toLowerCase().includes(busqueda.toLowerCase())) return false;
    return true;
  });

  if (loading) return <div className="min-h-screen bg-[#F6F7F9] flex items-center justify-center font-mono text-xs text-zinc-400">✧ cargando órdenes por joiner...</div>;
  if (usuarioEmail !== correoAdmin) {
    return (
      <div className="min-h-screen bg-[#F6F7F9] flex flex-col items-center justify-center p-4 gap-3">
        <p className="text-sm font-bold text-rose-600 bg-white border border-rose-100 px-6 py-3 rounded-full">✕ Acceso exclusivo de Atelier de Hyun 🎀</p>
        <Link href="/gos" className="text-xs underline text-zinc-500">Volver al catálogo ➔</Link>
      </div>
    );
  }

  const todosLosProductosAdmin = [...productosAdmin, ...productosTiendaAdmin];
  const coloresAvatar = ['bg-teal-700', 'bg-pink-600', 'bg-amber-600', 'bg-indigo-600', 'bg-emerald-700', 'bg-purple-700'];
  return (
    <div className="min-h-screen bg-[#F6F7F9] font-sans text-zinc-800 pb-16">
      <div className="bg-white border-b border-zinc-200 px-5 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center gap-4">
            <span className="font-black text-base tracking-tight text-zinc-900">🎀 Atelier Admin</span>
            <div className="flex gap-1 bg-zinc-100 p-1 rounded-xl">
              {[
                { id: 'joiners', label: '📋 Órdenes por Joiner' },
                { id: 'lanzar', label: '➕ Crear GO / Tienda' },
                { id: 'items', label: '🛠️ Ítems' },
                { id: 'stock', label: '📦 Stock' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setPestanaAdmin(tab.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${pestanaAdmin === tab.id ? 'bg-white text-zinc-900 shadow-2xs' : 'text-zinc-500 hover:text-zinc-800'}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          <Link href="/gos" className="text-xs font-semibold text-zinc-500 hover:text-pink-600">← Ir al catálogo</Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-5 pt-6">
        {pestanaAdmin === 'joiners' && (
          <div className="space-y-5">
            <div className="flex flex-wrap justify-between items-center gap-3">
              <div>
                <h1 className="text-xl font-extrabold text-zinc-900">Órdenes por Joiner</h1>
                <p className="text-xs text-zinc-500">Cada tarjeta muestra a una persona dentro de un GO específico</p>
              </div>
              <input
                type="text"
                placeholder="Buscar por nombre o correo..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="bg-white border border-zinc-200 rounded-xl px-4 py-2 text-xs w-full sm:w-72 shadow-2xs"
              />
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              <button
                type="button"
                onClick={() => setFiltroCategoria('TODOS')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${filtroCategoria === 'TODOS' ? 'bg-teal-800 text-white' : 'bg-white text-zinc-600 border border-zinc-200'}`}
              >
                Todos los GOs ({tarjetasJoiners.length})
              </button>
              {categoriasDisponibles.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setFiltroCategoria(cat)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${filtroCategoria === cat ? 'bg-pink-600 text-white' : 'bg-white text-zinc-700 border border-zinc-200 hover:border-pink-300'}`}
                >
                  {cat === 'Tienda / Shop' ? '🛍️ ' : '🧸 '} {cat}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              {(['TODOS', 'PENDIENTES', 'PAGADOS'] as const).map((est) => (
                <button
                  key={est}
                  type="button"
                  onClick={() => setFiltroEstado(est)}
                  className={`px-3 py-1 rounded-lg text-[11px] font-bold ${filtroEstado === est ? 'bg-zinc-800 text-white' : 'bg-white text-zinc-500 border border-zinc-200'}`}
                >
                  {est === 'TODOS' ? 'Todas' : est === 'PENDIENTES' ? 'Por pagar / Confirmar' : 'Pagadas'}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {tarjetasFiltradas.map((tarjeta, idx) => {
                const inicial = tarjeta.nombreReal.slice(0, 2).toUpperCase();
                const estadoConfirmActual = tarjeta.items?.estadoConfirmacion || 'Pendiente';
                const estadoPagoActual = tarjeta.items?.estadoPago || 'Sin pagar';
                const fechaPagoActual = tarjeta.items?.fechaPago || '';

                return (
                  <div key={tarjeta.tarjetaId} className="bg-white border border-zinc-200/90 rounded-2xl p-5 shadow-2xs flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl ${coloresAvatar[idx % coloresAvatar.length]} text-white font-black text-xs flex items-center justify-center shrink-0`}>
                            {inicial}
                          </div>
                          <div>
                            {editandoNombreCorreo === tarjeta.correo ? (
                              <div className="flex gap-1">
                                <input
                                  type="text"
                                  value={inputNombreTemp}
                                  onChange={(e) => setInputNombreTemp(e.target.value)}
                                  placeholder="Nombre real..."
                                  className="border rounded px-2 py-0.5 text-xs w-32"
                                  autoFocus
                                />
                                <button type="button" onClick={() => guardarNombreJoiner(tarjeta.correo)} className="bg-emerald-600 text-white text-[10px] px-2 rounded font-bold">OK</button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <h3 className="text-sm font-extrabold text-zinc-900 capitalize">{tarjeta.nombreReal}</h3>
                                <button
                                  type="button"
                                  onClick={() => { setEditandoNombreCorreo(tarjeta.correo); setInputNombreTemp(tarjeta.nombreReal); }}
                                  className="text-[11px] text-zinc-400 hover:text-pink-600"
                                >
                                  ✏️
                                </button>
                              </div>
                            )}
                            <p className="text-[11px] text-zinc-400">{tarjeta.correo}</p>
                          </div>
                        </div>

                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${estadoConfirmActual === 'Confirmado' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                          {estadoConfirmActual === 'Confirmado' ? '✔ Confirmado' : '⏳ Pendiente'}
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-[11px] text-zinc-500 border-b border-zinc-100 pb-2">
                        <span className="font-bold text-pink-600">{tarjeta.categoriaTitulo}</span>
                        <span>{tarjeta.items.length} artículo(s)</span>
                      </div>

                      <div className="space-y-2.5">
                        {tarjeta.items.map((it) => (
                          <div key={it.idUnico} className="flex justify-between items-center gap-2 text-xs">
                            <div className="flex items-center gap-2 min-w-0">
                              {it.imagenUrl ? (
                                <img src={it.imagenUrl} alt="" className="w-8 h-8 rounded-lg object-cover border shrink-0" />
                              ) : (
                                <span className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-xs shrink-0">🧸</span>
                              )}
                              <div className="truncate">
                                <p className="font-semibold text-zinc-800 truncate">{it.productoNombre}</p>
                                <p className="text-[10px] text-pink-600 font-bold">{it.detalleSlot}</p>
                              </div>
                            </div>
                            <span className="font-bold text-zinc-700 shrink-0">
                              {it.cantidad} · ${it.precioTotal.toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-zinc-100 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-zinc-500">Total en este GO</span>
                        <span className="text-base font-black text-zinc-900">${tarjeta.totalTarjeta.toFixed(2)} USD</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={estadoConfirmActual}
                          onChange={(e) => actualizarTarjetaCompleta(tarjeta, 'estadoConfirmacion', e.target.value)}
                          className={`text-[11px] font-bold rounded-xl px-2.5 py-2 border cursor-pointer ${estadoConfirmActual === 'Confirmado' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-zinc-50 text-zinc-700 border-zinc-200'}`}
                        >
                          <option value="Pendiente">⏳ Sin confirmar</option>
                          <option value="Confirmado">✅ Confirmado</option>
                          <option value="Cancelado">❌ Cancelado</option>
                        </select>

                        <select
                          value={estadoPagoActual}
                          onChange={(e) => actualizarTarjetaCompleta(tarjeta, 'estadoPago', e.target.value)}
                          className={`text-[11px] font-bold rounded-xl px-2.5 py-2 border cursor-pointer ${estadoPagoActual === 'Pagado' ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-amber-400 text-zinc-900 border-amber-500'}`}
                        >
                          <option value="Sin pagar">💸 Sin pagar</option>
                          <option value="Verificando">🔵 Verificando</option>
                          <option value="Pagado">💚 Pagado</option>
                        </select>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-zinc-500">
                        <span>Fecha pago:</span>
                        <input
                          type="date"
                          value={fechaPagoActual}
                          onChange={(e) => actualizarTarjetaCompleta(tarjeta, 'fechaPago', e.target.value)}
                          className="border border-zinc-200 rounded-lg px-2 py-1 text-[11px]"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {pestanaAdmin === 'lanzar' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <form onSubmit={handleCreateGO} className="bg-white border rounded-2xl p-5 space-y-3">
              <h2 className="text-xs font-extrabold uppercase text-pink-600">1. Crear Nuevo GO</h2>
              <input type="text" placeholder="Título del GO" value={newGoTitle} onChange={(e) => setNewGoTitle(e.target.value)} className="border rounded-xl px-3 py-2 text-xs w-full" />
              <input type="text" placeholder="Grupo (ej: stray kids)" value={newGoGroup} onChange={(e) => setNewGoGroup(e.target.value)} className="border rounded-xl px-3 py-2 text-xs w-full" />
              <input type="file" accept="image/*" onChange={(e) => uploadImageHandler(e, 'go')} className="text-xs" />
              <button type="submit" disabled={loadingForm || subiendoImagen} className="w-full bg-zinc-900 text-white font-bold text-xs py-2.5 rounded-xl">➕ Lanzar GO</button>
            </form>

            <form onSubmit={handleCrearProducto} className="bg-white border rounded-2xl p-5 space-y-3">
              <h2 className="text-xs font-extrabold uppercase text-pink-600">2. Agregar Artículo a GO</h2>
              <select value={selectedGoId || ''} onChange={(e) => setSelectedGoId(Number(e.target.value))} className="border rounded-xl px-3 py-2 text-xs w-full">
                {gosAdmin.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
              </select>
              {selectedGoId && <button type="button" onClick={() => handleEliminarGO(selectedGoId)} className="text-[11px] text-rose-500 underline">Eliminar este GO</button>}
              <input type="text" placeholder="Nombre del artículo" value={newProdName} onChange={(e) => setNewProdName(e.target.value)} className="border rounded-xl px-3 py-2 text-xs w-full" />
              <div className="flex gap-2">
                <input type="number" step="0.01" placeholder="Precio USD" value={newProdPrice} onChange={(e) => setNewProdPrice(e.target.value)} className="border rounded-xl px-3 py-2 text-xs w-1/2" />
                <input type="number" placeholder="Stock por slot" value={newProdQty} onChange={(e) => setNewProdQty(e.target.value)} className="border rounded-xl px-3 py-2 text-xs w-1/2" />
              </div>
              <input type="text" placeholder="Slots separados por coma" value={newProdSlots} onChange={(e) => setNewProdSlots(e.target.value)} className="border rounded-xl px-3 py-2 text-xs w-full" />
              <input type="file" accept="image/*" onChange={(e) => uploadImageHandler(e, 'prod')} className="text-xs" />
              <button type="submit" disabled={loadingForm || subiendoImagen} className="w-full bg-pink-600 text-white font-bold text-xs py-2.5 rounded-xl">📦 Publicar en GO</button>
            </form>

            <form onSubmit={handleCrearItemShop} className="bg-white border rounded-2xl p-5 space-y-3">
              <h2 className="text-xs font-extrabold uppercase text-indigo-600">3. Agregar a Tienda</h2>
              <input type="text" placeholder="Nombre producto tienda" value={newShopName} onChange={(e) => setNewShopName(e.target.value)} className="border rounded-xl px-3 py-2 text-xs w-full" />
              <div className="flex gap-2">
                <input type="number" step="0.01" placeholder="Precio USD" value={newShopPrice} onChange={(e) => setNewShopPrice(e.target.value)} className="border rounded-xl px-3 py-2 text-xs w-1/2" />
                <input type="number" placeholder="Cantidad" value={newShopQty} onChange={(e) => setNewShopQty(e.target.value)} className="border rounded-xl px-3 py-2 text-xs w-1/2" />
              </div>
              <input type="text" placeholder="Descripción" value={newShopDesc} onChange={(e) => setNewShopDesc(e.target.value)} className="border rounded-xl px-3 py-2 text-xs w-full" />
              <input type="file" accept="image/*" onChange={(e) => uploadImageHandler(e, 'shop')} className="text-xs" />
              <button type="submit" disabled={loadingForm || subiendoImagen} className="w-full bg-indigo-600 text-white font-bold text-xs py-2.5 rounded-xl">🛍️ Publicar en Tienda</button>
            </form>
          </div>
        )}
        {pestanaAdmin === 'items' && (
          <div className="bg-white border rounded-2xl p-5 space-y-3">
            <h2 className="text-sm font-extrabold">Todos los Ítems Publicados</h2>
            {editandoProducto && (
              <form onSubmit={handleGuardarEdicion} className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex flex-wrap gap-2 items-center">
                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="border rounded-lg px-2.5 py-1.5 text-xs bg-white" />
                <input type="number" step="0.01" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} className="border rounded-lg px-2.5 py-1.5 text-xs w-24 bg-white" />
                <input type="number" value={editQty} onChange={(e) => setEditQty(e.target.value)} className="border rounded-lg px-2.5 py-1.5 text-xs w-20 bg-white" />
                <button type="submit" className="bg-emerald-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg">Guardar</button>
                <button type="button" onClick={() => setEditandoProducto(null)} className="text-xs text-zinc-500 px-2">Cancelar</button>
              </form>
            )}
            <div className="divide-y">
              {todosLosProductosAdmin.map((p) => (
                <div key={`${p.isShop ? 's' : 'g'}-${p.id}`} className="py-3 flex justify-between items-center text-xs">
                  <div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded mr-2 ${p.isShop ? 'bg-indigo-50 text-indigo-700' : 'bg-pink-50 text-pink-700'}`}>{p.isShop ? 'TIENDA' : 'GO'}</span>
                    <span className="font-bold">{p.nombre_producto}</span> — ${Number(p.precio).toFixed(2)} USD (Stock: {p.cantidad_disponible})
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => iniciarEdicion(p)} className="text-blue-600 font-bold">Editar</button>
                    <button type="button" onClick={() => handleEliminarProducto(p.id, p.isShop)} className="text-rose-600 font-bold">Borrar</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {pestanaAdmin === 'stock' && (
          <div className="bg-white border rounded-2xl p-5 space-y-4">
            <h2 className="text-sm font-extrabold">Gestor de Stock por Slot</h2>
            <select value={idProductoStockSelected || ''} onChange={(e) => setIdProductoStockSelected(Number(e.target.value))} className="border rounded-xl px-3 py-2 text-xs w-full">
              <option value="">-- Elige un producto de GO --</option>
              {productosAdmin.map((p) => <option key={p.id} value={p.id}>{p.nombre_producto}</option>)}
            </select>
            {idProductoStockSelected && inputsStock[idProductoStockSelected] && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {Object.entries(inputsStock[idProductoStockSelected]).map(([slot, val]) => (
                    <div key={slot} className="border rounded-xl p-2.5 flex justify-between items-center text-xs">
                      <span className="font-bold">{slot}</span>
                      <input type="number" value={val} onChange={(e) => handleEditInputLocal(idProductoStockSelected, slot, e.target.value)} className="border rounded w-14 px-2 py-1 text-center" />
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => handleGuardarStockBD(idProductoStockSelected)} className="bg-zinc-900 text-white text-xs font-bold px-4 py-2 rounded-xl">💾 Guardar Stock</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
