"use strict";
/* Inicio de sesión de EDGIM con Supabase (opcional).
   - Sin datos en config.js: la app funciona como siempre, solo en este navegador.
   - Con config.js lleno: cada persona entra con su correo; sus datos y fotos se guardan
     en su cuenta (protegidos por las reglas de supabase-setup.sql) y app.js se carga
     cuando ya están listos. */
(() => {
  const cfg = window.EDGIM_CONFIG || {};
  const view = document.getElementById("view");
  const tabbar = document.querySelector(".tabbar");
  const TABLE = "edgim_data", BUCKET = "edgim", LEGACY_KEY = "repa.v1", LAST_USER = "edgim.lastUser";
  const isRecovery = location.hash.includes("type=recovery");
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const parse = (s) => { try { return JSON.parse(s); } catch { return null; } };
  const loadApp = () => { tabbar.hidden = false; const s = document.createElement("script"); s.src = "app.js"; document.body.append(s); };

  if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) return loadApp();

  // La librería no cargó (sin internet): abre con la copia local del último usuario
  if (!window.supabase?.createClient) {
    const last = parse(localStorage.getItem(LAST_USER));
    if (last) { window.EDGIM_STORE_KEY = "edgim.u." + last.id; window.EDGIM_USER = { ...last, offline: true }; return loadApp(); }
    tabbar.hidden = true;
    view.innerHTML = `<div class="auth"><p class="auth-brand">EDGIM</p><section class="card"><h2>Sin conexión</h2><p class="small muted">Necesitas internet para iniciar sesión la primera vez. Revisa tu conexión y recarga la página.</p></section></div>`;
    return;
  }

  const sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
  let mode = isRecovery ? "nueva" : "entrar", msg = "", msgOk = false, busy = false;

  /* ---------- Pantalla de acceso ---------- */
  function show() {
    tabbar.hidden = true;
    const titles = { entrar: "Entrar", crear: "Crear cuenta", recuperar: "Recuperar contraseña", nueva: "Nueva contraseña" };
    const email = mode !== "nueva" ? `<label class="field">Correo<input class="input" type="email" name="email" id="au-email" autocomplete="email" required></label>` : "";
    const pass = mode !== "recuperar" ? `<label class="field">${mode === "nueva" ? "Nueva contraseña" : "Contraseña"}<input class="input" type="password" name="password" id="au-pass" minlength="6" autocomplete="${mode === "entrar" ? "current-password" : "new-password"}" required></label>` : "";
    view.innerHTML = `
    <div class="auth">
      <div><p class="auth-brand">EDGIM</p><p class="muted">Tu entrenamiento, tu dieta y tu progreso en una sola app.</p></div>
      <section class="card">
        ${mode === "entrar" || mode === "crear" ? `<div class="seg full">${[["entrar", "Entrar"], ["crear", "Crear cuenta"]].map(([k, l]) => `<button type="button" class="${mode === k ? "on" : ""}" data-auth="${k}">${l}</button>`).join("")}</div>` : `<h2>${titles[mode]}</h2>`}
        <form class="stack" id="auth-form">
          ${email}${pass}
          ${mode === "crear" ? `<p class="small muted">Mínimo 6 caracteres. Te llegará un correo para confirmar tu cuenta.</p>` : ""}
          ${mode === "recuperar" ? `<p class="small muted">Te enviamos un link para crear una contraseña nueva.</p>` : ""}
          <button class="btn primary" type="submit" ${busy ? "disabled" : ""}>${busy ? "Un momento…" : { entrar: "Entrar", crear: "Crear cuenta", recuperar: "Enviar link", nueva: "Guardar contraseña" }[mode]}</button>
        </form>
        ${msg ? `<p class="small" role="status" style="color:${msgOk ? "var(--good)" : "var(--bad)"}">${esc(msg)}</p>` : ""}
        ${mode === "entrar" ? `<button type="button" class="btn ghost small" data-auth="recuperar">Olvidé mi contraseña</button>` : ""}
        ${mode === "recuperar" ? `<button type="button" class="btn ghost small" data-auth="entrar">Volver</button>` : ""}
      </section>
    </div>`;
  }
  const ERRORS = {
    "Invalid login credentials": "Correo o contraseña incorrectos.",
    "Email not confirmed": "Confirma tu cuenta con el link que te llegó al correo.",
    "User already registered": "Ya existe una cuenta con ese correo. Entra o recupera tu contraseña.",
  };
  const errText = (e) => ERRORS[e?.message] || (e?.message?.includes("Password") ? "La contraseña debe tener al menos 6 caracteres." : "No se pudo conectar. Revisa tu internet e intenta de nuevo.");

  view.addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-auth]");
    if (!b) return;
    mode = b.dataset.auth; msg = ""; show();
  });
  view.addEventListener("submit", async (ev) => {
    if (ev.target.id !== "auth-form") return;
    ev.preventDefault();
    const v = Object.fromEntries(new FormData(ev.target));
    busy = true; msg = ""; show();
    const back = location.origin + location.pathname;
    let error = null, user = null;
    if (mode === "entrar") ({ data: { user }, error } = await sb.auth.signInWithPassword({ email: v.email, password: v.password }));
    if (mode === "crear") {
      const r = await sb.auth.signUp({ email: v.email, password: v.password, options: { emailRedirectTo: back } });
      error = r.error;
      if (!error && r.data.session) user = r.data.user;
      else if (!error) { msg = "Cuenta creada. Revisa tu correo y abre el link para confirmarla; luego entra aquí."; msgOk = true; mode = "entrar"; }
    }
    if (mode === "recuperar") {
      ({ error } = await sb.auth.resetPasswordForEmail(v.email, { redirectTo: back }));
      if (!error) { msg = "Listo. Revisa tu correo y abre el link para crear tu contraseña nueva."; msgOk = true; }
    }
    if (mode === "nueva") {
      ({ data: { user }, error } = await sb.auth.updateUser({ password: v.password }));
      if (!error) history.replaceState(null, "", location.pathname);
    }
    busy = false;
    if (error) { msg = errText(error); msgOk = false; }
    if (user && !error) return enter(user);
    show();
  });

  /* ---------- Datos del usuario ---------- */
  function loading(text) { tabbar.hidden = true; view.innerHTML = `<div class="auth"><p class="auth-brand">EDGIM</p><p class="muted" role="status">${esc(text)}</p></div>`; }
  function ask(title, body, yes, no) {
    return new Promise((res) => {
      view.innerHTML = `<div class="auth"><p class="auth-brand">EDGIM</p><section class="card"><h2>${esc(title)}</h2><p class="small muted">${esc(body)}</p>
        <div class="row"><button class="btn primary" id="ask-yes">${esc(yes)}</button><button class="btn ghost" id="ask-no">${esc(no)}</button></div></section></div>`;
      document.getElementById("ask-yes").onclick = () => res(true);
      document.getElementById("ask-no").onclick = () => res(false);
    });
  }
  // Lee archivos guardados en este navegador (fotos y PDF) para subirlos a la cuenta
  function localFile(id) {
    return new Promise((res) => {
      const r = indexedDB.open("repa-files", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("files");
      r.onerror = () => res(null);
      r.onsuccess = () => { const g = r.result.transaction("files").objectStore("files").get(id); g.onsuccess = () => { res(g.result || null); r.result.close(); }; g.onerror = () => { res(null); r.result.close(); }; };
    });
  }

  // Fusiona dos versiones de los datos: listas por id (o fecha), registro de cardio por fecha
  // y el resto lo gana la versión más reciente. La API key siempre es la de este navegador.
  function merge(local, remote, localNewer) {
    const [older, newer] = localNewer ? [remote, local] : [local, remote];
    const union = (field, k) => { const m = new Map(); for (const x of older[field] || []) m.set(x[k], x); for (const x of newer[field] || []) m.set(x[k], x); return [...m.values()]; };
    const out = { ...older, ...newer };
    out.sessions = union("sessions", "id").sort((a, b) => a.date.localeCompare(b.date));
    out.photos = union("photos", "id");
    out.sources = union("sources", "id");
    out.weights = union("weights", "date");
    out.cardio = { ...(older.cardio || {}), ...(newer.cardio || {}), log: { ...(older.cardio?.log || {}), ...(newer.cardio?.log || {}) } };
    out.settings = { ...(out.settings || {}), apiKey: local.settings?.apiKey || "" };
    return out;
  }
  const forCloud = (s) => { const d = JSON.parse(JSON.stringify(s)); if (d.settings) d.settings.apiKey = ""; return d; };

  async function enter(user) {
    loading("Cargando tus datos…");
    const uid = user.id, key = "edgim.u." + uid;
    const K = { pending: key + ".pending", remoteAt: key + ".remoteAt", localAt: key + ".localAt", queue: key + ".uploadQ" };
    window.EDGIM_STORE_KEY = key;
    window.EDGIM_USER = { id: uid, email: user.email };
    localStorage.setItem(LAST_USER, JSON.stringify(window.EDGIM_USER));
    let token = (await sb.auth.getSession()).data.session?.access_token || "";
    sb.auth.onAuthStateChange((_e, s) => { if (s) token = s.access_token; });

    // Estado actual: el de la app si ya cargó, si no la copia local
    const current = () => (typeof state !== "undefined" ? state : parse(localStorage.getItem(key)));
    const localAt = () => +localStorage.getItem(K.localAt) || 0;
    const readRow = (cols) => sb.from(TABLE).select(cols).eq("user_id", uid).maybeSingle();

    /* Subida de datos: antes de escribir revisa si otro dispositivo cambió algo desde nuestra última lectura */
    let pushing = null;
    function push() {
      if (pushing) return pushing;
      pushing = (async () => {
        const startedAt = Date.now();
        const { data: head, error } = await readRow("updated_at");
        if (error) return; // sin conexión: queda pendiente
        let data = current();
        if (!data) return;
        if (head && head.updated_at !== localStorage.getItem(K.remoteAt)) {
          const { data: row, error: e2 } = await readRow("data, updated_at");
          if (e2) return;
          data = merge(data, row.data, localAt() > Date.parse(row.updated_at));
          window.EDGIM_REPLACE ? window.EDGIM_REPLACE(data) : localStorage.setItem(key, JSON.stringify(data));
        }
        const { data: saved, error: e3 } = await sb.from(TABLE).upsert({ user_id: uid, data: forCloud(data), updated_at: new Date().toISOString() }).select("updated_at").single();
        if (e3) { console.warn("EDGIM: no se pudo sincronizar", e3.message); return; }
        localStorage.setItem(K.remoteAt, saved.updated_at);
        if (localAt() <= startedAt) localStorage.removeItem(K.pending);
      })().catch((e) => console.warn("EDGIM: sincronización pendiente", e)).finally(() => { pushing = null; });
      return pushing;
    }
    // Al volver a la app: si la nube cambió, trae esa versión (o fusiona si hay cambios locales sin subir)
    async function pull() {
      const { data: row, error } = await readRow("data, updated_at");
      if (error || !row || row.updated_at === localStorage.getItem(K.remoteAt)) return;
      if (localStorage.getItem(K.pending)) return push();
      const data = row.data;
      data.settings = { ...(data.settings || {}), apiKey: current()?.settings?.apiKey || "" };
      localStorage.setItem(K.remoteAt, row.updated_at);
      window.EDGIM_REPLACE?.(data);
    }
    // Al cerrar la página no hay tiempo de esperar respuestas: envío directo con keepalive
    function beacon() {
      if (!localStorage.getItem(K.pending) || !token) return;
      const body = JSON.stringify({ user_id: uid, data: forCloud(current()), updated_at: new Date().toISOString() });
      if (body.length > 60000) { push(); return; } // keepalive admite ~64 KB
      fetch(`${cfg.supabaseUrl}/rest/v1/${TABLE}?on_conflict=user_id`, {
        method: "POST", keepalive: true, body,
        headers: { apikey: cfg.supabaseAnonKey, Authorization: "Bearer " + token, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" },
      }).catch(() => {});
    }

    /* Fotos y documentos: cola persistente; se reintenta al abrir la app y al volver la conexión */
    const queue = () => parse(localStorage.getItem(K.queue)) || [];
    const setQueue = (q) => localStorage.setItem(K.queue, JSON.stringify([...new Set(q)]));
    const upload = async (id, blob) => {
      try {
        const { error: e } = await sb.storage.from(BUCKET).upload(`${uid}/${id}`, blob, { upsert: true, contentType: blob.type || "application/octet-stream" });
        if (e) throw e;
        setQueue(queue().filter((x) => x !== id));
        return true;
      } catch (e) { console.warn("EDGIM: se reintentará subir", id, e?.message || e); return false; }
    };
    let retrying = false;
    async function retryQueue() {
      if (retrying || !navigator.onLine) return;
      retrying = true;
      for (const id of queue()) { const b = await localFile(id); if (!b) setQueue(queue().filter((x) => x !== id)); else await upload(id, b); }
      retrying = false;
    }

    /* Carga inicial */
    const local = parse(localStorage.getItem(key));
    const { data: row, error } = await readRow("data, updated_at");
    if (error) {
      // Sin conexión o tabla sin crear: sigue con la copia local
      console.warn("EDGIM: no se pudieron leer tus datos", error.message);
      window.EDGIM_USER.offline = true;
    } else if (row) {
      if (local && localStorage.getItem(K.pending)) {
        // Hay cambios sin subir: fusiona con lo que haya en la nube
        const data = row.updated_at === localStorage.getItem(K.remoteAt) ? local : merge(local, row.data, localAt() > Date.parse(row.updated_at));
        localStorage.setItem(key, JSON.stringify(data));
      } else {
        const remote = row.data;
        remote.settings = { ...(remote.settings || {}), apiKey: local?.settings?.apiKey || "" };
        localStorage.setItem(key, JSON.stringify(remote));
        localStorage.setItem(K.remoteAt, row.updated_at);
      }
    } else {
      // Cuenta nueva: ofrece traer lo que ya había en este navegador
      const legacy = parse(localStorage.getItem(LEGACY_KEY));
      const hasData = legacy && (legacy.sessions?.length || legacy.photos?.length || legacy.routine?.days?.length);
      if (!local && hasData && await ask("Encontramos datos en este navegador", `Tienes ${legacy.sessions?.length || 0} entrenos y ${legacy.photos?.length || 0} fotos guardados aquí. ¿Quieres pasarlos a tu cuenta?`, "Pasarlos a mi cuenta", "Empezar de cero")) {
        localStorage.setItem(key, JSON.stringify(legacy));
        const ids = [...(legacy.photos || []).map((p) => p.fileId), ...(legacy.sources || []).map((s) => s.fileId), legacy.ideal?.fileId].filter(Boolean);
        setQueue([...queue(), ...ids]);
        for (let i = 0; i < ids.length; i++) {
          loading(`Subiendo tus fotos y documentos… ${i + 1} de ${ids.length}`);
          const b = await localFile(ids[i]);
          if (b) await upload(ids[i], b);
        }
        localStorage.removeItem(LEGACY_KEY); // ya vive en la cuenta
      }
      if (localStorage.getItem(key)) localStorage.setItem(K.pending, "1");
    }
    if (!error && localStorage.getItem(K.pending)) await push();

    /* Ganchos que usa app.js */
    let t;
    window.EDGIM_SYNC = () => { localStorage.setItem(K.pending, "1"); localStorage.setItem(K.localAt, String(Date.now())); clearTimeout(t); t = setTimeout(push, 1500); };
    window.EDGIM_FILES = {
      put: (id, blob) => { setQueue([...queue(), id]); return upload(id, blob); },
      get: async (id) => { const { data, error: e } = await sb.storage.from(BUCKET).download(`${uid}/${id}`); return e ? null : data; },
      del: (id) => { setQueue(queue().filter((x) => x !== id)); return sb.storage.from(BUCKET).remove([`${uid}/${id}`]); },
    };
    window.EDGIM_LOGOUT = async () => {
      loading("Cerrando sesión…");
      clearTimeout(t);
      if (localStorage.getItem(K.pending)) await push();
      await retryQueue();
      await sb.auth.signOut();
      // No deja tus datos en este navegador: copia local, marcas de sincronización, cola y archivos
      [key, K.pending, K.remoteAt, K.localAt, K.queue, LAST_USER].forEach((k) => localStorage.removeItem(k));
      await window.EDGIM_CLOSE_DB?.();
      await new Promise((res) => { const r = indexedDB.deleteDatabase("repa-files"); r.onsuccess = r.onerror = r.onblocked = () => res(); });
      location.reload();
    };
    // app.js llama esto al ocultarse la página (hard = se está cerrando) y al volver
    window.EDGIM_FLUSH = (hard) => { if (!localStorage.getItem(K.pending)) return; clearTimeout(t); hard ? beacon() : push(); };
    window.EDGIM_PULL = pull;
    addEventListener("online", () => { retryQueue(); if (localStorage.getItem(K.pending)) push(); });
    loadApp();
    retryQueue();
  }

  // Cerrar sesión (botón en Ajustes)
  document.addEventListener("click", (ev) => {
    if (ev.target.closest("[data-action='x-logout']")) window.EDGIM_LOGOUT?.();
  });

  sb.auth.onAuthStateChange((event) => { if (event === "PASSWORD_RECOVERY") { mode = "nueva"; msg = ""; show(); } });
  loading("Abriendo EDGIM…");
  sb.auth.getSession().then(({ data: { session } }) => (session && !isRecovery ? enter(session.user) : show()));
})();
