// @ts-nocheck
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function MovesetCloudPanel({ moves, onImport }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState(null);
  const [items, setItems] = useState([]);
  const [name, setName] = useState("Mi moveset");
  const [busy, setBusy] = useState(false);
  const [showPublic, setShowPublic] = useState(false);

  async function refresh(current = user) {
    if (!current) return;
    const { data, error } = await supabase.from("community_movesets").select("id,name,author_name,moves,created_at,is_public").eq("user_id", current.id).order("created_at", { ascending: false }).limit(30);
    if (error) throw error;
    setItems(data || []);
  }

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(async ({ data }) => {
      if (!active) return;
      setUser(data.user || null);
      if (data.user) { try { await refresh(data.user); } catch (e) { console.error(e); } }
    }).catch(() => {});
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const next = session?.user || null;
      setUser(next);
      if (next) setTimeout(() => refresh(next).catch((e) => console.error(e)), 0);
      else setItems([]);
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);

  async function authenticate(signUp) {
    if (!email.trim() || password.length < 8) { toast.error("Introduce email y contraseña (mínimo 8 caracteres)"); return; }
    setBusy(true);
    try {
      const result = signUp ? await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: new URL("/", window.location.origin).toString() } }) : await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (result.error) throw result.error;
      if (signUp && !result.data.session) toast.success("Revisa tu correo para confirmar la cuenta.");
      else toast.success(signUp ? "Cuenta creada" : "Sesión iniciada");
    } catch (e) { toast.error(e.message || "No se pudo iniciar sesión"); }
    finally { setBusy(false); }
  }

  async function save(publicMode) {
    if (!user) { toast.error("Inicia sesión para guardar movesets"); return; }
    if (!name.trim()) { toast.error("Ponle un nombre al moveset"); return; }
    setBusy(true);
    try {
      const cleanMoves = JSON.parse(JSON.stringify(moves));
      const { error } = await supabase.from("community_movesets").insert({ user_id: user.id, name: name.trim().slice(0, 40), author_name: (user.user_metadata?.display_name || user.email?.split("@")[0] || "Jugador").slice(0, 24), moves: cleanMoves, is_public: publicMode });
      if (error) throw error;
      toast.success(publicMode ? "Moveset publicado en la comunidad" : "Moveset guardado en tu cuenta");
      await refresh(user);
    } catch (e) { toast.error(e.message || "No se pudo guardar. Comprueba que la tabla de movesets esté instalada."); }
    finally { setBusy(false); }
  }

  async function browsePublic() {
    setBusy(true);
    try {
      const { data, error } = await supabase.from("community_movesets").select("id,name,author_name,moves,created_at").eq("is_public", true).order("created_at", { ascending: false }).limit(40);
      if (error) throw error;
      setItems(data || []); setShowPublic(true);
    } catch (e) { toast.error(e.message || "No se pudo cargar la biblioteca pública"); }
    finally { setBusy(false); }
  }

  async function loadMine() {
    setShowPublic(false); setBusy(true);
    try { await refresh(user); } catch (e) { toast.error(e.message || "No se pudieron cargar tus movesets"); }
    finally { setBusy(false); }
  }

  async function remove(id) {
    if (!user) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("community_movesets").delete().eq("id", id).eq("user_id", user.id);
      if (error) throw error;
      await refresh(user); toast.success("Moveset eliminado");
    } catch (e) { toast.error(e.message || "No se pudo eliminar"); }
    finally { setBusy(false); }
  }

  return <section className="mt-4 rounded-xl border border-cyan-300/20 bg-gradient-to-br from-cyan-300/[0.08] to-violet-400/[0.05] p-3">
    <div className="mb-2 flex items-center justify-between gap-2"><div><h3 className="text-sm font-black text-cyan-100">Moveset Cloud</h3><p className="text-[11px] text-white/45">Guarda, comparte e importa configuraciones.</p></div><span className="text-[10px] text-cyan-200/70">CLOUD</span></div>
    {!user ? <div className="flex flex-col gap-2">
      <input value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="Tu correo" className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none focus:border-cyan-300/50" />
      <input value={password} onChange={e=>setPassword(e.target.value)} type="password" placeholder="Contraseña (mín. 8 caracteres)" className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none focus:border-cyan-300/50" />
      <div className="flex flex-wrap gap-2"><button disabled={busy} onClick={()=>authenticate(false)} className="rounded-lg bg-cyan-300 px-3 py-2 text-xs font-bold text-slate-950 disabled:opacity-50">Iniciar sesión</button><button disabled={busy} onClick={()=>authenticate(true)} className="rounded-lg border border-white/20 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Crear cuenta</button></div>
      <p className="text-[10px] text-white/40">La cuenta sirve para sincronizar tus movesets entre dispositivos.</p>
    </div> : <>
      <div className="mb-2 flex items-center justify-between gap-2"><span className="truncate text-xs text-emerald-200">Conectado: {user.email}</span><button onClick={()=>supabase.auth.signOut()} className="text-[10px] text-white/50 underline">Cerrar sesión</button></div>
      <input value={name} onChange={e=>setName(e.target.value)} maxLength={40} placeholder="Nombre del moveset" className="mb-2 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none focus:border-cyan-300/50" />
      <div className="flex flex-wrap gap-2"><button disabled={busy} onClick={()=>save(false)} className="rounded-lg bg-cyan-300 px-3 py-2 text-xs font-bold text-slate-950 disabled:opacity-50">Guardar en mi cuenta</button><button disabled={busy} onClick={()=>save(true)} className="rounded-lg border border-violet-300/40 bg-violet-300/10 px-3 py-2 text-xs font-bold text-violet-100 disabled:opacity-50">Publicar en la nube</button></div>
      <div className="mt-3 flex gap-2"><button disabled={busy} onClick={loadMine} className={`rounded-md px-2 py-1 text-[10px] ${!showPublic ? "bg-white/15 text-white" : "text-white/50"}`}>Mis movesets</button><button disabled={busy} onClick={browsePublic} className={`rounded-md px-2 py-1 text-[10px] ${showPublic ? "bg-white/15 text-white" : "text-white/50"}`}>Biblioteca pública</button></div>
      <div className="mt-2 flex flex-col gap-1.5">{items.map(item=><div key={item.id} className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 p-2"><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-white">{item.name}</p><p className="text-[10px] text-white/40">por {item.author_name || "Jugador"} · {item.is_public ? "Público" : "Privado"}</p></div><button onClick={()=>onImport(item.moves)} className="rounded-md bg-emerald-300/15 px-2 py-1.5 text-[10px] font-bold text-emerald-100">Usar</button>{!showPublic && <button onClick={()=>remove(item.id)} className="px-1 text-[10px] text-red-300">✕</button>}</div>)}{!items.length && <p className="py-2 text-[11px] text-white/35">{showPublic ? "Aún no hay movesets públicos." : "Todavía no guardaste movesets."}</p>}</div>
    </>}
  </section>;
}
