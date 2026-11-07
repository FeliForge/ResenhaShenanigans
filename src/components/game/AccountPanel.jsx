// @ts-nocheck
import { useEffect, useState } from "react";
import { BadgeCheck, UserRound, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

function getAuthRedirectUrl() {
  // Always return to the origin currently serving the app; never hard-code localhost.
  return new URL("/", window.location.origin).toString();
}

export default function AccountPanel({ onClose }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState("login");
  // The exclusive badge is tied to this exact, email-confirmed account.
  const isOwnerVerified = String(user?.email || "").toLowerCase() === "felipejerezgatti@gmail.com" && Boolean(user?.email_confirmed_at);

  async function loadProfile(currentUser) {
    if (!currentUser) { setProfile(null); return; }
    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, username, is_verified")
      .eq("user_id", currentUser.id)
      .maybeSingle();
    if (error) throw error;
    setProfile(data);
    if (data?.username) setUsername(data.username);
  }

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(async ({ data, error }) => {
      if (!active || error) return;
      setUser(data.user || null);
      if (data.user) {
        try { await loadProfile(data.user); } catch (e) { toast.error(e.message || "No se pudo cargar el perfil"); }
      }
    }).catch(() => {});
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const next = session?.user || null;
      setUser(next);
      if (next) {
        // Defer Supabase queries to avoid running them inside the auth callback.
        setTimeout(() => { if (active) loadProfile(next).catch((e) => toast.error(e.message || "No se pudo cargar el perfil")); }, 0);
      } else {
        setProfile(null);
        setUsername("");
      }
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);

  async function authenticate(signUp) {
    if (!email.trim() || password.length < 8) {
      toast.error("Introduce un correo válido y una contraseña de al menos 8 caracteres.");
      return;
    }
    setBusy(true);
    try {
      const result = signUp
        ? await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: { emailRedirectTo: getAuthRedirectUrl() },
          })
        : await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (result.error) throw result.error;
      if (signUp && !result.data.session) {
        toast.success("Te enviamos un correo. Confirma tu cuenta y volverás al juego automáticamente.");
      } else {
        toast.success(signUp ? "Cuenta creada." : "Sesión iniciada.");
      }
    } catch (e) {
      toast.error(e.message || "No se pudo completar el acceso.");
    } finally {
      setBusy(false);
    }
  }

  async function saveUsername() {
    const clean = username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(clean)) {
      toast.error("Usa de 3 a 20 caracteres: letras, números o _.");
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .update({ username: clean })
        .eq("user_id", user.id)
        .select("user_id, username, is_verified")
        .single();
      if (error) {
        if (error.code === "23505") throw new Error("Ese nombre de usuario ya está ocupado.");
        throw error;
      }
      setProfile(data);
      setUsername(data.username);
      toast.success("Nombre de usuario actualizado.");
    } catch (e) {
      toast.error(e.message || "No se pudo guardar el nombre.");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    setBusy(true);
    const { error } = await supabase.auth.signOut();
    if (error) toast.error(error.message);
    else toast.success("Sesión cerrada.");
    setBusy(false);
  }

  return (
    <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <section className="relative w-full max-w-md rounded-2xl border border-white/15 bg-[#111522] p-5 text-left text-white shadow-2xl">
        <button onClick={onClose} className="absolute right-4 top-4 rounded-lg p-1 text-white/50 hover:text-white" aria-label="Cerrar"><X size={18} /></button>
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-xl bg-cyan-300/10 p-2 text-cyan-200"><UserRound size={22} /></div>
          <div><h2 className="text-lg font-black">Tu cuenta</h2><p className="text-xs text-white/45">Perfil y nombre de usuario único</p></div>
        </div>
        {!user ? (
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <button onClick={() => setMode("login")} className={`rounded-lg px-3 py-2 text-xs font-bold ${mode === "login" ? "bg-cyan-300 text-slate-950" : "bg-white/5 text-white/60"}`}>Iniciar sesión</button>
              <button onClick={() => setMode("signup")} className={`rounded-lg px-3 py-2 text-xs font-bold ${mode === "signup" ? "bg-cyan-300 text-slate-950" : "bg-white/5 text-white/60"}`}>Crear cuenta</button>
            </div>
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" autoComplete="email" placeholder="Correo electrónico" className="rounded-lg border border-white/15 bg-black/30 px-3 py-2.5 text-sm outline-none focus:border-cyan-300/60" />
            <input value={password} onChange={e => setPassword(e.target.value)} type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} placeholder="Contraseña (mín. 8 caracteres)" className="rounded-lg border border-white/15 bg-black/30 px-3 py-2.5 text-sm outline-none focus:border-cyan-300/60" />
            <button disabled={busy} onClick={() => authenticate(mode === "signup")} className="rounded-lg bg-gradient-to-r from-cyan-300 to-blue-400 px-4 py-3 text-sm font-black text-slate-950 disabled:opacity-50">{busy ? "Procesando..." : mode === "signup" ? "Crear cuenta y verificar correo" : "Entrar"}</button>
            {mode === "signup" && <p className="text-[11px] leading-relaxed text-white/45">El enlace de verificación volverá al sitio publicado, no a localhost. Revisa también la carpeta de spam.</p>}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
              <p className="text-xs text-white/45">Conectado como</p>
              <p className="mt-1 break-all text-sm font-semibold">{user.email}</p>
              {isOwnerVerified && <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-sky-400/10 px-2 py-1 text-xs font-bold text-sky-300"><BadgeCheck size={14} fill="currentColor" className="text-sky-300" /><span className="text-sky-200">Verificado</span></span>}
            </div>
            <label className="text-xs font-bold text-white/70">Nombre de usuario único</label>
            <div className="flex items-center rounded-lg border border-white/15 bg-black/30 px-3">
              <span className="text-sm text-white/40">@</span>
              <input value={username} onChange={e => setUsername(e.target.value)} maxLength={20} placeholder="tu_usuario" className="w-full bg-transparent px-2 py-2.5 text-sm outline-none" />
            </div>
            <p className="text-[10px] text-white/40">3–20 caracteres. Solo letras minúsculas, números y guion bajo. No se permiten nombres repetidos.</p>
            <button disabled={busy} onClick={saveUsername} className="rounded-lg bg-cyan-300 px-4 py-2.5 text-sm font-black text-slate-950 disabled:opacity-50">Guardar nombre</button>
            <button disabled={busy} onClick={signOut} className="rounded-lg border border-white/15 px-4 py-2.5 text-xs font-bold text-white/70 disabled:opacity-50">Cerrar sesión</button>
          </div>
        )}
      </section>
    </div>
  );
}
