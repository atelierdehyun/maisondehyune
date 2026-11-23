'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

type Go = { id: number; title: string; group_name: string; status?: string; estado_logistica?: string };

type ItemTarjeta = {
  idUnico: string;
  claimKeyBase?: string;
  pedidoId?: number;
  origen: 'GO' | 'SHOP';
  goTitulo: string;
  grupoGo?: string;
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
async function optimizarImagenParaSubida(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Selecciona un archivo de imagen.');
  }

  // Conservamos GIF animados; el resto se convierte a WebP.
  if (file.type === 'image/gif') return file;

  const bitmap = await createImageBitmap(file);
  const maxDimension = 1600;
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) {
    bitmap.close();
    throw new Error('No se pudo preparar la imagen. Inténtalo con otra foto.');
  }

  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (resultado) => resultado ? resolve(resultado) : reject(new Error('No se pudo comprimir la imagen.')),
      'image/webp',
      0.82
    );
  });

  if (blob.type !== 'image/webp') {
    throw new Error('Este navegador no pudo convertir la imagen a WebP. Prueba con JPG o PNG en otro navegador.');
  }

  const nombreBase = file.name.replace(/\.[^.]+$/, '') || 'imagen';
  return new File([blob], `${nombreBase}.webp`, {
    type: 'image/webp',
    lastModified: Date.now(),
  });
}

