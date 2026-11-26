
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { firebaseAuth } from '@/lib/firebaseClient';

type ShopProduct = {
  id: number | string;
  nombre_producto?: string;
  precio?: number;
  descripcion?: string | null;
  grupo?: string | null;
  integrante?: string | null;
  categoria?: string | null;
  era?: string | null;
  tipo_pc?: string | null;
  destacado?: boolean;
  badge_especial?: string | null;
  imagen_producto?: string | null;
  fotos_extra?: string[] | null;
  cantidad_disponible?: number;
  variantes?: ShopVariant[] | null;
  due_date?: string;
};

type ShopVariant = {
  nombre: string;
  precio: number;
  stock: number;
  imagen?: string | null;
};

type EditableVariant = {
  nombre: string;
  precio: string;
  stock: string;
  imagen: string;
};
type ProductForm = {
  nombre_producto: string;
  grupo: string;
  integrante: string;
  precio: string;
  cantidad_disponible: string;
  categoria: string;
  era: string;
  tipo_pc: string;
  descripcion: string;
  imagen_producto: string;
  destacado: boolean;
};

const emptyForm: ProductForm = {
  nombre_producto: '',
  grupo: '',
  integrante: '',
  precio: '0',
  cantidad_disponible: '0',
  categoria: '',
  era: '',
  tipo_pc: '',
  descripcion: '',
  imagen_producto: '',
  destacado: false,
};

export default function ShopAdmin() {
  const [items, setItems] = useState<ShopProduct[]>([]);
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('TODOS');
  const [stockFilter, setStockFilter] = useState('TODOS');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ShopProduct | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [variants, setVariants] = useState<EditableVariant[]>([]);

  const getToken = useCallback(async () => {
    await firebaseAuth.authStateReady();
    const token = await firebaseAuth.currentUser?.getIdToken();

    if (!token) {
      throw new Error('Inicia sesión con tu cuenta administradora.');
    }

    return token;
  }, []);

  const load = useCallback(async () => {
    setBusy(true);
    setError('');

    try {
      const token = await getToken();

      const response = await fetch('/api/data/tienda_productos?order=%5B%22id%22%2Cfalse%5D', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'No se pudo cargar el catálogo.');
      }

      setItems(Array.isArray(result.data) ? result.data : []);
    } catch (err: any) {
      setError(err.message || 'No se pudo cargar el catálogo.');
    } finally {
      setBusy(false);
    }
  }, [getToken]);

  useEffect(() => {
    load();
  }, [load]);

  const groups = useMemo(
    () =>
      Array.from(
        new Set(items.map((item) => item.grupo?.trim()).filter(Boolean) as string[])
      ).sort(),
    [items]
  );

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();

    return items.filter((item) => {
      const matchesSearch =
        !term ||
        [
          item.nombre_producto,
          item.grupo,
          item.integrante,
          item.era,
          item.categoria,
          item.tipo_pc,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));

      const matchesGroup =
        groupFilter === 'TODOS' || item.grupo === groupFilter;

      const stock = Number(item.cantidad_disponible || 0);

      const matchesStock =
        stockFilter === 'TODOS' ||
        (stockFilter === 'DISPONIBLE' && stock > 0) ||
        (stockFilter === 'AGOTADO' && stock <= 0);

      return matchesSearch && matchesGroup && matchesStock;
    });
  }, [items, search, groupFilter, stockFilter]);

  const totalStock = items.reduce(
    (total, item) => total + Math.max(0, Number(item.cantidad_disponible || 0)),
    0
  );

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm); setVariants([]);
    setShowForm(true);
    setError('');
    setNotice('');
  };

  const openEdit = (item: ShopProduct) => {
    setEditing(item);
    setForm({
      nombre_producto: item.nombre_producto || '',
      grupo: item.grupo || '',
      integrante: item.integrante || '',
      precio: String(item.precio ?? 0),
      cantidad_disponible: String(item.cantidad_disponible ?? 0),
      categoria: item.categoria || '',
      era: item.era || '',
      tipo_pc: item.tipo_pc || '',
      descripcion: item.descripcion || '',
      destacado: Boolean(item.destacado),
      imagen_producto: item.imagen_producto || '',
    });
    setVariants(
  (item.variantes || []).map((variant) => ({
    nombre: variant.nombre || '',
    precio: String(variant.precio ?? 0),
    stock: String(variant.stock ?? 0),
    imagen: variant.imagen || '',
  }))
);
    setShowForm(true);
    setError('');
    setNotice('');
  };

  const addVariant = () => {
  setVariants((current) => [
    ...current,
    {
      nombre: '',
      precio: '0',
      stock: '0',
      imagen: '',
    },
  ]);
};

