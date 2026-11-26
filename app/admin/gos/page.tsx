'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { firebaseAuth } from '@/lib/firebaseClient';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
const correoAdmin = 'liahwang1852@gmail.com';

type Go = {
  id: number;
  title: string;
  group_name: string;
  status?: string;
  estado_logistica?: string;
  imagen_general?: string | null;
};

type ItemTarjeta = {
  idUnico: string;
  claimKeyBase?: string;
  origen: 'GO';
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
  origen: 'GO';
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
  claims_integrantes?: Record<string, any> | null;
  imagen_producto?: string | null;
  due_date?: string | null;
};
async function optimizarImagenParaSubida(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) throw new Error('Selecciona un archivo de imagen.');
  if (file.type === 'image/gif') return file;
  let bitmap: ImageBitmap | null = null;
  try {
    if (typeof createImageBitmap !== 'function') return file;
    bitmap = await createImageBitmap(file);
    const maxDimension = 1600;
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, width, height);
    const convertir = (mimeType: string, quality: number) =>
      new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mimeType, quality));
    const blobWebp = await convertir('image/webp', 0.82);
    if (blobWebp && blobWebp.type === 'image/webp') {
      const nombreBase = file.name.replace(/\.[^.]+$/, '') || 'imagen';
      return new File([blobWebp], `${nombreBase}.webp`, { type: 'image/webp', lastModified: Date.now() });
    }
    const blobJpeg = await convertir('image/jpeg', 0.86);
    if (blobJpeg && blobJpeg.type === 'image/jpeg') {
      const nombreBase = file.name.replace(/\.[^.]+$/, '') || 'imagen';
      return new File([blobJpeg], `${nombreBase}.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
    }
    return file;
  } catch {
    return file;
  } finally {
    bitmap?.close();
  }
}

function detectarEraDeTitulo(titulo: string): string {
  const t = String(titulo || '').toUpperCase();
  if (t.includes('PARALLEL WORLD')) return 'THE SIN : PARALLEL WORLD';
  if (t.includes('SEASONS GREETING')) return 'SEASONS GREETINGS';
  if (t.includes('ODD & FRESH') || t.includes('ODD AND FRESH')) return 'ODD & FRESH';
  if (t.includes('GLIDDY')) return 'GLIDDY POP-UP';
  if (t.includes('FESTA')) return "D'FESTA";
  if (t.includes('KARMA')) return 'KARMA';
  if (t.includes('HOP')) return 'HOP';
  if (t.includes('ATE')) return 'ATE';
  if (t.includes('DESIRE')) return 'DESIRE : UNLEASH';
  if (t.includes('ROMANCE')) return 'ROMANCE : UNTOLD';
  return 'OTRAS ERAS / GENERAL';
}
export default function AdminGosWorkspace() {
  const [usuarioEmail, setUsuarioEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [cargandoGo, setCargandoGo] = useState(false);

  const [vistaPrincipal, setVistaPrincipal] = useState<'go' | 'crear' | 'envios'>('go');
  const [gosAdmin, setGosAdmin] = useState<Go[]>([]);
  const [perfilesJoinersAdmin, setPerfilesJoinersAdmin] = useState<any[]>([]);
  const [solicitudesEnvio, setSolicitudesEnvio] = useState<any[]>([]);
  const [enviosCargados, setEnviosCargados] = useState(false);

  const [filtroGrupo, setFiltroGrupo] = useState<string>('TODOS');
  const [filtroEra, setFiltroEra] = useState<string>('TODAS');
  const [busquedaGo, setBusquedaGo] = useState('');
  const [goActivoId, setGoActivoId] = useState<number | null>(null);

  const [productosGoActivo, setProductosGoActivo] = useState<ProductoAdmin[]>([]);
  const [tarjetasGoActivo, setTarjetasGoActivo] = useState<TarjetaJoiner[]>([]);
  const [inputsStock, setInputsStock] = useState<Record<number, Record<string, string>>>({});
  const [inputsAbono, setInputsAbono] = useState<Record<string, string>>({});
  const [busquedaJoiner, setBusquedaJoiner] = useState('');
  const [filtroEstadoPago, setFiltroEstadoPago] = useState<'TODOS' | 'PAGADO' | 'ABONADO' | 'SIN_PAGAR'>('TODOS');

  const [editandoProdId, setEditandoProdId] = useState<number | null>(null);
  const [editProdNombre, setEditProdNombre] = useState('');
  const [editProdPrecio, setEditProdPrecio] = useState('');
  const [editProdDesc, setEditProdDesc] = useState('');
  const [editProdImagen, setEditProdImagen] = useState('');

  const [mostrarFormManual, setMostrarFormManual] = useState(false);
  const [manualProductoId, setManualProductoId] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [manualSlot, setManualSlot] = useState('');
  const [manualCantidad, setManualCantidad] = useState('1');
  const [guardandoClaimManual, setGuardandoClaimManual] = useState(false);

  const [newGoTitle, setNewGoTitle] = useState('');
  const [newGoGroup, setNewGoGroup] = useState('stray kids');
  const [newGoImage, setNewGoImage] = useState('');
  const [selectedGoParaNuevoProd, setSelectedGoParaNuevoProd] = useState<string>('');
  const [newProdName, setNewProdName] = useState('');
  const [newProdPrice, setNewProdPrice] = useState('');
  const [newProdQty, setNewProdQty] = useState('1');
  const [newProdSlots, setNewProdSlots] = useState('');
  const [newProdDueDate, setNewProdDueDate] = useState('');
  const [newProdDesc, setNewProdDesc] = useState('');
  const [newProdImage, setNewProdImage] = useState('');
  const [loadingForm, setLoadingForm] = useState(false);
  const [subiendoImagen, setSubiendoImagen] = useState(false);
  const [guiasTemp, setGuiasTemp] = useState<Record<number, string>>({});
  async function cargarIndiceInicial() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email && user.email.toLowerCase() === correoAdmin.toLowerCase()) {
        setUsuarioEmail(user.email);
        const [{ data: dataGos }, { data: dataPerfiles }] = await Promise.all([
          supabase.from('gos').select('*'),
          supabase.from('perfiles_joiners').select('*'),
        ]);
        if (dataPerfiles) setPerfilesJoinersAdmin(dataPerfiles);
        if (dataGos) {
          const listaGos = dataGos.map((g: any) => ({
            id: Number(g.id),
            title: String(g.title || ''),
            group_name: String(g.group_name || 'OTROS'),
            status: g.status || 'OPEN',
            estado_logistica: g.estado_logistica || 'Esperando cierre',
            imagen_general: g.imagen_general || null,
          }));
          setGosAdmin(listaGos);
          if (listaGos.length > 0 && !selectedGoParaNuevoProd) {
            setSelectedGoParaNuevoProd(String(listaGos.id));
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargarIndiceInicial();
  }, []);
  async function abrirGoEnWorkspace(goId: number) {
    setGoActivoId(goId);
    setVistaPrincipal('go');
    setEditandoProdId(null);
    setManualProductoId('');
    setManualSlot('');
    setCargandoGo(true);
    try {
      const goObj = gosAdmin.find((g) => Number(g.id) === Number(goId));
      const goTitle = goObj?.title || 'Group Order';
      const goGroupName = goObj?.group_name || 'OTROS';

      const { data: prodsData } = await supabase.from('productos').select('*').eq('go_id', goId);
      const listaProds: ProductoAdmin[] = Array.isArray(prodsData) ? prodsData : [];
      setProductosGoActivo(listaProds);

      const estructuraStock: Record<number, Record<string, string>> = {};
      const correosEnEsteGo = new Set<string>();

      listaProds.forEach((p: any) => {
        estructuraStock[p.id] = {};
        const slotsList = p.lista_slots
          ? String(p.lista_slots).split(',').map((s: string) => s.trim()).filter(Boolean)
          : Object.keys(p.stock_slots || {});
        slotsList.forEach((s: string) => {
          estructuraStock[p.id][s] = String(p.stock_slots?.[s] ?? '0');
        });

        const claims = p.claims_integrantes || {};
        Object.values(claims).forEach((dataClaim: any) => {
          if (!dataClaim) return;
          if (typeof dataClaim === 'string') {
            correosEnEsteGo.add(dataClaim.toLowerCase().trim());
          } else if (typeof dataClaim === 'object') {
            Object.entries(dataClaim).forEach(([mail, qty]) => {
              if (mail && Number(qty) > 0) correosEnEsteGo.add(mail.toLowerCase().trim());
            });
          }
        });
      });
      setInputsStock(estructuraStock);
      let dataSeg: any[] = [];
      const listaCorreos = Array.from(correosEnEsteGo);
      if (listaCorreos.length > 0) {
        const chunks: string[][] = [];
        for (let i = 0; i < listaCorreos.length; i += 25) {
          chunks.push(listaCorreos.slice(i, i + 25));
        }
        const segResponses = await Promise.all(
          chunks.map((grupoCorreos) =>
            supabase.from('seguimiento_claims').select('*').in('user_email', grupoCorreos)
          )
        );
        segResponses.forEach((r) => {
          if (Array.isArray(r.data)) dataSeg.push(...r.data);
        });
      }

      const mapaSeg: Record<string, any> = {};
      dataSeg.forEach((s: any) => {
        const correoSeg = String(s.user_email || '').toLowerCase().trim();
        mapaSeg[s.claim_key + '__' + correoSeg] = s;
        if (!mapaSeg[s.claim_key]) mapaSeg[s.claim_key] = s;
      });

      const mapaNombres: Record<string, string> = {};
      const mapaTelefonos: Record<string, string> = {};
      perfilesJoinersAdmin.forEach((pf: any) => {
        const m = String(pf.user_email || '').toLowerCase().trim();
        if (pf.nombre_completo) mapaNombres[m] = pf.nombre_completo;
        if (pf.telefono) mapaTelefonos[m] = pf.telefono;
      });

      const agrupadoPorJoiner: Record<string, TarjetaJoiner> = {};
      const agregarATarjeta = (correoRaw: string, item: ItemTarjeta, abonoItem = 0) => {
        const correo = correoRaw.toLowerCase().trim();
        const keyTarjeta = goTitle + '__' + correo;
        if (!agrupadoPorJoiner[keyTarjeta]) {
          const aliasCorreo = correo.split('@').at(0) || correo;
          agrupadoPorJoiner[keyTarjeta] = {
            tarjetaId: keyTarjeta,
            correo,
            nombreReal: mapaNombres[correo] || aliasCorreo,
            telefono: mapaTelefonos[correo] || '',
            categoriaTitulo: goTitle,
            origen: 'GO',
            items: [],
            totalTarjeta: 0,
            abonadoTarjeta: 0,
          };
        }
        agrupadoPorJoiner[keyTarjeta].items.push(item);
        agrupadoPorJoiner[keyTarjeta].totalTarjeta += item.precioTotal;
        agrupadoPorJoiner[keyTarjeta].abonadoTarjeta += Number(abonoItem || 0);
      };

      listaProds.forEach((p: any) => {
        const claims = p.claims_integrantes || {};
        Object.entries(claims).forEach(([integrante, dataClaim]: [string, any]) => {
          if (!dataClaim) return;
          const claimKey = p.id + '-' + integrante;
          const segLegacy = mapaSeg[claimKey];

          if (typeof dataClaim === 'string') {
            const correoClaim = dataClaim.toLowerCase().trim();
            const seg = mapaSeg[claimKey + '__' + correoClaim] || segLegacy;
            agregarATarjeta(
              dataClaim,
              {
                idUnico: claimKey, claimKeyBase: claimKey, origen: 'GO', goTitulo: goTitle, grupoGo: goGroupName,
                productoNombre: p.nombre_producto, imagenUrl: p.imagen_producto || null, detalleSlot: integrante,
                cantidad: 1, precioTotal: Number(p.precio || 0),
                estadoConfirmacion: seg?.estado_confirmacion || 'Pendiente',
                estadoPago: seg?.estado_pago || 'Sin pagar', fechaPago: seg?.fecha_pago || '', creadoEn: seg?.created_at || '',
              },
              seg?.estado_pago === 'Pagado' ? Number(p.precio || 0) : Number(seg?.monto_abonado || 0)
            );
          } else if (typeof dataClaim === 'object') {
            Object.entries(dataClaim).forEach(([correoCliente, cant]: [string, any]) => {
              if (!correoCliente || !cant) return;
              const seg = mapaSeg[claimKey + '__' + correoCliente.toLowerCase().trim()];
              agregarATarjeta(
                correoCliente,
                {
                  idUnico: claimKey + '-' + correoCliente, claimKeyBase: claimKey, origen: 'GO', goTitulo: goTitle, grupoGo: goGroupName,
                  productoNombre: p.nombre_producto, imagenUrl: p.imagen_producto || null, detalleSlot: integrante,
                  cantidad: Number(cant), precioTotal: Number(p.precio || 0) * Number(cant),
                  estadoConfirmacion: seg?.estado_confirmacion || 'Pendiente',
                  estadoPago: seg?.estado_pago || 'Sin pagar', fechaPago: seg?.fecha_pago || '', creadoEn: seg?.created_at || '',
                },
                seg?.estado_pago === 'Pagado' ? Number(p.precio || 0) * Number(cant) : Number(seg?.monto_abonado || 0)
              );
            });
          }
        });
      });

      const listaTarjetas = Object.values(agrupadoPorJoiner).sort((a, b) => {
        const fechaA = a.items.at(0)?.creadoEn || '9999-12-31';
        const fechaB = b.items.at(0)?.creadoEn || '9999-12-31';
        return fechaA.localeCompare(fechaB);
      });
      setTarjetasGoActivo(listaTarjetas);
    } catch (error) {
      console.error(error);
    } finally {
      setCargandoGo(false);
    }
  }
  async function cargarEnviosBajoDemanda() {
    setVistaPrincipal('envios');
    if (enviosCargados) return;
    const { data } = await supabase.from('solicitudes_envio').select('*').order('id', { ascending: false });
    if (data) setSolicitudesEnvio(data);
    setEnviosCargados(true);
  }

  async function uploadImageHandler(
    e: React.ChangeEvent<HTMLInputElement>,
    target: 'go' | 'prod' | 'edit-prod' | 'edit-go-cover'
  ) {
    const input = e.currentTarget;
    const files: File[] = Array.from(input.files || []);
    const file = files.at(0);
    if (!file) return;
    setSubiendoImagen(true);
    try {
      await firebaseAuth.authStateReady();
      const token = await firebaseAuth.currentUser?.getIdToken();
      if (!token) throw new Error('Tu sesión ha expirado. Inicia sesión nuevamente.');

      const imagenOptimizada = await optimizarImagenParaSubida(file);
      const formData = new FormData();
      formData.append('file', imagenOptimizada);
      formData.append('folder', target === 'go' || target === 'edit-go-cover' ? 'gos' : 'productos');

      const response = await fetch('/api/media/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const result = await response.json();
      if (!response.ok || !result.secure_url) {
        throw new Error(result.error || 'No se pudo subir la imagen a Cloudinary.');
      }

      const publicUrl = String(result.secure_url);

      if (target === 'go') {
        setNewGoImage(publicUrl);
        alert('✅ Imagen del GO subida.');
      } else if (target === 'prod') {
        setNewProdImage(publicUrl);
        alert('✅ Foto del artículo subida.');
      } else if (target === 'edit-prod') {
        setEditProdImagen(publicUrl);
        alert('✅ Nueva foto lista. Pulsa «Guardar foto y precio» para aplicarla.');
      } else if (target === 'edit-go-cover' && goActivoId) {
        const resPatch = await fetch('/api/data/gos', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ filters: [['id', goActivoId]], values: { imagen_general: publicUrl } }),
        });
        if (!resPatch.ok) throw new Error('No se pudo actualizar la portada del GO.');
        setGosAdmin((prev) =>
          prev.map((g) => (Number(g.id) === Number(goActivoId) ? { ...g, imagen_general: publicUrl } : g))
        );
        alert('✅ Portada del GO actualizada.');
      }
    } catch (error: any) {
      alert('No se pudo subir la imagen: ' + (error?.message || 'Error inesperado.'));
    } finally {
      setSubiendoImagen(false);
      input.value = '';
    }
  }
  async function ejecutarGestionClaims(payload: any) {
    await firebaseAuth.authStateReady();
    const token = await firebaseAuth.currentUser?.getIdToken();
    if (!token) throw new Error('Tu sesión ha expirado. Inicia sesión nuevamente.');
    const response = await fetch('/api/admin/claims-manage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok) {
      if (result.error?.startsWith('STOCK_BELOW_CLAIMS:')) {
        const [, slot, reservado] = result.error.split(':');
        throw new Error(`No puedes dejar "${slot}" con menos de ${reservado} unidades reservadas.`);
      }
      throw new Error(result.error || 'No se pudo completar la operación.');
    }
    return result.data;
  }

  async function handleGuardarStockBD(prodId: number) {
    const inputsProd = inputsStock[prodId] || {};
    const jsonNuevo: { [key: string]: number } = {};
    for (const [slot, val] of Object.entries(inputsProd)) {
      const cantidad = Number(val);
      if (!String(val).trim() || !Number.isSafeInteger(cantidad) || cantidad < 0) {
        alert(`El stock de "${slot}" debe ser un número entero igual o mayor que cero.`);
        return;
      }
      jsonNuevo[slot] = cantidad;
    }
    try {
      await ejecutarGestionClaims({ action: 'update-stock', productoId: prodId, stock_slots: jsonNuevo });
      alert('✅ ¡Stock guardado!');
      if (goActivoId) await abrirGoEnWorkspace(goActivoId);
    } catch (error: any) {
      alert('No se pudo guardar el stock: ' + (error?.message || 'Error desconocido.'));
    }
  }

  async function toggleVisibilidadGO(goId: number, statusActual?: string) {
    const nuevoStatus = statusActual === 'HIDDEN' ? 'OPEN' : 'HIDDEN';
    await supabase.from('gos').update({ status: nuevoStatus }).eq('id', goId);
    setGosAdmin((prev) => prev.map((g) => (Number(g.id) === Number(goId) ? { ...g, status: nuevoStatus } : g)));
  }

  async function actualizarEstadoLogisticaGO(goId: number, nuevoEstado: string) {
    await supabase.from('gos').update({ estado_logistica: nuevoEstado }).eq('id', goId);
    setGosAdmin((prev) => prev.map((g) => (Number(g.id) === Number(goId) ? { ...g, estado_logistica: nuevoEstado } : g)));
  }

  async function handleEliminarGO(goId: number) {
    if (!confirm('⚠️ ¿Eliminar este GO completo?')) return;
    await supabase.from('productos').delete().eq('go_id', goId);
    await supabase.from('gos').delete().eq('id', goId);
    setGoActivoId(null);
    await cargarIndiceInicial();
  }

  function iniciarEdicionProductoGo(prod: ProductoAdmin) {
    setEditandoProdId(prod.id);
    setEditProdNombre(prod.nombre_producto);
    setEditProdPrecio(String(prod.precio));
    setEditProdDesc(prod.descripcion || '');
    setEditProdImagen(prod.imagen_producto || '');
  }

  async function guardarEdicionProductoGo(prodId: number) {
    const precioNum = Number(editProdPrecio);
    if (!editProdNombre.trim() || isNaN(precioNum) || precioNum < 0) {
      alert('Revisa el nombre y el precio del artículo.');
      return;
    }
    setLoadingForm(true);
    try {
      await firebaseAuth.authStateReady();
      const token = await firebaseAuth.currentUser?.getIdToken();
      if (!token) throw new Error('Tu sesión ha expirado.');

      const res = await fetch('/api/data/productos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          filters: [['id', prodId]],
          values: {
            nombre_producto: editProdNombre.trim().toUpperCase(),
            precio: precioNum,
            descripcion: editProdDesc.trim() || null,
            imagen_producto: editProdImagen || null,
          },
        }),
      });
      if (!res.ok) throw new Error('No se pudo guardar en Firebase.');

      setEditandoProdId(null);
      alert('✅ Artículo actualizado (precio, foto y detalles).');
      if (goActivoId) await abrirGoEnWorkspace(goActivoId);
    } catch (err: any) {
      alert('No se pudo guardar: ' + (err?.message || 'Error inesperado.'));
    } finally {
      setLoadingForm(false);
    }
  }
  async function handleEliminarProductoGo(prodId: number) {
    if (!confirm('¿Eliminar este artículo del GO?')) return;
    const { error } = await supabase.from('productos').delete().eq('id', prodId);
    if (!error && goActivoId) await abrirGoEnWorkspace(goActivoId);
  }

  async function handleEliminarUnSoloItem(tarjeta: TarjetaJoiner, item: ItemTarjeta) {
    if (!confirm('¿Quitar "' + item.productoNombre + '" (' + item.detalleSlot + ') del pedido de ' + tarjeta.nombreReal + '?')) return;
    try {
      await ejecutarGestionClaims({
        action: 'delete-items',
        email: tarjeta.correo,
        items: [{ origen: 'GO', claimKeyBase: item.claimKeyBase }],
      }).catch(() => null);

      const prodId = Number(String(item.claimKeyBase || '').split('-').at(0));
      const prodObj = productosGoActivo.find((p) => Number(p.id) === prodId);
      if (prodObj && prodObj.claims_integrantes) {
        const claimsCopia: Record<string, any> = { ...prodObj.claims_integrantes };
        const slotExacto =
          Object.keys(claimsCopia).find((k) => k.trim().toLowerCase() === item.detalleSlot.trim().toLowerCase()) ||
          item.detalleSlot;

        if (claimsCopia[slotExacto] && typeof claimsCopia[slotExacto] === 'object') {
          const mailKey = Object.keys(claimsCopia[slotExacto]).find(
            (m) => m.trim().toLowerCase() === tarjeta.correo.trim().toLowerCase()
          );
          if (mailKey) {
            delete claimsCopia[slotExacto][mailKey];
            if (Object.keys(claimsCopia[slotExacto]).length === 0) delete claimsCopia[slotExacto];
            await supabase.from('productos').update({ claims_integrantes: claimsCopia }).eq('id', prodObj.id);
          }
        }
      }
      if (goActivoId) await abrirGoEnWorkspace(goActivoId);
    } catch (error: any) {
      alert('No se pudo eliminar el artículo: ' + (error?.message || 'Error desconocido.'));
    }
  }

  async function handleEliminarTarjetaPedido(tarjeta: TarjetaJoiner) {
    if (!confirm('⚠️ ¿Eliminar todo el pedido de ' + tarjeta.nombreReal + ' y liberar sus slots?')) return;
    try {
      await ejecutarGestionClaims({
        action: 'delete-items',
        email: tarjeta.correo,
        items: tarjeta.items.map((item) => ({ origen: 'GO', claimKeyBase: item.claimKeyBase })),
      }).catch(() => null);

      for (const item of tarjeta.items) {
        const prodId = Number(String(item.claimKeyBase || '').split('-').at(0));
        const prodObj = productosGoActivo.find((p) => Number(p.id) === prodId);
        if (prodObj && prodObj.claims_integrantes) {
          const claimsCopia: Record<string, any> = { ...prodObj.claims_integrantes };
          const slotExacto =
            Object.keys(claimsCopia).find((k) => k.trim().toLowerCase() === item.detalleSlot.trim().toLowerCase()) ||
            item.detalleSlot;

          if (claimsCopia[slotExacto] && typeof claimsCopia[slotExacto] === 'object') {
            const mailKey = Object.keys(claimsCopia[slotExacto]).find(
              (m) => m.trim().toLowerCase() === tarjeta.correo.trim().toLowerCase()
            );
            if (mailKey) {
              delete claimsCopia[slotExacto][mailKey];
              if (Object.keys(claimsCopia[slotExacto]).length === 0) delete claimsCopia[slotExacto];
              await supabase.from('productos').update({ claims_integrantes: claimsCopia }).eq('id', prodObj.id);
            }
          }
        }
      }
      alert('🗑️ Pedido eliminado y slots liberados ✨');
      if (goActivoId) await abrirGoEnWorkspace(goActivoId);
    } catch (error: any) {
      alert('No se pudo eliminar el pedido: ' + (error?.message || 'Error desconocido.'));
    }
  }
  async function registrarClaimManual(e: React.FormEvent) {
    e.preventDefault();
    const email = manualEmail.toLowerCase().trim();
    const cantidad = Number(manualCantidad);
    const productoId = Number(manualProductoId);
    if (!goActivoId || !email || !productoId || !manualSlot || !Number.isSafeInteger(cantidad) || cantidad < 1) {
      alert('Completa el artículo, Joiner, integrante y cantidad.');
      return;
    }
    setGuardandoClaimManual(true);
    try {
      await firebaseAuth.authStateReady();
      const token = await firebaseAuth.currentUser?.getIdToken();
      if (!token) throw new Error('Tu sesión ha expirado. Inicia sesión nuevamente.');
      const response = await fetch('/api/admin/claims-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ productoId, goId: String(goActivoId), email, slot: manualSlot, cantidad }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'No se pudo registrar el claim.');
      alert('✅ Claim recibido por WhatsApp registrado.');
      setManualEmail('');
      setManualSlot('');
      setManualCantidad('1');
      setMostrarFormManual(false);
      await abrirGoEnWorkspace(goActivoId);
    } catch (error: any) {
      alert('No se pudo registrar el claim: ' + (error?.message || 'Error desconocido.'));
    } finally {
      setGuardandoClaimManual(false);
    }
  }

  async function handleCreateGO(e: React.FormEvent) {
    e.preventDefault();
    if (!newGoTitle.trim()) return alert('Pon el título 🎀');
    setLoadingForm(true);
    const { error } = await supabase
      .from('gos')
      .insert([{ title: newGoTitle.toUpperCase(), group_name: newGoGroup.toLowerCase(), status: 'OPEN', imagen_general: newGoImage || null }]);
    setLoadingForm(false);
    if (!error) {
      alert('¡GO creado! ✨');
      setNewGoTitle('');
      setNewGoImage('');
      await cargarIndiceInicial();
    }
  }

  async function handleCrearProducto(e: React.FormEvent) {
    e.preventDefault();
    const goTarget = Number(selectedGoParaNuevoProd);
    if (!goTarget || !newProdName.trim() || !newProdPrice || !newProdSlots.trim()) return alert('Completa todos los datos 🧸');
    setLoadingForm(true);
    const slotsArr = newProdSlots.split(',').map((s) => s.trim()).filter(Boolean);
    const jsonStockInicial: { [key: string]: number } = {};
    slotsArr.forEach((s) => { jsonStockInicial[s] = Number(newProdQty || 0); });
    const { error } = await supabase.from('productos').insert([{
      go_id: goTarget,
      nombre_producto: newProdName.toUpperCase(),
      precio: Number(newProdPrice),
      lista_slots: slotsArr.join(', '),
      imagen_producto: newProdImage || null,
      claims_integrantes: {},
      cantidad_disponible: Number(newProdQty || 0),
      stock_slots: jsonStockInicial,
      due_date: newProdDueDate || null,
      descripcion: newProdDesc || null,
    }]);
    setLoadingForm(false);
    if (!error) {
      alert('¡Artículo publicado en el GO! 📦');
      setNewProdName('');
      setNewProdPrice('');
      setNewProdSlots('');
      setNewProdImage('');
      setNewProdDesc('');
      if (goActivoId === goTarget) await abrirGoEnWorkspace(goTarget);
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
      setEnviosCargados(false);
      await cargarEnviosBajoDemanda();
    }
  }
  const gruposDisponibles = Array.from(
    new Set(gosAdmin.map((g) => (g.group_name || 'OTROS').toUpperCase().trim()).filter(Boolean))
  );
  const gosPorGrupo = gosAdmin.filter(
    (g) => filtroGrupo === 'TODOS' || (g.group_name || 'OTROS').toUpperCase().trim() === filtroGrupo
  );
  const erasDisponibles = Array.from(new Set(gosPorGrupo.map((g) => detectarEraDeTitulo(g.title))));
  const gosFiltradosFinal = gosPorGrupo.filter((g) => {
    if (filtroEra !== 'TODAS' && detectarEraDeTitulo(g.title) !== filtroEra) return false;
    if (busquedaGo.trim() && !g.title.toLowerCase().includes(busquedaGo.toLowerCase().trim())) return false;
    return true;
  });

  const goActivoObj = gosAdmin.find((g) => Number(g.id) === Number(goActivoId)) || null;
  const prodManualObj = productosGoActivo.find((p) => String(p.id) === manualProductoId);
  const slotsManuales = (prodManualObj?.lista_slots || '').split(',').map((s) => s.trim()).filter(Boolean);

  if (loading) {
    return <div className="min-h-screen bg-[#fff8fb] flex items-center justify-center text-sm font-bold text-pink-700">🎀 Cargando tus Group Orders...</div>;
  }

  if (usuarioEmail.toLowerCase() !== correoAdmin.toLowerCase()) {
    return (
      <div className="min-h-screen bg-[#fff8fb] flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-3xl border border-pink-100 bg-white p-8 text-center shadow-sm">
          <div className="text-4xl mb-3">🔒</div>
          <h1 className="text-xl font-black text-zinc-900">Área privada</h1>
          <Link href="/mi-escritorio" className="inline-flex mt-5 rounded-xl bg-pink-600 px-5 py-2.5 text-xs font-bold text-white">Volver a Mi escritorio</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#fff4f8_0%,#fffaf0_42%,#f1fbf7_100%)] font-sans text-[#514653] pb-16">
      <header className="sticky top-0 z-30 border-b border-[#f4dce8] bg-white/95 backdrop-blur px-3 sm:px-6 py-2.5">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Link href="/admin" className="rounded-xl bg-pink-100 px-2.5 py-1.5 text-xs font-black text-pink-800">👑 Admin</Link>
            <span className="text-xs font-black text-zinc-800 hidden sm:inline">Gestión de GOs</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Link href="/gos" className="rounded-xl border border-pink-200 bg-pink-50 px-2.5 py-1.5 text-[11px] font-extrabold text-pink-700">🧸 Ir a GOs</Link>
            <Link href="/shop" className="rounded-xl border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-[11px] font-extrabold text-indigo-700">🛍️ Ir a Tienda</Link>
            <Link href="/admin/centro" className="rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-extrabold text-emerald-700">💳 Pagos</Link>
          </div>
        </div>
        <div className="mx-auto max-w-6xl grid grid-cols-3 gap-1.5 mt-2.5">
          <button type="button" onClick={() => setVistaPrincipal('go')} className={`py-2 px-2 rounded-xl text-xs font-black transition ${vistaPrincipal === 'go' ? 'bg-[#D96B9F] text-white' : 'bg-[#fdf2f7] text-[#8e4e70]'}`}>📂 Por GO</button>
          <button type="button" onClick={() => setVistaPrincipal('crear')} className={`py-2 px-2 rounded-xl text-xs font-black transition ${vistaPrincipal === 'crear' ? 'bg-[#D96B9F] text-white' : 'bg-[#fdf2f7] text-[#8e4e70]'}`}>✨ Crear GO</button>
          <button type="button" onClick={cargarEnviosBajoDemanda} className={`py-2 px-2 rounded-xl text-xs font-black transition ${vistaPrincipal === 'envios' ? 'bg-[#D96B9F] text-white' : 'bg-[#fdf2f7] text-[#8e4e70]'}`}>📮 Envíos</button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-3 sm:px-6 pt-4 space-y-5">
        {vistaPrincipal === 'go' && (
          <>
            {!goActivoObj ? (
              <section className="rounded-3xl border border-[#f1dce8] bg-white p-4 sm:p-6 shadow-xs space-y-4">
                <h1 className="text-lg font-black text-zinc-900">1. Elige un Group Order</h1>
                <div className="flex flex-wrap gap-1.5">
                  <button type="button" onClick={() => { setFiltroGrupo('TODOS'); setFiltroEra('TODAS'); }} className={`px-3 py-1.5 rounded-full text-xs font-extrabold ${filtroGrupo === 'TODOS' ? 'bg-zinc-800 text-white' : 'bg-zinc-100 text-zinc-600'}`}>Todos ({gosAdmin.length})</button>
                  {gruposDisponibles.map((grp) => (
                    <button key={grp} type="button" onClick={() => { setFiltroGrupo(grp); setFiltroEra('TODAS'); }} className={`px-3 py-1.5 rounded-full text-xs font-extrabold uppercase ${filtroGrupo === grp ? 'bg-[#D96B9F] text-white' : 'bg-pink-50 text-pink-700'}`}>🎤 {grp}</button>
                  ))}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <select value={filtroEra} onChange={(e) => setFiltroEra(e.target.value)} className="border border-pink-200 rounded-xl px-3 py-2.5 text-xs font-bold bg-[#fff9fc]">
                    <option value="TODAS">✨ Todas las Eras ({gosPorGrupo.length})</option>
                    {erasDisponibles.map((era) => <option key={era} value={era}>💿 {era}</option>)}
                  </select>
                  <input type="text" placeholder="🔍 Buscar GO..." value={busquedaGo} onChange={(e) => setBusquedaGo(e.target.value)} className="border border-zinc-200 rounded-xl px-3.5 py-2.5 text-xs bg-white" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                  {gosFiltradosFinal.map((g) => (
                    <button key={g.id} type="button" onClick={() => abrirGoEnWorkspace(g.id)} className="flex items-center gap-3 rounded-2xl border border-[#f2dce8] bg-[#fffafd] hover:border-pink-400 p-3 text-left transition">
                      {g.imagen_general ? <img src={g.imagen_general} alt="" className="w-12 h-12 rounded-xl object-cover border bg-white shrink-0" /> : <div className="w-12 h-12 rounded-xl bg-pink-50 border flex items-center justify-center text-lg shrink-0">🧸</div>}
                      <div className="min-w-0 flex-1">
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-pink-100 text-pink-700">{g.group_name}</span>
                        <p className="text-xs font-black text-zinc-900 line-clamp-2 mt-1">{g.title}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            ) : (
              <div className="space-y-5">
                <button type="button" onClick={() => { setGoActivoId(null); setProductosGoActivo([]); setTarjetasGoActivo([]); }} className="rounded-xl border border-pink-200 bg-white px-4 py-2.5 text-xs font-extrabold text-pink-700">⬅️ Cambiar de GO</button>
                <section className="rounded-3xl border border-[#f1dce8] bg-white p-4 sm:p-5 space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {goActivoObj.imagen_general ? <img src={goActivoObj.imagen_general} alt="" className="w-16 h-16 rounded-2xl object-cover border" /> : <div className="w-16 h-16 rounded-2xl bg-pink-50 border flex items-center justify-center text-2xl">🧸</div>}
                      <div>
                        <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-pink-100 text-pink-700">{goActivoObj.group_name}</span>
                        <h1 className="text-base sm:text-xl font-black text-zinc-900 mt-1">{goActivoObj.title}</h1>
                        <label className="mt-1 inline-flex items-center gap-1.5 text-[11px] font-bold text-pink-700 cursor-pointer underline">
                          <span>📸 {subiendoImagen ? 'Subiendo...' : 'Cambiar portada del GO'}</span>
                          <input type="file" accept="image/*" onChange={(e) => uploadImageHandler(e, 'edit-go-cover')} className="hidden" />
                        </label>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => toggleVisibilidadGO(goActivoObj.id, goActivoObj.status)} className="px-3 py-1.5 rounded-xl text-xs font-extrabold border bg-zinc-50">{goActivoObj.status === 'HIDDEN' ? '🟢 Mostrar' : '🙈 Ocultar'}</button>
                      <button type="button" onClick={() => handleEliminarGO(goActivoObj.id)} className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-rose-50 text-rose-600 border border-rose-200">🗑️ Borrar</button>
                    </div>
                  </div>
                  <select value={goActivoObj.estado_logistica || 'Esperando cierre'} onChange={(e) => actualizarEstadoLogisticaGO(goActivoObj.id, e.target.value)} className="border border-pink-300 bg-white rounded-xl px-3 py-2 text-xs font-extrabold w-full">
                    <option value="Esperando cierre">⏳ Esperando cierre</option>
                    <option value="Pedido realizado">🟡 Pedido realizado</option>
                    <option value="En bodega Corea / Japón">🇰🇷 En bodega Corea / Japón</option>
                    <option value="En camino a Ecuador">✈️ En camino a Ecuador</option>
                    <option value="Llegó a hyuneatelier">📦 ¡Llegó a hyuneatelier!</option>
                    <option value="Cancelado">❌ Cancelado</option>
                  </select>
                </section>

                <section className="rounded-3xl border border-[#f1dce8] bg-white p-4 sm:p-5 space-y-4">
                  <div className="flex justify-between items-center">
                    <h2 className="text-base font-black text-zinc-900">📦 Artículos del GO ({productosGoActivo.length})</h2>
                    <button type="button" onClick={() => { setSelectedGoParaNuevoProd(String(goActivoObj.id)); setVistaPrincipal('crear'); }} className="rounded-xl bg-pink-100 px-3 py-2 text-xs font-extrabold text-pink-800">+ Añadir artículo</button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {productosGoActivo.map((prod) => (
                      <div key={prod.id} className="rounded-2xl border border-zinc-200 bg-[#fffcfd] p-4 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            {prod.imagen_producto ? <img src={prod.imagen_producto} alt="" className="w-14 h-14 rounded-xl object-contain bg-white border p-1 shrink-0" /> : <div className="w-14 h-14 rounded-xl bg-pink-50 border flex items-center justify-center text-xl shrink-0">🖼️</div>}
                            <div className="min-w-0">
                              <h3 className="text-sm font-black text-zinc-900 break-words">{prod.nombre_producto}</h3>
                              <p className="text-xs font-extrabold text-pink-600">${Number(prod.precio).toFixed(2)} USD</p>
                            </div>
                          </div>
                          <div className="flex gap-1.5">
                            <button type="button" onClick={() => editandoProdId === prod.id ? setEditandoProdId(null) : iniciarEdicionProductoGo(prod)} className="rounded-xl bg-[#e5f1fb] px-2.5 py-1.5 text-[11px] font-extrabold text-[#477b9e]">
                              {editandoProdId === prod.id ? 'Cerrar' : '✏️ Precio / Foto'}
                            </button>
                            <button type="button" onClick={() => handleEliminarProductoGo(prod.id)} className="rounded-xl bg-rose-50 px-2.5 py-1.5 text-[11px] font-extrabold text-rose-600">🗑️</button>
                          </div>
                        </div>

                        {editandoProdId === prod.id && (
                          <div className="rounded-2xl border-2 border-amber-300 bg-amber-50/90 p-3 space-y-2.5">
                            <div className="flex items-center gap-3 bg-white p-2 rounded-xl border">
                              {editProdImagen ? <img src={editProdImagen} alt="" className="w-12 h-12 rounded-lg object-contain border" /> : <div className="w-12 h-12 rounded-lg border border-dashed flex items-center justify-center">📸</div>}
                              <label className="flex-1 text-[11px] font-bold text-pink-700 cursor-pointer">
                                <span>{subiendoImagen ? 'Subiendo foto...' : '📤 Subir / Resubir foto aquí'}</span>
                                <input type="file" accept="image/*" onChange={(e) => uploadImageHandler(e, 'edit-prod')} className="block w-full text-[10px] mt-1" />
                              </label>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <input type="text" value={editProdNombre} onChange={(e) => setEditProdNombre(e.target.value)} className="col-span-2 border rounded-xl px-2.5 py-1.5 text-xs font-bold bg-white" />
                              <input type="number" step="0.01" value={editProdPrecio} onChange={(e) => setEditProdPrecio(e.target.value)} className="border rounded-xl px-2.5 py-1.5 text-xs font-bold bg-white" />
                            </div>
                            <textarea rows={2} value={editProdDesc} onChange={(e) => setEditProdDesc(e.target.value)} className="w-full border rounded-xl px-2.5 py-1.5 text-xs bg-white" />
                            <button type="button" disabled={loadingForm || subiendoImagen} onClick={() => guardarEdicionProductoGo(prod.id)} className="w-full rounded-xl bg-emerald-600 py-2 text-xs font-extrabold text-white">💾 Guardar foto y precio</button>
                          </div>
                        )}

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t">
                          {Object.entries(inputsStock[prod.id] || {}).map(([slot, val]) => (
                            <div key={slot} className="flex items-center justify-between gap-1 bg-zinc-50 border rounded-xl px-2 py-1 text-xs">
                              <span className="truncate font-bold">{slot}</span>
                              <input type="number" min="0" value={val} onChange={(e) => setInputsStock((prev) => ({ ...prev, [prod.id]: { ...(prev[prod.id] || {}), [slot]: e.target.value } }))} className="w-12 border rounded px-1 py-0.5 text-center font-black bg-white" />
                            </div>
                          ))}
                        </div>
                        <button type="button" onClick={() => handleGuardarStockBD(prod.id)} className="w-full rounded-xl bg-zinc-900 text-white py-2 text-xs font-bold">💾 Guardar stock</button>
                      </div>
                    ))}
                  </div>
                </section>
                <section className="rounded-3xl border border-[#f1dce8] bg-white p-4 sm:p-5 space-y-4">
                  <div className="flex justify-between items-center">
                    <h2 className="text-base font-black text-zinc-900">📋 Pedidos de Joiners ({tarjetasGoActivo.length})</h2>
                    <button type="button" onClick={() => setMostrarFormManual(!mostrarFormManual)} className="rounded-xl bg-emerald-600 text-white px-3 py-2 text-xs font-bold">+ Claim WhatsApp</button>
                  </div>
                  {mostrarFormManual && (
                    <form onSubmit={registrarClaimManual} className="rounded-2xl border bg-emerald-50/70 p-4 space-y-2">
                      <select value={manualProductoId} onChange={(e) => setManualProductoId(e.target.value)} className="w-full border rounded-xl px-3 py-2 text-xs bg-white" required>
                        <option value="">Selecciona artículo...</option>
                        {productosGoActivo.map((p) => <option key={p.id} value={p.id}>{p.nombre_producto}</option>)}
                      </select>
                      <select value={manualSlot} onChange={(e) => setManualSlot(e.target.value)} className="w-full border rounded-xl px-3 py-2 text-xs bg-white" required>
                        <option value="">Selecciona integrante...</option>
                        {slotsManuales.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <input type="email" placeholder="Correo del joiner *" value={manualEmail} onChange={(e) => setManualEmail(e.target.value)} className="w-full border rounded-xl px-3 py-2 text-xs bg-white" required />
                      <input type="number" min="1" value={manualCantidad} onChange={(e) => setManualCantidad(e.target.value)} className="w-full border rounded-xl px-3 py-2 text-xs bg-white" required />
                      <button type="submit" disabled={guardandoClaimManual} className="w-full rounded-xl bg-emerald-600 text-white py-2.5 text-xs font-extrabold">{guardandoClaimManual ? 'Guardando...' : 'Guardar claim'}</button>
                    </form>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {tarjetasGoActivo.map((tarjeta) => (
                      <div key={tarjeta.tarjetaId} className="rounded-2xl border p-4 space-y-2 bg-[#fffcfd]">
                        <div className="flex justify-between items-center border-b pb-2">
                          <div><p className="text-xs font-black">{tarjeta.nombreReal}</p><p className="text-[10px] text-zinc-400">{tarjeta.correo}</p></div>
                          <span className="text-xs font-black text-pink-600">${tarjeta.totalTarjeta.toFixed(2)}</span>
                        </div>
                        {tarjeta.items.map((item) => (
                          <div key={item.idUnico} className="flex justify-between items-center text-xs">
                            <span>{item.productoNombre} ({item.detalleSlot} x{item.cantidad})</span>
                            <button type="button" onClick={() => handleEliminarUnSoloItem(tarjeta, item)} className="text-rose-500 font-bold">✕</button>
                          </div>
                        ))}
                        <button type="button" onClick={() => handleEliminarTarjetaPedido(tarjeta)} className="w-full py-1.5 rounded-xl bg-zinc-100 hover:bg-rose-600 hover:text-white text-zinc-500 text-[11px] font-bold">🗑️ Eliminar pedido / Liberar slots</button>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}
          </>
        )}

        {vistaPrincipal === 'crear' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <form onSubmit={handleCreateGO} className="rounded-3xl border border-[#f1dce8] bg-white p-5 space-y-3">
              <h2 className="text-base font-black text-zinc-900">1. Crear nuevo Group Order</h2>
              <input type="text" placeholder="Título del GO *" value={newGoTitle} onChange={(e) => setNewGoTitle(e.target.value)} className="border rounded-xl px-3.5 py-2.5 text-xs w-full font-bold" required />
              <select value={newGoGroup} onChange={(e) => setNewGoGroup(e.target.value)} className="border rounded-xl px-3.5 py-2.5 text-xs w-full font-bold">
                <option value="stray kids">🎤 Stray Kids</option>
                <option value="enhypen">🎤 Enhypen</option>
                <option value="evan">🎤 Evan</option>
                <option value="otros">✨ Otros grupos</option>
              </select>
              <input type="file" accept="image/*" onChange={(e) => uploadImageHandler(e, 'go')} className="text-xs w-full" />
              {newGoImage && <img src={newGoImage} alt="" className="h-24 rounded-xl border object-contain" />}
              <button type="submit" disabled={loadingForm || subiendoImagen} className="w-full rounded-xl bg-zinc-900 text-white text-xs font-extrabold py-3">{subiendoImagen ? 'Subiendo foto...' : '✨ Crear Group Order'}</button>
            </form>

            <form onSubmit={handleCrearProducto} className="rounded-3xl border border-[#f1dce8] bg-white p-5 space-y-3">
              <h2 className="text-base font-black text-pink-600">2. Añadir artículo a un GO</h2>
              <select value={selectedGoParaNuevoProd} onChange={(e) => setSelectedGoParaNuevoProd(e.target.value)} className="border rounded-xl px-3.5 py-2.5 text-xs w-full font-bold" required>
                <option value="">Seleccionar GO...</option>
                {gosAdmin.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
              </select>
              <input type="text" placeholder="Nombre del artículo *" value={newProdName} onChange={(e) => setNewProdName(e.target.value)} className="border rounded-xl px-3.5 py-2.5 text-xs w-full font-bold" required />
              <div className="grid grid-cols-2 gap-2">
                <input type="number" step="0.01" placeholder="Precio USD *" value={newProdPrice} onChange={(e) => setNewProdPrice(e.target.value)} className="border rounded-xl px-3.5 py-2.5 text-xs font-bold" required />
                <input type="number" min="0" placeholder="Stock por slot *" value={newProdQty} onChange={(e) => setNewProdQty(e.target.value)} className="border rounded-xl px-3.5 py-2.5 text-xs font-bold" required />
              </div>
              <input type="text" placeholder="Integrantes separados por coma *" value={newProdSlots} onChange={(e) => setNewProdSlots(e.target.value)} className="border rounded-xl px-3.5 py-2.5 text-xs w-full" required />
              <input type="date" value={newProdDueDate} onChange={(e) => setNewProdDueDate(e.target.value)} className="border rounded-xl px-3.5 py-2 text-xs w-full" />
              <textarea rows={2} placeholder="Descripción" value={newProdDesc} onChange={(e) => setNewProdDesc(e.target.value)} className="border rounded-xl px-3.5 py-2 text-xs w-full" />
              <input type="file" accept="image/*" onChange={(e) => uploadImageHandler(e, 'prod')} className="text-xs w-full" />
              {newProdImage && <img src={newProdImage} alt="" className="h-24 rounded-xl border object-contain" />}
              <button type="submit" disabled={loadingForm || subiendoImagen} className="w-full rounded-xl bg-[#D96B9F] text-white text-xs font-extrabold py-3">{subiendoImagen ? 'Subiendo foto...' : '📦 Publicar artículo en GO'}</button>
            </form>
          </div>
        )}

        {vistaPrincipal === 'envios' && (
          <div className="space-y-4">
            <h2 className="text-base font-black text-zinc-900">📮 Solicitudes de envío</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {solicitudesEnvio.map((sol) => (
                <div key={sol.id} className="bg-white border rounded-3xl p-5 space-y-3">
                  <div className="flex justify-between items-start border-b pb-2">
                    <div><h3 className="text-sm font-extrabold">{sol.nombre_completo} (@{sol.instagram})</h3><p className="text-[11px] text-zinc-400">{sol.user_email} · {sol.telefono}</p></div>
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800">{sol.estado_despacho}</span>
                  </div>
                  <p className="text-xs"><strong>Destino:</strong> {sol.ciudad} — {sol.direccion} ({sol.metodo_envio})</p>
                  <pre className="whitespace-pre-line font-sans text-[11px] bg-zinc-50 p-3 rounded-xl border">{sol.articulos_incluidos}</pre>
                  <div className="flex gap-2">
                    <input type="text" placeholder={sol.guia_rastreo || 'Guía Servientrega...'} value={guiasTemp[sol.id] ?? (sol.guia_rastreo || '')} onChange={(e) => setGuiasTemp((prev) => ({ ...prev, [sol.id]: e.target.value }))} className="border rounded-xl px-3 py-2 text-xs flex-1 bg-zinc-50" />
                    <button type="button" onClick={() => handleMarcarEnviado(sol.id)} className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold">🚚 Enviado</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