export default function AdminPanelPremium() {
  const [pestanaAdmin, setPestanaAdmin] = useState<'joiners' | 'envios' | 'stock' | 'lanzar' | 'items'>('joiners');
  const [solicitudesEnvio, setSolicitudesEnvio] = useState<any[]>([]);
  const [guiasTemp, setGuiasTemp] = useState<Record<number, string>>({});
  const [usuarioEmail, setUsuarioEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingForm, setLoadingForm] = useState(false);
  const [subiendoImagen, setSubiendoImagen] = useState(false);

  const [tarjetasJoiners, setTarjetasJoiners] = useState<TarjetaJoiner[]>([]);
  const [perfilesJoinersAdmin, setPerfilesJoinersAdmin] = useState<any[]>([]);
  const [manualGoId, setManualGoId] = useState('');
  const [manualProductoId, setManualProductoId] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [manualSlot, setManualSlot] = useState('');
  const [manualCantidad, setManualCantidad] = useState('1');
  const [guardandoClaimManual, setGuardandoClaimManual] = useState(false);
  const [filtroCategoria, setFiltroCategoria] = useState<string>('TODOS');
  const [filtroGrupoAdmin, setFiltroGrupoAdmin] = useState<string>('TODOS');
  const [filtroEstadoPago, setFiltroEstadoPago] = useState<'TODOS' | 'PAGADO' | 'ABONADO' | 'SIN_PAGAR'>('TODOS');
  const [joinerSeleccionado, setJoinerSeleccionado] = useState<string>('');

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
    const input = e.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    setSubiendoImagen(true);
    try {
      const imagenOptimizada = await optimizarImagenParaSubida(file);
      const extension = imagenOptimizada.type === 'image/webp' ? 'webp' : (imagenOptimizada.name.split('.').pop() || 'gif');
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;

      const { error } = await supabase.storage
        .from('fotos-productos')
        .upload(fileName, imagenOptimizada, {
          cacheControl: '31536000',
          contentType: imagenOptimizada.type,
          upsert: false,
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage.from('fotos-productos').getPublicUrl(fileName);
      if (targetForm === 'go') setNewGoImage(publicUrl);
      else if (targetForm === 'prod') setNewProdImage(publicUrl);
      else if (targetForm === 'shop') setNewShopImage(publicUrl);
      else if (targetForm === 'integ') setFotoIntegUrl(publicUrl);
      else setNewShopExtraImages((prev) => [...prev, publicUrl]);

      const ahorro = Math.max(0, Math.round((1 - imagenOptimizada.size / file.size) * 100));
      alert(`¡Imagen subida! ${imagenOptimizada.type === 'image/webp' ? `Optimizada a WebP${ahorro > 0 ? ` (aprox. ${ahorro}% menos peso)` : ''}.` : 'Se conservó su formato original.'}`);
    } catch (error: any) {
      alert('No se pudo subir la imagen: ' + (error?.message || 'Error inesperado.'));
    } finally {
      setSubiendoImagen(false);
      input.value = '';
    }
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
            supabase.from('productos').select('id, nombre_producto, precio, go_id, cantidad_disponible, descripcion, lista_slots, stock_slots, claims_integrantes, imagen_producto, due_date, gos(title, group_name)'),
            supabase.from('seguimiento_claims').select('*'),
            supabase.from('perfiles_joiners').select('*'),
            supabase.from('tienda_productos').select('*'),
            supabase.from('pedidos').select('*').order('id', { ascending: false }),
            supabase.from('solicitudes_envio').select('*').order('id', { ascending: false }),
          ]);

        if (dataEnvios) setSolicitudesEnvio(dataEnvios);
        if (dataPerfiles) setPerfilesJoinersAdmin(dataPerfiles);

        if (dataGos) {
          setGosAdmin(dataGos.map((g: any) => ({ id: g.id, title: g.title, group_name: g.group_name, status: g.status || 'OPEN', estado_logistica: g.estado_logistica || 'Esperando cierre' })));
          const primerGo = dataGos.at(0);
          if (primerGo && !selectedGoId) setSelectedGoId(primerGo.id);
          if (primerGo && goStockFiltro === 'TODOS') setGoStockFiltro(primerGo.id);
        }

        const mapaSeg: Record<string, any> = {};
        if (dataSeg) dataSeg.forEach((s: any) => {
          const correoSeg = String(s.user_email || '').toLowerCase().trim();
          mapaSeg[s.claim_key + '__' + correoSeg] = s;
          if (!mapaSeg[s.claim_key]) mapaSeg[s.claim_key] = s;
        });

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
            const goRelacionado = Array.isArray(p.gos) ? p.gos[0] : p.gos;
            const goTitle = goRelacionado?.title || 'Group Order';
            const goGroupName = goRelacionado?.group_name || 'OTROS';
            Object.entries(claims).forEach(([integrante, dataClaim]: [string, any]) => {
              if (!dataClaim) return;
              const claimKey = p.id + '-' + integrante;
              const segLegacy = mapaSeg[claimKey];

              if (typeof dataClaim === 'string') {
                const correoClaim = dataClaim.toLowerCase().trim();
                const seg = mapaSeg[claimKey + '__' + correoClaim] || segLegacy;
                agregarATarjeta(dataClaim, goTitle, 'GO', {
                  idUnico: claimKey, claimKeyBase: claimKey, origen: 'GO', goTitulo: goTitle, grupoGo: goGroupName,
                  productoNombre: p.nombre_producto, imagenUrl: p.imagen_producto || null,
                  detalleSlot: integrante, cantidad: 1, precioTotal: Number(p.precio || 0),
                  estadoConfirmacion: seg?.estado_confirmacion || 'Pendiente',
                  estadoPago: seg?.estado_pago || 'Sin pagar', fechaPago: seg?.fecha_pago || '',
                  creadoEn: seg?.created_at || '',
                }, seg?.estado_pago === 'Pagado' ? Number(p.precio || 0) : Number(seg?.monto_abonado || 0));
              } else if (typeof dataClaim === 'object') {
                Object.entries(dataClaim).forEach(([correoCliente, cant]: [string, any]) => {
                  if (!correoCliente || !cant) return;
                  const seg = mapaSeg[claimKey + '__' + correoCliente.toLowerCase().trim()];
                  agregarATarjeta(correoCliente, goTitle, 'GO', {
                    idUnico: claimKey + '-' + correoCliente, claimKeyBase: claimKey, origen: 'GO', goTitulo: goTitle, grupoGo: goGroupName,
                    productoNombre: p.nombre_producto, imagenUrl: p.imagen_producto || null,
                    detalleSlot: integrante, cantidad: Number(cant), precioTotal: Number(p.precio || 0) * Number(cant),
                    estadoConfirmacion: seg?.estado_confirmacion || 'Pendiente',
                    estadoPago: seg?.estado_pago || 'Sin pagar', fechaPago: seg?.fecha_pago || '',
                    creadoEn: seg?.created_at || '',
                  }, seg?.estado_pago === 'Pagado' ? Number(p.precio || 0) * Number(cant) : Number(seg?.monto_abonado || 0));
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
              }, ped.estado_pago === 'Pagado' ? Number(ped.total_pagar || 0) : Number(ped.monto_abonado || 0));
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
    if (monto > tarjeta.totalTarjeta + 0.005) { alert('El abono no puede superar el total del pedido.'); return; }
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

  async function registrarClaimManual(e: React.FormEvent) {
    e.preventDefault();
    const email = manualEmail.toLowerCase().trim();
    const cantidad = Math.floor(Number(manualCantidad));
    const productoId = Number(manualProductoId);
    if (!email || !productoId || !manualSlot || !Number.isInteger(cantidad) || cantidad < 1) {
      alert('Completa el GO, artículo, Joiner, integrante y cantidad.');
      return;
    }
    const perfil = perfilesJoinersAdmin.find((p) => String(p.user_email || '').toLowerCase().trim() === email);
    if (!perfil) {
      alert('Ese correo no está registrado en Hyuneatelier. Primero debe crear su cuenta y perfil de Joiner.');
      return;
    }
    setGuardandoClaimManual(true);
    try {
      const { data: producto, error: errorLectura } = await supabase.from('productos').select('id, go_id, precio, nombre_producto, stock_slots, claims_integrantes').eq('id', productoId).single();
      if (errorLectura || !producto) throw errorLectura || new Error('No se encontró el artículo.');
      if (String(producto.go_id) !== manualGoId) throw new Error('El artículo seleccionado no pertenece al GO elegido.');

      const claims = { ...(producto.claims_integrantes || {}) } as Record<string, any>;
      const actual = claims[manualSlot];
      const porCorreo: Record<string, number> = {};
      if (typeof actual === 'string' && actual.trim()) porCorreo[actual.toLowerCase().trim()] = 1;
      else if (actual && typeof actual === 'object') Object.entries(actual).forEach(([mail, qty]) => { porCorreo[mail.toLowerCase().trim()] = Number(qty) || 0; });
      const totalUsado = Object.values(porCorreo).reduce((sum, qty) => sum + qty, 0);
      const stock = Number(producto.stock_slots?.[manualSlot] ?? 0);
      if (totalUsado + cantidad > stock) throw new Error(`No hay suficientes cupos. Disponibles: ${Math.max(0, stock - totalUsado)}.`);
      porCorreo[email] = (porCorreo[email] || 0) + cantidad;
      claims[manualSlot] = porCorreo;

      const { error: errorGuardar } = await supabase.from('productos').update({ claims_integrantes: claims }).eq('id', productoId);
      if (errorGuardar) throw errorGuardar;
      alert('✅ Claim manual registrado. Ya aparecerá en el perfil de la Joiner y en el panel de pedidos.');
      setManualEmail(''); setManualSlot(''); setManualCantidad('1');
      await cargarDatosHibridos();
    } catch (error: any) {
      alert('No se pudo registrar el claim: ' + (error?.message || 'Error desconocido.'));
    } finally {
      setGuardandoClaimManual(false);
    }
  }

  async function actualizarEstadoLogisticaGO(goId: number, nuevoEstado: string) {
    const { error } = await supabase.from('gos').update({ estado_logistica: nuevoEstado }).eq('id', goId);
    if (error) {
      alert('Error al actualizar estado: ' + error.message);
    } else {
      setGosAdmin((prev) => prev.map((g) => (g.id === goId ? { ...g, estado_logistica: nuevoEstado } : g)));
      alert('✈️ ¡Estado del GO actualizado a: ' + nuevoEstado + '!');
    }
  }

  async function toggleVisibilidadGO(goId: number, estadoActual?: string) {
    const nuevoStatus = estadoActual === 'HIDDEN' ? 'OPEN' : 'HIDDEN';
    const { error } = await supabase.from('gos').update({ status: nuevoStatus }).eq('id', goId);
    if (!error) {
      setGosAdmin((prev) => prev.map((g) => (g.id === goId ? { ...g, status: nuevoStatus } : g)));
      alert(nuevoStatus === 'HIDDEN' ? '🙈 GO ocultado del catálogo público.' : '🟢 GO visible nuevamente en el catálogo.');
    }
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
        if (typeof claimsCopia[slotNombre] === 'string') {
          if (claimsCopia[slotNombre].toLowerCase().trim() === tarjeta.correo.toLowerCase().trim()) {
            delete claimsCopia[slotNombre];
          }
        } else if (typeof claimsCopia[slotNombre] === 'object' && claimsCopia[slotNombre] !== null) {
          delete claimsCopia[slotNombre][tarjeta.correo.toLowerCase().trim()];
          if (Object.keys(claimsCopia[slotNombre]).length === 0) delete claimsCopia[slotNombre];
        }
        await supabase.from('productos').update({ claims_integrantes: claimsCopia }).eq('id', prodId);
      }
      await supabase
        .from('seguimiento_claims')
        .delete()
        .eq('claim_key', item.claimKeyBase)
        .eq('user_email', tarjeta.correo.toLowerCase().trim());
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
          if (typeof claimsCopia[slotNombre] === 'string') {
            if (claimsCopia[slotNombre].toLowerCase().trim() === tarjeta.correo.toLowerCase().trim()) {
              delete claimsCopia[slotNombre];
            }
          } else if (typeof claimsCopia[slotNombre] === 'object' && claimsCopia[slotNombre] !== null) {
            delete claimsCopia[slotNombre][tarjeta.correo.toLowerCase().trim()];
            if (Object.keys(claimsCopia[slotNombre]).length === 0) delete claimsCopia[slotNombre];
          }
          await supabase.from('productos').update({ claims_integrantes: claimsCopia }).eq('id', prodId);
        }
        await supabase
          .from('seguimiento_claims')
          .delete()
          .eq('claim_key', item.claimKeyBase)
          .eq('user_email', tarjeta.correo.toLowerCase().trim());
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

    const gruposDisponiblesAdmin = Array.from(
    new Set(gosAdmin.map((g) => (g.group_name || 'OTROS').toUpperCase().trim()).filter(Boolean))
  );

  const gosFiltradosPorGrupo = gosAdmin.filter(
    (g) => filtroGrupoAdmin === 'TODOS' || (g.group_name || 'OTROS').toUpperCase().trim() === filtroGrupoAdmin
  );

  const categoriasGos = gosFiltradosPorGrupo.map((g) => g.title);
  const estadoPagoCalculado = (total: number, abonado: number): 'PAGADO' | 'ABONADO' | 'SIN_PAGAR' => {
    if (total > 0 && abonado >= total - 0.005) return 'PAGADO';
    if (abonado > 0) return 'ABONADO';
    return 'SIN_PAGAR';
  };
  const perfilesJoinersPago = Object.values(
    tarjetasJoiners.filter((t) => t.origen === 'GO').reduce((acc: Record<string, any>, t) => {
      const key = t.correo.toLowerCase().trim();
      if (!acc[key]) acc[key] = { correo: key, nombreReal: t.nombreReal, telefono: t.telefono || '', total: 0, abonado: 0, tarjetas: [] as TarjetaJoiner[] };
      acc[key].total += t.totalTarjeta;
      acc[key].abonado += t.abonadoTarjeta;
      acc[key].tarjetas.push(t);
      return acc;
    }, {})
  ).map((perfil: any) => ({ ...perfil, falta: Math.max(0, perfil.total - perfil.abonado), estado: estadoPagoCalculado(perfil.total, perfil.abonado) }))
    .filter((perfil: any) => {
      if (busqueda && !perfil.nombreReal.toLowerCase().includes(busqueda.toLowerCase()) && !perfil.correo.includes(busqueda.toLowerCase())) return false;
      if (filtroGrupoAdmin !== 'TODOS' && !perfil.tarjetas.some((t: TarjetaJoiner) => t.items.some((it) => (it.grupoGo || 'OTROS').toUpperCase().trim() === filtroGrupoAdmin))) return false;
      if (filtroEstadoPago !== 'TODOS' && perfil.estado !== filtroEstadoPago) return false;
      return true;
    })
    .sort((a: any, b: any) => a.nombreReal.localeCompare(b.nombreReal, 'es'));

  const tarjetasFiltradas = tarjetasJoiners
    .filter((t) => {
      if (joinerSeleccionado && t.correo !== joinerSeleccionado) return false;
      if (filtroGrupoAdmin !== 'TODOS' && t.origen === 'GO') {
        const grupoTarjeta = (t.items.find((it) => it.grupoGo)?.grupoGo || gosAdmin.find((g) => g.title === t.categoriaTitulo)?.group_name || 'OTROS').toUpperCase().trim();
        if (grupoTarjeta !== filtroGrupoAdmin) return false;
      }
      if (filtroEstadoPago !== 'TODOS') {
        const estado = estadoPagoCalculado(t.totalTarjeta, t.abonadoTarjeta);
        if (estado !== filtroEstadoPago) return false;
      }
      if (filtroCategoria !== 'TODOS' && t.categoriaTitulo !== filtroCategoria) return false;
      if (busqueda && !t.nombreReal.toLowerCase().includes(busqueda.toLowerCase()) && !t.correo.toLowerCase().includes(busqueda.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      const fechaA = a.items.at(0)?.creadoEn || '9999-12-31';
      const fechaB = b.items.at(0)?.creadoEn || '9999-12-31';
      return fechaA.localeCompare(fechaB);
    });

  const productosDelGoManual = productosAdmin.filter((p) => String(p.go_id) === manualGoId);
  const productoManualSeleccionado = productosDelGoManual.find((p) => String(p.id) === manualProductoId);
  const slotsManualDisponibles = (productoManualSeleccionado?.lista_slots || '').split(',').map((slot) => slot.trim()).filter(Boolean);
  const todosLosProductosAdmin = [...productosAdmin, ...productosTiendaAdmin];
  const productosStockFiltrados = goStockFiltro === 'TODOS' ? productosAdmin : productosAdmin.filter((p) => p.go_id === goStockFiltro);
  const coloresAvatar = ['bg-[#8fc9bd]', 'bg-[#e88db4]', 'bg-[#e8c96f]', 'bg-[#a9a4dc]', 'bg-[#8ebbd9]', 'bg-[#c4a0d8]'];

  if (loading) {
    return <div className="min-h-screen bg-[#fff8fb] flex items-center justify-center text-sm font-semibold text-pink-700">🎀 Preparando tu Atelier...</div>;
  }

  if (usuarioEmail.toLowerCase() !== correoAdmin.toLowerCase()) {
    return (
      <div className="min-h-screen bg-[#fff8fb] flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-3xl border border-pink-100 bg-white p-8 text-center shadow-sm">
          <div className="text-4xl mb-3">🔒</div>
          <h1 className="text-xl font-black text-zinc-900">Área privada</h1>
          <p className="mt-2 text-sm text-zinc-500">Esta sección está reservada para la administración de hyuneatelier.</p>
          <Link href="/mi-escritorio" className="inline-flex mt-5 rounded-xl bg-pink-600 px-5 py-2.5 text-xs font-bold text-white">Volver a Mi escritorio</Link>
        </div>
      </div>
    );
  }

  const tabsAdmin = [
    { id: 'joiners', label: 'Pedidos y pagos', icon: '🧾', note: 'Revisar apartados y cobrar', tint: 'bg-[#fce7f0]', active: 'bg-[#fce7f0] text-[#a83f70] ring-[#f4c9dc]' },
    { id: 'envios', label: 'Envíos', icon: '📮', note: 'Preparar y despachar paquetes', tint: 'bg-[#e4f4ef]', active: 'bg-[#e4f4ef] text-[#397d70] ring-[#c8e8dd]' },
    { id: 'stock', label: 'Stock y GOs', icon: '📦', note: 'Controlar cupos y estado', tint: 'bg-[#fff3cf]', active: 'bg-[#fff3cf] text-[#927126] ring-[#f3e2a9]' },
    { id: 'lanzar', label: 'Crear publicaciones', icon: '✨', note: 'Añadir GO o producto', tint: 'bg-[#e9e8fb]', active: 'bg-[#e9e8fb] text-[#6861a6] ring-[#d8d5f2]' },
    { id: 'items', label: 'Editar catálogo', icon: '🪄', note: 'Modificar productos existentes', tint: 'bg-[#e4f1fb]', active: 'bg-[#e4f1fb] text-[#477b9e] ring-[#cde3f4]' },
  ];
  const resumenSeccion: Record<string, { titulo: string; descripcion: string; paso: string; color: string }> = {
    joiners: { titulo: 'Pedidos y pagos', descripcion: 'Aquí puedes revisar quién pidió, cuánto debe y si su pago está confirmado.', paso: 'Busca a la persona o selecciona un GO para ver sus pedidos.', color: 'from-[#fff0f6] to-[#fff9ed]' },
    envios: { titulo: 'Envíos', descripcion: 'Revisa las solicitudes que llegan desde Mi escritorio y registra la guía cuando despaches.', paso: 'Copia o escribe el número de rastreo y pulsa «Marcar enviado».', color: 'from-[#eaf7f2] to-[#f4fbf8]' },
    stock: { titulo: 'Stock y Group Orders', descripcion: 'Controla los cupos disponibles de cada integrante y el avance de cada GO.', paso: 'Elige un GO, actualiza las cantidades y guarda los cambios.', color: 'from-[#fff7dc] to-[#fffaf0]' },
    lanzar: { titulo: 'Crear publicaciones', descripcion: 'Desde aquí agregas nuevos Group Orders, productos de la tienda y fotos de integrantes.', paso: 'Completa los campos del formulario y revisa la información antes de publicar.', color: 'from-[#f0efff] to-[#fff5fa]' },
    items: { titulo: 'Editar catálogo', descripcion: 'Encuentra publicaciones que ya existen para corregir su información.', paso: 'Filtra por Tienda o GO, busca el artículo y pulsa «Editar».', color: 'from-[#eaf4fc] to-[#f6f3ff]' },
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#fff4f8_0%,#fffaf0_42%,#f1fbf7_100%)] font-sans text-[#514653] pb-8">
      <header className="sticky top-0 z-30 border-b border-[#f4dce8] bg-white/90 backdrop-blur px-4 sm:px-6 py-3">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-pink-100 text-xl">🎀</div>
            <div><p className="text-sm font-black tracking-tight text-zinc-900">hyuneatelier</p><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-pink-500">Panel de administración</p></div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-[11px] text-zinc-400">{usuarioEmail}</span>
            <Link href="/admin/migracion" className="rounded-xl border border-[#ead8f4] bg-[#f8f2fc] px-3 py-2 text-[11px] font-bold text-[#8a6aa7]">Migración Firebase</Link>
            <Link href="/gos" className="rounded-xl border border-pink-100 bg-pink-50 px-3 py-2 text-[11px] font-bold text-pink-700 hover:bg-pink-100">← Catálogo</Link>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1500px] gap-5 px-3 sm:px-5 pt-4 lg:pt-6">
        <aside className="hidden lg:block w-64 shrink-0">
          <div className="sticky top-24 rounded-3xl border border-[#f2dce8] bg-white/95 p-3 shadow-[0_12px_35px_rgba(170,120,150,0.08)]">
            <p className="px-3 pb-3 pt-2 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">Espacio de trabajo</p>
            <nav className="space-y-1">
              {tabsAdmin.map((tab) => (
                <button key={tab.id} type="button" onClick={() => setPestanaAdmin(tab.id as any)} className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition ${pestanaAdmin === tab.id ? `${tab.active} ring-1` : 'text-[#766d78] hover:bg-[#faf5f8]'}`}>
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg ${tab.tint}`}>{tab.icon}</span><span className="min-w-0 flex-1"><span className="block text-xs font-extrabold">{tab.label}{tab.id === 'envios' ? ` (${solicitudesEnvio.filter((s) => s.estado_despacho !== 'Enviado').length})` : ''}</span><span className="mt-0.5 block text-[10px] text-zinc-400">{tab.note}</span></span>
                  {pestanaAdmin === tab.id && <span className="text-pink-500">●</span>}
                </button>
              ))}
            </nav>
            <div className="mt-4 rounded-2xl bg-gradient-to-br from-[#fff0f6] via-[#fff8e8] to-[#edf8f4] p-3"><p className="text-[10px] font-bold text-[#a83f70]">Tu Atelier, en orden ✨</p><p className="mt-1 text-[10px] leading-relaxed text-zinc-500">Gestiona pedidos, envíos, stock y publicaciones desde un solo lugar.</p></div>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <div className="mb-4 flex gap-2 overflow-x-auto pb-1 lg:hidden">
            {tabsAdmin.map((tab) => (
              <button key={tab.id} type="button" onClick={() => setPestanaAdmin(tab.id as any)} className={`shrink-0 rounded-xl px-3 py-2 text-[11px] font-bold ${pestanaAdmin === tab.id ? `${tab.active} shadow-sm ring-1` : 'border border-[#f0e2eb] bg-white text-[#766d78]'}`}>
                {tab.icon} {tab.label}{tab.id === 'envios' ? ` (${solicitudesEnvio.filter((s) => s.estado_despacho !== 'Enviado').length})` : ''}
              </button>
            ))}
          </div>
          <div className="mb-4 overflow-hidden rounded-3xl border border-white/80 bg-gradient-to-r from-[#fce8f1] via-[#fff5df] to-[#eaf7f2] p-4 sm:p-5 shadow-[0_10px_30px_rgba(170,120,150,0.07)]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="max-w-2xl">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#a45e7c]">Tu espacio de trabajo</p>
                <h1 className="mt-1 text-xl font-black text-[#514653] sm:text-2xl">{resumenSeccion[pestanaAdmin].titulo}</h1>
                <p className="mt-1.5 text-xs leading-relaxed text-[#766d78] sm:text-sm">{resumenSeccion[pestanaAdmin].descripcion}</p>
              </div>
              <div className="max-w-xs rounded-2xl border border-white/80 bg-white/70 px-3 py-2.5 text-[11px] leading-relaxed text-[#6d626e]">
                <span className="font-extrabold text-[#a45e7c]">¿Qué hago aquí?</span><br />{resumenSeccion[pestanaAdmin].paso}
              </div>
            </div>
          </div>
          <div className="rounded-3xl border border-[#f1dce8] bg-white/90 p-3 sm:p-5 shadow-[0_12px_40px_rgba(170,120,150,0.08)]">
        {pestanaAdmin === 'joiners' && (
          <div className="space-y-5">
            <div className="flex flex-wrap justify-between items-center gap-3">
              <div>
                <h2 className="text-lg font-extrabold text-zinc-900">Lista de pedidos</h2>
                <p className="mt-1 text-xs text-zinc-500">Selecciona un grupo y luego un GO. Cada tarjeta corresponde a una persona y reúne sus pedidos.</p>
              </div>
              <input type="text" placeholder="Buscar por nombre o correo..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="bg-white border border-zinc-200 rounded-xl px-4 py-2 text-xs w-full sm:w-72 shadow-2xs" />
            </div>

                        <form onSubmit={registrarClaimManual} className="rounded-2xl border border-[#ead9e3] bg-gradient-to-br from-white to-[#fff4f8] p-4 shadow-sm space-y-3">
              <div><h3 className="text-sm font-black text-[#514653]">➕ Registrar pedido recibido por WhatsApp</h3><p className="mt-1 text-[10px] text-zinc-500">Solo permite registrar personas que ya tengan una cuenta y perfil de Joiner.</p></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <select value={manualGoId} onChange={(e) => { setManualGoId(e.target.value); setManualProductoId(''); setManualSlot(''); }} className="w-full rounded-xl border bg-white px-3 py-2 text-xs" required>
                  <option value="">Seleccionar GO...</option>{gosAdmin.map((g) => <option key={g.id} value={g.id}>{g.group_name} · {g.title}</option>)}
                </select>
                <select value={manualProductoId} onChange={(e) => { setManualProductoId(e.target.value); setManualSlot(''); }} className="w-full rounded-xl border bg-white px-3 py-2 text-xs" required disabled={!manualGoId}>
                  <option value="">Seleccionar artículo...</option>{productosDelGoManual.map((p) => <option key={p.id} value={p.id}>{p.nombre_producto} · ${Number(p.precio).toFixed(2)}</option>)}
                </select>
                <select value={manualEmail} onChange={(e) => setManualEmail(e.target.value)} className="w-full rounded-xl border bg-white px-3 py-2 text-xs" required>
                  <option value="">Seleccionar Joiner registrado...</option>{perfilesJoinersAdmin.map((p) => <option key={p.user_email} value={p.user_email}>{p.nombre_completo || p.user_email} · {p.user_email}</option>)}
                </select>
                <select value={manualSlot} onChange={(e) => setManualSlot(e.target.value)} className="w-full rounded-xl border bg-white px-3 py-2 text-xs" required disabled={!manualProductoId}>
                  <option value="">Seleccionar integrante / slot...</option>{slotsManualDisponibles.map((slot) => <option key={slot} value={slot}>{slot}</option>)}
                </select>
                <input type="number" min="1" step="1" value={manualCantidad} onChange={(e) => setManualCantidad(e.target.value)} className="w-full rounded-xl border bg-white px-3 py-2 text-xs" placeholder="Cantidad" required />
                <button type="submit" disabled={guardandoClaimManual || !manualGoId || !manualProductoId || !manualEmail || !manualSlot} className="rounded-xl bg-[#D96B9F] px-4 py-2 text-xs font-extrabold text-white disabled:opacity-50">{guardandoClaimManual ? 'Guardando...' : 'Guardar claim manual'}</button>
              </div>
            </form>

            <div className="bg-white border border-zinc-200/80 rounded-2xl p-3 space-y-2.5 shadow-2xs">
              <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b border-zinc-100">
                <span className="text-[10px] font-black uppercase text-zinc-400 mr-1">1. Grupo:</span>
                <button
                  type="button"
                  onClick={() => { setFiltroGrupoAdmin('TODOS'); setFiltroCategoria('TODOS'); setJoinerSeleccionado(''); }}
                  className={`px-3 py-1 rounded-full text-[11px] font-extrabold ${filtroGrupoAdmin === 'TODOS' ? 'bg-[#776a79] text-white' : 'bg-zinc-100 text-zinc-600'}`}
                >
                  ✨ Todos los grupos
                </button>
                {gruposDisponiblesAdmin.map((grp) => (
                  <button
                    key={grp}
                    type="button"
                    onClick={() => { setFiltroGrupoAdmin(grp); setFiltroCategoria('TODOS'); setJoinerSeleccionado(''); }}
                    className={`px-3 py-1 rounded-full text-[11px] font-extrabold uppercase ${filtroGrupoAdmin === grp ? 'bg-[#df82aa] text-white' : 'bg-[#fce7f0] text-[#a83f70] hover:bg-pink-100'}`}
                  >
                    🎤 {grp}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => { setFiltroGrupoAdmin('TODOS'); setFiltroCategoria('Tienda / Shop'); setJoinerSeleccionado(''); }}
                  className={`px-3 py-1 rounded-full text-[11px] font-extrabold ${filtroCategoria === 'Tienda / Shop' ? 'bg-[#aaa4df] text-[#39345f]' : 'bg-indigo-50 text-indigo-700'}`}
                >
                  🛍️ Tienda / Shop ({tarjetasJoiners.filter((t) => t.origen === 'SHOP').length})
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5 items-center">
                <span className="text-[10px] font-black uppercase text-zinc-400 mr-1">2. GO:</span>
                <button
                  type="button"
                  onClick={() => { setFiltroCategoria('TODOS'); setJoinerSeleccionado(''); }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold ${filtroCategoria === 'TODOS' ? 'bg-teal-800 text-white' : 'bg-zinc-50 text-zinc-600 border border-zinc-200'}`}
                >
                  Ver todos ({tarjetasFiltradas.length})
                </button>
                {categoriasGos.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => { setFiltroCategoria(cat); setJoinerSeleccionado(''); }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold ${filtroCategoria === cat ? 'bg-[#df82aa] text-white' : 'bg-white text-zinc-700 border border-zinc-200 hover:border-pink-300'}`}
                  >
                    🧸 {cat}
                  </button>
                ))}
              </div>
            </div>


            {filtroCategoria === 'TODOS' && <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-black text-[#514653]">👤 Pagos por Joiner</h3>
                  <p className="text-[11px] text-[#8b7c89]">Un perfil reúne todos sus GOs, incluso si participa en varios grupos.</p>
                </div>
                <button type="button" onClick={() => setJoinerSeleccionado('')} className="rounded-full border border-[#ead9e3] bg-white px-3 py-1.5 text-[10px] font-bold text-[#8b647a]">Ver todas las personas</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {([
                  ['TODOS', 'Todos'], ['PAGADO', '💚 Pagados'], ['ABONADO', '💛 Abonados'], ['SIN_PAGAR', '🩷 Sin pagar'],
                ] as [string, string][]).map(([valor, etiqueta]) => (
                  <button key={valor} type="button" onClick={() => { setFiltroEstadoPago(valor as any); setJoinerSeleccionado(''); }} className={`rounded-full px-3 py-1.5 text-[10px] font-extrabold ${filtroEstadoPago === valor ? 'bg-[#776a79] text-white' : 'border border-[#f0e2eb] bg-white text-[#766d78]'}`}>{etiqueta}</button>
                ))}
              </div>
              {joinerSeleccionado && <p className="rounded-xl border border-pink-200 bg-pink-50 px-3 py-2 text-[11px] font-bold text-pink-700">Mostrando pedidos de: {perfilesJoinersPago.find((p: any) => p.correo === joinerSeleccionado)?.nombreReal || joinerSeleccionado}</p>}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {perfilesJoinersPago.map((perfil: any, idx: number) => {
                  const grupos = Array.from(new Set(perfil.tarjetas.flatMap((t: TarjetaJoiner) => t.items.map((it) => (it.grupoGo || 'OTROS').toUpperCase().trim()))));
                  const waDigits = (perfil.telefono || '').replace(/\D/g, '');
                  const waNumber = waDigits.startsWith('0') ? '593' + waDigits.slice(1) : waDigits.startsWith('593') ? waDigits : waDigits ? '593' + waDigits : '';
                  const desglose = perfil.tarjetas.map((t: TarjetaJoiner) => `• ${t.categoriaTitulo}: $${t.totalTarjeta.toFixed(2)} (abonado $${t.abonadoTarjeta.toFixed(2)}, falta $${Math.max(0, t.totalTarjeta - t.abonadoTarjeta).toFixed(2)})`).join('\n');
                  const mensaje = `¡Holis, ${perfil.nombreReal}! 🎀 Te comparto el resumen de tus Group Orders de hyuneatelier:\n\n${desglose}\n\nTotal GOs: $${perfil.total.toFixed(2)} USD\nAbonado: $${perfil.abonado.toFixed(2)} USD\nSaldo pendiente: $${perfil.falta.toFixed(2)} USD\n\nQuedo atenta a tu comprobante. ¡Muchas gracias! ♡`;
                  const estadoLabel = perfil.estado === 'PAGADO' ? '💚 Pagado' : perfil.estado === 'ABONADO' ? '💛 Abonado' : '🩷 Sin pagar';
                  return (
                    <article key={perfil.correo} className={`rounded-2xl border bg-white p-4 shadow-sm ${joinerSeleccionado === perfil.correo ? 'border-pink-400 ring-2 ring-pink-100' : 'border-[#f0dce7]'}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0"><p className="text-sm font-black capitalize text-[#514653]">{perfil.nombreReal}</p><p className="break-all text-[10px] text-zinc-400">{perfil.correo}</p><p className="mt-1 text-[10px] font-bold text-[#a45e7c]">{grupos.join(' · ')}</p></div>
                        <span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-extrabold ${perfil.estado === 'PAGADO' ? 'bg-emerald-50 text-emerald-700' : perfil.estado === 'ABONADO' ? 'bg-amber-50 text-amber-800' : 'bg-rose-50 text-rose-700'}`}>{estadoLabel}</span>
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-1.5 text-center">
                        <div className="rounded-xl bg-[#fff4f8] p-2"><p className="text-sm font-black text-[#a83f70]">${perfil.total.toFixed(2)}</p><p className="text-[9px] text-zinc-500">Total GOs</p></div>
                        <div className="rounded-xl bg-[#eff9f3] p-2"><p className="text-sm font-black text-emerald-700">${perfil.abonado.toFixed(2)}</p><p className="text-[9px] text-zinc-500">Abonado</p></div>
                        <div className="rounded-xl bg-[#fff7e8] p-2"><p className="text-sm font-black text-amber-800">${perfil.falta.toFixed(2)}</p><p className="text-[9px] text-zinc-500">Falta</p></div>
                      </div>
                      <div className="mt-3 space-y-1.5">{perfil.tarjetas.map((t: TarjetaJoiner) => <div key={t.tarjetaId} className="flex justify-between gap-2 text-[10px]"><span className="min-w-0 truncate text-zinc-600">{t.categoriaTitulo}</span><strong className="shrink-0 text-zinc-800">${t.totalTarjeta.toFixed(2)}</strong></div>)}</div>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button type="button" onClick={() => { setJoinerSeleccionado(perfil.correo); setFiltroCategoria('TODOS'); }} className="rounded-xl border border-pink-200 bg-pink-50 px-2 py-2 text-[10px] font-extrabold text-pink-700">Ver sus pedidos</button>
                        {waNumber ? <a href={`https://wa.me/${waNumber}?text=${encodeURIComponent(mensaje)}`} target="_blank" rel="noopener noreferrer" className="rounded-xl bg-emerald-600 px-2 py-2 text-center text-[10px] font-extrabold text-white">💬 Cobro conjunto</a> : <button type="button" onClick={async () => { const tel = prompt('WhatsApp de ' + perfil.nombreReal + ' (ej. 0991234567):'); if (!tel?.trim()) return; const { error } = await supabase.from('perfiles_joiners').upsert({ user_email: perfil.correo, nombre_completo: perfil.nombreReal, telefono: tel.trim() }, { onConflict: 'user_email' }); if (error) alert('No se pudo guardar el teléfono: ' + error.message); else cargarDatosHibridos(); }} className="rounded-xl bg-amber-100 px-2 py-2 text-[10px] font-extrabold text-amber-900">+ Añadir WhatsApp</button>}
                      </div>
                    </article>
                  );
                })}
                {perfilesJoinersPago.length === 0 && <div className="col-span-full rounded-2xl border border-dashed border-[#ead9e3] bg-white p-6 text-center text-xs text-zinc-400">No hay Joiners con GOs para estos filtros.</div>}
              </div>
            </section>}

            {filtroCategoria === 'TODOS' && (
              <section className="space-y-3">
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-black text-[#514653]">Tus Group Orders</h3>
                    <p className="text-[11px] text-[#8b7c89]">Elige una tarjeta para abrir sus pedidos y ver la prioridad de llegada.</p>
                  </div>
                  <span className="rounded-full bg-[#fff3cf] px-3 py-1 text-[10px] font-bold text-[#927126]">{gosAdmin.filter((g) => filtroGrupoAdmin === 'TODOS' || (g.group_name || 'OTROS').toUpperCase().trim() === filtroGrupoAdmin).length} GO(s)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {gosAdmin
                    .filter((g) => filtroGrupoAdmin === 'TODOS' || (g.group_name || 'OTROS').toUpperCase().trim() === filtroGrupoAdmin)
                    .map((g) => {
                      const pedidosGo = tarjetasJoiners.filter((t) => t.origen === 'GO' && t.categoriaTitulo === g.title);
                      const pendientes = pedidosGo.filter((t) => t.items.some((it) => it.estadoPago !== 'Pagado')).length;
                      const totalSlots = pedidosGo.reduce((sum, t) => sum + t.items.reduce((n, it) => n + it.cantidad, 0), 0);
                      return (
                        <button key={g.id} type="button" onClick={() => setFiltroCategoria(g.title)} className="rounded-2xl border border-[#f0dce7] bg-gradient-to-br from-white to-[#fff7fb] p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#df82aa] hover:shadow-md">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#b17b96]">{g.group_name}</p><h4 className="mt-1 truncate text-sm font-black text-[#514653]">{g.title}</h4></div>
                            <span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-extrabold ${g.status === 'HIDDEN' ? 'bg-zinc-100 text-zinc-500' : 'bg-[#e4f4ef] text-[#397d70]'}`}>{g.status === 'HIDDEN' ? 'Oculto' : 'Visible'}</span>
                          </div>
                          <div className="mt-4 grid grid-cols-3 gap-2">
                            <div className="rounded-xl bg-[#fce7f0] p-2"><p className="text-lg font-black text-[#a83f70]">{pedidosGo.length}</p><p className="text-[9px] font-semibold text-[#a45e7c]">Joiners</p></div>
                            <div className="rounded-xl bg-[#fff3cf] p-2"><p className="text-lg font-black text-[#927126]">{pendientes}</p><p className="text-[9px] font-semibold text-[#927126]">Por cobrar</p></div>
                            <div className="rounded-xl bg-[#e4f1fb] p-2"><p className="text-lg font-black text-[#477b9e]">{totalSlots}</p><p className="text-[9px] font-semibold text-[#477b9e]">Slots</p></div>
                          </div>
                          <p className="mt-3 text-[10px] font-extrabold text-[#b34e7c]">Ver pedidos y prioridad →</p>
                        </button>
                      );
                    })}
                  {gosAdmin.filter((g) => filtroGrupoAdmin === 'TODOS' || (g.group_name || 'OTROS').toUpperCase().trim() === filtroGrupoAdmin).length === 0 && (
                    <div className="rounded-2xl border border-dashed border-[#ead9e3] bg-[#fffafd] p-6 text-center text-xs text-[#8b7c89]">Todavía no hay GOs en este grupo.</div>
                  )}
                </div>
              </section>
            )}

            {filtroCategoria !== 'TODOS' && filtroCategoria !== 'Tienda / Shop' && (
              <section className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-pink-200 bg-gradient-to-r from-pink-50 to-white p-3">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#b17b96]">GO seleccionado</p>
                    <h3 className="text-sm font-black text-[#514653]">🧸 {filtroCategoria}</h3>
                    <p className="text-[10px] text-zinc-500">Solo se muestran las personas que participan en este GO.</p>
                  </div>
                  <button type="button" onClick={() => { setFiltroCategoria('TODOS'); setJoinerSeleccionado(''); }} className="rounded-xl border border-pink-200 bg-white px-3 py-2 text-[10px] font-extrabold text-pink-700">← Volver a todos los GOs</button>
                </div>
                <div className="bg-white border border-pink-200 rounded-2xl overflow-hidden shadow-2xs">
                <div className="bg-pink-50/80 px-4 py-2.5 border-b border-pink-100 flex justify-between items-center">
                  <span className="text-xs font-black text-pink-700 uppercase">⏱️ Prioridad de llegada — {filtroCategoria}</span>
                  <span className="text-[11px] font-bold text-zinc-500">{tarjetasFiltradas.length} joiner(s) · primero en reclamar = #1</span>
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
                {tarjetasFiltradas.length === 0 && <div className="rounded-2xl border border-dashed border-[#ead9e3] bg-white p-6 text-center text-xs text-zinc-400">Todavía no hay Joiners registrados en este GO.</div>}
              </section>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {tarjetasFiltradas.map((tarjeta, idx) => {
                const primerItem = tarjeta.items.at(0);
                const inicial = tarjeta.nombreReal.slice(0, 2).toUpperCase();
                const estadoConfirmActual = primerItem?.estadoConfirmacion || 'Pendiente';
                const estadoPagoActual = estadoPagoCalculado(tarjeta.totalTarjeta, tarjeta.abonadoTarjeta) === 'PAGADO' ? 'Pagado' : estadoPagoCalculado(tarjeta.totalTarjeta, tarjeta.abonadoTarjeta) === 'ABONADO' ? 'Abonado' : 'Sin pagar';
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
                                      href={'https://wa.me/' + numeroWsp + '?text=' + encodeURIComponent(textoCobro)}
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
                                {it.imagenUrl ? <img loading="lazy" decoding="async" src={it.imagenUrl} alt="" className="w-11 h-11 rounded-xl object-cover border shrink-0" /> : <span className="w-11 h-11 rounded-xl bg-white border flex items-center justify-center text-sm shrink-0">🧸</span>}
                                <div className="flex-1 min-w-0 space-y-1.5">
                                  {Object.entries(gruposPorPost).map(([tituloPost, subItems], idxPost) => (
                                    <div key={idxPost} className="space-y-1">
                                      <p className="font-extrabold text-zinc-900 leading-snug break-words">
                                        {tituloPost}{' '}
                                        {subItems.length > 0 && (
                                          <span className="text-[10px] font-bold bg-[#f9dce9] text-[#a83f70] px-2 py-0.5 rounded-full ml-1">
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
                        <div className={`text-[11px] font-extrabold rounded-xl px-2.5 py-2 border text-center ${estadoPagoActual === 'Pagado' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : estadoPagoActual === 'Abonado' ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
                          {estadoPagoActual === 'Pagado' ? '💚 Pagado' : estadoPagoActual === 'Abonado' ? '💛 Abonado' : '💸 Sin pagar'}
                        </div>
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
            <div><h2 className="text-lg font-extrabold text-zinc-900">Solicitudes recibidas</h2><p className="mt-1 text-xs text-zinc-500">Cuando prepares un paquete, añade su guía y marca el envío como despachado.</p></div>
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
              <div><h2 className="text-base font-extrabold text-zinc-900">Inventario por Group Order</h2><p className="mt-1 text-xs text-zinc-500">Elige un GO para ver y actualizar los cupos de cada producto.</p></div>
              <div className="flex flex-wrap gap-2">
                {gosAdmin.map((g) => (
                  <button key={g.id} type="button" onClick={() => setGoStockFiltro(g.id)} className={`px-3.5 py-2 rounded-xl text-xs font-bold ${goStockFiltro === g.id ? 'bg-[#df82aa] text-white' : 'bg-[#f4edf2] text-[#665b68]'}`}>
                    {g.status === 'HIDDEN' ? '🙈 ' : '🧸 '}{g.title}
                  </button>
                ))}
              </div>

              {typeof goStockFiltro === 'number' && (() => {
                const goSel = gosAdmin.find((g) => g.id === goStockFiltro);
                if (!goSel) return null;
                return (
                  <div className="bg-pink-50/80 border border-pink-200 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-extrabold text-pink-800">✈️ Estado logístico:</span>
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
                    <button
                      type="button"
                      onClick={() => toggleVisibilidadGO(goSel.id, goSel.status)}
                      className={`px-3.5 py-1.5 rounded-xl font-extrabold border ${
                        goSel.status === 'HIDDEN'
                          ? 'bg-emerald-600 text-white border-emerald-700'
                          : 'bg-white text-zinc-700 border-zinc-300 hover:bg-zinc-100'
                      }`}
                    >
                      {goSel.status === 'HIDDEN' ? '🟢 Mostrar GO en catálogo' : '🙈 Ocultar GO del catálogo'}
                    </button>
                  </div>
                );
              })()}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="rounded-2xl bg-[#fce7f0] p-3"><p className="text-xl font-black text-[#a83f70]">{productosStockFiltrados.length}</p><p className="text-[10px] font-bold text-[#a45e7c]">Publicaciones en este GO</p></div>
              <div className="rounded-2xl bg-[#e4f4ef] p-3"><p className="text-xl font-black text-[#397d70]">{productosStockFiltrados.reduce((n, p) => n + Number(p.cantidad_disponible || 0), 0)}</p><p className="text-[10px] font-bold text-[#397d70]">Stock total registrado</p></div>
              <div className="rounded-2xl bg-[#fff3cf] p-3"><p className="text-xl font-black text-[#927126]">{productosStockFiltrados.reduce((n, p) => n + Object.values(inputsStock[p.id] || {}).reduce((a, v) => a + Math.max(0, Number(v) || 0), 0), 0)}</p><p className="text-[10px] font-bold text-[#927126]">Cupos disponibles por integrante</p></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {productosStockFiltrados.map((prod) => (
                <div key={prod.id} className="bg-white border rounded-2xl p-5 space-y-4 shadow-2xs">
                  <div className="flex items-center gap-3 border-b pb-3">
                    {prod.imagen_producto && <img loading="lazy" decoding="async" src={prod.imagen_producto} alt="" className="w-12 h-12 rounded-xl object-contain bg-white border p-1" />}
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
                  <button type="button" onClick={() => handleGuardarStockBD(prod.id)} className="w-full bg-[#776a79] text-white text-xs font-bold py-2.5 rounded-xl">💾 Guardar stock</button>
                </div>
              ))}
              {productosStockFiltrados.length === 0 && <div className="md:col-span-2 rounded-2xl border border-dashed border-[#ead9e3] bg-[#fffafd] p-8 text-center"><p className="text-2xl">📦</p><p className="mt-2 text-sm font-extrabold text-[#514653]">Este GO todavía no tiene artículos</p><p className="mt-1 text-xs text-[#8b7c89]">Puedes crear uno desde «Crear publicaciones».</p><button type="button" onClick={() => setPestanaAdmin('lanzar')} className="mt-3 rounded-xl bg-[#df82aa] px-4 py-2 text-[11px] font-bold text-white">Crear artículo para GO</button></div>}
            </div>
          </div>
        )}
        {pestanaAdmin === 'lanzar' && (
          <div className="space-y-8">
            <form onSubmit={handleCrearItemShop} className="bg-white border rounded-3xl p-6 shadow-2xs space-y-6">
              <div className="flex flex-wrap justify-between items-center border-b pb-4 gap-2">
                <div><h2 className="text-lg font-extrabold text-zinc-900">Agregar producto a la Tienda</h2><p className="mt-1 text-[11px] text-zinc-500">Completa grupo, categoría, integrante, era, tipo, precio, stock y fotos. Si hay varias photocards, usa «Opciones» para registrar cada una por separado.</p></div>
                <button type="submit" disabled={loadingForm || subiendoImagen} className="px-6 py-2.5 rounded-xl bg-[#aaa4df] text-[#39345f] text-xs font-extrabold">
                  {subiendoImagen ? 'Subiendo...' : '✨ Publicar en Tienda'}
                </button>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-5 space-y-3">
                  <div className="w-full h-56 rounded-2xl bg-zinc-50 border-2 border-dashed flex flex-col items-center justify-center p-3">
                    {newShopImage ? <img loading="lazy" decoding="async" src={newShopImage} alt="Portada" className="max-h-full max-w-full object-contain rounded-xl" /> : <p className="text-xs text-zinc-400">📸 Foto principal (Portada)</p>}
                    <input type="file" accept="image/*" onChange={(e) => uploadImageHandler(e, 'shop')} className="mt-2 text-[11px]" />
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {newShopExtraImages.map((url, i) => (
                      <div key={i} className="relative h-16 rounded-xl border overflow-hidden">
                        <img loading="lazy" decoding="async" src={url} alt="" className="w-full h-full object-cover" />
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
                    <select value={newShopCategoria} onChange={(e) => setNewShopCategoria(e.target.value)} className="border rounded-xl px-3 py-2.5 text-xs font-bold">
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
                    <select value={newShopTipoPc} onChange={(e) => setNewShopTipoPc(e.target.value)} className="border rounded-xl px-3 py-2.5 text-xs font-bold">
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
                      <p className="text-xs font-extrabold text-indigo-900">🃏 Opciones / variantes (si la publicación tiene varias PCs)</p>
                      <button type="button" onClick={() => setNewShopVariantes((prev) => [...prev, { nombre: '', precio: '', stock: '1' }])} className="px-3 py-1 rounded-lg bg-[#aaa4df] text-[#39345f] text-[11px] font-bold">+ Agregar opción</button>
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
                  <textarea rows={2} placeholder="Descripción: estado, versión, inclusiones, detalles o condiciones de venta..." value={newShopDesc} onChange={(e) => setNewShopDesc(e.target.value)} className="border rounded-xl px-3.5 py-2 text-xs w-full" />
                </div>
              </div>
            </form>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <form onSubmit={handleCreateGO} className="bg-white border rounded-2xl p-5 space-y-3">
                <div><h2 className="text-sm font-extrabold">1. Crear un Group Order</h2><p className="mt-1 text-[10px] leading-relaxed text-zinc-500">Crea primero el GO. Luego podrás añadirle artículos, integrantes y cupos en el formulario de al lado.</p></div>
                <label className="block space-y-1"><span className="text-[10px] font-bold text-zinc-500">Nombre del GO</span><input type="text" placeholder="Ej. SKZ 6TH FANMEETING MD" value={newGoTitle} onChange={(e) => setNewGoTitle(e.target.value)} className="border rounded-xl px-3.5 py-2.5 text-xs w-full" /></label>
                <label className="block space-y-1"><span className="text-[10px] font-bold text-zinc-500">Grupo / artista</span><input type="text" placeholder="Stray Kids, Enhypen..." value={newGoGroup} onChange={(e) => setNewGoGroup(e.target.value)} className="border rounded-xl px-3.5 py-2.5 text-xs w-full" /></label>
                <label className="block space-y-1"><span className="text-[10px] font-bold text-zinc-500">Imagen de portada (opcional)</span><input type="file" accept="image/*" onChange={(e) => uploadImageHandler(e, 'go')} className="text-xs w-full" /></label>
                {newGoImage && <img loading="lazy" decoding="async" src={newGoImage} alt="Vista previa del GO" className="h-28 w-full rounded-xl border border-pink-100 bg-pink-50 object-contain" />}
                <button type="submit" disabled={loadingForm || subiendoImagen} className="w-full bg-[#776a79] text-white font-bold text-xs py-3 rounded-xl">➕ Crear GO</button>
              </form>

              <form onSubmit={handleCrearProducto} className="bg-white border rounded-2xl p-5 space-y-3">
                <div className="flex justify-between items-center">
                  <div><h2 className="text-sm font-extrabold text-pink-600">2. Añadir artículo a un GO</h2><p className="mt-1 text-[10px] text-zinc-500">Primero elige a qué GO pertenece; después completa precio, integrantes, fecha límite y foto.</p></div>
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
                <label className="block space-y-1"><span className="text-[10px] font-bold text-zinc-500">Fecha límite (opcional)</span><input type="date" value={newProdDueDate} onChange={(e) => setNewProdDueDate(e.target.value)} className="border rounded-xl px-3.5 py-2 text-xs w-full" /></label>
                <textarea rows={3} placeholder="Descripción / detalles para los joiners (opcional)" value={newProdDesc} onChange={(e) => setNewProdDesc(e.target.value)} className="border rounded-xl px-3.5 py-2 text-xs w-full" />
                <label className="block space-y-1"><span className="text-[10px] font-bold text-zinc-500">Foto del artículo (opcional)</span><input type="file" accept="image/*" onChange={(e) => uploadImageHandler(e, 'prod')} className="text-xs w-full" /></label>
                <button type="submit" disabled={loadingForm || subiendoImagen} className="w-full bg-[#df82aa] text-white font-bold text-xs py-3 rounded-xl">📦 Publicar en GO</button>
              </form>
            </div>

            <form onSubmit={guardarFotoIntegrante} className="bg-white border rounded-2xl p-5 space-y-3">
              <h2 className="text-sm font-extrabold text-indigo-700">🪞 3. Subir Foto de Perfil de Integrante (Burbujas de Tienda)</h2>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-center">
                <input type="text" placeholder="Grupo (STRAY KIDS)" value={fotoIntegGrupo} onChange={(e) => setFotoIntegGrupo(e.target.value)} className="border rounded-xl px-3 py-2 text-xs uppercase" />
                <input type="text" placeholder="Nombre exacto (ej: Hyunjin)" value={fotoIntegNombre} onChange={(e) => setFotoIntegNombre(e.target.value)} className="border rounded-xl px-3 py-2 text-xs" />
                <input type="file" accept="image/*" onChange={(e) => uploadImageHandler(e, 'integ')} className="text-xs" />
                <button type="submit" disabled={loadingForm || subiendoImagen} className="bg-[#aaa4df] text-[#39345f] font-bold text-xs py-2.5 rounded-xl">💾 Guardar Foto</button>
              </div>
            </form>
          </div>
        )}
        {pestanaAdmin === 'items' && (
          <div className="space-y-5">
            <div className="flex flex-wrap justify-between items-center gap-3">
              <div>
                <h2 className="text-lg font-extrabold text-zinc-900">Productos publicados</h2>
                <p className="text-xs text-zinc-500">Filtra por Tienda o por GO. Abre «Editar» para cambiar los datos de una publicación.</p>
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
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all ${filtroItemsEditar === 'TIENDA' ? 'bg-[#aaa4df] text-[#39345f] shadow-2xs' : 'bg-white text-indigo-700 border border-indigo-200'}`}
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
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${filtroItemsEditar === 'GO_' + g.id ? 'bg-[#df82aa] text-white shadow-2xs' : 'bg-white text-zinc-700 border border-zinc-200'}`}
                  >
                    🧸 {g.title} ({countGo})
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setFiltroItemsEditar('TODOS')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${filtroItemsEditar === 'TODOS' ? 'bg-[#776a79] text-white' : 'bg-zinc-100 text-zinc-600'}`}
              >
                Ver Todos ({todosLosProductosAdmin.length})
              </button>
            </div>

            {editandoProducto && (
              <form onSubmit={handleGuardarEdicion} className="bg-amber-50 border-2 border-amber-300 p-5 rounded-3xl space-y-3 shadow-sm">
                <div className="flex items-center gap-3 border-b border-amber-200/70 pb-3">
                  {editandoProducto.imagen_producto && (
                    <img loading="lazy" decoding="async" src={editandoProducto.imagen_producto} alt="" className="w-12 h-12 rounded-xl object-cover border bg-white" />
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
                            <img loading="lazy" decoding="async" src={p.imagen_producto} alt={p.nombre_producto} className="w-full h-full object-contain p-2" />
                          ) : (
                            <span className="text-2xl">{p.isShop ? '🛍️' : '🧸'}</span>
                          )}
                          <span className={`absolute top-2 left-2 text-[9px] font-extrabold px-2 py-0.5 rounded-full shadow-2xs ${p.isShop ? 'bg-[#aaa4df] text-[#39345f]' : 'bg-[#df82aa] text-white'}`}>
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
                          className="py-1.5 rounded-xl bg-[#e5f1fb] hover:bg-[#d7eafa] text-[#477b9e] text-[11px] font-extrabold"
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
        </main>
      </div>
    </div>
  );
}
