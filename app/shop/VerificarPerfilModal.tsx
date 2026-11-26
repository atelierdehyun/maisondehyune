'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

export default function VerificarPerfilModal() {
  const [mostrarMuro, setMostrarMuro] = useState(false);
  const [email, setEmail] = useState('');
  const [nombre, setNombre] = useState('');
  const [instagram, setInstagram] = useState('');
  const [telefono, setTelefono] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    async function revisarPerfil() {
      const { data: { session } } = await supabase.auth.getSession();
      const mail = session?.user?.email?.toLowerCase().trim() || '';
      if (!mail || mail === 'liahwang1852@gmail.com') return;

      setEmail(mail);
      const { data: perfil } = await supabase
        .from('perfiles_joiners')
        .select('*')
        .eq('user_email', mail)
        .maybeSingle();

      if (!perfil?.nombre_completo || !perfil?.usuario_red || !perfil?.telefono) {
        setNombre(perfil?.nombre_completo || '');
        setInstagram((perfil?.usuario_red || '').replace('@', ''));
        setTelefono(perfil?.telefono || '');
        setMostrarMuro(true);
      }
    }
    revisarPerfil();
  }, []);

  async function handleCompletarDatos(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim() || !instagram.trim() || !telefono.trim()) {
      return alert('Por favor completa los 3 datos obligatorios para continuar 🎀');
    }
    setGuardando(true);
    const igLimpio = '@' + instagram.replace('@', '').trim();
    const { error } = await supabase.from('perfiles_joiners').upsert({
      user_email: email,
      nombre_completo: nombre.trim(),
      usuario_red: igLimpio,
      telefono: telefono.trim(),
    });
    setGuardando(false);
    if (!error) {
      setMostrarMuro(false);
    } else {
      alert('Error: ' + error.message);
    }
  }

  if (!mostrarMuro) return null;

  return (
    <div className="fixed inset-0 bg-zinc-950/75 backdrop-blur-sm flex items-center justify-center p-4 z-[999]">
      <form
        onSubmit={handleCompletarDatos}
        className="bg-white border-2 border-pink-300 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl"
      >
        <div className="text-center space-y-1">
          <span className="text-[10px] font-black uppercase bg-pink-100 text-pink-700 px-3 py-1 rounded-full">
            🎀 Verificación de Joiner
          </span>
          <h2 className="text-lg font-black text-zinc-900 pt-1">Completa tus datos de contacto</h2>
          <p className="text-xs text-zinc-500">
            Para participar en Group Orders y comprar en Hyune Atelier necesitamos tu contacto real por seguridad.
          </p>
        </div>

        <div className="space-y-2.5 text-left">
          <div>
            <label className="text-[11px] font-bold text-zinc-600 block mb-1">Nombre y Apellido *</label>
            <input
              type="text"
              required
              placeholder="Ej: Camila López"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full border border-zinc-200 rounded-xl px-3.5 py-2.5 text-xs bg-zinc-50"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-zinc-600 block mb-1">Usuario de Instagram (sin @) *</label>
            <input
              type="text"
              required
              placeholder="Ej: cami_skz"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              className="w-full border border-zinc-200 rounded-xl px-3.5 py-2.5 text-xs bg-zinc-50 font-bold text-pink-600"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-zinc-600 block mb-1">Número de WhatsApp / Teléfono *</label>
            <input
              type="tel"
              required
              placeholder="Ej: 0991234567"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className="w-full border border-zinc-200 rounded-xl px-3.5 py-2.5 text-xs bg-zinc-50 font-bold"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={guardando}
          className="w-full py-3.5 bg-pink-600 hover:bg-pink-700 text-white font-black text-xs uppercase rounded-2xl shadow-sm transition-all"
        >
          {guardando ? 'Guardando...' : '✨ Guardar mis datos y entrar'}
        </button>
      </form>
    </div>
  );
}
