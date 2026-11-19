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
  }  async function handleMarcarEnviado(solId: number) {
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
    <div className="min-h-screen bg-[#F6F7F9] font-sans text-zinc-800 pb-16">

      <div className="bg-white border-b border-zinc-200 px-5 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center gap-4">
            <span className="font-black text-base tracking-tight text-zinc-900">🎀 hyuneatelier Admin</span>
            <div className="flex flex-wrap gap-1 bg-zinc-100 p-1 rounded-xl">
              {[
                { id: 'joiners', label: '📋 Órdenes por Joiner' },
                { id: 'envios', label: '🚚 Envíos (' + solicitudesEnvio.filter((s) => s.estado_despacho !== 'Enviado').length + ')' },
                { id: 'stock', label: '📦 Stock por GO' },
                { id: 'lanzar', label: '➕ Crear GO / Tienda' },
                { id: 'items', label: '🛠️ Editar Ítems' },
              ].map((tab) => (
                <button key={tab.id} type="button" onClick={() => setPestanaAdmin(tab.id as any)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${pestanaAdmin === tab.id ? 'bg-white text-zinc-900 shadow-2xs' : 'text-zinc-500 hover:text-zinc-800'}`}>
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
                <p className="text-xs text-zinc-500">Toca un GO para ver la Tabla de Prioridad (#1, #2, #3...) y cobrar por WhatsApp</p>
              </div>
              <input type="text" placeholder="Buscar por nombre o correo..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="bg-white border border-zinc-200 rounded-xl px-4 py-2 text-xs w-full sm:w-72 shadow-2xs" />
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              <button type="button" onClick={() => setFiltroCategoria('TODOS')} className={`px-3.5 py-1.5 rounded-xl text-xs font-bold ${filtroCategoria === 'TODOS' ? 'bg-teal-800 text-white' : 'bg-white text-zinc-600 border border-zinc-200'}`}>
                Todos ({tarjetasJoiners.length})
              </button>
              {categoriasGos.map((cat) => (
                <button key={cat} type="button" onClick={() => setFiltroCategoria(cat)} className={`px-3.5 py-1.5 rounded-xl text-xs font-bold ${filtroCategoria === cat ? 'bg-pink-600 text-white' : 'bg-white text-zinc-700 border border-zinc-200'}`}>
                  🧸 {cat}
                </button>
              ))}
              <button type="button" onClick={() => setFiltroCategoria('Tienda / Shop')} className={`px-3.5 py-1.5 rounded-xl text-xs font-bold ${filtroCategoria === 'Tienda / Shop' ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'}`}>
                🛍️ Tienda / Shop ({tarjetasJoiners.filter((t) => t.origen === 'SHOP').length})
              </button>
            </div>

            {filtroCategoria !== 'TODOS' && filtroCategoria !== 'Tienda / Shop' && tarjetasFiltradas.length > 0 && (
              <div className="bg-white border border-pink-200 rounded-2xl overflow-hidden shadow-2xs">
                <div className="bg-pink-50/80 px-4 py-2.5 border-b border-pink-100 flex justify-between items-center">
                  <span className="text-xs font-black text-pink-700 uppercase">⏱️ Tabla de Prioridad — {filtroCategoria}</span>
                  <span className="text-[11px] font-bold text-zinc-500">{tarjetasFiltradas.length} joiner(s)</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-50 text-[10px] font-extrabold uppercase text-zinc-500 border-b">
                      <tr>
                        <th className="px-3 py-2">#</th>
                        <th className="px-3 py-2">Joiner</th>
                        <th className="px-3 py-2">WhatsApp</th>
                        <th className="px-3 py-2">Slots</th>
                        <th className="px-3 py-2">Hora</th>
                        <th className="px-3 py-2">Pago / Abono</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {tarjetasFiltradas.map((t, i) => (
                        <tr key={t.tarjetaId} className="hover:bg-pink-50/30">
                          <td className="px-3 py-2 font-black text-pink-600">#{i + 1}</td>
                          <td className="px-3 py-2 font-bold text-zinc-900 capitalize">{t.nombreReal}</td>
                          <td className="px-3 py-2 font-mono text-[11px] text-emerald-700">{t.telefono || '—'}</td>
                          <td className="px-3 py-2 font-semibold text-zinc-700">{t.items.map((it) => it.detalleSlot).join(', ')}</td>
                          <td className="px-3 py-2 font-mono text-[10px] text-zinc-500">
                            {t.items.at(0)?.creadoEn
                              ? new Date(t.items.at(0)!.creadoEn!).toLocaleString('es-EC', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
                              : 'Antiguo'}
                          </td>
                          <td className="px-3 py-2 font-bold text-[11px]">
                            {t.items.at(0)?.estadoPago === 'Pagado'
                              ? '💚 Pagado'
                              : t.abonadoTarjeta > 0
                              ? `💰 Abonó $${t.abonadoTarjeta.toFixed(2)}`
                              : '💸 Pendiente'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
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
                          <div className={`w-10 h-10 rounded-xl ${colorAvatar} text-white font-black text-xs flex items-center justify-center shrink-0`}>{inicial}</div>
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
                            <p className="text-[11px] text-zinc-400 break-all">{tarjeta.correo}</p>
                            {tarjeta.telefono ? (
  <div className="pt-1 space-y-1">
    <p className="text-[11px] font-bold text-emerald-700">📱 {tarjeta.telefono}</p>
    {estadoPagoActual !== 'Pagado' && estadoConfirmActual !== 'Cancelado' && (() => {
      const soloDigitos = tarjeta.telefono!.replace(/\D/g, '');
      const numeroWsp = soloDigitos.startsWith('0')
        ? '593' + soloDigitos.slice(1)
        : soloDigitos.startsWith('593')
        ? soloDigitos
        : '593' + soloDigitos;
      const faltaPagar = Math.max(0, tarjeta.totalTarjeta - (tarjeta.abonadoTarjeta || 0));
      const resumenItems = tarjeta.items.map((it) => it.productoNombre + ' (' + it.detalleSlot + ')').join(', ');
      const textoCobro =
        '¡Holis, ' + tarjeta.nombreReal + '! 🎀 Te escribo de *hyuneatelier* para recordarte que tienes un saldo pendiente de *$' +
        faltaPagar.toFixed(2) + ' USD* por tu pedido en *' + tarjeta.categoriaTitulo + '* (' + resumenItems + ').\n\n' +
        'Quedo atenta a tu comprobante por aquí para mantener tus apartados ✨';
      const datosCobro = new URLSearchParams({ phone: numeroWsp, text: textoCobro });

      return (
        <a
          href={'https://whatsapp.com?' + datosCobro.toString()}
          className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-lg shadow-2xs"
        >
          💬 Cobrar por WhatsApp (${faltaPagar.toFixed(2)})
        </a>
      );
    })()}
  </div>
) : (
  <button
    type="button"
    onClick={async () => {
      const telNuevo = prompt('Escribe el WhatsApp de ' + tarjeta.nombreReal + ' (ej: 0991234567):');
      if (!telNuevo || !telNuevo.trim()) return;
      await supabase.from('perfiles_joiners').upsert(
        { user_email: tarjeta.correo, nombre_completo: tarjeta.nombreReal, telefono: telNuevo.trim() },
        { onConflict: 'user_email' }
      );
      cargarDatosHibridos();
    }}
    className="mt-1 inline-flex items-center gap-1 bg-amber-100 hover:bg-amber-200 text-amber-900 text-[10px] font-extrabold px-2.5 py-1 rounded-lg"
  >
    📱 + Agregar WhatsApp para cobrar
  </button>
)}

    className="mt-1 inline-flex items-center gap-1 bg-amber-100 hover:bg-amber-200 text-amber-900 text-[10px] font-extrabold px-2.5 py-1 rounded-lg"
  >
    📱 + Agregar WhatsApp para cobrar
  </button>
)}

                            ) : (
                              <p className="text-[10px] font-semibold text-rose-500">⚠️ Sin teléfono registrado</p>
                            )}
                          </div>
                        </div>
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0 ${estadoConfirmActual === 'Confirmado' ? 'bg-emerald-50 text-emerald-700' : estadoConfirmActual === 'Cancelado' ? 'bg-rose-100 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>
                          {estadoConfirmActual}
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-[11px] text-zinc-500 border-b border-zinc-100 pb-2">
                        <span className="font-bold text-pink-600">
                          {filtroCategoria !== 'TODOS' ? `#${idx + 1} · ` : ''}{tarjeta.categoriaTitulo}
                        </span>
                        <span>{tarjeta.items.length} orden(es)</span>
                      </div>
                      <div className="space-y-3">
                        {tarjeta.items.map((it) => {
                          const partesRaw = it.origen === 'SHOP' ? it.productoNombre.split(' + ').map((s) => s.trim()).filter(Boolean) : [it.productoNombre];
                          const gruposPorPost: Record<string, string[]> = {};
                          partesRaw.forEach((linea) => {
                            const match = linea.match(/^(\d+x)\s+(.+?)\s+\[(.+?)\]\s+(\(\$.*?\))$/);
                            if (match) {
                              const [, cant, tituloPost, variante, precio] = match;
                              if (!gruposPorPost[tituloPost]) gruposPorPost[tituloPost] = [];
                              gruposPorPost[tituloPost].push(cant + ' ' + variante + ' ' + precio);
                            } else {
                              if (!gruposPorPost[linea]) gruposPorPost[linea] = [];
                            }
                          });

                          return (
                            <div key={it.idUnico} className="bg-zinc-50/90 border border-zinc-200/80 rounded-2xl p-3 space-y-2.5 text-xs">
                              <div className="flex items-start gap-2.5">
                                {it.imagenUrl ? <img src={it.imagenUrl} alt="" className="w-11 h-11 rounded-xl object-cover border shrink-0" /> : <span className="w-11 h-11 rounded-xl bg-white border flex items-center justify-center text-sm shrink-0">🧸</span>}
                                <div className="flex-1 min-w-0 space-y-1.5">
                                  {Object.entries(gruposPorPost).map(([tituloPost, subItems], idxPost) => (
                                    <div key={idxPost} className="space-y-1">
                                      <p className="font-extrabold text-zinc-900 leading-snug break-words">
                                        {tituloPost}{' '}
                                        {subItems.length > 0 && (
                                          <span className="text-[10px] font-bold bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full ml-1">
                                            {subItems.length} elegido(s)
                                          </span>
                                        )}
                                      </p>
                                      {subItems.length > 0 && (
                                        <div className="bg-white border border-zinc-200/70 rounded-xl p-2 space-y-1">
                                          {subItems.map((sub, iSub) => (
                                            <p key={iSub} className="text-[11px] font-semibold text-zinc-700 leading-tight">• {sub}</p>
                                          ))}
                                        </div>
                                      )}
                                      {it.origen === 'GO' && <p className="text-[11px] font-bold text-pink-600">Slot: {it.detalleSlot}</p>}
                                      {it.creadoEn && (
                                        <p className="text-[10px] font-mono text-zinc-500">
                                          ⏱️ Pedido: {new Date(it.creadoEn).toLocaleString('es-EC', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                        </p>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => handleEliminarUnSoloItem(tarjeta, it)}
                                        className="text-[10px] font-bold text-rose-600 hover:underline pt-0.5 block"
                                      >
                                        ✕ Quitar solo este ítem
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div className="flex justify-between items-center pt-1.5 border-t border-zinc-200/60 text-[11px]">
                                <span className="text-zinc-400">Monto pedido:</span>
                                {it.origen === 'SHOP' && it.pedidoId && editandoTotalId === it.pedidoId ? (
                                  <div className="flex items-center gap-1">
                                    <input type="number" step="0.01" value={inputTotalTemp} onChange={(e) => setInputTotalTemp(e.target.value)} className="border rounded px-2 py-0.5 w-20 text-xs bg-white font-bold" autoFocus />
                                    <button type="button" onClick={() => guardarNuevoTotalPedido(it.pedidoId!, inputTotalTemp)} className="bg-emerald-600 text-white px-2 py-0.5 rounded font-bold">OK</button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-extrabold text-zinc-800">${it.precioTotal.toFixed(2)} USD</span>
                                    {it.origen === 'SHOP' && it.pedidoId && (
                                      <button type="button" onClick={() => { setEditandoTotalId(it.pedidoId!); setInputTotalTemp(String(it.precioTotal)); }} className="text-[10px] text-indigo-600 underline font-bold">
                                        ✏️ editar
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-zinc-100 space-y-2.5">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-zinc-500">Total</span>
                        <span className="text-base font-black text-zinc-900">${tarjeta.totalTarjeta.toFixed(2)} USD</span>
                      </div>

                      <div className="bg-zinc-50 border border-zinc-200/80 rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-zinc-600">Abonado: $</span>
                          <input
                            type="number"
                            step="0.01"
                            value={inputsAbono[tarjeta.tarjetaId] ?? String(tarjeta.abonadoTarjeta || 0)}
                            onChange={(e) => setInputsAbono((prev) => ({ ...prev, [tarjeta.tarjetaId]: e.target.value }))}
                            className="border bg-white rounded-lg px-2 py-1 w-20 text-xs font-extrabold text-emerald-700"
                          />
                          <button
                            type="button"
                            onClick={() => guardarAbonoTarjeta(tarjeta)}
                            className="bg-zinc-900 hover:bg-emerald-600 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold"
                          >
                            💾
                          </button>
                        </div>
                        <span className="font-extrabold text-amber-700">
                          Falta: ${Math.max(0, tarjeta.totalTarjeta - Number(inputsAbono[tarjeta.tarjetaId] ?? tarjeta.abonadoTarjeta ?? 0)).toFixed(2)}
                        </span>
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

                      <button type="button" onClick={() => handleEliminarTarjetaPedido(tarjeta)} className="w-full py-1.5 rounded-xl bg-zinc-100 hover:bg-rose-600 hover:text-white text-zinc-500 text-[11px] font-bold transition-colors">
                        🗑️ Eliminar pedido completo / Liberar slots
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {pestanaAdmin === 'envios' && (
          <div className="space-y-4">
            <h1 className="text-xl font-extrabold text-zinc-900">🚚 Solicitudes de Envío (Bodega)</h1>
            {solicitudesEnvio.length === 0 ? (
              <div className="bg-white border rounded-2xl p-10 text-center text-xs text-zinc-400">Aún no hay solicitudes de envío registradas 📦</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {solicitudesEnvio.map((sol) => (
                  <div key={sol.id} className="bg-white border rounded-2xl p-5 shadow-2xs space-y-3">
                    <div className="flex justify-between items-start gap-2 border-b pb-3">
                      <div>
                        <h3 className="text-sm font-extrabold text-zinc-900">{sol.nombre_completo} (@{sol.instagram})</h3>
                        <p className="text-[11px] text-zinc-400">{sol.user_email} · Tlf: {sol.telefono}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${sol.estado_despacho === 'Enviado' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'}`}>
                        {sol.estado_despacho}
                      </span>
                    </div>
                    <div className="text-xs text-zinc-700 space-y-1">
                      <p><strong>Destino:</strong> {sol.ciudad} — {sol.direccion}</p>
                      <p><strong>Método:</strong> {sol.metodo_envio} (${Number(sol.costo_envio || 0).toFixed(2)})</p>
                      <pre className="whitespace-pre-line font-sans text-[11px] bg-zinc-50 p-3 rounded-xl border mt-2">{sol.articulos_incluidos}</pre>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <input type="text" placeholder={sol.guia_rastreo || 'Guía Servientrega...'} value={guiasTemp[sol.id] ?? (sol.guia_rastreo || '')} onChange={(e) => setGuiasTemp((prev) => ({ ...prev, [sol.id]: e.target.value }))} className="border rounded-xl px-3 py-2 text-xs flex-1 bg-zinc-50" />
                      <button type="button" onClick={() => handleMarcarEnviado(sol.id)} className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold shrink-0">🚚 Marcar Enviado</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {pestanaAdmin === 'stock' && (
          <div className="space-y-5">
            <div className="bg-white border rounded-2xl p-4 space-y-3">
              <h2 className="text-base font-extrabold text-zinc-900">📦 Gestor de Stock y Estado Logístico por GO</h2>
              <div className="flex flex-wrap gap-2">
                {gosAdmin.map((g) => (
                  <button key={g.id} type="button" onClick={() => setGoStockFiltro(g.id)} className={`px-3.5 py-2 rounded-xl text-xs font-bold ${goStockFiltro === g.id ? 'bg-pink-600 text-white' : 'bg-zinc-100 text-zinc-700'}`}>
                    🧸 {g.title}
                  </button>
                ))}
              </div>

              {typeof goStockFiltro === 'number' && (() => {
                const goSel = gosAdmin.find((g) => g.id === goStockFiltro);
                if (!goSel) return null;
                return (
                  <div className="bg-pink-50/80 border border-pink-200 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-extrabold text-pink-800">✈️ Estado logístico de este GO:</span>
                    <select
                      value={goSel.estado_logistica || 'Esperando cierre'}
                      onChange={(e) => actualizarEstadoLogisticaGO(goSel.id, e.target.value)}
                      className="border border-pink-300 bg-white rounded-xl px-3 py-1.5 font-extrabold text-zinc-900"
                    >
                      <option value="Esperando cierre">⏳ Esperando cierre (Not secured)</option>
                      <option value="Pedido realizado">🟡 Pedido realizado (Secured)</option>
                      <option value="En bodega Corea / Japón">🇰🇷 En bodega Corea / Japón</option>
                      <option value="En camino a Ecuador">✈️ En camino a Ecuador</option>
                      <option value="Llegó a hyuneatelier">📦 ¡Llegó a hyuneatelier! (Listo para envío)</option>
                    </select>
                  </div>
                );
              })()}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {productosStockFiltrados.map((prod) => (
                <div key={prod.id} className="bg-white border rounded-2xl p-5 space-y-4 shadow-2xs">
                  <div className="flex items-center gap-3 border-b pb-3">
                    {prod.imagen_producto && <img src={prod.imagen_producto} alt="" className="w-12 h-12 rounded-xl object-cover border" />}
                    <div>
                      <h3 className="text-sm font-extrabold text-zinc-900">{prod.nombre_producto}</h3>
                      <p className="text-xs text-zinc-500">${Number(prod.precio).toFixed(2)} USD</p>
                    </div>
                  </div>
                  {inputsStock[prod.id] && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {Object.entries(inputsStock[prod.id]).map(([slot, val]) => (
                        <div key={slot} className="bg-zinc-50 border rounded-xl p-2 flex justify-between items-center text-xs">
                          <button type="button" onClick={() => handleRenombrarSlotGO(prod, slot)} className="font-bold truncate pr-1 text-left hover:text-pink-600 flex items-center gap-1">
                            <span>{slot}</span>
                            <span className="text-[10px]">✏️</span>
                          </button>
                          <input type="number" value={val} onChange={(e) => handleEditInputLocal(prod.id, slot, e.target.value)} className="border bg-white rounded-lg w-12 px-1.5 py-1 text-center font-bold" />
                        </div>
                      ))}
                    </div>
                  )}
                  <button type="button" onClick={() => handleGuardarStockBD(prod.id)} className="w-full bg-zinc-900 text-white text-xs font-bold py-2.5 rounded-xl">💾 Guardar stock</button>
                </div>
              ))}
            </div>
          </div>
        )}
        {pestanaAdmin === 'lanzar' && (
          <div className="space-y-8">
            <form onSubmit={handleCrearItemShop} className="bg-white border rounded-3xl p-6 shadow-2xs space-y-6">
              <div className="flex flex-wrap justify-between items-center border-b pb-4 gap-2">
                <h2 className="text-lg font-extrabold text-zinc-900">Agregar Nuevo Producto a la Tienda</h2>
                <button type="submit" disabled={loadingForm || subiendoImagen} className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-extrabold">
                  {subiendoImagen ? 'Subiendo...' : '✨ Publicar en Tienda'}
                </button>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-5 space-y-3">
                  <div className="w-full h-56 rounded-2xl bg-zinc-50 border-2 border-dashed flex flex-col items-center justify-center p-3">
                    {newShopImage ? <img src={newShopImage} alt="Portada" className="max-h-full max-w-full object-contain rounded-xl" /> : <p className="text-xs text-zinc-400">📸 Foto principal (Portada)</p>}
                    <input type="file" accept="image/*" onChange={(e) => uploadImageHandler(e, 'shop')} className="mt-2 text-[11px]" />
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {newShopExtraImages.map((url, i) => (
                      <div key={i} className="relative h-16 rounded-xl border overflow-hidden">
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        <button type="button" onClick={() => setNewShopExtraImages((prev) => prev.filter((_, idx) => idx !== i))} className="absolute top-0.5 right-0.5 bg-rose-600 text-white text-[9px] w-4 h-4 rounded-full">✕</button>
                      </div>
                    ))}
                    {newShopExtraImages.length < 4 && (
                      <label className="h-16 rounded-xl border-2 border-dashed flex items-center justify-center text-zinc-400 cursor-pointer text-[10px] font-bold">
                        <span>+ Foto</span>
                        <input type="file" accept="image/*" onChange={(e) => uploadImageHandler(e, 'shop-extra')} className="hidden" />
                      </label>
                    )}
                  </div>
                </div>
                <div className="lg:col-span-7 space-y-3">
                  <input type="text" placeholder="Nombre del Producto *" value={newShopName} onChange={(e) => setNewShopName(e.target.value)} className="border rounded-xl px-3.5 py-2.5 text-xs w-full" />
                  <div className="grid grid-cols-2 gap-3">
                    <select value={newShopStatus} onChange={(e) => setNewShopStatus(e.target.value)} className="border rounded-xl px-3 py-2.5 text-xs font-bold">
                      <option value="INSTOCK">🟢 In Stock</option>
                      <option value="PREORDER">🟡 Pre-Order</option>
                      <option value="SOLD OUT">🔴 Sold Out</option>
                    </select>
                    <input type="text" placeholder="Grupo (Stray Kids, Enhypen...)" value={newShopGroup} onChange={(e) => setNewShopGroup(e.target.value)} className="border rounded-xl px-3.5 py-2.5 text-xs" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <select value={newShopCategoria} onChange={(e) => setNewShopCategoria(e.target.value)} className="border rounded-xl px-3.5 py-2.5 text-xs font-bold">
                      <option value="Photocards">🃏 Photocards</option>
                      <option value="Álbumes">💿 Álbumes</option>
                      <option value="Plushies">🧸 Plushies</option>
                      <option value="Llaveros">🔑 Llaveros</option>
                      <option value="Hecho a mano">🧶 Hecho a mano</option>
                      <option value="Merch Oficial">✨ Merch Oficial</option>
                    </select>
                    <input type="text" placeholder="Integrante (ej: Hyunjin)" value={newShopIntegrante} onChange={(e) => setNewShopIntegrante(e.target.value)} className="border rounded-xl px-3.5 py-2.5 text-xs" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input type="text" placeholder="Era / Serie (ej: ATE, HOP)" value={newShopEra} onChange={(e) => setNewShopEra(e.target.value)} className="border rounded-xl px-3.5 py-2.5 text-xs uppercase" />
                    <select value={newShopTipoPc} onChange={(e) => setNewShopTipoPc(e.target.value)} className="border rounded-xl px-3.5 py-2.5 text-xs font-bold">
                      <option value="Álbum PC">💿 Álbum PC</option>
                      <option value="POB">🎁 POB (Pre-Order Benefit)</option>
                      <option value="Lucky Draw">🎰 Lucky Draw</option>
                      <option value="Pop-Up / MD">🎪 Pop-Up / Merch</option>
                      <option value="Concierto / Fanmeeting">🎤 Concierto / Fanmeeting</option>
                      <option value="Otro">✨ Otro</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input type="number" step="0.01" placeholder="Precio único USD" value={newShopPrice} onChange={(e) => setNewShopPrice(e.target.value)} className="border rounded-xl px-3.5 py-2.5 text-xs font-bold" />
                    <input type="number" min="0" placeholder="Stock único" value={newShopQty} onChange={(e) => setNewShopQty(e.target.value)} className="border rounded-xl px-3.5 py-2.5 text-xs font-bold" />
                  </div>

                  <div className="bg-indigo-50/50 border border-indigo-200 rounded-2xl p-3 space-y-2">
                    <div className="flex justify-between items-center">
                      <p className="text-xs font-extrabold text-indigo-900">🃏 Opciones / Photocards en esta foto</p>
                      <button type="button" onClick={() => setNewShopVariantes((prev) => [...prev, { nombre: '', precio: '', stock: '1' }])} className="px-3 py-1 rounded-lg bg-indigo-600 text-white text-[11px] font-bold">+ Agregar opción</button>
                    </div>
                    {newShopVariantes.map((v, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-1.5 items-center bg-white p-1.5 rounded-xl border">
                        <input type="text" placeholder="Ej: #1 Hyunjin" value={v.nombre} onChange={(e) => { const c = [...newShopVariantes]; c[idx].nombre = e.target.value; setNewShopVariantes(c); }} className="col-span-5 border rounded px-2 py-1 text-xs" />
                        <input type="number" step="0.01" placeholder="Precio $" value={v.precio} onChange={(e) => { const c = [...newShopVariantes]; c[idx].precio = e.target.value; setNewShopVariantes(c); }} className="col-span-3 border rounded px-2 py-1 text-xs font-bold" />
                        <input type="number" min="0" placeholder="Stock" value={v.stock} onChange={(e) => { const c = [...newShopVariantes]; c[idx].stock = e.target.value; setNewShopVariantes(c); }} className="col-span-3 border rounded px-2 py-1 text-xs text-center font-bold" />
                        <button type="button" onClick={() => setNewShopVariantes((prev) => prev.filter((_, i) => i !== idx))} className="col-span-1 text-rose-500 font-bold text-xs">✕</button>
                      </div>
                    ))}
                  </div>
                  <textarea rows={2} placeholder="Descripción..." value={newShopDesc} onChange={(e) => setNewShopDesc(e.target.value)} className="border rounded-xl px-3.5 py-2 text-xs w-full" />
                </div>
              </div>
            </form>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <form onSubmit={handleCreateGO} className="bg-white border rounded-2xl p-5 space-y-3">
                <h2 className="text-sm font-extrabold">1. Nuevo Group Order (GO)</h2>
                <input type="text" placeholder="Título del GO" value={newGoTitle} onChange={(e) => setNewGoTitle(e.target.value)} className="border rounded-xl px-3.5 py-2.5 text-xs w-full" />
                <input type="text" placeholder="Grupo (stray kids, enhypen...)" value={newGoGroup} onChange={(e) => setNewGoGroup(e.target.value)} className="border rounded-xl px-3.5 py-2.5 text-xs w-full" />
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

            <form onSubmit={guardarFotoIntegrante} className="bg-white border rounded-2xl p-5 space-y-3">
              <h2 className="text-sm font-extrabold text-indigo-700">🪞 3. Subir Foto de Perfil de Integrante (Burbujas de Tienda)</h2>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-center">
                <input type="text" placeholder="Grupo (STRAY KIDS)" value={fotoIntegGrupo} onChange={(e) => setFotoIntegGrupo(e.target.value)} className="border rounded-xl px-3 py-2 text-xs uppercase" />
                <input type="text" placeholder="Nombre exacto (ej: Hyunjin)" value={fotoIntegNombre} onChange={(e) => setFotoIntegNombre(e.target.value)} className="border rounded-xl px-3 py-2 text-xs" />
                <input type="file" accept="image/*" onChange={(e) => uploadImageHandler(e, 'integ')} className="text-xs" />
                <button type="submit" disabled={loadingForm || subiendoImagen} className="bg-indigo-600 text-white font-bold text-xs py-2.5 rounded-xl">💾 Guardar Foto</button>
              </div>
            </form>
          </div>
        )}
        {pestanaAdmin === 'items' && (
          <div className="space-y-5">
            <div className="flex flex-wrap justify-between items-center gap-3">
              <div>
                <h2 className="text-xl font-extrabold text-zinc-900">🛠️ Editar Ítems Publicados</h2>
                <p className="text-xs text-zinc-500">Filtra por Tienda o por GO y edita sus datos sin volver a subir nada</p>
              </div>
              <input
                type="text"
                placeholder="🔍 Buscar artículo por nombre..."
                value={busquedaItemsEditar}
                onChange={(e) => setBusquedaItemsEditar(e.target.value)}
                className="bg-white border border-zinc-200 rounded-xl px-4 py-2 text-xs w-full sm:w-72 shadow-2xs"
              />
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              <button
                type="button"
                onClick={() => setFiltroItemsEditar('TIENDA')}
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all ${filtroItemsEditar === 'TIENDA' ? 'bg-indigo-600 text-white shadow-2xs' : 'bg-white text-indigo-700 border border-indigo-200'}`}
              >
                🛍️ Tienda / Shop ({productosTiendaAdmin.length})
              </button>

              {gosAdmin.map((g) => {
                const countGo = productosAdmin.filter((p) => p.go_id === g.id).length;
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setFiltroItemsEditar('GO_' + g.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${filtroItemsEditar === 'GO_' + g.id ? 'bg-pink-600 text-white shadow-2xs' : 'bg-white text-zinc-700 border border-zinc-200'}`}
                  >
                    🧸 {g.title} ({countGo})
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setFiltroItemsEditar('TODOS')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${filtroItemsEditar === 'TODOS' ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600'}`}
              >
                Ver Todos ({todosLosProductosAdmin.length})
              </button>
            </div>

            {editandoProducto && (
              <form onSubmit={handleGuardarEdicion} className="bg-amber-50 border-2 border-amber-300 p-5 rounded-3xl space-y-3 shadow-sm">
                <div className="flex items-center gap-3 border-b border-amber-200/70 pb-3">
                  {editandoProducto.imagen_producto && (
                    <img src={editandoProducto.imagen_producto} alt="" className="w-12 h-12 rounded-xl object-cover border bg-white" />
                  )}
                  <div>
                    <span className="text-[10px] font-bold uppercase text-amber-800">Editando artículo:</span>
                    <h3 className="text-sm font-black text-zinc-900">{editandoProducto.nombre_producto}</h3>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 items-center">
                  <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="border rounded-xl px-3 py-2 text-xs bg-white font-bold flex-1 min-w-[200px]" />
                  {editandoProducto.isShop && (
                    <>
                      <input type="text" placeholder="Grupo (Stray Kids)" value={editGrupo} onChange={(e) => setEditGrupo(e.target.value)} className="border rounded-xl px-3 py-2 text-xs w-32 bg-white font-bold" />
                      <input type="text" placeholder="Integrante (Hyunjin)" value={editIntegrante} onChange={(e) => setEditIntegrante(e.target.value)} className="border rounded-xl px-3 py-2 text-xs w-32 bg-white font-bold" />
                      <input type="text" placeholder="Era (ej: ATE, HOP)" value={editEra} onChange={(e) => setEditEra(e.target.value)} className="border rounded-xl px-3 py-2 text-xs w-32 bg-white uppercase font-bold" />
                      <select value={editTipoPc} onChange={(e) => setEditTipoPc(e.target.value)} className="border rounded-xl px-3 py-2 text-xs bg-white font-bold">
                        <option value="Álbum PC">Álbum PC</option>
                        <option value="POB">POB</option>
                        <option value="Lucky Draw">Lucky Draw</option>
                        <option value="Pop-Up / MD">Pop-Up / MD</option>
                        <option value="Concierto / Fanmeeting">Concierto / Fanmeeting</option>
                        <option value="Otro">Otro</option>
                      </select>
                    </>
                  )}
                  {editVariantes.length === 0 && (
                    <>
                      <input type="number" step="0.01" placeholder="Precio $" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} className="border rounded-xl px-3 py-2 text-xs w-28 bg-white font-bold" />
                      <input type="number" min="0" placeholder="Stock" value={editQty} onChange={(e) => setEditQty(e.target.value)} className="border rounded-xl px-3 py-2 text-xs w-24 bg-white font-bold text-center" />
                    </>
                  )}
                  <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold px-5 py-2 rounded-xl">
                    💾 Guardar cambios
                  </button>
                  <button type="button" onClick={() => setEditandoProducto(null)} className="text-xs font-bold text-zinc-500 px-3 py-2">
                    Cancelar
                  </button>
                </div>

                {editVariantes.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-2 border-t border-amber-200/70">
                    {editVariantes.map((v, idx) => (
                      <div key={idx} className="bg-white border rounded-xl p-2.5 flex items-center justify-between gap-2 text-xs">
                        <span className="font-bold text-zinc-800 truncate flex-1">{v.nombre}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-zinc-400">$</span>
                          <input
                            type="number"
                            step="0.01"
                            value={v.precio}
                            onChange={(e) => {
                              const c = [...editVariantes];
                              c[idx].precio = Number(e.target.value);
                              setEditVariantes(c);
                            }}
                            className="border rounded-lg px-1.5 py-1 w-16 text-xs font-bold"
                          />
                          <span className="text-[10px] text-zinc-400">Stock:</span>
                          <input
                            type="number"
                            min="0"
                            value={v.stock}
                            onChange={(e) => {
                              const c = [...editVariantes];
                              c[idx].stock = Number(e.target.value);
                              setEditVariantes(c);
                            }}
                            className="border rounded-lg px-1.5 py-1 w-14 text-xs font-bold text-center bg-pink-50"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </form>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {todosLosProductosAdmin
                .filter((p) => {
                  if (filtroItemsEditar === 'TIENDA' && !p.isShop) return false;
                  if (filtroItemsEditar.startsWith('GO_')) {
                    const idGoFiltro = Number(filtroItemsEditar.replace('GO_', ''));
                    if (p.isShop || p.go_id !== idGoFiltro) return false;
                  }
                  if (busquedaItemsEditar && !p.nombre_producto.toLowerCase().includes(busquedaItemsEditar.toLowerCase())) {
                    return false;
                  }
                  return true;
                })
                .map((p) => {
                  const goPadre = !p.isShop ? gosAdmin.find((g) => g.id === p.go_id)?.title : null;
                  return (
                    <div key={(p.isShop ? 's-' : 'g-') + p.id} className="bg-white border border-zinc-200/90 rounded-2xl p-3 flex flex-col justify-between shadow-2xs hover:shadow-md transition-all">
                      <div>
                        <div className="w-full h-36 bg-zinc-50 rounded-xl overflow-hidden border border-zinc-100 relative flex items-center justify-center mb-2.5">
                          {p.imagen_producto ? (
                            <img src={p.imagen_producto} alt={p.nombre_producto} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-2xl">{p.isShop ? '🛍️' : '🧸'}</span>
                          )}
                          <span className={`absolute top-2 left-2 text-[9px] font-extrabold px-2 py-0.5 rounded-full shadow-2xs ${p.isShop ? 'bg-indigo-600 text-white' : 'bg-pink-600 text-white'}`}>
                            {p.isShop ? 'TIENDA' : 'GO'}
                          </span>
                          <span className="absolute bottom-2 right-2 bg-zinc-900/85 text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                            Stock: {p.cantidad_disponible}
                          </span>
                        </div>

                        {goPadre && (
                          <p className="text-[10px] font-bold text-pink-600 uppercase truncate">{goPadre}</p>
                        )}
                        {p.isShop && (p.integrante || p.era) && (
                          <p className="text-[10px] font-bold text-indigo-600 uppercase truncate">
                            {[p.integrante, p.era].filter(Boolean).join(' · ')}
                          </p>
                        )}
                        <h3 className="text-xs font-extrabold text-zinc-900 line-clamp-2 leading-snug">
                          {p.nombre_producto}
                        </h3>
                        <p className="text-xs font-black text-zinc-700 mt-1">${Number(p.precio).toFixed(2)} USD</p>

                        {p.isShop && (
                          <div className="pt-2 space-y-1">
                            <button
                              type="button"
                              onClick={() => toggleDestacarShop(p.id, !!p.destacado)}
                              className={`w-full py-1 rounded-lg text-[10px] font-extrabold border transition-all ${
                                p.destacado
                                  ? 'bg-amber-400 text-zinc-950 border-amber-500'
                                  : 'bg-zinc-50 text-zinc-500 border-zinc-200 hover:border-amber-400'
                              }`}
                            >
                              {p.destacado ? '⭐ Destacado en Vitrina' : '☆ Destacar en Vitrina'}
                            </button>
                            {p.destacado && (
                              <select
                                value={p.badge_especial || ''}
                                onChange={(e) => toggleDestacarShop(p.id, false, e.target.value)}
                                className="w-full border border-amber-300 bg-amber-50 rounded-lg px-1.5 py-1 text-[10px] font-bold text-amber-900"
                              >
                                <option value="">✨ Pick del Atelier</option>
                                <option value="🎁 Freebie Extra">🎁 Freebie Extra</option>
                                <option value="💎 Pieza Única">💎 Pieza Única</option>
                                <option value="🎀 Favorito de Lia">🎀 Favorito de Lia</option>
                              </select>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 pt-3 mt-3 border-t border-zinc-100">
                        <button
                          type="button"
                          onClick={() => iniciarEdicion(p)}
                          className="py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-extrabold"
                        >
                          ✏️ Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEliminarProducto(p.id, p.isShop)}
                          className="py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-[11px] font-extrabold"
                        >
                          🗑️ Borrar
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
