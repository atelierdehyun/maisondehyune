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
  imagen_producto?: string | null;
  isShop?: boolean;
  estado_pago?: string;
  due_date?: string;
};
export default function AdminPanelPremium() {
  const [pestanaAdmin, setPestanaAdmin] = useState<'joiners' | 'envios' | 'stock' | 'lanzar' | 'items'>('joiners');
const [solicitudesEnvio, setSolicitudesEnvio] = useState<any[]>([]);
const [guiasTemp, setGuiasTemp] = useState<Record<number, string>>({});

  const [usuarioEmail, setUsuarioEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingForm, setLoadingForm] = useState(false);
  const [subiendoImagen, setSubiendoImagen] = useState(false);

  const [tarjetasJoiners, setTarjetasJoiners] = useState<TarjetaJoiner[]>([]);
  const [filtroCategoria, setFiltroCategoria] = useState<string>('TODOS');
  const [busqueda, setBusqueda] = useState('');
  const [editandoNombreCorreo, setEditandoNombreCorreo] = useState<string | null>(null);
  const [inputNombreTemp, setInputNombreTemp] = useState('');

  const [gosAdmin, setGosAdmin] = useState<Go[]>([]);
  const [productosAdmin, setProductosAdmin] = useState<ProductoAdmin[]>([]);
  const [productosTiendaAdmin, setProductosTiendaAdmin] = useState<ProductoAdmin[]>([]);
  const [inputsStock, setInputsStock] = useState<{ [prodId: number]: { [slot: string]: string } }>({});
  const [goStockFiltro, setGoStockFiltro] = useState<number | 'TODOS'>('TODOS');
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
  const [newProdDueDate, setNewProdDueDate] = useState('');
  const [newProdDesc, setNewProdDesc] = useState('');
  const [newShopName, setNewShopName] = useState('');
  const [newShopPrice, setNewShopPrice] = useState('');
  const [newShopStatus, setNewShopStatus] = useState('INSTOCK');
  const [newShopImage, setNewShopImage] = useState('');
  const [newShopExtraImages, setNewShopExtraImages] = useState<string[]>([]);
  const [newShopGroup, setNewShopGroup] = useState('Stray Kids');
  const [newShopIntegrante, setNewShopIntegrante] = useState('Grupal / Todos');
  const [newShopCategoria, setNewShopCategoria] = useState('Photocards');
  const [newShopQty, setNewShopQty] = useState('1');
  const [newShopDesc, setNewShopDesc] = useState('');
  const [newShopVariantes, setNewShopVariantes] = useState<{ nombre: string; precio: string; stock: string }[]>([]);

  const [editandoProducto, setEditandoProducto] = useState<ProductoAdmin | null>(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editQty, setEditQty] = useState('');
  const [editDesc, setEditDesc] = useState('');

  async function uploadImageHandler(e: React.ChangeEvent<HTMLInputElement>, targetForm: 'go' | 'prod' | 'shop' | 'shop-extra') {
    const file = e.target.files ? Array.from(e.target.files).at(0) : null;
    if (!file) return;
    setSubiendoImagen(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const { error } = await supabase.storage.from('fotos-productos').upload(fileName, file);
    if (error) { alert('Error: ' + error.message); setSubiendoImagen(false); return; }
    const { data: { publicUrl } } = supabase.storage.from('fotos-productos').getPublicUrl(fileName);
    if (targetForm === 'go') setNewGoImage(publicUrl);
    else if (targetForm === 'prod') setNewProdImage(publicUrl);
    else if (targetForm === 'shop') setNewShopImage(publicUrl);
    else setNewShopExtraImages((prev) => [...prev, publicUrl]);
    setSubiendoImagen(false);
  }
  async function cargarDatosHibridos() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email && user.email === correoAdmin) {
        setUsuarioEmail(user.email);

            const [{ data: dataGos }, { data: dataAllProds }, { data: dataSeg }, { data: dataPerfiles }, { data: dataTiendaProds }, { data: dataPedidos }, { data: dataEnvios }] =
      await Promise.all([
        supabase.from('gos').select('*'),
        supabase.from('productos').select('id, nombre_producto, precio, go_id, cantidad_disponible, descripcion, lista_slots, stock_slots, claims_integrantes, imagen_producto, due_date, gos(title)'),
        supabase.from('seguimiento_claims').select('*'),
        supabase.from('perfiles_joiners').select('*'),
        supabase.from('tienda_productos').select('*'),
        supabase.from('pedidos').select('*').order('id', { ascending: false }),
        supabase.from('solicitudes_envio').select('*').order('id', { ascending: false }),
      ]);

    if (dataEnvios) setSolicitudesEnvio(dataEnvios);


        if (dataGos) {
          setGosAdmin(dataGos.map((g: any) => ({ id: g.id, title: g.title, group_name: g.group_name })));
          const primerGo = dataGos.at(0);
          if (primerGo && !selectedGoId) setSelectedGoId(primerGo.id);
          if (primerGo && goStockFiltro === 'TODOS') setGoStockFiltro(primerGo.id);
        }

        const mapaSeg: Record<string, any> = {};
        if (dataSeg) dataSeg.forEach((s: any) => { mapaSeg[s.claim_key] = s; });

        const mapaNombres: Record<string, string> = {};
        if (dataPerfiles) dataPerfiles.forEach((pf: any) => { if (pf.nombre_completo) mapaNombres[pf.user_email.toLowerCase()] = pf.nombre_completo; });

        const agrupadoPorGoYJoiner: Record<string, TarjetaJoiner> = {};
        const agregarATarjeta = (correoRaw: string, categoria: string, origen: 'GO' | 'SHOP', item: ItemTarjeta) => {
          const correo = correoRaw.toLowerCase().trim();
          const keyTarjeta = `${categoria}__${correo}`;
          if (!agrupadoPorGoYJoiner[keyTarjeta]) {
            const aliasCorreo = correo.split('@').at(0) || correo;
            agrupadoPorGoYJoiner[keyTarjeta] = {
              tarjetaId: keyTarjeta,
              correo,
              nombreReal: mapaNombres[correo] || aliasCorreo,
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
                  idUnico: claimKey, claimKeyBase: claimKey, origen: 'GO', goTitulo: goTitle,
                  productoNombre: p.nombre_producto, imagenUrl: p.imagen_producto || null,
                  detalleSlot: integrante, cantidad: 1, precioTotal: Number(p.precio || 0),
                  estadoConfirmacion: seg?.estado_confirmacion || 'Pendiente',
                  estadoPago: seg?.estado_pago || 'Sin pagar', fechaPago: seg?.fecha_pago || '',
                });
              } else if (typeof dataClaim === 'object') {
                Object.entries(dataClaim).forEach(([correoCliente, cant]: [string, any]) => {
                  if (!correoCliente || !cant) return;
                  agregarATarjeta(correoCliente, goTitle, 'GO', {
                    idUnico: `${claimKey}-${correoCliente}`, claimKeyBase: claimKey, origen: 'GO', goTitulo: goTitle,
                    productoNombre: p.nombre_producto, imagenUrl: p.imagen_producto || null,
                    detalleSlot: integrante, cantidad: Number(cant), precioTotal: Number(p.precio || 0) * Number(cant),
                    estadoConfirmacion: seg?.estado_confirmacion || 'Pendiente',
                    estadoPago: seg?.estado_pago || 'Sin pagar', fechaPago: seg?.fecha_pago || '',
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
            imagen_producto: p.imagen_producto, estado_pago: p.estado_pago, due_date: p.due_date, isShop: true,
          })));
        }

        if (dataPedidos) {
          dataPedidos.forEach((ped: any) => {
            if (ped.user_email && ped.user_email !== 'STOCK_TIENDA_FISICA') {
              agregarATarjeta(ped.user_email, 'Tienda / Shop', 'SHOP', {
                idUnico: `shop-${ped.id}`, pedidoId: ped.id, origen: 'SHOP', goTitulo: 'Tienda / Shop',
                productoNombre: ped.producto_nombre || ped.detalles || 'Pedido Tienda',
                imagenUrl: ped.imagen_producto || null, detalleSlot: ped.detalles || 'Compra directa',
                cantidad: 1, precioTotal: Number(ped.total_pagar || 0),
                estadoConfirmacion: ped.estado_confirmacion || 'Pendiente',
                estadoPago: ped.estado_pago || 'Sin pagar', fechaPago: ped.fecha_pago || '',
              });
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
    const hoyIso = new Date().toISOString().split('T').at(0) || '';
    const fechaAuto = campo === 'estadoPago' && valor === 'Pagado' ? hoyIso : null;

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

  async function handleMarcarEnviado(solId: number) {
  const guia = (guiasTemp[solId] || '').trim();
  const { error } = await supabase
    .from('solicitudes_envio')
    .update({ estado_despacho: 'Enviado', guia_rastreo: guia || null })
    .eq('id', solId);
  if (!error) {
    alert('🚚 ¡Envío marcado como DESPACHADO! El joiner ya puede ver su guía en su cuenta.');
    cargarDatosHibridos();
  }
}

  async function notificarCancelacionFaltaPago(tarjeta: TarjetaJoiner) {
    if (!confirm(`¿Marcar el pedido de ${tarjeta.nombreReal} como CANCELADO por falta de pago?`)) return;
    await actualizarTarjetaCompleta(tarjeta, 'estadoConfirmacion', 'Cancelado');
    alert('🚨 Listo: El pedido aparece como CANCELADO y al joiner le saldrá la alerta roja en su cuenta.');
  }
    async function handleEliminarTarjetaPedido(tarjeta: TarjetaJoiner) {
    if (!confirm(`⚠️ ¿Eliminar por completo el pedido de ${tarjeta.nombreReal} en ${tarjeta.categoriaTitulo} y liberar sus slots?`)) return;

    for (const item of tarjeta.items) {
      if (item.origen === 'GO' && item.claimKeyBase) {
        const partes = item.claimKeyBase.split('-');
        const prodId = Number(partes.at(0));
        const slotNombre = partes.slice(1).join('-');

        const { data: prodDb } = await supabase
          .from('productos')
          .select('claims_integrantes')
          .eq('id', prodId)
          .single();

        if (prodDb?.claims_integrantes) {
          const claimsCopia = { ...prodDb.claims_integrantes };
          if (typeof claimsCopia[slotNombre] === 'string') {
            delete claimsCopia[slotNombre];
          } else if (typeof claimsCopia[slotNombre] === 'object' && claimsCopia[slotNombre] !== null) {
            delete claimsCopia[slotNombre][tarjeta.correo];
            if (Object.keys(claimsCopia[slotNombre]).length === 0) {
              delete claimsCopia[slotNombre];
            }
          }
          await supabase.from('productos').update({ claims_integrantes: claimsCopia }).eq('id', prodId);
        }

        await supabase.from('seguimiento_claims').delete().eq('claim_key', item.claimKeyBase);
      } else if (item.pedidoId) {
        await supabase.from('pedidos').delete().eq('id', item.pedidoId);
      }
    }

    alert('🗑️ Pedido eliminado y slots liberados ✨');
    cargarDatosHibridos();
  }
  const handleEditInputLocal = (prodId: number, slot: string, valor: string) => {
    setInputsStock((prev) => ({ ...prev, [prodId]: { ...(prev[prodId] || {}), [slot]: valor } }));
  };

  async function handleGuardarStockBD(prodId: number) {
    const inputsProd = inputsStock[prodId] || {};
    const jsonNuevo: { [key: string]: number } = {};
    Object.entries(inputsProd).forEach(([slot, val]) => { jsonNuevo[slot] = Math.max(0, parseInt(val) || 0); });
    const { error } = await supabase.from('productos').update({ stock_slots: jsonNuevo }).eq('id', prodId);
    if (!error) { alert('¡Stock guardado! ✨'); cargarDatosHibridos(); }
  }

  async function handleCreateGO(e: React.FormEvent) {
    e.preventDefault();
    if (!newGoTitle) return alert('Pon el título 🎀');
    setLoadingForm(true);
    const { error } = await supabase.from('gos').insert([{ title: newGoTitle.toUpperCase(), group_name: newGoGroup.toLowerCase(), status: 'OPEN', imagen_general: newGoImage || null }]);
    setLoadingForm(false);
    if (!error) { alert('¡GO creado! ✨'); setNewGoTitle(''); setNewGoImage(''); cargarDatosHibridos(); }
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
      cantidad_disponible: Number(newProdQty), stock_slots: jsonStockInicial,
      due_date: newProdDueDate || null, descripcion: newProdDesc || null,
    }]);
    setLoadingForm(false);
    if (!error) { alert('¡Artículo publicado! 📦'); setNewProdName(''); setNewProdPrice(''); setNewProdSlots(''); setNewProdImage(''); setNewProdDesc(''); cargarDatosHibridos(); }
  }

    async function handleCrearItemShop(e: React.FormEvent) {
    e.preventDefault();
    const variantesLimpias = newShopVariantes
      .filter((v) => v.nombre.trim() !== '' && v.precio !== '')
      .map((v) => ({
        nombre: v.nombre.trim(),
        precio: Number(v.precio),
        stock: Math.max(0, Number(v.stock || 0)),
      }));

    const tieneVariantes = variantesLimpias.length > 0;
    if (!newShopName || (!tieneVariantes && !newShopPrice)) {
      return alert('Pon el nombre del producto y al menos un precio o variante 🛍️');
    }

    const precioBase = tieneVariantes
      ? Math.min(...variantesLimpias.map((v) => v.precio))
      : Number(newShopPrice);

    const stockTotal = tieneVariantes
      ? variantesLimpias.reduce((acc, v) => acc + v.stock, 0)
      : Number(newShopQty);

    setLoadingForm(true);
    const { error } = await supabase.from('tienda_productos').insert([{
      nombre_producto: newShopName.toUpperCase(),
      precio: precioBase,
      cantidad_disponible: stockTotal,
      descripcion: newShopDesc || null,
      estado_pago: stockTotal > 0 ? newShopStatus : 'SOLD OUT',
      due_date: newShopGroup.toLowerCase(),
      grupo: newShopGroup,
      integrante: newShopIntegrante,
      categoria: newShopCategoria,
      imagen_producto: newShopImage || null,
      fotos_extra: newShopExtraImages,
      variantes: variantesLimpias,
    }]);
    setLoadingForm(false);
    if (!error) {
      alert('¡Producto publicado en la Tienda! 🛍️✨');
      setNewShopName('');
      setNewShopPrice('');
      setNewShopDesc('');
      setNewShopImage('');
      setNewShopExtraImages([]);
      setNewShopVariantes([]);
      cargarDatosHibridos();
    } else alert('Error: ' + error.message);
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

  const categoriasGos = Array.from(new Set(tarjetasJoiners.filter((t) => t.origen === 'GO').map((t) => t.categoriaTitulo)));
  const tarjetasFiltradas = tarjetasJoiners.filter((t) => {
    if (filtroCategoria !== 'TODOS' && t.categoriaTitulo !== filtroCategoria) return false;
    if (busqueda && !t.nombreReal.toLowerCase().includes(busqueda.toLowerCase()) && !t.correo.toLowerCase().includes(busqueda.toLowerCase())) return false;
    return true;
  });

  if (loading) return <div className="min-h-screen bg-[#F6F7F9] flex items-center justify-center font-mono text-xs text-zinc-400">✧ cargando atelier admin...</div>;
  if (usuarioEmail !== correoAdmin) {
    return (
      <div className="min-h-screen bg-[#F6F7F9] flex flex-col items-center justify-center p-4 gap-3">
        <p className="text-sm font-bold text-rose-600 bg-white border border-rose-100 px-6 py-3 rounded-full">✕ Acceso exclusivo de Atelier de Hyun 🎀</p>
        <Link href="/gos" className="text-xs underline text-zinc-500">Volver al catálogo ➔</Link>
      </div>
    );
  }

  const todosLosProductosAdmin = [...productosAdmin, ...productosTiendaAdmin];
  const productosStockFiltrados = goStockFiltro === 'TODOS' ? productosAdmin : productosAdmin.filter((p) => p.go_id === goStockFiltro);
  const coloresAvatar = ['bg-teal-700', 'bg-pink-600', 'bg-amber-600', 'bg-indigo-600', 'bg-emerald-700', 'bg-purple-700'];
  return (
    <div className="min-h-screen bg-[#F6F7F9] font-sans text-zinc-800 pb-16">
      <div className="bg-white border-b border-zinc-200 px-5 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center gap-4">
            <span className="font-black text-base tracking-tight text-zinc-900">🎀 Atelier Admin</span>
            <div className="flex flex-wrap gap-1 bg-zinc-100 p-1 rounded-xl">
              {[
                { id: 'joiners', label: '📋 Órdenes por Joiner' },
                    { id: 'joiners', label: '📋 Órdenes por Joiner' },
              { id: 'envios', label: `🚚 Envíos (${solicitudesEnvio.filter((s) => s.estado_despacho !== 'Enviado').length})` },
              { id: 'stock', label: '📦 Stock por GO' },

                { id: 'stock', label: '📦 Stock por GO' },
                { id: 'lanzar', label: '➕ Crear GO / Tienda' },
                { id: 'items', label: '🛠️ Editar Ítems' },
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
                <p className="text-xs text-zinc-500">Cada tarjeta es una persona dentro de un GO o de Tienda</p>
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
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold ${filtroCategoria === 'TODOS' ? 'bg-teal-800 text-white' : 'bg-white text-zinc-600 border border-zinc-200'}`}
              >
                Todos ({tarjetasJoiners.length})
              </button>
              {categoriasGos.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setFiltroCategoria(cat)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold ${filtroCategoria === cat ? 'bg-pink-600 text-white' : 'bg-white text-zinc-700 border border-zinc-200'}`}
                >
                  🧸 {cat}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setFiltroCategoria('Tienda / Shop')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold ${filtroCategoria === 'Tienda / Shop' ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'}`}
              >
                🛍️ Tienda / Shop ({tarjetasJoiners.filter((t) => t.origen === 'SHOP').length})
              </button>
            </div>
            {tarjetasFiltradas.length === 0 ? (
              <div className="bg-white border border-zinc-200 rounded-2xl p-10 text-center text-xs text-zinc-500">
                No hay órdenes registradas en esta categoría todavía 🌸
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {tarjetasFiltradas.map((tarjeta, idx) => {
                  const primerItem = tarjeta.items.at(0);
                  const inicial = tarjeta.nombreReal.slice(0, 2).toUpperCase();
                  const estadoConfirmActual = primerItem?.estadoConfirmacion || 'Pendiente';
                  const estadoPagoActual = primerItem?.estadoPago || 'Sin pagar';
                  const fechaPagoActual = primerItem?.fechaPago || '';
                  const colorAvatar = coloresAvatar.at(idx % coloresAvatar.length) || 'bg-pink-600';

                  return (
                    <div key={tarjeta.tarjetaId} className="bg-white border border-zinc-200/90 rounded-2xl p-5 shadow-2xs flex flex-col justify-between space-y-4">
                      <div className="space-y-3">
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl ${colorAvatar} text-white font-black text-xs flex items-center justify-center shrink-0`}>
                              {inicial}
                            </div>
                            <div>
                              {editandoNombreCorreo === tarjeta.correo ? (
                                <div className="flex gap-1">
                                  <input type="text" value={inputNombreTemp} onChange={(e) => setInputNombreTemp(e.target.value)} className="border rounded px-2 py-0.5 text-xs w-32" autoFocus />
                                  <button type="button" onClick={() => guardarNombreJoiner(tarjeta.correo)} className="bg-emerald-600 text-white text-[10px] px-2 rounded font-bold">OK</button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  <h3 className="text-sm font-extrabold text-zinc-900 capitalize">{tarjeta.nombreReal}</h3>
                                  <button type="button" onClick={() => { setEditandoNombreCorreo(tarjeta.correo); setInputNombreTemp(tarjeta.nombreReal); }} className="text-[11px] text-zinc-400 hover:text-pink-600">✏️</button>
                                </div>
                              )}
                              <p className="text-[11px] text-zinc-400">{tarjeta.correo}</p>
                            </div>
                          </div>

                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${estadoConfirmActual === 'Confirmado' ? 'bg-emerald-50 text-emerald-700' : estadoConfirmActual === 'Cancelado' ? 'bg-rose-100 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>
                            {estadoConfirmActual === 'Confirmado' ? '✔ Confirmado' : estadoConfirmActual === 'Cancelado' ? '❌ Cancelado' : '⏳ Pendiente'}
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
                                {it.imagenUrl ? <img src={it.imagenUrl} alt="" className="w-8 h-8 rounded-lg object-cover border shrink-0" /> : <span className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-xs shrink-0">🧸</span>}
                                <div className="truncate">
                                  <p className="font-semibold text-zinc-800 truncate">{it.productoNombre}</p>
                                  <p className="text-[10px] text-pink-600 font-bold">{it.detalleSlot}</p>
                                </div>
                              </div>
                              <span className="font-bold text-zinc-700 shrink-0">{it.cantidad} · ${it.precioTotal.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="pt-3 border-t border-zinc-100 space-y-2.5">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-zinc-500">Total</span>
                          <span className="text-base font-black text-zinc-900">${tarjeta.totalTarjeta.toFixed(2)} USD</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <select value={estadoConfirmActual} onChange={(e) => actualizarTarjetaCompleta(tarjeta, 'estadoConfirmacion', e.target.value)} className="text-[11px] font-bold rounded-xl px-2.5 py-2 border bg-zinc-50">
                            <option value="Pendiente">⏳ Sin confirmar</option>
                            <option value="Confirmado">✅ Confirmado</option>
                            <option value="Cancelado">❌ Cancelado</option>
                          </select>
                          <select value={estadoPagoActual} onChange={(e) => actualizarTarjetaCompleta(tarjeta, 'estadoPago', e.target.value)} className={`text-[11px] font-bold rounded-xl px-2.5 py-2 border ${estadoPagoActual === 'Pagado' ? 'bg-emerald-500 text-white' : 'bg-amber-400 text-zinc-900'}`}>
                            <option value="Sin pagar">💸 Sin pagar</option>
                            <option value="Verificando">🔵 Verificando</option>
                            <option value="Pagado">💚 Pagado</option>
                          </select>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-zinc-500">
                          <span>Fecha pago:</span>
                          <input type="date" value={fechaPagoActual} onChange={(e) => actualizarTarjetaCompleta(tarjeta, 'fechaPago', e.target.value)} className="border border-zinc-200 rounded-lg px-2 py-1 text-[11px]" />
                        </div>

                        {estadoPagoActual !== 'Pagado' && estadoConfirmActual !== 'Cancelado' && (
                          <button type="button" onClick={() => notificarCancelacionFaltaPago(tarjeta)} className="w-full py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-bold">
                            🚨 Notificar cancelación por falta de pago
                          </button>
                        )}
                                                <button
                          type="button"
                          onClick={() => handleEliminarTarjetaPedido(tarjeta)}
                          className="w-full py-1.5 rounded-xl bg-zinc-100 hover:bg-rose-600 hover:text-white text-zinc-500 text-[11px] font-bold transition-colors"
                        >
                          🗑️ Eliminar pedido / Liberar slots
                        </button>

                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
              {pestanaAdmin === 'envios' && (
        <div className="space-y-4">
          <div>
            <h1 className="text-xl font-extrabold text-zinc-900">🚚 Solicitudes de Envío (Bodega)</h1>
            <p className="text-xs text-zinc-500">Paquetes acumulados que tus joiners pidieron despachar</p>
          </div>

          {solicitudesEnvio.length === 0 ? (
            <div className="bg-white border border-zinc-200 rounded-2xl p-10 text-center text-xs text-zinc-400">
              Aún no hay solicitudes de envío registradas 📦
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {solicitudesEnvio.map((sol) => (
                <div key={sol.id} className="bg-white border border-zinc-200/90 rounded-2xl p-5 shadow-2xs space-y-3">
                  <div className="flex justify-between items-start gap-2 border-b border-zinc-100 pb-3">
                    <div>
                      <h3 className="text-sm font-extrabold text-zinc-900">{sol.nombre_completo} (@{sol.instagram})</h3>
                      <p className="text-[11px] text-zinc-400">{sol.user_email} · Tlf: {sol.telefono}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${sol.estado_despacho === 'Enviado' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'}`}>
                      {sol.estado_despacho === 'Enviado' ? '✔ Enviado' : '⏳ Pendiente'}
                    </span>
                  </div>

                  <div className="text-xs text-zinc-700 space-y-1">
                    <p><strong>Destino:</strong> {sol.ciudad} — {sol.direccion}</p>
                    <p><strong>Método:</strong> {sol.metodo_envio} (<span className="text-pink-600 font-bold">${Number(sol.costo_envio || 0).toFixed(2)}</span>)</p>
                    <pre className="whitespace-pre-line font-sans text-[11px] bg-zinc-50 p-3 rounded-xl border mt-2">{sol.articulos_incluidos}</pre>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <input
                      type="text"
                      placeholder={sol.guia_rastreo || 'Código de guía Servientrega (opcional)...'}
                      value={guiasTemp[sol.id] ?? (sol.guia_rastreo || '')}
                      onChange={(e) => setGuiasTemp((prev) => ({ ...prev, [sol.id]: e.target.value }))}
                      className="border border-zinc-200 rounded-xl px-3 py-2 text-xs flex-1 bg-zinc-50"
                    />
                    <button
                      type="button"
                      onClick={() => handleMarcarEnviado(sol.id)}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shrink-0"
                    >
                      🚚 Marcar Enviado
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

        {pestanaAdmin === 'stock' && (
          <div className="space-y-5">
            <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 space-y-3">
              <h2 className="text-base font-extrabold text-zinc-900">📦 Gestor de Stock separado por GO</h2>
              <div className="flex flex-wrap gap-2">
                {gosAdmin.map((g) => (
                  <button key={g.id} type="button" onClick={() => setGoStockFiltro(g.id)} className={`px-3.5 py-2 rounded-xl text-xs font-bold ${goStockFiltro === g.id ? 'bg-pink-600 text-white' : 'bg-zinc-100 text-zinc-700'}`}>
                    🧸 {g.title}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {productosStockFiltrados.map((prod) => (
                <div key={prod.id} className="bg-white border border-zinc-200/90 rounded-2xl p-5 space-y-4 shadow-2xs">
                  <div className="flex items-center gap-3 border-b border-zinc-100 pb-3">
                    <div className="w-14 h-14 rounded-xl bg-zinc-100 border overflow-hidden shrink-0 flex items-center justify-center">
                      {prod.imagen_producto ? <img src={prod.imagen_producto} alt="" className="w-full h-full object-cover" /> : <span className="text-xl">🧸</span>}
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-zinc-900">{prod.nombre_producto}</h3>
                      <p className="text-xs text-zinc-500">${Number(prod.precio).toFixed(2)} USD</p>
                    </div>
                  </div>
                  {inputsStock[prod.id] && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {Object.entries(inputsStock[prod.id]).map(([slot, val]) => (
                        <div key={slot} className="bg-zinc-50 border border-zinc-200/80 rounded-xl p-2 flex justify-between items-center text-xs">
                          <span className="font-bold text-zinc-700 truncate pr-1">{slot}</span>
                          <input type="number" value={val} onChange={(e) => handleEditInputLocal(prod.id, slot, e.target.value)} className="border border-zinc-300 bg-white rounded-lg w-12 px-1.5 py-1 text-center font-bold" />
                        </div>
                      ))}
                    </div>
                  )}
                  <button type="button" onClick={() => handleGuardarStockBD(prod.id)} className="w-full bg-zinc-900 text-white text-xs font-bold py-2.5 rounded-xl">
                    💾 Guardar stock de este producto
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        {pestanaAdmin === 'lanzar' && (
          <div className="space-y-8">
            <form onSubmit={handleCrearItemShop} className="bg-white border border-zinc-200/90 rounded-3xl p-6 shadow-2xs space-y-6">
              <div className="flex flex-wrap justify-between items-center border-b border-zinc-100 pb-4 gap-2">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">Hyune Atelier Shop</span>
                  <h2 className="text-lg font-extrabold text-zinc-900 mt-1">Agregar Nuevo Producto a la Tienda</h2>
                </div>
                <button type="submit" disabled={loadingForm || subiendoImagen} className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold">
                  {subiendoImagen ? 'Subiendo foto...' : '✨ Publicar en Tienda'}
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-5 space-y-3">
                  <p className="text-xs font-bold text-zinc-700">Imágenes del Producto</p>
                  <div className="w-full h-60 rounded-2xl bg-zinc-50 border-2 border-dashed border-zinc-200 overflow-hidden relative flex flex-col items-center justify-center p-3">
                    {newShopImage ? <img src={newShopImage} alt="Portada" className="max-h-full max-w-full object-contain rounded-xl" /> : <p className="text-xs text-zinc-400">📸 Foto principal (Portada)</p>}
                    <input type="file" accept="image/*" onChange={(e) => uploadImageHandler(e, 'shop')} className="mt-2 text-[11px]" />
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {newShopExtraImages.map((url, i) => (
                      <div key={i} className="relative h-16 rounded-xl border overflow-hidden bg-zinc-50">
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        <button type="button" onClick={() => setNewShopExtraImages((prev) => prev.filter((_, idx) => idx !== i))} className="absolute top-0.5 right-0.5 bg-rose-600 text-white text-[9px] w-4 h-4 rounded-full">✕</button>
                      </div>
                    ))}
                    {newShopExtraImages.length < 4 && (
                      <label className="h-16 rounded-xl border-2 border-dashed border-zinc-200 flex items-center justify-center text-zinc-400 cursor-pointer text-[10px] font-bold">
                        <span>+ Foto</span>
                        <input type="file" accept="image/*" onChange={(e) => uploadImageHandler(e, 'shop-extra')} className="hidden" />
                      </label>
                    )}
                  </div>
                </div>
                <div className="lg:col-span-7 space-y-4">
                  <input type="text" placeholder="Nombre del Producto *" value={newShopName} onChange={(e) => setNewShopName(e.target.value)} className="border border-zinc-200 rounded-xl px-3.5 py-2.5 text-xs w-full bg-zinc-50/50" />
                  <div className="grid grid-cols-2 gap-3">
                    <select value={newShopStatus} onChange={(e) => setNewShopStatus(e.target.value)} className="border border-zinc-200 rounded-xl px-3 py-2.5 text-xs bg-zinc-50/50 font-bold">
                      <option value="INSTOCK">🟢 In Stock</option>
                      <option value="PREORDER">🟡 Pre-Order</option>
                      <option value="SOLD OUT">🔴 Sold Out</option>
                    </select>
                    <input type="text" placeholder="Grupo (ej: Stray Kids, TXT...)" value={newShopGroup} onChange={(e) => setNewShopGroup(e.target.value)} className="border border-zinc-200 rounded-xl px-3.5 py-2.5 text-xs bg-zinc-50/50" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <select value={newShopCategoria} onChange={(e) => setNewShopCategoria(e.target.value)} className="border border-zinc-200 rounded-xl px-3 py-2.5 text-xs bg-zinc-50/50 font-bold">
                      <option value="Photocards">🃏 Photocards</option>
                      <option value="Álbumes">💿 Álbumes</option>
                      <option value="Plushies">🧸 Plushies</option>
                      <option value="Llaveros">🔑 Llaveros</option>
                      <option value="Hecho a mano">🧶 Hecho a mano</option>
                      <option value="Merch Oficial">✨ Merch Oficial</option>
                    </select>
                    <input type="text" placeholder="Integrante (ej: Hyunjin)" value={newShopIntegrante} onChange={(e) => setNewShopIntegrante(e.target.value)} className="border border-zinc-200 rounded-xl px-3.5 py-2.5 text-xs bg-zinc-50/50" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input type="number" step="0.01" placeholder="Precio USD *" value={newShopPrice} onChange={(e) => setNewShopPrice(e.target.value)} className="border border-zinc-200 rounded-xl px-3.5 py-2.5 text-xs font-bold" />
                    <input type="number" min="0" placeholder="Stock *" value={newShopQty} onChange={(e) => setNewShopQty(e.target.value)} className="border border-zinc-200 rounded-xl px-3.5 py-2.5 text-xs font-bold" />
                  </div>
                                    {/* VARIANTES / PHOTOCARDS DENTRO DE LA MISMA FOTO */}
                  <div className="bg-indigo-50/50 border border-indigo-200/80 rounded-2xl p-3.5 space-y-2.5">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-xs font-extrabold text-indigo-900">🃏 Opciones / Photocards en esta foto (Opcional)</p>
                        <p className="text-[10px] text-indigo-700">Úsalo si subiste una foto grupal o set con precios/stocks distintos</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setNewShopVariantes((prev) => [...prev, { nombre: '', precio: '', stock: '1' }])}
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-[11px] font-bold hover:bg-indigo-700"
                      >
                        + Agregar opción
                      </button>
                    </div>

                    {newShopVariantes.map((v, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-1.5 items-center bg-white p-2 rounded-xl border border-indigo-100">
                        <input
                          type="text"
                          placeholder="Ej: #1 Hyunjin"
                          value={v.nombre}
                          onChange={(e) => {
                            const copia = [...newShopVariantes];
                            copia[idx].nombre = e.target.value;
                            setNewShopVariantes(copia);
                          }}
                          className="col-span-5 border rounded-lg px-2 py-1.5 text-xs"
                        />
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Precio $"
                          value={v.precio}
                          onChange={(e) => {
                            const copia = [...newShopVariantes];
                            copia[idx].precio = e.target.value;
                            setNewShopVariantes(copia);
                          }}
                          className="col-span-3 border rounded-lg px-2 py-1.5 text-xs font-bold"
                        />
                        <input
                          type="number"
                          min="0"
                          placeholder="Stock"
                          value={v.stock}
                          onChange={(e) => {
                            const copia = [...newShopVariantes];
                            copia[idx].stock = e.target.value;
                            setNewShopVariantes(copia);
                          }}
                          className="col-span-3 border rounded-lg px-2 py-1.5 text-xs text-center font-bold"
                        />
                        <button
                          type="button"
                          onClick={() => setNewShopVariantes((prev) => prev.filter((_, i) => i !== idx))}
                          className="col-span-1 text-rose-500 font-bold text-xs text-center"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                  <textarea rows={2} placeholder="Descripción..." value={newShopDesc} onChange={(e) => setNewShopDesc(e.target.value)} className="border border-zinc-200 rounded-xl px-3.5 py-2 text-xs w-full bg-zinc-50/50" />
                </div>
              </div>
            </form>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <form onSubmit={handleCreateGO} className="bg-white border rounded-2xl p-5 space-y-3">
                <h2 className="text-sm font-extrabold">1. Nuevo Group Order (GO)</h2>
                <input type="text" placeholder="Título del GO" value={newGoTitle} onChange={(e) => setNewGoTitle(e.target.value)} className="border rounded-xl px-3.5 py-2.5 text-xs w-full" />
                <input type="text" placeholder="Grupo (ej: stray kids)" value={newGoGroup} onChange={(e) => setNewGoGroup(e.target.value)} className="border rounded-xl px-3.5 py-2.5 text-xs w-full" />
                <input type="file" accept="image/*" onChange={(e) => uploadImageHandler(e, 'go')} className="text-xs w-full" />
                <button type="submit" disabled={loadingForm || subiendoImagen} className="w-full bg-zinc-900 text-white font-bold text-xs py-3 rounded-xl">➕ Crear GO</button>
              </form>
              <form onSubmit={handleCrearProducto} className="bg-white border rounded-2xl p-5 space-y-3">
                <div className="flex justify-between items-center">
                  <h2 className="text-sm font-extrabold text-pink-600">2. Nuevo Artículo en GO</h2>
                  {selectedGoId && <button type="button" onClick={() => handleEliminarGO(selectedGoId)} className="text-[11px] text-rose-500 underline">Borrar GO</button>}
                </div>
                <select value={selectedGoId || ''} onChange={(e) => setSelectedGoId(Number(e.target.value))} className="border rounded-xl px-3.5 py-2.5 text-xs w-full font-bold">
                  {gosAdmin.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
                </select>
                <input type="text" placeholder="Nombre del artículo" value={newProdName} onChange={(e) => setNewProdName(e.target.value)} className="border rounded-xl px-3.5 py-2.5 text-xs w-full" />
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" step="0.01" placeholder="Precio USD" value={newProdPrice} onChange={(e) => setNewProdPrice(e.target.value)} className="border rounded-xl px-3.5 py-2.5 text-xs" />
                  <input type="number" placeholder="Stock por slot" value={newProdQty} onChange={(e) => setNewProdQty(e.target.value)} className="border rounded-xl px-3.5 py-2.5 text-xs" />
                </div>
                <input type="text" placeholder="Integrantes (Bang Chan, Lee Know...)" value={newProdSlots} onChange={(e) => setNewProdSlots(e.target.value)} className="border rounded-xl px-3.5 py-2.5 text-xs w-full" />
                <input type="date" value={newProdDueDate} onChange={(e) => setNewProdDueDate(e.target.value)} className="border rounded-xl px-3.5 py-2 text-xs w-full" />
                <input type="file" accept="image/*" onChange={(e) => uploadImageHandler(e, 'prod')} className="text-xs w-full" />
                <button type="submit" disabled={loadingForm || subiendoImagen} className="w-full bg-pink-600 text-white font-bold text-xs py-3 rounded-xl">📦 Publicar en GO</button>
              </form>
            </div>
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
      </div>
    </div>
  );
}
