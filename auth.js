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
      r.onsuccess = () => { const g = r.result.transaction("files").objectStore("files").get(id); g.onsuccess = () => res(g.result || null); g.onerror = () => res(null); };
    });
  }

  async function enter(user) {
    loading("Cargando tus datos…");
    const uid = user.id, key = "edgim.u." + uid, pendingKey = key + ".pending";
    window.EDGIM_STORE_KEY = key;
    window.EDGIM_USER = { id: uid, email: user.email };
    localStorage.setItem(LAST_USER, JSON.stringify(window.EDGIM_USER));
    const upload = (id, blob) => sb.storage.from(BUCKET).upload(`${uid}/${id}`, blob, { upsert: true, contentType: blob.type || "application/octet-stream" });

    async function push(state) {
      const data = JSON.parse(JSON.stringify(state));
      if (data.settings) data.settings.apiKey = ""; // la API key nunca sale de este navegador
      const { error } = await sb.from(TABLE).upsert({ user_id: uid, data, updated_at: new Date().toISOString() });
      if (error) console.warn("EDGIM: no se pudo sincronizar", error.message);
      else localStorage.removeItem(pendingKey);
    }

    const local = parse(localStorage.getItem(key));
    const { data: row, error } = await sb.from(TABLE).select("data").eq("user_id", uid).maybeSingle();
    if (error) {
      // Sin conexión o tabla sin crear: sigue con la copia local
      console.warn("EDGIM: no se pudieron leer tus datos", error.message);
      window.EDGIM_USER.offline = true;
    } else if (row?.data && !localStorage.getItem(pendingKey)) {
      const remote = row.data;
      if (local?.settings?.apiKey) remote.settings = { ...remote.settings, apiKey: local.settings.apiKey };
      localStorage.setItem(key, JSON.stringify(remote));
    } else if (!row) {
      // Cuenta nueva: ofrece traer lo que ya había en este navegador
      const legacy = parse(localStorage.getItem(LEGACY_KEY));
      const hasData = legacy && (legacy.sessions?.length || legacy.photos?.length || legacy.routine?.days?.length);
      if (!local && hasData && await ask("Encontramos datos en este navegador", `Tienes ${legacy.sessions?.length || 0} entrenos y ${legacy.photos?.length || 0} fotos guardados aquí. ¿Quieres pasarlos a tu cuenta?`, "Pasarlos a mi cuenta", "Empezar de cero")) {
        localStorage.setItem(key, JSON.stringify(legacy));
        const ids = [...(legacy.photos || []).map((p) => p.fileId), ...(legacy.sources || []).map((s) => s.fileId), legacy.ideal?.fileId].filter(Boolean);
        for (let i = 0; i < ids.length; i++) {
          loading(`Subiendo tus fotos y documentos… ${i + 1} de ${ids.length}`);
          const b = await localFile(ids[i]);
          if (b) await upload(ids[i], b);
        }
      }
    }
    const cur = parse(localStorage.getItem(key));
    if (!error && cur && (!row || localStorage.getItem(pendingKey))) await push(cur);

    // Ganchos que usa app.js
    let t;
    window.EDGIM_SYNC = (state) => { localStorage.setItem(pendingKey, "1"); clearTimeout(t); t = setTimeout(() => push(state), 1500); };
    window.EDGIM_FILES = {
      put: (id, blob) => upload(id, blob).then(({ error: e }) => e && console.warn("EDGIM: no se subió", id, e.message)),
      get: async (id) => { const { data, error: e } = await sb.storage.from(BUCKET).download(`${uid}/${id}`); return e ? null : data; },
      del: (id) => sb.storage.from(BUCKET).remove([`${uid}/${id}`]),
    };
    loadApp();
  }

  // Cerrar sesión (botón en Ajustes)
  document.addEventListener("click", async (ev) => {
    if (!ev.target.closest("[data-action='x-logout']")) return;
    await sb.auth.signOut();
    // En un dispositivo compartido no deja tus datos a la vista (salvo cambios aún sin subir)
    const u = window.EDGIM_USER;
    if (u && !localStorage.getItem(`edgim.u.${u.id}.pending`)) localStorage.removeItem(`edgim.u.${u.id}`);
    localStorage.removeItem(LAST_USER);
    location.reload();
  });

  sb.auth.onAuthStateChange((event) => { if (event === "PASSWORD_RECOVERY") { mode = "nueva"; msg = ""; show(); } });
  loading("Abriendo EDGIM…");
  sb.auth.getSession().then(({ data: { session } }) => (session && !isRecovery ? enter(session.user) : show()));
})();
