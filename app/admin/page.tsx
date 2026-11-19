'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

type Go = { id: number; title: string; group_name: string; estado_logistica?: string };

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
  creadoEn?: string;
};

type TarjetaJoiner = {
  tarjetaId: string;
  correo: string;
  nombreReal: string;
  telefono?: string;
  categoriaTitulo: string;
  origen: 'GO' | 'SHOP';
  items: ItemTarjeta[];
  totalTarjeta: number;
  abonadoTarjeta: number;
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
  grupo?: string | null;
  integrante?: string | null;
  era?: string | null;
  tipo_pc?: string | null;
  destacado?: boolean;
  badge_especial?: string | null;
  variantes?: { nombre: string; precio: number; stock: number }[] | null;
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
  const [editandoTotalId, setEditandoTotalId] = useState<number | null>(null);
  const [inputTotalTemp, setInputTotalTemp] = useState('');
  const [inputsAbono, setInputsAbono] = useState<Record<string, string>>({});

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
  const [newShopEra, setNewShopEra] = useState('');
  const [newShopTipoPc, setNewShopTipoPc] = useState('Álbum PC');
  const [newShopQty, setNewShopQty] = useState('1');
  const [newShopDesc, setNewShopDesc] = useState('');
  const [newShopVariantes, setNewShopVariantes] = useState<{ nombre: string; precio: string; stock: string }[]>([]);

  const [editandoProducto, setEditandoProducto] = useState<ProductoAdmin | null>(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editQty, setEditQty] = useState('');
  const [editGrupo, setEditGrupo] = useState('');
  const [editIntegrante, setEditIntegrante] = useState('');
  const [editEra, setEditEra] = useState('');
  const [editTipoPc, setEditTipoPc] = useState('Álbum PC');
  const [editDesc, setEditDesc] = useState('');
  const [editVariantes, setEditVariantes] = useState<{ nombre: string; precio: number; stock: number }[]>([]);
  const [filtroItemsEditar, setFiltroItemsEditar] = useState<string>('TIENDA');
  const [busquedaItemsEditar, setBusquedaItemsEditar] = useState('');

  const [fotoIntegGrupo, setFotoIntegGrupo] = useState('STRAY KIDS');
  const [fotoIntegNombre, setFotoIntegNombre] = useState('');
  const [fotoIntegUrl, setFotoIntegUrl] = useState('');
  async function uploadImageHandler(e: React.ChangeEvent<HTMLInputElement>, targetForm: 'go' | 'prod' | 'shop' | 'shop-extra' | 'integ') {
    const file = e.target.files ? Array.from(e.target.files).at(0) : null;
    if (!file) return;
    setSubiendoImagen(true);
    const fileExt = file.name.split('.').pop();
    const fileName = Date.now() + '-' + Math.random().toString(36).substring(2) + '.' + fileExt;
    const { error } = await supabase.storage.from('fotos-productos').upload(fileName, file);
    if (error) { alert('Error: ' + error.message); setSubiendoImagen(false); return; }
    const { data: { publicUrl } } = supabase.storage.from('fotos-productos').getPublicUrl(fileName);
    if (targetForm === 'go') setNewGoImage(publicUrl);
    else if (targetForm === 'prod') setNewProdImage(publicUrl);
    else if (targetForm === 'shop') setNewShopImage(publicUrl);
    else if (targetForm === 'integ') setFotoIntegUrl(publicUrl);
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
          setGosAdmin(dataGos.map((g: any) => ({ id: g.id, title: g.title, group_name: g.group_name, estado_logistica: g.estado_logistica || 'Esperando cierre' })));
          const primerGo = dataGos.at(0);
          if (primerGo && !selectedGoId) setSelectedGoId(primerGo.id);
          if (primerGo && goStockFiltro === 'TODOS') setGoStockFiltro(primerGo.id);
        }

        const mapaSeg: Record<string, any> = {};
        if (dataSeg) dataSeg.forEach((s: any) => { mapaSeg[s.claim_key] = s; });

        const mapaNombres: Record<string, string> = {};
        const mapaTelefonos: Record<string, string> = {};
        if (dataPerfiles) {
          dataPerfiles.forEach((pf: any) => {
            const m = pf.user_email.toLowerCase();
            if (pf.nombre_completo) mapaNombres[m] = pf.nombre_completo;
            if (pf.telefono) mapaTelefonos[m] = pf.telefono;
          });
        }

        const agrupadoPorGoYJoiner: Record<string, TarjetaJoiner> = {};
        const agregarATarjeta = (correoRaw: string, categoria: string, origen: 'GO' | 'SHOP', item: ItemTarjeta, abonoItem = 0) => {
          const correo = correoRaw.toLowerCase().trim();
          const keyTarjeta = categoria + '__' + correo;
          if (!agrupadoPorGoYJoiner[keyTarjeta]) {
            const aliasCorreo = correo.split('@').at(0) || correo;
            agrupadoPorGoYJoiner[keyTarjeta] = {
              tarjetaId: keyTarjeta,
              correo,
              nombreReal: mapaNombres[correo] || aliasCorreo,
              telefono: mapaTelefonos[correo] || '',
              categoriaTitulo: categoria,
              origen,
              items: [],
              totalTarjeta: 0,
              abonadoTarjeta: 0,
            };
          }
          agrupadoPorGoYJoiner[keyTarjeta].items.push(item);
          agrupadoPorGoYJoiner[keyTarjeta].totalTarjeta += item.precioTotal;
          agrupadoPorGoYJoiner[keyTarjeta].abonadoTarjeta += Number(abonoItem || 0);
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
              const claimKey = p.id + '-' + integrante;
              const seg = mapaSeg[claimKey];

              if (typeof dataClaim === 'string') {
                agregarATarjeta(dataClaim, goTitle, 'GO', {
                  idUnico: claimKey, claimKeyBase: claimKey, origen: 'GO', goTitulo: goTitle,
                  productoNombre: p.nombre_producto, imagenUrl: p.imagen_producto || null,
                  detalleSlot: integrante, cantidad: 1, precioTotal: Number(p.precio || 0),
                  estadoConfirmacion: seg?.estado_confirmacion || 'Pendiente',
                  estadoPago: seg?.estado_pago || 'Sin pagar', fechaPago: seg?.fecha_pago || '',
                  creadoEn: seg?.created_at || '',
                }, Number(seg?.monto_abonado || 0));
              } else if (typeof dataClaim === 'object') {
                Object.entries(dataClaim).forEach(([correoCliente, cant]: [string, any]) => {
                  if (!correoCliente || !cant) return;
                  agregarATarjeta(correoCliente, goTitle, 'GO', {
                    idUnico: claimKey + '-' + correoCliente, claimKeyBase: claimKey, origen: 'GO', goTitulo: goTitle,
                    productoNombre: p.nombre_producto, imagenUrl: p.imagen_producto || null,
                    detalleSlot: integrante, cantidad: Number(cant), precioTotal: Number(p.precio || 0) * Number(cant),
                    estadoConfirmacion: seg?.estado_confirmacion || 'Pendiente',
                    estadoPago: seg?.estado_pago || 'Sin pagar', fechaPago: seg?.fecha_pago || '',
                    creadoEn: seg?.created_at || '',
                  }, Number(seg?.monto_abonado || 0));
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
            imagen_producto: p.imagen_producto, estado_pago: p.estado_pago, due_date: p.due_date,
            grupo: p.grupo, integrante: p.integrante, era: p.era, tipo_pc: p.tipo_pc,
            destacado: p.destacado, badge_especial: p.badge_especial, variantes: p.variantes, isShop: true,
          })));
        }

        if (dataPedidos) {
          dataPedidos.forEach((ped: any) => {
            if (ped.user_email && ped.user_email !== 'STOCK_TIENDA_FISICA') {
              agregarATarjeta(ped.user_email, 'Tienda / Shop', 'SHOP', {
                idUnico: 'shop-' + ped.id, pedidoId: ped.id, origen: 'SHOP', goTitulo: 'Tienda / Shop',
                productoNombre: ped.producto_nombre || ped.detalles || 'Pedido Tienda',
                imagenUrl: ped.imagen_producto || null, detalleSlot: ped.detalles || 'En bodega',
                cantidad: 1, precioTotal: Number(ped.total_pagar || 0),
                estadoConfirmacion: ped.estado_confirmacion || 'Pendiente',
                estadoPago: ped.estado_pago || 'Sin pagar', fechaPago: ped.fecha_pago || '',
                creadoEn: ped.created_at || '',
              }, Number(ped.monto_abonado || 0));
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
    }, { onConflict: 'user_email' });
    setTarjetasJoiners((prev) =>
      prev.map((t) => (t.correo === correo ? { ...t, nombreReal: inputNombreTemp.trim() } : t))
    );
    setEditandoNombreCorreo(null);
  }

  async function guardarNuevoTotalPedido(pedidoId: number, nuevoMonto: string) {
    const val = Number(nuevoMonto);
    if (isNaN(val) || val < 0) { setEditandoTotalId(null); return; }
    await supabase.from('pedidos').update({ total_pagar: val }).eq('id', pedidoId);
    setEditandoTotalId(null);
    cargarDatosHibridos();
  }

  async function guardarAbonoTarjeta(tarjeta: TarjetaJoiner) {
    const valStr = inputsAbono[tarjeta.tarjetaId];
    if (valStr === undefined) return;
    const monto = Math.max(0, Number(valStr) || 0);
    const llegoAlTotal = monto >= tarjeta.totalTarjeta && tarjeta.totalTarjeta > 0;

    for (let i = 0; i < tarjeta.items.length; i++) {
      const it = tarjeta.items[i];
      const abonoItem = i === 0 ? monto : 0;
      if (it.origen === 'GO' && it.claimKeyBase) {
        await supabase.from('seguimiento_claims').upsert({
          claim_key: it.claimKeyBase,
          user_email: tarjeta.correo,
          go_title: tarjeta.categoriaTitulo,
          producto_nombre: it.productoNombre,
          integrante: it.detalleSlot,
          estado_confirmacion: it.estadoConfirmacion,
          estado_pago: llegoAlTotal ? 'Pagado' : it.estadoPago,
          monto_abonado: abonoItem,
        });
      } else if (it.pedidoId) {
        await supabase.from('pedidos').update({
          monto_abonado: abonoItem,
          estado_pago: llegoAlTotal ? 'Pagado' : it.estadoPago,
        }).eq('id', it.pedidoId);
      }
    }
    alert(llegoAlTotal ? '💚 ¡Pago completado al 100%!' : '💰 ¡Abono guardado!');
    cargarDatosHibridos();
  }

  async function actualizarEstadoLogisticaGO(goId: number, nuevoEstado: string) {
    await supabase.from('gos').update({ estado_logistica: nuevoEstado }).eq('id', goId);
    setGosAdmin((prev) => prev.map((g) => (g.id === goId ? { ...g, estado_logistica: nuevoEstado } : g)));
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
      alert('🚚 ¡Envío marcado como DESPACHADO!');
      cargarDatosHibridos();
    }
  }

  async function notificarCancelacionFaltaPago(tarjeta: TarjetaJoiner) {
    if (!confirm('¿Marcar el pedido de ' + tarjeta.nombreReal + ' como CANCELADO por falta de pago?')) return;
    await actualizarTarjetaCompleta(tarjeta, 'estadoConfirmacion', 'Cancelado');
  }

  async function handleEliminarUnSoloItem(tarjeta: TarjetaJoiner, item: ItemTarjeta) {
    if (!confirm('¿Quitar "' + item.productoNombre + '" (' + item.detalleSlot + ') del pedido de ' + tarjeta.nombreReal + '?')) return;

    if (item.origen === 'GO' && item.claimKeyBase) {
      const partes = item.claimKeyBase.split('-');
      const prodId = Number(partes.at(0));
      const slotNombre = partes.slice(1).join('-');
      const { data: prodDb } = await supabase.from('productos').select('claims_integrantes').eq('id', prodId).single();
      if (prodDb?.claims_integrantes) {
        const claimsCopia = { ...prodDb.claims_integrantes };
        if (typeof claimsCopia[slotNombre] === 'string') delete claimsCopia[slotNombre];
        else if (typeof claimsCopia[slotNombre] === 'object' && claimsCopia[slotNombre] !== null) {
          delete claimsCopia[slotNombre][tarjeta.correo];
          if (Object.keys(claimsCopia[slotNombre]).length === 0) delete claimsCopia[slotNombre];
        }
        await supabase.from('productos').update({ claims_integrantes: claimsCopia }).eq('id', prodId);
      }
      await supabase.from('seguimiento_claims').delete().eq('claim_key', item.claimKeyBase);
    } else if (item.pedidoId) {
      await supabase.from('pedidos').delete().eq('id', item.pedidoId);
    }

    cargarDatosHibridos();
  }

  async function handleEliminarTarjetaPedido(tarjeta: TarjetaJoiner) {
    if (!confirm('⚠️ ¿Eliminar todo el pedido de ' + tarjeta.nombreReal + ' y liberar sus slots?')) return;
    for (const item of tarjeta.items) {
      if (item.origen === 'GO' && item.claimKeyBase) {
        const partes = item.claimKeyBase.split('-');
        const prodId = Number(partes.at(0));
        const slotNombre = partes.slice(1).join('-');
        const { data: prodDb } = await supabase.from('productos').select('claims_integrantes').eq('id', prodId).single();
        if (prodDb?.claims_integrantes) {
          const claimsCopia = { ...prodDb.claims_integrantes };
          if (typeof claimsCopia[slotNombre] === 'string') delete claimsCopia[slotNombre];
          else if (typeof claimsCopia[slotNombre] === 'object' && claimsCopia[slotNombre] !== null) {
            delete claimsCopia[slotNombre][tarjeta.correo];
            if (Object.keys(claimsCopia[slotNombre]).length === 0) delete claimsCopia[slotNombre];
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

  async function handleRenombrarSlotGO(prod: ProductoAdmin, slotViejo: string) {
    const slotNuevo = prompt('Escribe el nombre correcto para "' + slotViejo + '":', slotViejo);
    if (!slotNuevo || !slotNuevo.trim() || slotNuevo.trim() === slotViejo) return;
    const limpio = slotNuevo.trim();

    const listaActual = (prod.lista_slots || '').split(',').map((s) => s.trim());
    const nuevaLista = listaActual.map((s) => (s === slotViejo ? limpio : s)).join(', ');

    const stockActual = { ...(prod.stock_slots || {}) };
    const cantSlot = stockActual[slotViejo] ?? 1;
    delete stockActual[slotViejo];
    stockActual[limpio] = cantSlot;

    await supabase
      .from('productos')
      .update({ lista_slots: nuevaLista, stock_slots: stockActual })
      .eq('id', prod.id);

    cargarDatosHibridos();
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
      .map((v) => ({ nombre: v.nombre.trim(), precio: Number(v.precio), stock: Math.max(0, Number(v.stock || 0)) }));
    const tieneVariantes = variantesLimpias.length > 0;
    if (!newShopName || (!tieneVariantes && !newShopPrice)) return alert('Llena el nombre y precio/opciones 🛍️');
    const precioBase = tieneVariantes ? Math.min(...variantesLimpias.map((v) => v.precio)) : Number(newShopPrice);
    const stockTotal = tieneVariantes ? variantesLimpias.reduce((acc, v) => acc + v.stock, 0) : Number(newShopQty);

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
      era: newShopEra.trim().toUpperCase() || null,
      tipo_pc: newShopTipoPc,
      imagen_producto: newShopImage || null,
      fotos_extra: newShopExtraImages,
      variantes: variantesLimpias,
    }]);
    setLoadingForm(false);
    if (!error) {
      alert('¡Producto publicado en la Tienda! 🛍️✨');
      setNewShopName(''); setNewShopPrice(''); setNewShopEra(''); setNewShopDesc(''); setNewShopImage(''); setNewShopExtraImages([]); setNewShopVariantes([]);
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

  async function toggleDestacarShop(prodId: number, actual: boolean, nuevoBadge?: string) {
    const payload: any = { destacado: !actual };
    if (nuevoBadge !== undefined) {
      payload.destacado = true;
      payload.badge_especial = nuevoBadge || null;
    }
    await supabase.from('tienda_productos').update(payload).eq('id', prodId);
    cargarDatosHibridos();
  }

  async function guardarFotoIntegrante(e: React.FormEvent) {
    e.preventDefault();
    if (!fotoIntegNombre.trim() || !fotoIntegUrl) return alert('Escribe el nombre y sube su foto 📸');
    setLoadingForm(true);
    const { error } = await supabase.from('integrantes_fotos').upsert(
      {
        grupo: fotoIntegGrupo.toUpperCase().trim(),
        nombre: fotoIntegNombre.trim(),
        imagen_url: fotoIntegUrl,
      },
      { onConflict: 'nombre' }
    );
    setLoadingForm(false);
    if (!error) {
      setFotoIntegNombre('');
      setFotoIntegUrl('');
      alert('🪞 ¡Foto de integrante guardada!');
    } else {
      alert('Error: ' + error.message);
    }
  }
  const iniciarEdicion = (p: ProductoAdmin) => {
    setEditandoProducto(p);
    setEditName(p.nombre_producto);
    setEditPrice(String(p.precio));
    setEditQty(String(p.cantidad_disponible));
    setEditGrupo(p.grupo || '');
    setEditIntegrante(p.integrante || '');
    setEditEra(p.era || '');
    setEditTipoPc(p.tipo_pc || 'Álbum PC');
    setEditDesc(p.descripcion || '');
    setEditVariantes(Array.isArray(p.variantes) ? p.variantes.map((v) => ({ ...v })) : []);
  };

  async function handleGuardarEdicion(e: React.FormEvent) {
    e.preventDefault();
    if (!editandoProducto) return;
    setLoadingForm(true);

    if (editandoProducto.isShop && editVariantes.length > 0) {
      const stockTotal = editVariantes.reduce((s, v) => s + Math.max(0, Number(v.stock || 0)), 0);
      const precioMin = Math.min(...editVariantes.map((v) => Number(v.precio || 0)));
      await supabase
        .from('tienda_productos')
        .update({
          nombre_producto: editName.toUpperCase(),
          precio: precioMin,
          cantidad_disponible: stockTotal,
          estado_pago: stockTotal > 0 ? 'INSTOCK' : 'SOLD OUT',
          grupo: editGrupo.trim() || editandoProducto.grupo,
          due_date: (editGrupo.trim() || editandoProducto.due_date || '').toLowerCase(),
          integrante: editIntegrante.trim() || 'Grupal / Todos',
          era: editEra.trim().toUpperCase() || null,
          tipo_pc: editTipoPc,
          variantes: editVariantes.map((v) => ({
            nombre: v.nombre,
            precio: Number(v.precio),
            stock: Math.max(0, Number(v.stock)),
          })),
          descripcion: editDesc || null,
        })
        .eq('id', editandoProducto.id);
    } else {
      const nuevoStock = Math.max(0, Number(editQty));
      const payload: any = {
        nombre_producto: editName.toUpperCase(),
        precio: Number(editPrice),
        cantidad_disponible: nuevoStock,
        descripcion: editDesc || null,
      };
      if (editandoProducto.isShop) {
        payload.estado_pago = nuevoStock > 0 ? 'INSTOCK' : 'SOLD OUT';
        payload.grupo = editGrupo.trim() || editandoProducto.grupo;
        payload.due_date = (editGrupo.trim() || editandoProducto.due_date || '').toLowerCase();
        payload.integrante = editIntegrante.trim() || 'Grupal / Todos';
        payload.era = editEra.trim().toUpperCase() || null;
        payload.tipo_pc = editTipoPc;
      }
      await supabase
        .from(editandoProducto.isShop ? 'tienda_productos' : 'productos')
        .update(payload)
        .eq('id', editandoProducto.id);
    }

    setLoadingForm(false);
    setEditandoProducto(null);
    cargarDatosHibridos();
  }

  const categoriasGos = Array.from(
    new Set([
      ...gosAdmin.map((g) => g.title),
      ...tarjetasJoiners.filter((t) => t.origen === 'GO').map((t) => t.categoriaTitulo),
    ])
  );

  const tarjetasFiltradas = tarjetasJoiners
    .filter((t) => {
      if (filtroCategoria !== 'TODOS' && t.categoriaTitulo !== filtroCategoria) return false;
      if (busqueda && !t.nombreReal.toLowerCase().includes(busqueda.toLowerCase()) && !t.correo.toLowerCase().includes(busqueda.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      const fechaA = a.items.at(0)?.creadoEn || '9999-12-31';
      const fechaB = b.items.at(0)?.creadoEn || '9999-12-31';
      return fechaA.localeCompare(fechaB);
    });

  if (loading) return <div className="min-h-screen bg-[#F6F7F9] flex items-center justify-center font-mono text-xs text-zinc-400">✧ cargando atelier admin...</div>;
  if (usuarioEmail !== correoAdmin) {
    return (
      <div className="min-h-screen bg-[#F6F7F9] flex flex-col items-center justify-center p-4 gap-3">
        <p className="text-sm font-bold text-rose-600 bg-white border border-rose-100 px-6 py-3 rounded-full">✕ Acceso exclusivo de hyuneatelier 🎀</p>
        <Link href="/gos" className="text-xs underline text-zinc-500">Volver al catálogo ➔</Link>
      </div>
    );
  }

  const todosLosProductosAdmin = [...productosAdmin, ...productosTiendaAdmin];
  const productosStockFiltrados = goStockFiltro === 'TODOS' ? productosAdmin : productosAdmin.filter((p) => p.go_id === goStockFiltro);
  const coloresAvatar = ['bg-teal-700', 'bg-pink-600', 'bg-amber-600', 'bg-indigo-600', 'bg-emerald-700', 'bg-purple-700'];

  return (
