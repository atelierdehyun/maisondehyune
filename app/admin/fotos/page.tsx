'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { firebaseAuth } from '@/lib/firebaseClient';
type Row = Record<string, any>;
const field = 'w-full rounded-2xl border border-[#ead9e3] bg-white px-3 py-3 text-sm outline-none focus:border-[#d779a5]';
const btn = 'rounded-2xl px-4 py-3 text-sm font-bold disabled:opacity-50';
export default function AdminFotos() {
  const [files, setFiles] = useState<File[]>([]);
  const [scope, setScope] = useState<'SHOP' | 'GO' | 'GO_COVER'>('SHOP');
  const [products, setProducts] = useState<Row[]>([]);
  const [productId, setProductId] = useState('');
  const [mode, setMode] = useState<'cover' | 'gallery'>('cover');
  const [library, setLibrary] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const getToken = useCallback(async () => { await firebaseAuth.authStateReady(); const token = await firebaseAuth.currentUser?.getIdToken(); if (!token) throw new Error('Inicia sesión con tu cuenta administradora.'); return token; }, []);
  const load = useCallback(async () => {
    try {
      const token = await getToken();
      const [shopRes, goRes, gosRes, libRes] = await Promise.all([
        fetch('/api/data/tienda_productos', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }),
        fetch('/api/data/productos', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }),
        fetch('/api/data/gos', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }),
        fetch('/api/admin/media-library', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }),
      ]);
      const [shop, go, gos, lib] = await Promise.all([shopRes.json(), goRes.json(), gosRes.json(), libRes.json()]);
      if (!shopRes.ok || !goRes.ok || !gosRes.ok || !libRes.ok) throw new Error('No se pudo cargar el catálogo o la biblioteca.');
      setProducts([...(scope === 'SHOP' ? shop.data || [] : scope === 'GO_COVER' ? gos.data || [] : go.data || [])]);
      setLibrary(lib.data || []);
    } catch (error: any) { setMessage(error.message || 'Error al cargar.'); }
  }, [getToken, scope]);
  useEffect(() => { load(); }, [load]);
  const selected = products.find((item) => String(item.id) === productId);
  const upload = async () => {
    if (!files.length || !productId) { setMessage('Selecciona fotos y un producto de destino.'); return; }
    if (files.length > 20) { setMessage('Puedes subir hasta 20 fotos por tanda.'); return; }
    if (scope === 'GO_COVER' && files.length > 1) { setMessage('La portada de cada GO es una sola imagen. Selecciona una foto para esta publicación.'); return; }
    setBusy(true); setMessage('');
    try {
      const token = await getToken();
      const uploaded: Row[] = [];
      for (const file of files) {
        const form = new FormData(); form.append('file', file); form.append('folder', scope === 'SHOP' ? 'shop' : scope === 'GO_COVER' ? 'gos' : 'productos');
        const response = await fetch('/api/media/upload', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form });
        const result = await response.json();
        if (!response.ok) throw new Error(`${file.name}: ${result.error || 'No se pudo subir.'}`);
        uploaded.push({ url: result.secure_url, publicId: result.public_id, fileName: file.name, mimeType: file.type });
      }
      const collection = scope === 'SHOP' ? 'tienda_productos' : scope === 'GO_COVER' ? 'gos' : 'productos';
      const values: Row = {};
      if (mode === 'cover' || scope === 'GO_COVER') values[scope === 'GO_COVER' ? 'imagen_general' : 'imagen_producto'] = uploaded[0].url;
      const extra = scope === 'GO_COVER' ? [] : mode === 'gallery' ? uploaded.map((item) => item.url) : uploaded.slice(1).map((item) => item.url);
      if (extra.length) {
        const current = Array.isArray(selected?.fotos_extra) ? selected.fotos_extra : typeof selected?.fotos_extra === 'string' ? (() => { try { return JSON.parse(selected.fotos_extra); } catch { return []; } })() : [];
        values.fotos_extra = [...current, ...extra];
      }
      const updateResponse = await fetch(`/api/data/${collection}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ filters: [['id', productId]], values }) });
      const updateResult = await updateResponse.json();
      if (!updateResponse.ok) throw new Error(updateResult.error || 'Las fotos se subieron, pero no se pudieron asignar al producto.');
      const libraryResponse = await fetch('/api/admin/media-library', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ records: uploaded, assignedTo: scope, productId, productName: selected?.nombre_producto || selected?.title || '' }) });
      const libraryResult = await libraryResponse.json();
      if (!libraryResponse.ok) throw new Error(libraryResult.error || 'Las fotos se asignaron, pero no se pudieron registrar en la biblioteca.');
      setFiles([]); setMessage(`${uploaded.length} foto(s) subidas y asignadas correctamente ♡`); await load();
    } catch (error: any) { setMessage(error.message || 'Error al subir las fotos.'); }
    finally { setBusy(false); }
  };
  return <main className="min-h-screen bg-[#fff9fc] px-4 py-6 text-[#594653] sm:px-8"><div className="mx-auto max-w-5xl space-y-5">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-[#c17b9d]">Hyuneatelier · biblioteca multimedia</p><h1 className="text-3xl font-black">Tus fotografías ♡</h1><p className="mt-1 text-sm text-[#987f8e]">Selecciona varias fotos de tu teléfono y asígnalas a una publicación.</p></div><Link href="/admin" className={`${btn} border border-[#ead9e3] bg-white`}>← Panel</Link></header>
    <section className="rounded-3xl bg-white p-5 shadow-sm space-y-4"><div className="flex flex-wrap gap-2"><button type="button" onClick={() => { setScope('SHOP'); setProductId(''); }} className={`${btn} ${scope === 'SHOP' ? 'bg-[#d779a5] text-white' : 'bg-[#fff2f7] text-[#a34f79]'}`}>Shop</button><button type="button" onClick={() => { setScope('GO'); setProductId(''); }} className={`${btn} ${scope === 'GO' ? 'bg-[#d779a5] text-white' : 'bg-[#fff2f7] text-[#a34f79]'}`}>Productos GO</button><button type="button" onClick={() => { setScope('GO_COVER'); setProductId(''); setMode('cover'); }} className={`${btn} ${scope === 'GO_COVER' ? 'bg-[#d779a5] text-white' : 'bg-[#fff2f7] text-[#a34f79]'}`}>Portadas GO</button></div>
      <div><label className="mb-1 block text-xs font-bold text-[#886b7c]">1. Producto al que quieres asignar las fotos</label><select className={field} value={productId} onChange={(e) => setProductId(e.target.value)}><option value="">Selecciona un producto…</option>{products.map((item) => <option key={item.id} value={item.id}>{item.nombre_producto || item.title || `Producto ${item.id}`}</option>)}</select></div>
      <div><label className="mb-1 block text-xs font-bold text-[#886b7c]">2. ¿Cómo quieres usarlas?</label><select className={field} value={mode} onChange={(e) => setMode(e.target.value as any)}><option value="cover">Primera foto como portada; las demás como galería</option><option value="gallery" disabled={scope === 'GO_COVER'}>Todas como fotos adicionales</option></select></div>
      <div><label className="mb-1 block text-xs font-bold text-[#886b7c]">3. Selecciona hasta 20 fotos</label><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple onChange={(e) => setFiles(Array.from(e.target.files || []))} className="block w-full rounded-2xl border border-dashed border-[#e8cbd9] bg-[#fffafd] p-4 text-sm"/><p className="mt-1 text-xs text-[#987f8e]">No necesitas renombrarlas. Puedes elegirlas directamente de tu galería.</p></div>
      {files.length > 0 && <div className="rounded-2xl bg-[#fff2f7] p-3 text-xs">{files.length} archivo(s) seleccionados · {files.map((file) => file.name).join(' · ')}</div>}
      {(selected?.imagen_producto || selected?.imagen_general) && <div className="flex items-center gap-3 rounded-2xl border border-[#f3e5ec] p-3"><img src={selected.imagen_producto || selected.imagen_general} alt="Portada actual" className="h-16 w-16 rounded-xl object-cover"/><div><p className="text-xs font-bold">Portada actual</p><p className="text-xs text-[#987f8e]">{selected.nombre_producto}</p></div></div>}
      <button type="button" disabled={busy || !files.length || !productId} onClick={upload} className={`${btn} w-full bg-[#d779a5] text-white`}>{busy ? 'Subiendo y asignando…' : `Subir y asignar ${files.length || ''} foto(s)`}</button>
      {message && <p role="status" className="rounded-2xl bg-[#fff2f7] p-3 text-sm">{message}</p>}
    </section>
    <section className="rounded-3xl bg-white p-5 shadow-sm"><div className="mb-3 flex items-center justify-between"><h2 className="font-black">Biblioteca reciente</h2><span className="text-xs text-[#987f8e]">{library.length} fotos</span></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{library.slice(0, 32).map((item) => <article key={item.id} className="overflow-hidden rounded-2xl border border-[#f3e5ec]"><img src={item.url} alt={item.file_name || ''} className="aspect-square w-full object-cover"/><p className="truncate px-2 pt-2 text-[10px] text-[#987f8e]">{item.file_name}</p><p className="truncate px-2 pb-2 text-[9px] font-bold text-[#b17b96]">{item.assigned_to || 'Sin asignar'} · {item.assigned_product_name || '—'}</p></article>)}</div></section>
  </div></main>;
}
