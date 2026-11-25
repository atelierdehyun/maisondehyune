'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { firebaseAuth } from '@/lib/firebaseClient';

type Row = Record<string, any>;
type Go = { id: number; title: string; group_name: string; status?: string; imagen_general?: string | null; fecha_cierre?: string | null; descripcion?: string | null };
type Product = { id: number; go_id: number; nombre_producto: string; precio: number; cantidad_disponible?: number; lista_slots?: string; imagen_producto?: string | null; descripcion?: string | null };

const field = 'w-full rounded-2xl border border-[#ead9e3] bg-white px-3.5 py-3 text-sm text-[#594653] outline-none transition focus:border-[#d779a5] focus:ring-2 focus:ring-[#f8e6ef]';
const label = 'mb-1.5 block text-xs font-bold text-[#886b7c]';
const button = 'rounded-2xl px-4 py-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50';

export default function AdminGosPage() {
  const [gos, setGos] = useState<Go[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedGo, setSelectedGo] = useState<number | 'all'>('all');
  const [search, setSearch] = useState('');
  const [goForm, setGoForm] = useState({ title: '', group_name: 'stray kids', imagen_general: '', descripcion: '', fecha_cierre: '' });
  const [productForm, setProductForm] = useState({ go_id: '', nombre_producto: '', precio: '', cantidad_disponible: '1', lista_slots: '', imagen_producto: '', descripcion: '' });

  const token = useCallback(async () => {
    await firebaseAuth.authStateReady();
    const current = firebaseAuth.currentUser;
    if (!current) throw new Error('Tu sesión no está iniciada. Entra al panel de administración y vuelve a intentarlo.');
    return current.getIdToken();
  }, []);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const idToken = await token();
      const headers = { Authorization: `Bearer ${idToken}` };
      const [g, p] = await Promise.all([
        fetch('/api/data/gos', { headers, cache: 'no-store' }),
        fetch('/api/data/productos', { headers, cache: 'no-store' }),
      ]);
      const gj = await g.json(); const pj = await p.json();
      if (!g.ok) throw new Error(gj.error || 'No se pudieron cargar los GOs.');
      if (!p.ok) throw new Error(pj.error || 'No se pudieron cargar los productos.');
      setGos(gj.data || []); setProducts(pj.data || []); setMessage('');
    } catch (error: any) { setMessage(error?.message || 'No se pudieron cargar los datos.'); }
    finally { setBusy(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  async function upload(file?: File, kind: 'gos' | 'productos' = 'gos') {
    if (!file) return '';
    if (!file.type.startsWith('image/')) throw new Error('Selecciona un archivo de imagen.');
    if (file.size > 10 * 1024 * 1024) throw new Error('La imagen supera 10 MB.');
    setUploading(true);
    try {
      const idToken = await token();
      const body = new FormData(); body.append('file', file); body.append('folder', kind);
      const response = await fetch('/api/media/upload', { method: 'POST', headers: { Authorization: `Bearer ${idToken}` }, body });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'No se pudo subir la imagen.');
      return result.secure_url as string;
    } finally { setUploading(false); }
  }

  async function createGo(event: React.FormEvent) {
    event.preventDefault();
    if (!goForm.title.trim()) return setMessage('Escribe el nombre del GO.');
    setSaving(true); setMessage('');
    try {
      const idToken = await token();
      const response = await fetch('/api/data/gos', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` }, body: JSON.stringify({ records: [{ title: goForm.title.trim().toUpperCase(), group_name: goForm.group_name.trim().toLowerCase(), status: 'OPEN', imagen_general: goForm.imagen_general || null, descripcion: goForm.descripcion || null, fecha_cierre: goForm.fecha_cierre || null }] }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || 'No se pudo crear el GO.');
      setGoForm({ title: '', group_name: 'stray kids', imagen_general: '', descripcion: '', fecha_cierre: '' });
      setMessage('¡GO creado correctamente! ♡'); await load();
    } catch (error: any) { setMessage(error?.message || 'No se pudo crear el GO.'); }
    finally { setSaving(false); }
  }

  async function createProduct(event: React.FormEvent) {
    event.preventDefault();
    if (!productForm.go_id || !productForm.nombre_producto.trim() || !productForm.precio || !productForm.lista_slots.trim()) return setMessage('Completa GO, nombre, precio y slots.');
    setSaving(true); setMessage('');
    try {
      const idToken = await token();
      const slots = productForm.lista_slots.split(',').map(s => s.trim()).filter(Boolean);
      const stock = Object.fromEntries(slots.map(slot => [slot, Math.max(0, Number(productForm.cantidad_disponible) || 0)]));
      const response = await fetch('/api/data/productos', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` }, body: JSON.stringify({ records: [{ go_id: Number(productForm.go_id), nombre_producto: productForm.nombre_producto.trim().toUpperCase(), precio: Number(productForm.precio), cantidad_disponible: Number(productForm.cantidad_disponible) || 0, lista_slots: slots.join(', '), stock_slots: stock, imagen_producto: productForm.imagen_producto || null, descripcion: productForm.descripcion || null }] }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || 'No se pudo crear el producto.');
      setProductForm({ go_id: productForm.go_id, nombre_producto: '', precio: '', cantidad_disponible: '1', lista_slots: '', imagen_producto: '', descripcion: '' });
      setMessage('¡Artículo añadido al GO! ♡'); await load();
    } catch (error: any) { setMessage(error?.message || 'No se pudo crear el artículo.'); }
    finally { setSaving(false); }
  }

  async function updateGo(id: number, values: Row) {
    setSaving(true); setMessage('');
    try {
      const idToken = await token();
      const response = await fetch('/api/data/gos', { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` }, body: JSON.stringify({ filters: [['id', id]], values }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || 'No se pudo actualizar.');
      await load(); setMessage('GO actualizado.');
    } catch (error: any) { setMessage(error?.message || 'No se pudo actualizar.'); }
    finally { setSaving(false); }
  }

  const visibleGos = useMemo(() => gos.filter(go => (selectedGo === 'all' || go.id === selectedGo) && `${go.title} ${go.group_name}`.toLowerCase().includes(search.toLowerCase())), [gos, selectedGo, search]);

  return <main className="min-h-screen bg-[#fff9fc] px-4 py-6 text-[#594653] sm:px-8"><div className="mx-auto max-w-6xl space-y-6">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-extrabold uppercase tracking-[.22em] text-[#bd7899]">Hyuneatelier · workspace</p><h1 className="mt-1 text-3xl font-black">Gestión de GOs ♡</h1><p className="mt-1 text-sm text-[#987f8e]">Crea Group Orders, añade artículos y administra su estado.</p></div><div className="flex gap-2"><Link href="/admin" className={`${button} border border-[#ead9e3] bg-white text-[#916b80]`}>← Panel</Link><button onClick={load} className={`${button} bg-[#f8e6ef] text-[#a34f79]`}>↻ Actualizar</button></div></header>
    {message && <div role="status" className="rounded-2xl border border-[#f0dce6] bg-white px-4 py-3 text-sm">{message}</div>}
    <section className="grid gap-3 sm:grid-cols-3"><article className="rounded-3xl border border-[#f0e2eb] bg-white p-5"><p className="text-xs font-semibold text-[#987f8e]">GOs registrados</p><p className="mt-2 text-3xl font-black">{gos.length}</p></article><article className="rounded-3xl border border-[#f0e2eb] bg-white p-5"><p className="text-xs font-semibold text-[#987f8e]">Artículos GO</p><p className="mt-2 text-3xl font-black">{products.length}</p></article><article className="rounded-3xl border border-[#f0e2eb] bg-white p-5"><p className="text-xs font-semibold text-[#987f8e]">Abiertos</p><p className="mt-2 text-3xl font-black">{gos.filter(g => String(g.status || 'OPEN').toUpperCase() === 'OPEN').length}</p></article></section>
    <div className="grid items-start gap-5 lg:grid-cols-2">
      <form onSubmit={createGo} className="rounded-3xl border border-[#f0e2eb] bg-white p-5 shadow-sm"><div className="mb-4"><p className="text-[10px] font-extrabold uppercase tracking-[.2em] text-[#bd7899]">01 · nuevo group order</p><h2 className="mt-1 text-xl font-black">Crear un GO</h2></div>
        <label className={label}>Nombre del GO *</label><input className={`${field} mb-3`} value={goForm.title} onChange={e=>setGoForm({...goForm,title:e.target.value})} placeholder="Ej. SKZ 6TH FANMEETING MD" required />
        <label className={label}>Grupo</label><select className={`${field} mb-3`} value={goForm.group_name} onChange={e=>setGoForm({...goForm,group_name:e.target.value})}>{['stray kids','enhypen','txt','seventeen','ateez','aespa','blackpink','twice','otros'].map(x=><option key={x} value={x}>{x.toUpperCase()}</option>)}</select>
        <label className={label}>Portada (opcional)</label><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className={`${field} mb-2`} disabled={uploading} onChange={async e=>{try{const url=await upload(e.target.files?.[0],'gos');if(url)setGoForm(v=>({...v,imagen_general:url}));}catch(err:any){setMessage(err.message||'Error al subir portada');}finally{e.currentTarget.value='';}}}/>
        {goForm.imagen_general&&<div className="mb-3 flex items-center gap-3"><img src={goForm.imagen_general} alt="Portada del GO" className="h-16 w-16 rounded-xl object-cover"/><button type="button" onClick={()=>setGoForm(v=>({...v,imagen_general:''}))} className="text-xs font-bold text-rose-500">Quitar portada</button></div>}
        <label className={label}>Fecha de cierre (opcional)</label><input type="date" className={`${field} mb-3`} value={goForm.fecha_cierre} onChange={e=>setGoForm({...goForm,fecha_cierre:e.target.value})}/>
        <label className={label}>Descripción (opcional)</label><textarea rows={3} className={`${field} mb-4`} value={goForm.descripcion} onChange={e=>setGoForm({...goForm,descripcion:e.target.value})} placeholder="Información breve para los joiners..."/>
        <button disabled={saving||uploading} className={`${button} w-full bg-[#d779a5] text-white`}>{saving?'Guardando...':'＋ Crear GO'}</button>
      </form>
      <form onSubmit={createProduct} className="rounded-3xl border border-[#f0e2eb] bg-white p-5 shadow-sm"><div className="mb-4"><p className="text-[10px] font-extrabold uppercase tracking-[.2em] text-[#bd7899]">02 · artículos</p><h2 className="mt-1 text-xl font-black">Añadir producto a un GO</h2></div>
        <label className={label}>GO al que pertenece *</label><select required className={`${field} mb-3`} value={productForm.go_id} onChange={e=>setProductForm({...productForm,go_id:e.target.value})}><option value="">Selecciona un GO</option>{gos.map(g=><option key={g.id} value={g.id}>{g.title}</option>)}</select>
        <label className={label}>Nombre del artículo *</label><input required className={`${field} mb-3`} value={productForm.nombre_producto} onChange={e=>setProductForm({...productForm,nombre_producto:e.target.value})} placeholder="Ej. ALBUM / PHOTOCARD SET"/>
        <div className="mb-3 grid grid-cols-2 gap-3"><div><label className={label}>Precio USD *</label><input required min="0" step="0.01" type="number" className={field} value={productForm.precio} onChange={e=>setProductForm({...productForm,precio:e.target.value})} placeholder="15.00"/></div><div><label className={label}>Stock por slot</label><input min="0" type="number" className={field} value={productForm.cantidad_disponible} onChange={e=>setProductForm({...productForm,cantidad_disponible:e.target.value})}/></div></div>
        <label className={label}>Slots / integrantes separados por coma *</label><input required className={`${field} mb-3`} value={productForm.lista_slots} onChange={e=>setProductForm({...productForm,lista_slots:e.target.value})} placeholder="OT8, Bang Chan, Lee Know..."/>
        <label className={label}>Imagen del artículo (opcional)</label><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className={`${field} mb-2`} disabled={uploading} onChange={async e=>{try{const url=await upload(e.target.files?.[0],'productos');if(url)setProductForm(v=>({...v,imagen_producto:url}));}catch(err:any){setMessage(err.message||'Error al subir imagen');}finally{e.currentTarget.value='';}}}/>
        {productForm.imagen_producto&&<div className="mb-3 flex items-center gap-3"><img src={productForm.imagen_producto} alt="Imagen del artículo" className="h-14 w-14 rounded-xl object-cover"/><button type="button" onClick={()=>setProductForm(v=>({...v,imagen_producto:''}))} className="text-xs font-bold text-rose-500">Quitar imagen</button></div>}
        <label className={label}>Descripción (opcional)</label><textarea rows={2} className={`${field} mb-4`} value={productForm.descripcion} onChange={e=>setProductForm({...productForm,descripcion:e.target.value})}/>
        <button disabled={saving||uploading||gos.length===0} className={`${button} w-full bg-[#d779a5] text-white`}>{saving?'Guardando...':'＋ Añadir artículo'}</button>
      </form>
    </div>
    <section className="rounded-3xl border border-[#f0e2eb] bg-white p-5 shadow-sm"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] font-extrabold uppercase tracking-[.2em] text-[#bd7899]">03 · catálogo</p><h2 className="mt-1 text-xl font-black">Tus Group Orders</h2></div><div className="flex flex-wrap gap-2"><input className="rounded-xl border border-[#ead9e3] px-3 py-2 text-sm" placeholder="Buscar GO..." value={search} onChange={e=>setSearch(e.target.value)}/><select className="rounded-xl border border-[#ead9e3] px-3 py-2 text-sm" value={selectedGo} onChange={e=>setSelectedGo(e.target.value==='all'?'all':Number(e.target.value))}><option value="all">Todos</option>{gos.map(g=><option key={g.id} value={g.id}>{g.title}</option>)}</select></div></div>
      {busy?<p className="py-8 text-center text-sm text-[#987f8e]">Cargando GOs...</p>:visibleGos.length===0?<p className="rounded-2xl bg-[#fff7fb] p-6 text-center text-sm text-[#987f8e]">No hay GOs que coincidan con la búsqueda.</p>:<div className="grid gap-3 md:grid-cols-2">{visibleGos.map(go=><article key={go.id} className="overflow-hidden rounded-2xl border border-[#f0e2eb] bg-[#fffafd]">{go.imagen_general&&<img src={go.imagen_general} alt={go.title} className="h-36 w-full object-cover"/>}<div className="p-4"><div className="flex items-start justify-between gap-2"><div><p className="text-[10px] font-bold uppercase tracking-wider text-[#bd7899]">{go.group_name}</p><h3 className="mt-1 font-black">{go.title}</h3><p className="mt-1 text-xs text-[#987f8e]">{products.filter(p=>Number(p.go_id)===Number(go.id)).length} artículos · ID {go.id}</p></div><span className={`rounded-full px-3 py-1 text-[10px] font-extrabold ${String(go.status||'OPEN').toUpperCase()==='OPEN'?'bg-emerald-50 text-emerald-700':'bg-rose-50 text-rose-600'}`}>{go.status||'OPEN'}</span></div><div className="mt-3 flex flex-wrap gap-2"><button disabled={saving} onClick={()=>updateGo(go.id,{status:String(go.status||'OPEN').toUpperCase()==='OPEN'?'CLOSED':'OPEN'})} className="rounded-xl border border-[#ead9e3] bg-white px-3 py-2 text-xs font-bold text-[#916b80]">{String(go.status||'OPEN').toUpperCase()==='OPEN'?'Cerrar GO':'Abrir GO'}</button><Link href="/admin/fotos" className="rounded-xl bg-[#f8e6ef] px-3 py-2 text-xs font-bold text-[#a34f79]">Gestionar fotos</Link><Link href={`/gos`} className="rounded-xl border border-[#ead9e3] bg-white px-3 py-2 text-xs font-bold text-[#916b80]">Ver catálogo ↗</Link></div><div className="mt-3 space-y-2">{products.filter(p=>Number(p.go_id)===Number(go.id)).map(p=><div key={p.id} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 text-xs"><span className="min-w-0 truncate font-semibold">{p.nombre_producto}</span><span className="shrink-0 text-[#987f8e]">${Number(p.precio||0).toFixed(2)}</span></div>)}</div></div></article>)}</div>}
    </section>
    <p className="pb-6 text-center text-xs text-[#b49aa8]">Hyuneatelier · gestión privada de Group Orders ♡</p>
  </div></main>;
}