const updateVariant = (
  index: number,
  field: keyof EditableVariant,
  value: string
) => {
  setVariants((current) =>
    current.map((variant, i) =>
      i === index ? { ...variant, [field]: value } : variant
    )
  );
};

const removeVariant = (index: number) => {
  setVariants((current) => current.filter((_, i) => i !== index));
};
  const uploadCover = async (file: File) => {
  setSaving(true);
  setError('');
  setNotice('');

  try {
    const token = await getToken();
    const data = new FormData();

    data.append('file', file);
    data.append('folder', 'shop');

    const response = await fetch('/api/media/upload', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: data,
    });

    const result = await response.json();

    if (!response.ok || !result.secure_url) {
      throw new Error(result.error || 'No se pudo subir la imagen.');
    }

    setForm((current) => ({
      ...current,
      imagen_producto: result.secure_url,
    }));

    const libraryResponse = await fetch('/api/admin/media-library', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        records: [{
          url: result.secure_url,
          publicId: result.public_id,
          fileName: file.name,
          mimeType: file.type,
        }],
        assignedTo: 'SHOP',
        productId: editing?.id || null,
        productName: form.nombre_producto,
      }),
    });

    const libraryResult = await libraryResponse.json();

    if (!libraryResponse.ok) {
      throw new Error(
        libraryResult.error || 'La imagen se subió, pero no se registró en la biblioteca.'
      );
    }

    setNotice('¡Portada subida correctamente! ♡');
  } catch (error: any) {
    setError(error.message || 'No se pudo subir la portada.');
  } finally {
    setSaving(false);
  }
};
  const uploadVariantImage = async (index: number, file: File) => {
    setSaving(true);
    setError('');
    setNotice('');

    try {
      const token = await getToken();
      const data = new FormData();

      data.append('file', file);
      data.append('folder', 'shop');

      const response = await fetch('/api/media/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: data,
      });

      const result = await response.json();

      if (!response.ok || !result.secure_url) {
        throw new Error(result.error || 'No se pudo subir la imagen.');
      }

      setVariants((current) =>
        current.map((variant, i) =>
          i === index ? { ...variant, imagen: result.secure_url } : variant
        )
      );
      setNotice('¡Foto de variante subida correctamente! ♡');
    } catch (error: any) {
      setError(error.message || 'No se pudo subir la foto de la variante.');
    } finally {
      setSaving(false);
    }
  };

  const saveProduct = async () => {
    if (!form.nombre_producto.trim()) {
      setError('Escribe el nombre del producto.');
      return;
    }

    if (!form.grupo.trim()) {
      setError('Indica el grupo del producto.');
      return;
    }

    const price = Number(form.precio);
    const stock = Number(form.cantidad_disponible);

    if (!Number.isFinite(price) || price < 0) {
      setError('El precio debe ser un número válido.');
      return;
    }

    if (!Number.isInteger(stock) || stock < 0) {
      setError('El stock debe ser un número entero igual o mayor que cero.');
      return;
    }

    for (const variant of variants) {
  const variantPrice = Number(variant.precio);
  const variantStock = Number(variant.stock);

  if (!variant.nombre.trim()) {
    setError('Todas las variantes deben tener un nombre.');
    return;
  }

  if (!Number.isFinite(variantPrice) || variantPrice < 0) {
    setError('Revisa el precio de las variantes.');
    return;
  }

  if (!Number.isInteger(variantStock) || variantStock < 0) {
    setError('El stock de cada variante debe ser un entero igual o mayor que cero.');
    return;
  }
}
    setSaving(true);
    setError('');
    setNotice('');

    try {
      const token = await getToken();

      const values = {
        nombre_producto: form.nombre_producto.trim(),
        grupo: form.grupo.trim(),
        integrante: form.integrante.trim() || null,
        precio: price,
        cantidad_disponible: stock,
        categoria: form.categoria.trim() || null,
        era: form.era.trim() || null,
        tipo_pc: form.tipo_pc.trim() || null,
        descripcion: form.descripcion.trim() || null,
        destacado: form.destacado,
        imagen_producto: form.imagen_producto.trim() || null,
variantes: variants.map((variant) => ({
  nombre: variant.nombre.trim(),
  precio: Number(variant.precio),
  stock: Number(variant.stock),
  imagen: variant.imagen.trim() || null,
})),
};

      const isEditing = Boolean(editing);

      const response = await fetch('/api/data/tienda_productos', {
        method: isEditing ? 'PATCH' : 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          isEditing
            ? {
                filters: [['id', editing!.id]],
                values,
              }
            : {
                records: [
                  {
                    ...values,
                    imagen_producto: form.imagen_producto.trim() || null,
                    fotos_extra: [],
                  },
                ],
              }
        ),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'No se pudo guardar el producto.');
      }

      if (isEditing && result.data?.count === 0) {
        throw new Error('No se encontró el producto que intentas editar.');
      }

      setShowForm(false);
      setEditing(null);
      setForm(emptyForm);
      setNotice(isEditing ? 'Producto actualizado correctamente.' : 'Producto agregado al catálogo.');
      await load();
    } catch (err: any) {
      setError(err.message || 'No se pudo guardar el producto.');
    } finally {
      setSaving(false);
    }
  };

  const deleteProduct = async (item: ShopProduct) => {
    const confirmed = window.confirm(
      `¿Eliminar "${item.nombre_producto || 'este producto'}" del catálogo de Shop? Esta acción no se puede deshacer.`
    );

    if (!confirmed) return;

    
    setSaving(true);
    setError('');
    setNotice('');

    try {
      const token = await getToken();

      const response = await fetch('/api/data/tienda_productos', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filters: [['id', item.id]],
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'No se pudo eliminar el producto.');
      }

      if (result.data?.count === 0) {
        throw new Error('No se encontró el producto para eliminar.');
      }

      setNotice('Producto eliminado del catálogo.');
      await load();
    } catch (err: any) {
      setError(err.message || 'No se pudo eliminar el producto.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#fff9fc] px-4 py-6 text-[#594653] sm:px-7 lg:px-9">
      <div className="mx-auto max-w-[1450px] space-y-6">

        <header className="flex flex-wrap items-center justify-between gap-4 rounded-[28px] border border-[#f0e3eb] bg-white p-5 shadow-sm sm:p-7">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.22em] text-[#bd83a0]">
              Hyuneatelier · administración
            </p>
            <h1 className="mt-1 text-3xl font-black">Hyuneatelier Shop 🛍️</h1>
            <p className="mt-1 text-sm text-[#93818d]">
              Gestiona tu catálogo, inventario y publicaciones de Shop.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin"
              className="rounded-xl border border-[#efdfE8] px-4 py-2.5 text-sm font-bold"
            >
              ← Dashboard
            </Link>
            <Link
              href="/shop"
              target="_blank"
              className="rounded-xl border border-[#efdfE8] px-4 py-2.5 text-sm font-bold text-[#a4567d]"
            >
              Ver tienda ↗
            </Link>
            <button
              onClick={load}
              disabled={busy || saving}
              className="rounded-xl bg-[#f8e8f0] px-4 py-2.5 text-sm font-bold text-[#a4567d] disabled:opacity-50"
            >
              ↻ Actualizar
            </button>
          </div>
        </header>

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {error}
          </div>
        )}

        {notice && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            {notice}
          </div>
        )}

        <section className="grid gap-3 sm:grid-cols-3">
          <article className="rounded-[24px] border border-[#f0e3eb] bg-white p-5">
            <p className="text-xs font-bold text-[#9a8793]">Productos en catálogo</p>
            <p className="mt-2 text-3xl font-black">{items.length}</p>
            <p className="mt-1 text-xs text-[#b08a9e]">Shop</p>
          </article>

          <article className="rounded-[24px] border border-[#f0e3eb] bg-white p-5">
            <p className="text-xs font-bold text-[#9a8793]">Unidades disponibles</p>
            <p className="mt-2 text-3xl font-black">{totalStock}</p>
            <p className="mt-1 text-xs text-[#8eaa9b]">Inventario total</p>
          </article>

          <article className="rounded-[24px] border border-[#f0e3eb] bg-white p-5">
            <p className="text-xs font-bold text-[#9a8793]">Estado de conexión</p>
            <p className="mt-2 text-xl font-black">
              {busy ? 'Cargando…' : error ? 'Revisar conexión' : 'Conectado'}
            </p>
            <p className="mt-1 text-xs text-[#8eaa9b]">Firebase</p>
          </article>
        </section>

        <section className="rounded-[28px] border border-[#f0e3eb] bg-white p-5 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#bd83a0]">
                Administración
              </p>
              <h2 className="text-2xl font-black">Tu catálogo</h2>
              <p className="mt-1 text-sm text-[#93818d]">
                Agrega productos, actualiza precios y controla el inventario.
              </p>
            </div>

            <button
              onClick={openNew}
              disabled={saving}
              className="rounded-2xl bg-[#b34c80] px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-[#9f3e70] disabled:opacity-50"
            >
              + Agregar producto
            </button>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-[1fr_220px_190px]">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por producto, grupo, integrante o era…"
              className="min-w-0 rounded-2xl border border-[#eee3eb] bg-[#fffafd] px-4 py-3 text-sm outline-none focus:border-[#c47b9d]"
            />

            <select
              value={groupFilter}
              onChange={(event) => setGroupFilter(event.target.value)}
              className="rounded-2xl border border-[#eee3eb] bg-white px-4 py-3 text-sm outline-none"
            >
              <option value="TODOS">Todos los grupos</option>
              {groups.map((group) => (
                <option key={group} value={group}>{group}</option>
              ))}
            </select>

            <select
              value={stockFilter}
              onChange={(event) => setStockFilter(event.target.value)}
              className="rounded-2xl border border-[#eee3eb] bg-white px-4 py-3 text-sm outline-none"
            >
              <option value="TODOS">Todo el inventario</option>
              <option value="DISPONIBLE">Con stock</option>
              <option value="AGOTADO">Agotados</option>
            </select>
          </div>

          <div className="mt-4 flex items-center justify-between text-xs text-[#9a8793]">
            <span>
              {filteredItems.length} de {items.length} productos
            </span>
            {busy && <span>Cargando catálogo…</span>}
          </div>

          {filteredItems.length === 0 ? (
            <div className="mt-4 rounded-2xl bg-[#faf6fa] p-8 text-center">
              <p className="text-lg font-bold">
                {busy ? 'Cargando productos…' : 'No encontramos productos'}
              </p>
              <p className="mt-1 text-sm text-[#93818d]">
                {search || groupFilter !== 'TODOS' || stockFilter !== 'TODOS'
                  ? 'Prueba cambiando los filtros.'
                  : 'Puedes agregar el primer producto con el botón de arriba.'}
              </p>
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-2xl border border-[#f1e9ef]">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-[#fcf7fa] text-xs text-[#95899f]">
                  <tr>
                    <th className="p-4">Producto</th>
                    <th className="p-4">Grupo / integrante</th>
                    <th className="p-4">Precio</th>
                    <th className="p-4">Stock</th>
                    <th className="p-4">Estado</th>
                    <th className="p-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item, index) => {
                    const stock = Number(item.cantidad_disponible || 0);

                    return (
                      <tr
                        key={item.id || index}
                        className="border-t border-[#f3edf1] hover:bg-[#fffafd]"
                      >
                        <td className="p-4">
                          <p className="font-bold">
                            {item.nombre_producto || 'Producto sin nombre'}
                          </p>
                          {item.era && (
                            <p className="mt-1 text-xs text-[#a18d99]">{item.era}</p>
                          )}
                        </td>

                        <td className="p-4">
                          <p>{item.grupo || '—'}</p>
                          <p className="mt-1 text-xs text-[#a18d99]">
                            {item.integrante || 'Grupal / todos'}
                          </p>
                        </td>

                        <td className="p-4 font-semibold">
                          ${Number(item.precio || 0).toFixed(2)}
                        </td>

                        <td className="p-4">
                          <span className={stock > 0 ? 'font-bold text-[#54856b]' : 'font-bold text-rose-500'}>
                            {stock}
                          </span>
                        </td>

                        <td className="p-4">
                          <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                            stock > 0
                              ? 'bg-[#edf7f0] text-[#54856b]'
                              : 'bg-[#fff0f1] text-[#c36b78]'
                          }`}>
                            {stock > 0 ? 'Disponible' : 'Agotado'}
                          </span>
                        </td>

                        <td className="p-4">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => openEdit(item)}
                              disabled={saving}
                              className="rounded-xl border border-[#eadce5] px-3 py-2 text-xs font-bold text-[#a4567d] hover:bg-[#fff3f8] disabled:opacity-50"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => deleteProduct(item)}
                              disabled={saving}
                              className="rounded-xl border border-[#f1dede] px-3 py-2 text-xs font-bold text-[#bb6b75] hover:bg-[#fff4f4] disabled:opacity-50"
                            >
                              Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/admin/fotos"
            className="rounded-[24px] border border-[#f0e3eb] bg-white p-5 transition hover:border-[#dfbfd0]"
          >
            <p className="text-2xl">🖼️</p>
            <h3 className="mt-2 font-black">Biblioteca de fotografías</h3>
            <p className="mt-1 text-sm text-[#93818d]">
              Abre las herramientas multimedia para subir y asignar imágenes de Shop.
            </p>
            <p className="mt-3 text-xs font-bold text-[#b16d90]">Abrir biblioteca →</p>
          </Link>

          <Link
            href="/shop"
            target="_blank"
            className="rounded-[24px] border border-[#f0e3eb] bg-white p-5 transition hover:border-[#dfbfd0]"
          >
            <p className="text-2xl">♡</p>
            <h3 className="mt-2 font-black">Vista pública de la tienda</h3>
            <p className="mt-1 text-sm text-[#93818d]">
              Comprueba cómo se ve el catálogo para tus clientes.
            </p>
            <p className="mt-3 text-xs font-bold text-[#b16d90]">Ver tienda →</p>
          </Link>
        </section>

        <p className="pb-5 text-center text-xs text-[#b49aa8]">
          Hyuneatelier Shop · catálogo independiente de Group Orders ♡
        </p>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#352532]/40 p-3 backdrop-blur-sm">
          <div className="my-auto w-full max-w-2xl rounded-[28px] border border-[#f0e3eb] bg-white p-5 shadow-2xl sm:p-7">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#bd83a0]">
                  Hyuneatelier Shop
                </p>
                <h2 className="mt-1 text-2xl font-black">
                  {editing ? 'Editar producto' : 'Agregar producto'}
                </h2>
                <p className="mt-1 text-sm text-[#93818d]">
                  Completa la información de tu publicación.
                </p>
              </div>

              <button
                onClick={() => setShowForm(false)}
                disabled={saving}
                className="rounded-full bg-[#faf2f6] px-3 py-2 text-sm font-bold"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="sm:col-span-2">
                <span className="mb-1.5 block text-xs font-bold">Nombre del producto *</span>
                <input
                  value={form.nombre_producto}
                  onChange={(e) => setForm({ ...form, nombre_producto: e.target.value })}
                  className="w-full rounded-xl border border-[#eee3eb] px-4 py-3 text-sm outline-none focus:border-[#c47b9d]"
                  placeholder="Ej. Hyunjin photocard set"
                />
              </label>

              <label>
                <span className="mb-1.5 block text-xs font-bold">Grupo *</span>
                <input
                  value={form.grupo}
                  onChange={(e) => setForm({ ...form, grupo: e.target.value })}
                  className="w-full rounded-xl border border-[#eee3eb] px-4 py-3 text-sm outline-none focus:border-[#c47b9d]"
                  placeholder="Stray Kids, Enhypen…"
                />
              </label>

              <label>
                <span className="mb-1.5 block text-xs font-bold">Integrante</span>
                <input
                  value={form.integrante}
                  onChange={(e) => setForm({ ...form, integrante: e.target.value })}
                  className="w-full rounded-xl border border-[#eee3eb] px-4 py-3 text-sm outline-none focus:border-[#c47b9d]"
                  placeholder="Hyunjin, Felix…"
                />
              </label>

              <label>
                <span className="mb-1.5 block text-xs font-bold">Precio (USD)</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.precio}
                  onChange={(e) => setForm({ ...form, precio: e.target.value })}
                  className="w-full rounded-xl border border-[#eee3eb] px-4 py-3 text-sm outline-none focus:border-[#c47b9d]"
                />
              </label>

              <label>
                <span className="mb-1.5 block text-xs font-bold">Stock disponible</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.cantidad_disponible}
                  onChange={(e) => setForm({ ...form, cantidad_disponible: e.target.value })}
                  className="w-full rounded-xl border border-[#eee3eb] px-4 py-3 text-sm outline-none focus:border-[#c47b9d]"
                />
              </label>

              <label>
                <span className="mb-1.5 block text-xs font-bold">Categoría</span>
                <input
                  value={form.categoria}
                  onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                  className="w-full rounded-xl border border-[#eee3eb] px-4 py-3 text-sm outline-none focus:border-[#c47b9d]"
                  placeholder="Photocard, álbum…"
                />
              </label>

              <label>
                <span className="mb-1.5 block text-xs font-bold">Tipo</span>
                <input
                  value={form.tipo_pc}
                  onChange={(e) => setForm({ ...form, tipo_pc: e.target.value })}
                  className="w-full rounded-xl border border-[#eee3eb] px-4 py-3 text-sm outline-none focus:border-[#c47b9d]"
                  placeholder="POB, álbum PC…"
                />
              </label>

              <label className="sm:col-span-2">
                <span className="mb-1.5 block text-xs font-bold">Era / serie</span>
                <input
                  value={form.era}
                  onChange={(e) => setForm({ ...form, era: e.target.value })}
                  className="w-full rounded-xl border border-[#eee3eb] px-4 py-3 text-sm outline-none focus:border-[#c47b9d]"
                  placeholder="Nombre de la era o colección"
                />
              </label>

              <label className="sm:col-span-2">
                <span className="mb-1.5 block text-xs font-bold">Descripción</span>
                <textarea
                  value={form.descripcion}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                  rows={3}
                  className="w-full resize-y rounded-xl border border-[#eee3eb] px-4 py-3 text-sm outline-none focus:border-[#c47b9d]"
                  placeholder="Detalles del producto…"
                />
              </label>

              <section className="sm:col-span-2 rounded-2xl border border-[#f0e3eb] bg-[#fffafd] p-4">
  <div className="flex flex-wrap items-center justify-between gap-3">
    <div>
      <h3 className="font-black text-[#594653]">Variantes del producto</h3>
      <p className="mt-1 text-xs text-[#93818d]">
        Cada variante puede tener su propio precio y stock.
      </p>
    </div>

    <button
      type="button"
      onClick={addVariant}
      className="rounded-xl bg-[#b34c80] px-4 py-2.5 text-xs font-bold text-white"
    >
      + Añadir variante
    </button>
  </div>

  {variants.length === 0 ? (
    <p className="mt-4 rounded-xl bg-[#faf2f6] p-4 text-center text-sm text-[#93818d]">
      Todavía no hay variantes. Puedes añadir la primera aquí.
    </p>
  ) : (
    <div className="mt-4 space-y-4">
      {variants.map((variant, index) => (
        <div
          key={index}
          className="rounded-xl border border-[#f0e3eb] bg-white p-4"
        >
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-black text-[#a4567d]">
              Variante {index + 1}
            </p>

            <button
              type="button"
              onClick={() => removeVariant(index)}
              className="rounded-lg bg-[#fff0f1] px-3 py-2 text-xs font-bold text-[#bb6b75]"
            >
              Eliminar
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label>
              <span className="mb-1 block text-xs font-bold">Nombre o código *</span>
              <input
                value={variant.nombre}
                onChange={(e) =>
                  updateVariant(index, 'nombre', e.target.value)
                }
                placeholder="Ej. A, B, DICON, Regular..."
                className="w-full rounded-xl border border-[#eee3eb] px-3 py-3 text-sm outline-none focus:border-[#c47b9d]"
              />
            </label>

            <label>
              <span className="mb-1 block text-xs font-bold">Precio (USD) *</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={variant.precio}
                onChange={(e) =>
                  updateVariant(index, 'precio', e.target.value)
                }
                className="w-full rounded-xl border border-[#eee3eb] px-3 py-3 text-sm outline-none focus:border-[#c47b9d]"
              />
            </label>

            <label>
              <span className="mb-1 block text-xs font-bold">Stock disponible *</span>
              <input
                type="number"
                min="0"
                step="1"
                value={variant.stock}
                onChange={(e) =>
                  updateVariant(index, 'stock', e.target.value)
                }
                className="w-full rounded-xl border border-[#eee3eb] px-3 py-3 text-sm outline-none focus:border-[#c47b9d]"
              />
            </label>

            <label>
              <span className="mb-1 block text-xs font-bold">URL de imagen (opcional)</span>
              <input
                value={variant.imagen}
                onChange={(e) =>
                  updateVariant(index, 'imagen', e.target.value)
                }
                placeholder="https://..."
                className="w-full rounded-xl border border-[#eee3eb] px-3 py-3 text-sm outline-none focus:border-[#c47b9d]"
              />
            </label>

            <div className="sm:col-span-2">
              <label className="flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-[#d9a6bf] bg-[#fff7fb] px-4 py-3 text-sm font-semibold text-[#a64d78]">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={saving}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadVariantImage(index, file);
                    e.target.value = '';
                  }}
                />
                ♡ Seleccionar foto para esta variante
              </label>

              {variant.imagen && (
                <img
                  src={variant.imagen}
                  alt={`Imagen de ${variant.nombre || `variante ${index + 1}`}`}
                  className="mt-3 max-h-40 w-auto rounded-xl object-contain"
                />
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )}
</section>
              <label className="sm:col-span-2 flex items-center gap-3 rounded-xl bg-[#fff7fa] p-3 text-sm">
                <input
                  type="checkbox"
                  checked={form.destacado}
                  onChange={(e) => setForm({ ...form, destacado: e.target.checked })}
                  className="h-4 w-4 accent-[#b34c80]"
                />
                <span className="font-semibold">Marcar como producto destacado</span>
              </label>

              <div className="sm:col-span-2">
                <span className="mb-2 block text-xs font-bold">
                  Imagen principal de la publicación
                </span>

                <input
                  type="text"
                  value={form.imagen_producto}
                  onChange={(e) =>
                    setForm({ ...form, imagen_producto: e.target.value })
                  }
                  className="w-full rounded-xl border border-[#eee3eb] px-4 py-3 text-sm"
                  placeholder="Pega aquí la URL de la imagen"
                />

                <label className="mt-3 flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-[#d9a6bf] bg-[#fff7fb] px-4 py-4 text-sm font-semibold text-[#a64d78]">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={saving}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadCover(file);
                      e.target.value = '';
                    }}
                  />
                  ♡ Seleccionar foto desde mi dispositivo
                </label>

                {form.imagen_producto && (
                  <img
                    src={form.imagen_producto}
                    alt="Vista previa de portada"
                    className="mt-3 max-h-56 w-auto rounded-xl object-contain"
                  />
                )}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                onClick={() => setShowForm(false)}
                disabled={saving}
                className="rounded-xl border border-[#eee3eb] px-5 py-3 text-sm font-bold"
              >
                Cancelar
              </button>
              <button
                onClick={saveProduct}
                disabled={saving}
                className="rounded-xl bg-[#b34c80] px-5 py-3 text-sm font-black text-white disabled:opacity-50"
              >
                {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Agregar producto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
