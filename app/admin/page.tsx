'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

type Go = { id: number; title: string; group_name: string };

type PedidoAdminUnificado = {
  idUnico: string;
  origen: 'GO' | 'SHOP';
  goId?: number;
  goTitulo: string;
  productoNombre: string;
  imagenUrl: string | null;
  detalleSlot: string;
  cantidad: number;
  correoJoiner: string;
  precioTotal: number;
  fechaLimite: string;
  estadoConfirmacion: string;
  estadoPago: string;
  fechaPago: string;
  pedidoId?: number;
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
  const [guardandoFila, setGuardandoFila] = useState<string | null>(null);

  const [pedidosUnificados, setPedidosUnificados] = useState<PedidoAdminUnificado[]>([]);
  const [filtroCategoria, setFiltroCategoria] = useState<string>('TODOS');
  const [filtroEstadoPago, setFiltroEstadoPago] = useState<string>('TODOS');
  const [busquedaJoiner, setBusquedaJoiner] = useState('');

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
    if (error) {
      alert('Error: ' + error.message);
      setSubiendoImagen(false);
      return;
    }
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

        const [{ data: dataGos }, { data: dataAllProds }, { data: dataSeg }, { data: dataTiendaProds }, { data: dataPedidos }] =
          await Promise.all([
            supabase.from('gos').select('*'),
            supabase.from('productos').select('id, nombre_producto, precio, go_id, cantidad_disponible, descripcion, lista_slots, stock_slots, claims_integrantes, imagen_producto, due_date, gos(title)'),
            supabase.from('seguimiento_claims').select('*'),
            supabase.from('tienda_productos').select('*'),
            supabase.from('pedidos').select('*').order('id', { ascending: false }),
          ]);

        if (dataGos) {
          setGosAdmin(dataGos.map((g: any) => ({ id: g.id, title: g.title, group_name: g.group_name })));
          if (dataGos.length > 0 && !selectedGoId) setSelectedGoId(dataGos[0].id);
        }

        const mapaSeg: Record<string, any> = {};
        if (dataSeg) dataSeg.forEach((s: any) => { mapaSeg[s.claim_key] = s; });

        const listaUnificada: PedidoAdminUnificado[] = [];
        if (dataAllProds) {
          setProductosAdmin(dataAllProds);
          const estructura: typeof inputsStock = {};
          dataAllProds.forEach((p: any) => {
            estructura[p.id] = {};
            const listaSlots = p.lista_slots ? String(p.lista_slots) : '';
            const slots = listaSlots ? listaSlots.split(',').map((s: string) => s.trim()) : [];
            slots.forEach((s: string) => { estructura[p.id][s] = String(p.stock_slots?.[s] ?? '0'); });

            const claims = p.claims_integrantes || {};
            Object.entries(claims).forEach(([integrante, dataClaim]: [string, any]) => {
              if (!dataClaim) return;
              const goTitle = p.gos?.title || 'Group Order';
              const fechaLim = p.due_date ? new Date(p.due_date).toLocaleDateString() : 'Sin fecha';

              if (typeof dataClaim === 'string') {
                const key = `${p.id}-${integrante}`;
                const seg = mapaSeg[key];
                listaUnificada.push({
                  idUnico: key,
                  origen: 'GO',
                  goId: p.go_id,
                  goTitulo: goTitle,
                  productoNombre: p.nombre_producto,
                  imagenUrl: p.imagen_producto || null,
                  detalleSlot: integrante,
                  cantidad: 1,
                  correoJoiner: dataClaim,
                  precioTotal: Number(p.precio || 0),
                  fechaLimite: fechaLim,
                  estadoConfirmacion: seg?.estado_confirmacion || 'Pendiente',
                  estadoPago: seg?.estado_pago || 'Sin pagar',
                  fechaPago: seg?.fecha_pago || '',
                });
              } else if (typeof dataClaim === 'object') {
                Object.entries(dataClaim).forEach(([correoCliente, cant]: [string, any]) => {
                  if (!correoCliente || !cant) return;
                  const key = `${p.id}-${integrante}`;
                  const seg = mapaSeg[key];
                  listaUnificada.push({
                    idUnico: `${key}-${correoCliente}`,
                    origen: 'GO',
                    goId: p.go_id,
                    goTitulo: goTitle,
                    productoNombre: p.nombre_producto,
                    imagenUrl: p.imagen_producto || null,
                    detalleSlot: integrante,
                    cantidad: Number(cant),
                    correoJoiner: correoCliente,
                    precioTotal: Number(p.precio || 0) * Number(cant),
                    fechaLimite: fechaLim,
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
          setProductosTiendaAdmin(
            dataTiendaProds.map((p: any) => ({
              id: p.id,
              nombre_producto: p.nombre_producto,
              precio: p.precio,
              go_id: 0,
              cantidad_disponible: p.cantidad_disponible,
              descripcion: p.descripcion,
              estado_pago: p.estado_pago,
              due_date: p.due_date,
              isShop: true,
            }))
          );
        }

        if (dataPedidos) {
          dataPedidos.forEach((ped: any) => {
            if (ped.user_email && ped.user_email !== 'STOCK_TIENDA_FISICA') {
              listaUnificada.push({
                idUnico: `shop-${ped.id}`,
                origen: 'SHOP',
                goTitulo: 'Tienda / Shop',
                productoNombre: ped.producto_nombre || ped.detalles || 'Pedido Tienda',
                imagenUrl: ped.imagen_producto || null,
                detalleSlot: ped.detalles || 'Compra directa',
                cantidad: 1,
                correoJoiner: ped.user_email,
                precioTotal: Number(ped.total_pagar || 0),
                fechaLimite: ped.fecha_limite || 'Inmediato',
                estadoConfirmacion: ped.estado_confirmacion || 'Pendiente',
                estadoPago: ped.estado_pago || 'Sin pagar',
                fechaPago: ped.fecha_pago || '',
                pedidoId: ped.id,
              });
            }
          });
        }

        setPedidosUnificados(listaUnificada);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargarDatosHibridos();
  }, []);
  async function actualizarEstadoPedido(
    item: PedidoAdminUnificado,
    campo: 'estadoConfirmacion' | 'estadoPago' | 'fechaPago',
    nuevoValor: string
  ) {
    setGuardandoFila(item.idUnico);
    const actualizado = { ...item, [campo]: nuevoValor };

    if (campo === 'estadoPago' && nuevoValor === 'Pagado' && !actualizado.fechaPago) {
      actualizado.fechaPago = new Date().toISOString().split('T')[0];
    }

    setPedidosUnificados((prev) =>
      prev.map((p) => (p.idUnico === item.idUnico ? actualizado : p))
    );

    if (item.origen === 'GO') {
      const claimKeyBase = item.idUnico.split('-').slice(0, 2).join('-');
      await supabase.from('seguimiento_claims').upsert({
        claim_key: claimKeyBase,
        user_email: item.correoJoiner.toLowerCase().trim(),
        go_title: item.goTitulo,
        producto_nombre: item.productoNombre,
        integrante: item.detalleSlot,
        estado_confirmacion: actualizado.estadoConfirmacion,
        estado_pago: actualizado.estadoPago,
        fecha_pago: actualizado.fechaPago || null,
      });
    } else if (item.pedidoId) {
      await supabase
        .from('pedidos')
        .update({
          estado_confirmacion: actualizado.estadoConfirmacion,
          estado_pago: actualizado.estadoPago,
          fecha_pago: actualizado.fechaPago || null,
        })
        .eq('id', item.pedidoId);
    }

    setGuardandoFila(null);
  }

  const handleEditInputLocal = (prodId: number, slot: string, valor: string) => {
    setInputsStock((prev) => ({
      ...prev,
      [prodId]: { ...(prev[prodId] || {}), [slot]: valor },
    }));
  };

  async function handleGuardarStockBD(prodId: number) {
    const inputsProd = inputsStock[prodId] || {};
    const jsonNuevo: { [key: string]: number } = {};
    Object.entries(inputsProd).forEach(([slot, val]) => {
      jsonNuevo[slot] = Math.max(0, parseInt(val) || 0);
    });
    const { error } = await supabase.from('productos').update({ stock_slots: jsonNuevo }).eq('id', prodId);
    if (!error) { alert('¡Inventario guardado! ✨'); cargarDatosHibridos(); }
  }

  async function handleCreateGO(e: React.FormEvent) {
    e.preventDefault();
    if (!newGoTitle) return alert('Pon el título 🎀');
    setLoadingForm(true);
    const { error } = await supabase.from('gos').insert([
      { title: newGoTitle.toUpperCase(), group_name: newGoGroup.toLowerCase(), status: 'OPEN', imagen_general: newGoImage || null },
    ]);
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
    const { error } = await supabase.from('productos').insert([
      {
        go_id: selectedGoId,
        nombre_producto: newProdName.toUpperCase(),
        precio: Number(newProdPrice),
        lista_slots: newProdSlots,
        imagen_producto: newProdImage || null,
        claims_integrantes: {},
        cantidad_disponible: Number(newProdQty),
        stock_slots: jsonStockInicial,
        descripcion: newProdDesc || null,
      },
    ]);
    setLoadingForm(false);
    if (!error) { alert('¡Artículo publicado! 📦'); setNewProdName(''); setNewProdPrice(''); setNewProdSlots(''); setNewProdDesc(''); cargarDatosHibridos(); }
  }

  async function handleCrearItemShop(e: React.FormEvent) {
    e.preventDefault();
    if (!newShopName || !newShopPrice) return alert('Llena los datos');
    setLoadingForm(true);
    const { error } = await supabase.from('tienda_productos').insert([
      {
        nombre_producto: newShopName.toUpperCase(),
        precio: Number(newShopPrice),
        cantidad_disponible: Number(newShopQty),
        descripcion: newShopDesc || null,
        estado_pago: newShopStatus,
        due_date: newShopGroup,
        imagen_producto: newShopImage || null,
      },
    ]);
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
    setEditandoProducto(p);
    setEditName(p.nombre_producto);
    setEditPrice(String(p.precio));
    setEditQty(String(p.cantidad_disponible));
    setEditDesc(p.descripcion || '');
  };

  async function handleGuardarEdicion(e: React.FormEvent) {
    e.preventDefault();
    if (!editandoProducto) return;
    setLoadingForm(true);
    await supabase
      .from(editandoProducto.isShop ? 'tienda_productos' : 'productos')
      .update({ nombre_producto: editName.toUpperCase(), precio: Number(editPrice), cantidad_disponible: Number(editQty), descripcion: editDesc || null })
      .eq('id', editandoProducto.id);
    setLoadingForm(false);
    setEditandoProducto(null);
    cargarDatosHibridos();
  }

  const pedidosFiltrados = pedidosUnificados.filter((p) => {
    if (filtroCategoria === 'SHOP' && p.origen !== 'SHOP') return false;
    if (filtroCategoria !== 'TODOS' && filtroCategoria !== 'SHOP' && p.goTitulo !== filtroCategoria) return false;
    if (filtroEstadoPago === 'PENDIENTES' && p.estadoPago === 'Pagado') return false;
    if (filtroEstadoPago === 'PAGADOS' && p.estadoPago !== 'Pagado') return false;
    if (filtroEstadoPago === 'SIN_CONFIRMAR' && p.estadoConfirmacion === 'Confirmado') return false;
    if (busquedaJoiner && !p.correoJoiner.toLowerCase().includes(busquedaJoiner.toLowerCase()) && !p.productoNombre.toLowerCase().includes(busquedaJoiner.toLowerCase())) return false;
    return true;
  });

  const nombresGosUnicos = Array.from(new Set(pedidosUnificados.filter((p) => p.origen === 'GO').map((p) => p.goTitulo)));
  const totalRecaudado = pedidosFiltrados.filter((p) => p.estadoPago === 'Pagado').reduce((s, p) => s + p.precioTotal, 0);
  const totalPorCobrar = pedidosFiltrados.filter((p) => p.estadoPago !== 'Pagado').reduce((s, p) => s + p.precioTotal, 0);

  if (loading) return <div className="min-h-screen bg-[#FAF8F9] flex items-center justify-center font-mono text-xs text-zinc-400">✧ cargando panel atelier...</div>;
  if (usuarioEmail !== correoAdmin) {
    return (
      <div className="min-h-screen bg-[#FAF8F9] flex flex-col items-center justify-center p-4 gap-3">
        <p className="text-sm font-bold text-rose-600 bg-white border border-rose-100 px-6 py-3 rounded-full">✕ Acceso exclusivo de Atelier de Hyun 🎀</p>
        <Link href="/gos" className="text-xs underline text-zinc-500">Volver al catálogo ➔</Link>
      </div>
    );
  }

  const todosLosProductosAdmin = [...productosAdmin, ...productosTiendaAdmin];

  return (
    <div className="min-h-screen bg-[#FAF8F9] font-sans text-zinc-800 pb-16">
      <div className="bg-white border-b border-zinc-200 px-4 py-3">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <Link href="/gos" className="text-xs font-semibold text-zinc-500 hover:text-pink-600">← Volver al catálogo</Link>
          <span className="text-[11px] bg-pink-600 text-white font-bold px-3 py-1 rounded-full">👑 PANEL CONTROL ATELIER</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pt-5 space-y-5">
        <div className="flex flex-wrap gap-2 bg-white p-1.5 rounded-2xl border border-zinc-200/80 shadow-2xs">
          {[
            { id: 'joiners', label: '👤 Pedidos y Joiners' },
            { id: 'lanzar', label: '➕ Crear GO / Producto' },
            { id: 'items', label: '🛠️ Editar Ítems' },
            { id: 'stock', label: '📦 Stock por Slot' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setPestanaAdmin(tab.id as any)}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all ${
                pestanaAdmin === tab.id ? 'bg-zinc-900 text-white shadow-2xs' : 'text-zinc-500 hover:bg-zinc-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {pestanaAdmin === 'joiners' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white border border-zinc-200/80 rounded-2xl p-4">
                <p className="text-[11px] font-bold uppercase text-zinc-400">Pedidos mostrados</p>
                <p className="text-xl font-black text-zinc-900 mt-1">{pedidosFiltrados.length}</p>
              </div>
              <div className="bg-white border border-zinc-200/80 rounded-2xl p-4">
                <p className="text-[11px] font-bold uppercase text-emerald-600">Pagado (Confirmado)</p>
                <p className="text-xl font-black text-emerald-600 mt-1">${totalRecaudado.toFixed(2)} USD</p>
              </div>
              <div className="bg-white border border-zinc-200/80 rounded-2xl p-4">
                <p className="text-[11px] font-bold uppercase text-rose-500">Por cobrar</p>
                <p className="text-xl font-black text-rose-600 mt-1">${totalPorCobrar.toFixed(2)} USD</p>
              </div>
            </div>

            <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 space-y-3">
              <div className="flex flex-wrap gap-1.5 border-b border-zinc-100 pb-3">
                <button
                  type="button"
                  onClick={() => setFiltroCategoria('TODOS')}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold ${filtroCategoria === 'TODOS' ? 'bg-pink-600 text-white' : 'bg-zinc-100 text-zinc-600'}`}
                >
                  Todos ({pedidosUnificados.length})
                </button>
                {nombresGosUnicos.map((tituloGo) => (
                  <button
                    key={tituloGo}
                    type="button"
                    onClick={() => setFiltroCategoria(tituloGo)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold ${filtroCategoria === tituloGo ? 'bg-pink-600 text-white' : 'bg-pink-50 text-pink-700 border border-pink-200'}`}
                  >
                    🧸 {tituloGo}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setFiltroCategoria('SHOP')}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold ${filtroCategoria === 'SHOP' ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'}`}
                >
                  🛍️ Solo Tienda
                </button>
              </div>
              <div className="flex flex-wrap justify-between gap-2">
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: 'TODOS', label: 'Todos los estados' },
                    { id: 'SIN_CONFIRMAR', label: '⏳ Sin confirmar' },
                    { id: 'PENDIENTES', label: '💸 Sin pagar' },
                    { id: 'PAGADOS', label: '✅ Pagados' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFiltroEstadoPago(f.id)}
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border ${filtroEstadoPago === f.id ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white text-zinc-600 border-zinc-200'}`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Buscar por correo o producto..."
                  value={busquedaJoiner}
                  onChange={(e) => setBusquedaJoiner(e.target.value)}
                  className="border border-zinc-200 rounded-xl px-3 py-1.5 text-xs w-full sm:w-64"
                />
              </div>
            </div>

            <div className="bg-white border border-zinc-200/80 rounded-2xl overflow-x-auto shadow-2xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-200 text-[11px] uppercase text-zinc-500">
                    <th className="p-3.5">Producto</th>
                    <th className="p-3.5">GO / Categoría</th>
                    <th className="p-3.5">Joiner</th>
                    <th className="p-3.5">Monto</th>
                    <th className="p-3.5">Confirmación</th>
                    <th className="p-3.5">Estado Pago</th>
                    <th className="p-3.5">Fecha Pago</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-xs">
                  {pedidosFiltrados.map((item) => (
                    <tr key={item.idUnico} className="hover:bg-zinc-50/70">
                      <td className="p-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-zinc-100 border border-zinc-200 overflow-hidden shrink-0 flex items-center justify-center">
                            {item.imagenUrl ? <img src={item.imagenUrl} alt="" className="w-full h-full object-cover" /> : <span>{item.origen === 'GO' ? '🧸' : '🛍️'}</span>}
                          </div>
                          <div>
                            <p className="font-bold text-zinc-900">{item.productoNombre}</p>
                            <p className="text-[11px] text-pink-600 font-semibold">{item.detalleSlot} · Cant: {item.cantidad}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${item.origen === 'GO' ? 'bg-pink-50 text-pink-700 border border-pink-200' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'}`}>
                          {item.goTitulo}
                        </span>
                      </td>
                      <td className="p-3.5 font-medium text-zinc-700">{item.correoJoiner}</td>
                      <td className="p-3.5 font-black text-zinc-900">${item.precioTotal.toFixed(2)}</td>
                      <td className="p-3.5">
                        <select
                          value={item.estadoConfirmacion}
                          onChange={(e) => actualizarEstadoPedido(item, 'estadoConfirmacion', e.target.value)}
                          className={`text-[11px] font-bold rounded-full px-2.5 py-1 border cursor-pointer ${
                            item.estadoConfirmacion === 'Confirmado' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : item.estadoConfirmacion === 'Cancelado' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          <option value="Pendiente">⏳ Pendiente</option>
                          <option value="Confirmado">✅ Confirmado</option>
                          <option value="Cancelado">❌ Cancelado</option>
                        </select>
                      </td>
                      <td className="p-3.5">
                        <select
                          value={item.estadoPago}
                          onChange={(e) => actualizarEstadoPedido(item, 'estadoPago', e.target.value)}
                          className={`text-[11px] font-bold rounded-full px-2.5 py-1 border cursor-pointer ${
                            item.estadoPago === 'Pagado' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : item.estadoPago === 'Verificando' ? 'bg-sky-50 text-sky-700 border-sky-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          <option value="Sin pagar">🔴 Sin pagar</option>
                          <option value="Verificando">🔵 Verificando</option>
                          <option value="Pagado">🟢 Pagado</option>
                        </select>
                      </td>
                      <td className="p-3.5">
                        <input
                          type="date"
                          value={item.fechaPago}
                          onChange={(e) => actualizarEstadoPedido(item, 'fechaPago', e.target.value)}
                          className="border border-zinc-200 rounded-lg px-2 py-1 text-[11px]"
                        />
                        {guardandoFila === item.idUnico && <span className="text-[10px] text-pink-500 block">Guardando...</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
