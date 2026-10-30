"use strict";

/* ---------- Utilidades ---------- */
const $ = (s, el = document) => el.querySelector(s);
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const todayISO = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
const fmtDate = (iso, opts = { day: "numeric", month: "short" }) => new Date(iso.length === 10 ? iso + "T12:00:00" : iso).toLocaleDateString("es-MX", opts);
const num = (v) => { const n = parseFloat(String(v).replace(",", ".")); return Number.isFinite(n) ? n : 0; };
// Enteros con separador de miles: "8,500" = 8500 (num() trataría la coma como decimal)
const int = (v) => { const n = parseInt(String(v).replace(/[,\s]/g, ""), 10); return Number.isFinite(n) ? n : 0; };
// Redondea a pasos de s sin dejar colas de decimales (3.3 y no 3.3000000000000003)
const round = (n, s = 1) => +(Math.round(n / s) * s).toFixed((String(s).split(".")[1] || "").length);
const e1rm = (w, r) => (w > 0 && r > 0 ? w * (1 + r / 30) : 0);
const ICON = {
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M5 12l5 5 9-10"/></svg>',
  gear: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  up: '<svg viewBox="0 0 24 24"><path d="M12 19V5M6 11l6-6 6 6"/></svg>',
  down: '<svg viewBox="0 0 24 24"><path d="M12 5v14M6 13l6 6 6-6"/></svg>',
  copy: '<svg viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/></svg>',
  edit: '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>',
  search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>',
  spark: '<svg viewBox="0 0 24 24"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/></svg>',
};

/* ---------- Estado ---------- */
// Con sesión iniciada, auth.js asigna una clave por usuario; sin sesión se usa la local de siempre
const STORE_KEY = window.EDGIM_STORE_KEY || "repa.v1";
const DEFAULT_STATE = {
  tab: "hoy",
  customExercises: [],
  sessions: [],
  active: null,
  routine: { daysPerWeek: 4, priorities: {}, days: [], summary: "" },
  sources: [],
  diet: { sex: "h", age: 25, height: 175, weight: 75, bf: "", activity: "1.55", goal: "perder", rate: "0.5", meals: 4, goalWeight: "" },
  weights: [],
  photos: [],
  settings: { apiKey: "", model: "claude-opus-5-5", rest: 90 },
};
let state = load();
const ui = { muscleFilter: "Todos", query: "", detail: null, detailVar: 0, compare: [], compareMode: false, pendingFiles: [], aiResult: null, aiBusy: false, confirmCb: null, picker: null };

function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      return { ...structuredClone(DEFAULT_STATE), ...s, diet: { ...DEFAULT_STATE.diet, ...s.diet }, settings: { ...DEFAULT_STATE.settings, ...s.settings }, routine: { ...DEFAULT_STATE.routine, ...s.routine } };
    }
  } catch (e) { console.warn(e); }
  return structuredClone(DEFAULT_STATE);
}
let saveT;
function save(now) {
  clearTimeout(saveT);
  const run = () => { try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); window.EDGIM_SYNC?.(state); } catch (e) { toast("No se pudo guardar. Abre la app con “Abrir EDGIM”."); } };
  now ? run() : (saveT = setTimeout(run, 250));
}
// Guarda al instante si cierras la pestaña o cambias de app
addEventListener("pagehide", () => save(true));
document.addEventListener("visibilitychange", () => { if (document.hidden) save(true); });
const STORAGE_OK = (() => { try { localStorage.setItem("repa.test", "1"); localStorage.removeItem("repa.test"); return location.protocol !== "file:"; } catch { return false; } })();

/* ---------- IndexedDB para fotos y documentos ---------- */
let dbP;
function idb() {
  if (!dbP) dbP = new Promise((res, rej) => {
    const r = indexedDB.open("repa-files", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("files");
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  return dbP;
}
async function idbOp(mode, fn) {
  const db = await idb();
  return new Promise((res, rej) => {
    const tx = db.transaction("files", mode);
    const req = fn(tx.objectStore("files"));
    tx.oncomplete = () => res(req?.result);
    tx.onerror = () => rej(tx.error);
  });
}
// Con sesión iniciada, las fotos y documentos también se suben a tu cuenta (EDGIM_FILES, en auth.js)
const fileSet = (id, blob) => idbOp("readwrite", (s) => s.put(blob, id)).then((r) => { window.EDGIM_FILES?.put(id, blob); return r; });
const fileGet = async (id) => {
  const local = await idbOp("readonly", (s) => s.get(id));
  if (local || !window.EDGIM_FILES) return local;
  const remote = await window.EDGIM_FILES.get(id);
  if (remote) await idbOp("readwrite", (s) => s.put(remote, id));
  return remote;
};
const fileDel = (id) => idbOp("readwrite", (s) => s.delete(id)).then((r) => { window.EDGIM_FILES?.del(id); return r; });
const urlCache = new Map();
async function fileURL(id) {
  if (urlCache.has(id)) return urlCache.get(id);
  const b = await fileGet(id);
  if (!b) return "";
  const u = URL.createObjectURL(b);
  urlCache.set(id, u);
  return u;
}
const blobToB64 = (b) => new Promise((res) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(",")[1]); r.readAsDataURL(b); });
const blobToDataURL = (b) => new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(b); });

async function shrinkImage(file, max = 1600) {
  try {
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
    return await new Promise((res) => c.toBlob((b) => res(b || file), "image/jpeg", 0.86));
  } catch { return file; }
}

/* ---------- Ejercicios ---------- */
const allExercises = () => [...BASE_EXERCISES, ...state.customExercises];
const exById = (id) => allExercises().find((e) => e.id === id);
const exByName = (name) => allExercises().find((e) => e.name.toLowerCase() === String(name).toLowerCase().trim());
const COMPOUND = new Set(["press-banca", "press-inclinado", "press-maquina", "dominadas", "jalon", "remo", "remo-sentado", "remo-pecho-apoyado", "peso-muerto", "press-militar", "press-hombro-maquina", "sentadilla", "hack", "prensa", "bulgara", "rumano", "hip-thrust", "fondos", "press-cerrado", "zancadas"]);

function setsFor(exId, variant) {
  const out = [];
  for (const s of state.sessions) for (const en of s.entries) {
    if (en.exId === exId && en.variant === variant) out.push({ date: s.date, sets: en.sets.filter((x) => num(x.w) || num(x.r)) });
  }
  return out.filter((x) => x.sets.length).sort((a, b) => b.date.localeCompare(a.date));
}
const lastPerf = (exId, variant) => setsFor(exId, variant)[0];
function bestOf(exId, variant) {
  let best = null;
  for (const h of setsFor(exId, variant)) for (const st of h.sets) {
    const v = e1rm(num(st.w), num(st.r));
    if (!best || v > best.v) best = { v, w: num(st.w), r: num(st.r), date: h.date };
  }
  return best;
}
const setsStr = (sets) => sets.map((s) => `${num(s.r)}×${num(s.w)}`).join(" · ");

/* ---------- Render principal ---------- */
const view = $("#view");
const views = { hoy: viewHoy, ejercicios: viewEjercicios, rutina: viewRutina, dieta: viewDieta, progreso: viewProgreso, rango: viewRango };
function render() {
  document.querySelectorAll(".tab").forEach((t) => {
    const on = t.dataset.tab === state.tab;
    t.classList.toggle("on", on);
    if (on) t.setAttribute("aria-current", "page"); else t.removeAttribute("aria-current");
  });
  view.innerHTML = (STORAGE_OK ? "" : `<div class="card flat" style="border-color:var(--bad)"><b>Tus datos pueden perderse</b><p class="small">Abriste el archivo directo y el navegador no lo guarda de forma segura. Cierra esta pestaña y abre la app con <b>“Abrir EDGIM”</b> en la carpeta gym app.</p></div>`) + views[state.tab]();
  hydratePhotos(view);
}
function go(tab) { state.tab = tab; save(); render(); window.scrollTo(0, 0); }

let toastT;
function toast(msg) {
  const t = $("#toast"); t.textContent = msg; t.classList.add("show");
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), 2600);
}

/* ---------- Hoja inferior ---------- */
let sheetRender = null;
function openSheet(fn) { sheetRender = fn; $("#sheet-body").innerHTML = fn(); $("#sheet").hidden = false; hydratePhotos($("#sheet-body")); }
function refreshSheet() { if (sheetRender && !$("#sheet").hidden) { $("#sheet-body").innerHTML = sheetRender(); hydratePhotos($("#sheet-body")); } }
function closeSheet() { $("#sheet").hidden = true; sheetRender = null; }
function confirmBox(msg, yesLabel, cb) {
  ui.confirmCb = cb;
  openSheet(() => `<h2>${esc(msg)}</h2><p class="muted">Esta acción no se puede deshacer.</p>
    <div class="row"><button class="btn danger" data-action="confirm-yes">${esc(yesLabel)}</button><button class="btn ghost" data-action="close-sheet">Cancelar</button></div>`);
}

/* ---------- Gráfica de línea ---------- */
function lineChart(points, { unit = "", h = 150 } = {}) {
  if (points.length < 2) return `<p class="muted small">Registra al menos dos datos para ver la gráfica.</p>`;
  const W = 600, H = h, pl = 36, pr = 14, pt = 12, pb = 24;
  const ys = points.map((p) => p.y);
  let min = Math.min(...ys), max = Math.max(...ys);
  const pad = (max - min) * 0.15 || 1; min -= pad; max += pad;
  const x = (i) => pl + (i / (points.length - 1)) * (W - pl - pr);
  const y = (v) => pt + (1 - (v - min) / (max - min)) * (H - pt - pb);
  const ticks = [min + pad, (min + max) / 2, max - pad];
  const path = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.y).toFixed(1)}`).join("");
  const area = `${path}L${x(points.length - 1)},${H - pb}L${pl},${H - pb}Z`;
  const lbl = [0, Math.floor((points.length - 1) / 2), points.length - 1].filter((v, i, a) => a.indexOf(v) === i);
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img">
    ${ticks.map((t) => `<line class="grid" x1="${pl}" x2="${W - pr}" y1="${y(t)}" y2="${y(t)}"/><text x="${pl - 6}" y="${y(t) + 3}" text-anchor="end">${round(t, 0.5)}</text>`).join("")}
    <path class="area" d="${area}"/><path class="line" d="${path}"/>
    ${points.map((p, i) => `<circle class="pt ${i === points.length - 1 ? "last" : ""}" cx="${x(i)}" cy="${y(p.y)}" r="${i === points.length - 1 ? 5 : 3.5}"><title>${esc(p.label)}: ${round(p.y, 0.1)} ${unit}</title></circle>`).join("")}
    ${lbl.map((i) => `<text x="${x(i)}" y="${H - 6}" text-anchor="${i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"}">${esc(points[i].label)}</text>`).join("")}
  </svg>`;
}

/* =========================================================
   ENTRENO
   ========================================================= */
function viewHoy() {
  if (state.active) return viewActive();
  const weekAgo = Date.now() - 7 * 864e5;
  const week = state.sessions.filter((s) => new Date(s.date).getTime() > weekAgo);
  const vol = week.reduce((a, s) => a + s.entries.reduce((b, e) => b + e.sets.reduce((c, st) => c + num(st.w) * num(st.r), 0), 0), 0);
  const setsW = week.reduce((a, s) => a + s.entries.reduce((b, e) => b + e.sets.length, 0), 0);
  const nextIdx = state.routine.days.length ? (state.sessions.filter((s) => s.dayIdx != null).length) % state.routine.days.length : -1;
  const greeting = new Date().getHours() < 12 ? "Buenos días" : new Date().getHours() < 19 ? "Buenas tardes" : "Buenas noches";
  return `
  <header class="page-head"><div><p class="brand">EDGIM</p><p class="eyebrow">${esc(fmtDate(todayISO(), { weekday: "long", day: "numeric", month: "long" }))}</p><h1>${greeting}</h1></div></header>
  <section class="card hero">
    <p class="eyebrow" style="color:inherit;opacity:.8">Últimos 7 días</p>
    <div class="grid-3">
      <div class="stat"><span class="v num">${week.length}</span><span class="l" style="color:inherit">entrenos</span></div>
      <div class="stat"><span class="v num">${setsW}</span><span class="l" style="color:inherit">series</span></div>
      <div class="stat"><span class="v num">${vol >= 1000 ? round(vol / 1000, 0.1) + "t" : round(vol)}</span><span class="l" style="color:inherit">volumen kg</span></div>
    </div>
  </section>
  ${cardioCard()}
  <section class="card">
    ${programBanner()}
    <div class="section-title"><h2>Empezar entreno</h2>${nextIdx >= 0 ? `<span class="tag peach">Sigue: ${esc(state.routine.days[nextIdx].name)}</span>` : ""}</div>
    ${state.routine.days.length ? `<div class="stack">${state.routine.days.map((d, i) => `
      <button class="list-item" data-action="start" data-day="${i}">
        <span class="avatar">${i + 1}</span>
        <span class="grow"><span class="title">${esc(d.name)}</span><br><span class="muted small">${d.items.length} ejercicios · ${d.items.reduce((a, it) => a + num(it.sets), 0)} series</span></span>
        <span class="btn small ${i === nextIdx ? "primary" : ""}">Iniciar</span>
      </button>`).join("")}</div>` : `<p class="muted">Aún no tienes rutina. Créala en la pestaña Rutina o empieza un entreno libre.</p>`}
    <button class="btn ghost block" data-action="start" data-day="-1">${ICON.plus} Entreno libre</button>
  </section>
  <section class="card">
    <h2>Historial</h2>
    ${state.sessions.length ? `<div class="stack">${[...state.sessions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 15).map((s) => `
      <details class="day">
        <summary><span>${esc(s.dayName)}</span> <span class="muted small">· ${esc(fmtDate(s.date, { weekday: "short", day: "numeric", month: "short" }))} · ${s.entries.length} ejercicios${s.minutes ? " · " + s.minutes + " min" : ""}</span></summary>
        ${s.entries.map((e) => { const ex = exById(e.exId); return `<div class="day-item"><span><b>${esc(ex?.name || "Ejercicio borrado")}</b> <span class="tag gray">${esc(ex?.variants[e.variant] || "")}</span></span><span class="num small">${esc(setsStr(e.sets))}</span></div>`; }).join("")}
        <button class="btn danger small" data-action="del-session" data-id="${s.id}">Borrar entreno</button>
      </details>`).join("")}</div>` : `<div class="empty"><p>Tus entrenos aparecerán aquí con cada serie, peso y repeticiones.</p></div>`}
  </section>`;
}

function startSession(dayIdx) {
  const day = dayIdx >= 0 ? state.routine.days[dayIdx] : null;
  state.active = {
    id: uid(), date: todayISO(), start: Date.now(), dayIdx: day ? dayIdx : null,
    dayName: day ? day.name : "Entreno libre",
    entries: day ? day.items.map((it) => {
      // Ajusta las series a la semana del programa (descarga = mitad) y muestra el RIR objetivo
      const wk = programInfo()?.cur;
      const n = Math.max(1, Math.round((num(it.sets) || 3) * (wk?.mult || 1)));
      return newEntry(it.exId, it.variant, n, `${n}×${it.reps}${wk ? ` · RIR ${wk.rir}` : ""}`, it.reps);
    }) : [],
  };
  save(); render(); window.scrollTo(0, 0);
}
function newEntry(exId, variant = 0, n = 3, target = "", reps = "") {
  return { exId, variant, target, reps, sets: Array.from({ length: n }, () => ({ w: "", r: "", done: false })) };
}

function viewActive() {
  const a = state.active;
  const mins = Math.max(1, Math.round((Date.now() - a.start) / 60000));
  return `
  <header class="page-head">
    <div><p class="eyebrow">En curso · ${mins} min</p><h1>${esc(a.dayName)}</h1></div>
    <div class="row"><button class="btn ghost small" data-action="cancel-session">Descartar</button><button class="btn primary" data-action="finish">Terminar</button></div>
  </header>
  ${a.entries.map((en, ei) => {
    const ex = exById(en.exId);
    if (!ex) return "";
    const prev = lastPerf(en.exId, en.variant);
    const best = bestOf(en.exId, en.variant);
    return `<section class="card ex-card">
      <div class="ex-head">
        <div class="grow"><h3>${esc(ex.name)}</h3><div class="row small" style="gap:6px;margin-top:4px"><span class="tag">${esc(ex.muscle)}</span>${en.target ? `<span class="tag peach">Objetivo ${esc(en.target)}</span>` : ""}</div></div>
        <button class="icon-btn" data-action="rm-entry" data-e="${ei}" aria-label="Quitar ejercicio">${ICON.x}</button>
      </div>
      <div class="seg" role="group" aria-label="Variante">${ex.variants.map((v, vi) => `<button class="${en.variant === vi ? "on" : ""}" data-action="variant" data-e="${ei}" data-v="${vi}">${esc(v)}</button>`).join("")}</div>
      ${prev && en.reps && prev.sets.every((s) => num(s.r) >= num(String(en.reps).split("-").pop())) ? `<p class="small"><span class="tag peach">Sube 2–5% el peso</span> Llegaste al tope de reps la última vez.</p>` : ""}
      <p class="prev">${prev ? `Última vez (${esc(fmtDate(prev.date))}): <span class="num">${esc(setsStr(prev.sets))}</span>` : "Primera vez con esta variante"}${best ? ` · Mejor: <span class="num">${best.r}×${best.w}kg</span>` : ""}</p>
      <table class="sets"><thead><tr><th>Serie</th><th>Kg</th><th>Reps</th><th></th><th></th></tr></thead><tbody>
      ${en.sets.map((st, si) => { const ph = prev?.sets[si] || prev?.sets[prev.sets.length - 1]; return `<tr class="${st.done ? "done" : ""}">
        <td class="set-n">${si + 1}</td>
        <td><input class="input" inputmode="decimal" id="w-${ei}-${si}" data-input="set" data-e="${ei}" data-s="${si}" data-f="w" value="${esc(st.w)}" placeholder="${ph ? esc(ph.w) : "0"}" aria-label="Peso serie ${si + 1}"></td>
        <td><input class="input" inputmode="numeric" id="r-${ei}-${si}" data-input="set" data-e="${ei}" data-s="${si}" data-f="r" value="${esc(st.r)}" placeholder="${ph ? esc(ph.r) : "0"}" aria-label="Reps serie ${si + 1}"></td>
        <td><button class="check ${st.done ? "on" : ""}" data-action="done" data-e="${ei}" data-s="${si}" aria-label="Marcar serie">${ICON.check}</button></td>
        <td><button class="icon-btn" style="width:28px;height:28px" data-action="rm-set" data-e="${ei}" data-s="${si}" aria-label="Quitar serie">${ICON.x}</button></td>
      </tr>`; }).join("")}
      </tbody></table>
      <button class="btn ghost small" data-action="add-set" data-e="${ei}">${ICON.plus} Serie</button>
    </section>`;
  }).join("")}
  <button class="btn primary block" data-action="picker" data-mode="session">${ICON.plus} Añadir ejercicio</button>`;
}

function finishSession(force = false) {
  const a = state.active;
  // Se filtra una copia: state.active solo cambia si el entreno se guarda
  const entries = a.entries.map((en) => ({ ...en, sets: en.sets.filter((s) => s.done && num(s.r) > 0) })).filter((en) => en.sets.length);
  const unchecked = a.entries.some((en) => en.sets.some((s) => !s.done && (num(s.w) || num(s.r))));
  if (!entries.length) { toast(unchecked ? "Palomea las series que hiciste para poder guardarlas" : "Palomea al menos una serie con repeticiones"); return; }
  if (unchecked && !force) { confirmBox("Tienes series con datos sin palomear. ¿Guardar solo las palomeadas?", "Guardar entreno", () => finishSession(true)); return; }
  const prs = [];
  for (const en of entries) {
    const before = bestOf(en.exId, en.variant);
    const top = Math.max(...en.sets.map((s) => e1rm(num(s.w), num(s.r))));
    if (before && top > before.v + 0.01) prs.push(exById(en.exId)?.name);
  }
  state.sessions.push({ id: a.id, date: a.date, dayIdx: a.dayIdx, dayName: a.dayName, minutes: Math.round((Date.now() - a.start) / 60000), entries: entries.map(({ exId, variant, sets }) => ({ exId, variant, sets: sets.map(({ w, r }) => ({ w: num(w), r: num(r) })) })) });
  state.active = null;
  save(true); stopTimer(); render(); window.scrollTo(0, 0);
  toast(prs.length ? `Entreno guardado · Récord en ${prs.join(", ")}` : "Entreno guardado");
}

/* Temporizador de descanso */
let timerEnd = 0, timerI;
function startTimer(sec = state.settings.rest) {
  timerEnd = Date.now() + sec * 1000;
  clearInterval(timerI); tickTimer(); timerI = setInterval(tickTimer, 500);
}
function tickTimer() {
  const left = Math.max(0, Math.round((timerEnd - Date.now()) / 1000));
  const t = $("#timer"); t.hidden = false;
  t.innerHTML = `<span>Descanso <span class="num">${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}</span></span><button class="icon-btn" data-action="timer-add" aria-label="Más 30 segundos">+30</button><button class="icon-btn" data-action="timer-stop" aria-label="Cerrar">${ICON.x}</button>`;
  if (!left) { stopTimer(); toast("Descanso terminado"); try { navigator.vibrate?.(300); } catch {} }
}
function stopTimer() { clearInterval(timerI); $("#timer").hidden = true; }

/* Selector de ejercicios (sesión o rutina) */
function pickerSheet() {
  const q = ui.query.toLowerCase();
  const list = allExercises().filter((e) => (ui.muscleFilter === "Todos" || e.muscle === ui.muscleFilter) && (!q || e.name.toLowerCase().includes(q)));
  return `<div class="row between"><h2>Añadir ejercicio</h2><button class="icon-btn" data-action="close-sheet" aria-label="Cerrar">${ICON.x}</button></div>
    <div class="search">${ICON.search}<input class="input" id="picker-q" data-input="picker-q" placeholder="Buscar ejercicio" value="${esc(ui.query)}"></div>
    ${muscleChips()}
    <div class="list" id="picker-list">${list.map((e) => `<button class="list-item" data-action="${ui.picker?.mode === "swap" ? "r-swap-pick" : "pick"}" data-id="${e.id}"><span class="avatar">${esc(e.name[0])}</span><span class="grow"><span class="title">${esc(e.name)}</span><br><span class="muted small">${esc(e.muscle)} · ${esc(e.variants.join(" / "))}</span></span>${ICON.plus}</button>`).join("") || `<p class="muted">Sin resultados. Crea el ejercicio en la pestaña Ejercicios.</p>`}</div>`;
}
function muscleChips() {
  return `<div class="chips">${["Todos", ...MUSCLES].map((m) => `<button class="chip ${ui.muscleFilter === m ? "on" : ""}" data-action="muscle-filter" data-m="${esc(m)}">${esc(m)}</button>`).join("")}</div>`;
}

/* =========================================================
   EJERCICIOS
   ========================================================= */
function viewEjercicios() {
  return `
  <header class="page-head"><div><p class="eyebrow">Biblioteca</p><h1>Ejercicios</h1><p class="sub">${allExercises().length} ejercicios, cada uno con dos variantes.</p></div>
    <button class="btn primary" data-action="new-ex">${ICON.plus} Crear</button></header>
  <div class="search">${ICON.search}<input class="input" id="ex-q" data-input="ex-q" placeholder="Buscar: curl, press, sentadilla…" value="${esc(ui.query)}"></div>
  ${muscleChips()}
  <section class="card" id="ex-list">${exListHTML()}</section>`;
}
function exListHTML() {
  const q = ui.query.toLowerCase();
  const list = allExercises().filter((e) => (ui.muscleFilter === "Todos" || e.muscle === ui.muscleFilter) && (!q || e.name.toLowerCase().includes(q)));
  if (!list.length) return `<div class="empty"><p>No hay ejercicios con ese nombre.</p><button class="btn primary" data-action="new-ex" data-name="${esc(ui.query)}">Crear “${esc(ui.query)}”</button></div>`;
  const groups = MUSCLES.map((m) => [m, list.filter((e) => e.muscle === m)]).filter(([, l]) => l.length);
  return groups.map(([m, l]) => `<p class="eyebrow">${esc(m)}</p><div class="list">${l.map((e) => {
    const b = Math.max(bestOf(e.id, 0)?.v || 0, bestOf(e.id, 1)?.v || 0);
    return `<button class="list-item" data-action="ex-detail" data-id="${e.id}"><span class="avatar">${esc(e.name[0])}</span>
      <span class="grow"><span class="title">${esc(e.name)}</span> ${e.tier === 1 ? '<span class="tag">Top</span>' : ""} ${e.custom ? '<span class="tag peach">Tuyo</span>' : ""}<br><span class="muted small">${esc(e.variants.join(" · "))}</span></span>
      ${b ? `<span class="num small muted">${round(b)} kg e1RM</span>` : ""}</button>`;
  }).join("")}</div>`).join("");
}
function newExSheet(prefill = "") {
  return `<div class="row between"><h2>Nuevo ejercicio</h2><button class="icon-btn" data-action="close-sheet" aria-label="Cerrar">${ICON.x}</button></div>
  <form class="stack" data-form="new-ex">
    <label class="field">Nombre<input class="input" name="name" id="nx-name" required value="${esc(prefill)}" placeholder="Ej. Remo Meadows"></label>
    <label class="field">Músculo principal<select class="input" name="muscle" id="nx-muscle">${MUSCLES.map((m) => `<option>${m}</option>`).join("")}</select></label>
    <div class="grid-2">
      <label class="field">Variante 1<input class="input" name="v1" id="nx-v1" value="Libre" required></label>
      <label class="field">Variante 2<input class="input" name="v2" id="nx-v2" value="Polea" required></label>
    </div>
    <p class="muted small">Ejemplos: Libre / Polea, Barra / Mancuerna, Máquina / Smith, Unilateral / Bilateral.</p>
    <button class="btn primary" type="submit">Guardar ejercicio</button>
  </form>`;
}
function exDetailSheet() {
  const ex = exById(ui.detail);
  if (!ex) return "";
  const v = ui.detailVar;
  const hist = setsFor(ex.id, v);
  const best = bestOf(ex.id, v);
  const pts = [...hist].reverse().map((h) => ({ y: Math.max(...h.sets.map((s) => e1rm(num(s.w), num(s.r)))), label: fmtDate(h.date) }));
  return `<div class="row between"><div><p class="eyebrow">${esc(ex.muscle)}</p><h2>${esc(ex.name)}</h2></div><button class="icon-btn" data-action="close-sheet" aria-label="Cerrar">${ICON.x}</button></div>
  <div class="seg">${ex.variants.map((n, i) => `<button class="${v === i ? "on" : ""}" data-action="detail-var" data-v="${i}">${esc(n)}</button>`).join("")}</div>
  <div class="grid-3">
    <div class="stat"><span class="v num">${best ? `${best.w}` : "–"}</span><span class="l">kg mejor serie${best ? ` (${best.r} reps)` : ""}</span></div>
    <div class="stat"><span class="v num">${best ? round(best.v) : "–"}</span><span class="l">1RM estimado</span></div>
    <div class="stat"><span class="v num">${hist.length}</span><span class="l">sesiones</span></div>
  </div>
  <div class="card flat"><h3>Progreso del 1RM estimado</h3>${lineChart(pts, { unit: "kg" })}</div>
  <div class="card flat"><h3>Historial · ${esc(ex.variants[v])}</h3>
    ${hist.length ? hist.map((h) => `<div class="row between small"><span>${esc(fmtDate(h.date, { day: "numeric", month: "short", year: "2-digit" }))}</span><span class="num">${esc(setsStr(h.sets))}</span></div>`).join("") : `<p class="muted small">Sin registros con esta variante todavía.</p>`}
  </div>
  ${ex.custom ? `<button class="btn danger" data-action="del-ex" data-id="${ex.id}">Borrar ejercicio</button>` : ""}`;
}

/* =========================================================
   RUTINA
   ========================================================= */
const SMALL_MUSCLES = new Set(["Pantorrilla", "Abdomen", "Trapecio", "Antebrazo"]);
// Series semanales directas de base y extra según el puesto de prioridad (1 = la más alta)
const BASE_SETS = { Pecho: 10, Espalda: 12, Hombro: 10, "Bíceps": 8, "Tríceps": 8, "Cuádriceps": 10, Femoral: 8, "Glúteo": 6, Pantorrilla: 6, Abdomen: 6, Trapecio: 4, Antebrazo: 0 };
const PRI_BONUS = { 1: 10, 2: 8, 3: 6, 4: 4 };
(() => {
  // Migra prioridades viejas ("alta") a puestos 1-4 y crea el programa si no existe
  const p = state.routine.priorities; let r = 1;
  for (const m of Object.keys(p)) if (p[m] === "alta") p[m] = r <= 4 ? r++ : "normal";
  state.routine.program ||= { weeks: 8, start: todayISO() };
  state.sources.forEach((s) => { s.tags ||= []; if (s.active === undefined) s.active = true; });
})();
const priOf = (m) => state.routine.priorities[m] || "normal";
const rankHolder = (n) => MUSCLES.find((m) => state.routine.priorities[m] === n) || "";
function weeklyTarget(m) {
  const p = priOf(m);
  if (p === "baja") return SMALL_MUSCLES.has(m) ? 0 : Math.round(BASE_SETS[m] / 2);
  return BASE_SETS[m] + (PRI_BONUS[p] || 0);
}
function weeklyVolume(days = state.routine.days) {
  const v = {};
  for (const d of days) for (const it of d.items) { const ex = exById(it.exId); if (ex) v[ex.muscle] = (v[ex.muscle] || 0) + num(it.sets); }
  return v;
}

/* Programa: bloques de semanas de carga + descarga (ambos configurables) */
const DURATIONS = [[4, "1 mes"], [6, "6 semanas"], [8, "2 meses"], [12, "3 meses"], [16, "4 meses"], [20, "5 meses"], [24, "6 meses"]];
const deloadCfg = () => ({ work: 4, weeks: 1, mult: 0.5, ...(state.routine.program.deload || {}) });
function programWeeks(N, cfg = deloadCfg()) {
  const out = [];
  let left = N, block = 1;
  while (left > 0) {
    let work, dl;
    if (left >= cfg.work + cfg.weeks) { work = cfg.work; dl = cfg.weeks; }
    else if (left > cfg.weeks + 1) { work = left - cfg.weeks; dl = cfg.weeks; }
    else { work = left; dl = 0; }
    // Si después quedarían 1-2 semanas sueltas, se suman a este bloque
    const rest = left - work - dl;
    if (rest > 0 && rest < 3) work += rest;
    for (let i = 0; i < work; i++) {
      const t = work > 1 ? i / (work - 1) : 0.5;
      out.push({ block, deload: false, mult: Math.round((0.85 + 0.25 * t) * 100) / 100, rir: ["3", "2", "1-2", "0-1"][Math.round(t * 3)], phase: t < 0.34 ? "Acumulación" : t < 0.67 ? "Progresión" : "Intensificación" });
    }
    for (let i = 0; i < dl; i++) out.push({ block, deload: true, mult: cfg.mult, rir: "4", phase: "Descarga" });
    left -= work + dl; block++;
  }
  return out;
}
function programInfo() {
  const p = state.routine.program;
  if (!p?.weeks) return null;
  const weeks = programWeeks(p.weeks);
  const idx = Math.floor((new Date(todayISO()) - new Date(p.start)) / (7 * 864e5));
  const end = new Date(new Date(p.start).getTime() + p.weeks * 7 * 864e5 - 864e5).toISOString().slice(0, 10);
  return { weeks, idx, cur: idx >= 0 && idx < weeks.length ? weeks[idx] : null, total: p.weeks, end, finished: idx >= weeks.length };
}
function programBanner() {
  const pi = programInfo();
  if (!pi || !state.routine.days.length) return "";
  if (pi.finished) return `<p class="small"><span class="tag peach">Programa terminado</span> Genera uno nuevo en Rutina para seguir progresando.</p>`;
  if (!pi.cur) return `<p class="small muted">Tu programa empieza el ${esc(fmtDate(state.routine.program.start))}.</p>`;
  return `<p class="small"><span class="tag ${pi.cur.deload ? "peach" : ""}">Semana ${pi.idx + 1} de ${pi.total}</span> ${esc(pi.cur.phase)} · series ×${pi.cur.mult} · RIR ${esc(pi.cur.rir)}</p>`;
}

/* Selección de ejercicios basada en evidencia: [id, variante, razón] en orden de preferencia */
const SCIENCE = {
  Pecho: [["press-inclinado", 1, "Mancuerna: más rango y estiramiento del pectoral"], ["press-maquina", 0, "Estable: puedes llegar cerca del fallo con seguridad"], ["aperturas", 0, "Polea: tensión en la posición estirada"], ["press-banca", 0, ""], ["fondos", 0, "Inclínate adelante para cargar el pecho"]],
  Espalda: [["jalon", 1, "Estira del todo arriba en cada rep"], ["remo-pecho-apoyado", 0, "Pecho apoyado: sin fatiga lumbar"], ["remo-sentado", 0, "Deja ir los hombros adelante al estirar"], ["dominadas", 0, ""], ["pullover", 0, "Dorsal en estiramiento"]],
  "Bíceps": [["curl-bayesian", 0, "Brazo detrás del cuerpo: bíceps estirado"], ["curl-inclinado", 0, "Posición alargada del bíceps"], ["curl-predicador", 1, ""]],
  "Tríceps": [["ext-cabeza", 0, "Sobre la cabeza crece más que en polea (Maeo 2023)"], ["ext-polea", 0, ""], ["press-frances", 0, ""]],
  "Cuádriceps": [["hack", 0, "Rango profundo y estable"], ["extension-cuad", 0, "Respaldo reclinado: recto femoral estirado (Pedrosa 2022)"], ["sentadilla", 0, ""], ["bulgara", 0, ""], ["prensa", 0, "Baja lo más profundo que controles"]],
  Femoral: [["curl-femoral", 0, "Sentado > tumbado: más crecimiento (Maeo 2021)"], ["rumano", 0, "Bisagra de cadera: femoral estirado"]],
  "Glúteo": [["bulgara", 0, "Glúteo en estiramiento profundo"], ["abduccion", 0, ""], ["hip-thrust", 0, ""]],
  Pantorrilla: [["talones", 0, "Pausa 1–2 s abajo, en el estiramiento (Kassiano 2023)"], ["talones-prensa", 0, ""]],
  Abdomen: [["crunch", 0, "En polea puedes progresar en peso"], ["elev-piernas", 0, ""]],
  Trapecio: [["encogimientos", 1, ""]],
  Antebrazo: [["curl-muneca", 0, ""]],
};
const SHOULDER_POOL = {
  tiron: [["reverse-pec", 0, "Deltoide posterior"], ["face-pull", 0, ""]],
  empuje: [["laterales", 1, "Polea por detrás del cuerpo: tensión en el estiramiento"], ["press-hombro-maquina", 0, ""]],
  default: [["laterales", 1, "Polea por detrás del cuerpo: tensión en el estiramiento"], ["press-hombro-maquina", 0, ""], ["reverse-pec", 0, "Deltoide posterior"]],
};
// Split automático según los días
const SPLITS = {
  2: [["Full body A", "full"], ["Full body B", "full"]],
  3: [["Full body A", "full"], ["Full body B", "full"], ["Full body C", "full"]],
  4: [["Torso A", "torso"], ["Pierna A", "pierna"], ["Torso B", "torso"], ["Pierna B", "pierna"]],
  5: [["Torso", "torso"], ["Pierna A", "pierna"], ["Empuje", "empuje"], ["Tirón", "tiron"], ["Pierna B", "pierna"]],
  6: [["Empuje A", "empuje"], ["Tirón A", "tiron"], ["Pierna A", "pierna"], ["Empuje B", "empuje"], ["Tirón B", "tiron"], ["Pierna B", "pierna"]],
};
// Splits a elegir: patrón de tipos de día que se repite hasta llenar los días de la semana
const SPLIT_TYPES = {
  auto: ["Automático (según tus días)", null],
  full: ["Full body", ["full"]],
  ul: ["Torso / Pierna", ["torso", "pierna"]],
  ppl: ["Empuje / Tirón / Pierna", ["empuje", "tiron", "pierna"]],
  ulppl: ["Torso / Pierna + Empuje / Tirón / Pierna", ["torso", "pierna", "empuje", "tiron", "pierna"]],
  arnold: ["Arnold (Pecho+Espalda / Hombro+Brazos / Pierna)", ["pechoespalda", "hombrobrazos", "pierna"]],
  bro: ["Un grupo por día (bro split)", ["pecho", "espalda", "pierna", "hombro", "brazos"]],
};
const TYPE_NAME = { full: "Full body", torso: "Torso", pierna: "Pierna", empuje: "Empuje", tiron: "Tirón", pecho: "Pecho", espalda: "Espalda", hombro: "Hombro", brazos: "Brazos", pechoespalda: "Pecho y espalda", hombrobrazos: "Hombro y brazos" };
const DAY_MUSCLES = {
  full: ["Pecho", "Espalda", "Hombro", "Bíceps", "Tríceps", "Cuádriceps", "Femoral", "Glúteo", "Pantorrilla", "Abdomen", "Trapecio", "Antebrazo"],
  torso: ["Pecho", "Espalda", "Hombro", "Bíceps", "Tríceps", "Trapecio", "Antebrazo"],
  pierna: ["Cuádriceps", "Femoral", "Glúteo", "Pantorrilla", "Abdomen"],
  empuje: ["Pecho", "Hombro", "Tríceps"],
  tiron: ["Espalda", "Bíceps", "Hombro", "Trapecio", "Antebrazo"],
  pecho: ["Pecho", "Abdomen"],
  espalda: ["Espalda", "Trapecio"],
  hombro: ["Hombro", "Antebrazo"],
  brazos: ["Bíceps", "Tríceps", "Antebrazo"],
  pechoespalda: ["Pecho", "Espalda", "Trapecio"],
  hombrobrazos: ["Hombro", "Bíceps", "Tríceps", "Antebrazo"],
};
function splitDays(n) {
  const pattern = SPLIT_TYPES[state.routine.split || "auto"]?.[1];
  const types = pattern ? Array.from({ length: n }, (_, i) => pattern[i % pattern.length]) : SPLITS[n].map(([, t]) => t);
  const count = {}, seen = {};
  types.forEach((t) => (count[t] = (count[t] || 0) + 1));
  return types.map((t) => { seen[t] = (seen[t] || 0) + 1; return { name: TYPE_NAME[t] + (count[t] > 1 ? " " + "ABC"[seen[t] - 1] : ""), type: t, items: [] }; });
}
function generateRoutine() {
  const n = num(state.routine.daysPerWeek) || 4;
  const days = splitDays(n);
  const occ = {};
  for (const m of MUSCLES) {
    const target = weeklyTarget(m);
    if (!target) continue;
    const dIdx = days.map((d, i) => (DAY_MUSCLES[d.type].includes(m) ? i : -1)).filter((i) => i >= 0);
    // Con 1 sesión por semana se permite más volumen por sesión para no perder el de las prioridades
    const sessionCap = dIdx.length === 1 ? 14 : 10;
    dIdx.forEach((di, j) => {
      const day = days[di];
      const perDay = Math.min(sessionCap, Math.floor(target / dIdx.length) + (j < target % dIdx.length ? 1 : 0));
      if (!perDay) return;
      const pool = (m === "Hombro" ? SHOULDER_POOL[day.type] || SHOULDER_POOL.default : SCIENCE[m]).filter(([id]) => exById(id));
      if (!pool.length) return;
      const nEx = Math.min(pool.length, perDay <= 4 ? 1 : perDay <= 8 ? 2 : 3);
      const o = (occ[m] = (occ[m] ?? -1) + 1);
      const start = (o * nEx) % pool.length;
      const chosen = [...pool.slice(start), ...pool.slice(0, start)].filter(([id]) => !day.items.some((it) => it.exId === id)).slice(0, nEx);
      let left = perDay;
      chosen.forEach(([id, variant, why], k) => {
        const sets = Math.ceil(left / (chosen.length - k)); left -= sets;
        const comp = COMPOUND.has(id), p = priOf(m);
        day.items.push({ exId: id, variant, sets, reps: comp ? "6-10" : m === "Pantorrilla" || m === "Abdomen" ? "10-20" : "10-15", rest: comp ? 150 : 90, note: [typeof p === "number" ? `Prioridad ${p}` : "", why].filter(Boolean).join(" · "), _m: m });
      });
    });
  }
  const key = (it) => { const p = priOf(it._m); return (typeof p === "number" ? p : 5) * 100 + (COMPOUND.has(it.exId) ? 0 : 50) + MUSCLES.indexOf(it._m); };
  // Balancea: un día de más de ~28 series manda aislamientos al día más ligero; si aún se pasa, recorta
  const CAP = 28, tot = (d) => d.items.reduce((a, it) => a + it.sets, 0);
  let trimmed = false;
  days.forEach((d) => d.items.sort((a, b) => key(a) - key(b)));
  for (const d of days) {
    for (let guard = 0; tot(d) > CAP && guard < 20; guard++) {
      const light = days.filter((x) => x !== d).sort((a, b) => tot(a) - tot(b))[0];
      const pick = light && d.items.map((it, i) => [it, i]).reverse().find(([it]) => !COMPOUND.has(it.exId) && !light.items.some((x) => x.exId === it.exId) && tot(light) + it.sets <= CAP - 2);
      if (!pick) break;
      light.items.push(d.items.splice(pick[1], 1)[0]);
    }
    while (tot(d) > CAP + 2) { const it = [...d.items].reverse().find((x) => x.sets > 2); if (!it) break; it.sets--; trimmed = true; }
  }
  days.forEach((d) => d.items.sort((a, b) => key(a) - key(b)));
  // Opcional: la semana empieza con el día que trabaja el músculo elegido, y ese músculo va primero
  const sm = state.routine.startMuscle;
  if (sm) {
    const first = days.findIndex((d) => d.items.some((it) => it._m === sm));
    if (first > 0) days.push(...days.splice(0, first));
    if (first >= 0) { const d0 = days[0]; d0.items = [...d0.items.filter((it) => it._m === sm), ...d0.items.filter((it) => it._m !== sm)]; }
    // Renombra A/B/C según el nuevo orden
    const cnt = {}, seen = {};
    days.forEach((d) => (cnt[d.type] = (cnt[d.type] || 0) + 1));
    days.forEach((d) => { seen[d.type] = (seen[d.type] || 0) + 1; d.name = TYPE_NAME[d.type] + (cnt[d.type] > 1 ? " " + "ABC"[seen[d.type] - 1] : ""); });
  }
  days.forEach((d) => { d.items.forEach((it) => delete it._m); delete d.type; });
  state.routine.days = days;
  state.routine.program.start = todayISO();
  const pri = [1, 2, 3, 4].map(rankHolder).filter(Boolean);
  state.routine.summary = `${n} días · ${days.map((d) => d.name).join(" / ")} · ${state.routine.program.weeks} semanas${pri.length ? ` · Prioridades: ${pri.map((m, i) => `${i + 1}. ${m}`).join(", ")}` : ""}`;
  ui.rTab = "rutina";
  save(); render();
  toast(trimmed && n < 6 ? "Rutina lista. Para todo el volumen de tus prioridades conviene entrenar más días" : "Rutina generada con base científica");
}

/* Vista principal de Rutina con tres sub-secciones */
function viewRutina() {
  ui.rTab ||= state.routine.days.length ? "rutina" : "plan";
  const tabs = [["plan", "Plan"], ["rutina", "Mi rutina"], ["articulos", `Artículos${state.sources.length ? ` (${state.sources.length})` : ""}`]];
  return `
  <header class="page-head"><div><p class="eyebrow">Plan de entrenamiento</p><h1>Rutina</h1></div>
    <button class="icon-btn" data-action="settings" aria-label="Ajustes">${ICON.gear}</button></header>
  ${state.routine.summary ? `<p class="small muted">${esc(state.routine.summary)}</p>` : ""}
  <div class="seg full" role="tablist">${tabs.map(([k, l]) => `<button class="${ui.rTab === k ? "on" : ""}" data-action="r-tab" data-k="${k}">${esc(l)}</button>`).join("")}</div>
  ${ui.rTab === "plan" ? viewPlan() : ui.rTab === "rutina" ? viewMyRoutine() : viewArticles()}`;
}

function viewPlan() {
  const r = state.routine, prog = r.program, pi = programInfo(), dl = deloadCfg();
  const custom = !DURATIONS.some(([w]) => w === prog.weeks);
  const opt = (v, cur, label = v) => `<option value="${esc(v)}" ${String(cur) === String(v) ? "selected" : ""}>${esc(label)}</option>`;
  return `
  <section class="card">
    <h2>Estructura</h2>
    <div class="grid-2">
      <label class="field">Días por semana<select class="input" id="days-pw" data-input="days-pw">${[2, 3, 4, 5, 6].map((n) => opt(n, r.daysPerWeek)).join("")}</select></label>
      <label class="field">Empezar la semana con<select class="input" id="x-start-m" data-input="x-start-m">${opt("", r.startMuscle || "", "Sin preferencia")}${MUSCLES.map((m) => opt(m, r.startMuscle || "")).join("")}</select></label>
    </div>
    <label class="field">Tipo de split<select class="input" id="x-split" data-input="x-split">${Object.entries(SPLIT_TYPES).map(([k, [l]]) => opt(k, r.split || "auto", l)).join("")}</select></label>
    <p class="small muted">${(r.split || "auto") === "bro" ? "Ojo: un grupo por día entrena cada músculo 1 vez por semana; la evidencia favorece 2 (Schoenfeld 2016). Se compensa con más series por sesión." : "Ambos campos son opcionales: en automático se elige el split con mejor frecuencia para tus días."}</p>
  </section>

  <section class="card">
    <h2>Programa</h2>
    <div class="grid-2">
      <label class="field">Duración<select class="input" id="r-dur" data-input="r-dur">${DURATIONS.map(([w, l]) => `<option value="${w}" ${prog.weeks === w ? "selected" : ""}>${l} (${w} sem)</option>`).join("")}<option value="custom" ${custom ? "selected" : ""}>Otra…</option></select></label>
      ${custom ? `<label class="field">Semanas<input class="input num" id="r-weeks" data-input="r-weeks" inputmode="numeric" value="${prog.weeks}"></label>` : `<div class="field"><span>Termina</span><span class="input" style="background:var(--surface-2)">${esc(fmtDate(pi.end, { day: "numeric", month: "short", year: "numeric" }))}</span></div>`}
      <label class="field">Empieza<input class="input" type="date" id="r-start" data-input="r-start" value="${esc(prog.start)}"></label>
    </div>
    <div class="weeks">${pi.weeks.map((w, i) => `<span class="wk ${w.deload ? "deload" : ""} ${i === pi.idx ? "now" : ""} ${i < pi.idx ? "past" : ""}" title="${esc(w.phase)} · series ×${w.mult} · RIR ${esc(w.rir)}">${i + 1}</span>`).join("")}</div>
    <p class="small muted">Verde: semanas de carga, subiendo series (×0.85 → ×1.1) y esfuerzo (RIR 3 → 0-1). <span class="tag peach">Naranja</span>: descarga. ${pi.cur ? `Hoy estás en la semana ${pi.idx + 1}: ${esc(pi.cur.phase)}.` : ""}</p>
  </section>

  <section class="card">
    <h2>Descargas</h2>
    <div class="grid-3">
      <label class="field">Cada<select class="input" id="x-dl-work" data-input="x-dl" data-k="work">${[3, 4, 5, 6, 8].map((n) => opt(n, dl.work, `${n} sem de carga`)).join("")}</select></label>
      <label class="field">Duración<select class="input" id="x-dl-weeks" data-input="x-dl" data-k="weeks">${[1, 2, 3].map((n) => opt(n, dl.weeks, `${n} semana${n > 1 ? "s" : ""}`)).join("")}</select></label>
      <label class="field">Series<select class="input" id="x-dl-mult" data-input="x-dl" data-k="mult">${[0.3, 0.4, 0.5, 0.6, 0.7].map((n) => opt(n, dl.mult, `${n * 100}%`)).join("")}</select></label>
    </div>
    <div class="chips wrap">
      <button class="chip" data-action="x-dl-preset" data-v="4,1,0.5">Clásica 4+1</button>
      <button class="chip" data-action="x-dl-preset" data-v="4,2,0.5">Larga 4+2</button>
      <button class="chip" data-action="x-dl-preset" data-v="6,1,0.5">Consenso Bell 2023 (6+1)</button>
      <button class="chip" data-action="x-dl-preset" data-v="5,2,0.4">Recuperación 5+2</button>
    </div>
    <label class="field">Basar las descargas en un artículo<select class="input" id="x-dl-src" data-input="x-dl-src">${opt("", prog.deloadSrc || "", "— Ninguno —")}${state.sources.map((s) => opt(s.id, prog.deloadSrc || "", s.title)).join("")}</select></label>
    ${prog.deloadSrc ? `<button class="btn peach" data-action="x-dl-ai" ${ui.dlBusy ? "disabled" : ""}>${ui.dlBusy ? "Leyendo el artículo…" : "Ajustar descargas con Claude según el artículo"}</button>` : `<p class="small muted">Sube o agrega el artículo en la pestaña Artículos (hay estudios sobre descargas en la biblioteca científica).</p>`}
    ${ui.dlMsg ? `<div class="ai-out">${esc(ui.dlMsg)}</div>` : ""}
  </section>

  <section class="card">
    <h2>Prioridades</h2>
    <p class="muted small">Tu músculo #1 recibe más series (+10/sem) y va primero en cada sesión; #2 +8, #3 +6, #4 +4.</p>
    <div class="grid-2">${[1, 2, 3, 4].map((n) => `<label class="field">${n}ª prioridad<select class="input" id="pri-${n}" data-input="r-pri" data-n="${n}"><option value="">—</option>${MUSCLES.map((m) => `<option ${rankHolder(n) === m ? "selected" : ""}>${m}</option>`).join("")}</select></label>`).join("")}</div>
    <p class="eyebrow">Solo mantener (menos series)</p>
    <div class="chips wrap">${MUSCLES.filter((m) => typeof priOf(m) !== "number").map((m) => `<button class="chip ${priOf(m) === "baja" ? "pri-baja on" : ""}" data-action="r-keep" data-m="${esc(m)}">${esc(m)}</button>`).join("")}</div>
    <p class="eyebrow">Series por semana que tendrá cada músculo</p>
    <div class="chips wrap">${MUSCLES.filter((m) => weeklyTarget(m)).map((m) => `<span class="chip ${typeof priOf(m) === "number" ? "pri-alta" : ""}">${esc(m)} <span class="num">${weeklyTarget(m)}</span></span>`).join("")}</div>
  </section>

  <section class="card">
    <h2>Crear rutina</h2>
    <button class="btn primary block" data-action="r-generate">Generar con base científica</button>
    <button class="btn peach block" data-action="r-ai-create" ${ui.aiBusy ? "disabled" : ""}>${ICON.spark} Crear con Claude usando mis ${state.sources.filter((s) => s.active).length || ""} artículos</button>
    <p class="small muted">La primera usa las reglas de abajo sin conexión. La segunda además lee tus artículos guardados (necesita API key en Ajustes).</p>
  </section>

  <details class="card">
    <summary>Por qué está armada así (evidencia)</summary>
    <ul class="small stack" style="padding-left:18px;margin:0">
      <li><b>Volumen:</b> 10–20 series semanales por músculo. Más series dan más crecimiento, con rendimientos decrecientes (Schoenfeld, Ogborn y Krieger 2017; Pelland et al. 2024). Por eso tus prioridades llegan a ~20.</li>
      <li><b>Frecuencia:</b> cada músculo 2 veces por semana (Schoenfeld 2016), máximo ~10 series por sesión para que las últimas sigan siendo de calidad.</li>
      <li><b>Esfuerzo:</b> 0–3 repeticiones en reserva (RIR). Acercarse al fallo mejora la hipertrofia (Robinson et al. 2024).</li>
      <li><b>Repeticiones:</b> de 6 a 20 reps funcionan igual para crecer si llegas cerca del fallo (Schoenfeld et al. 2017). Compuestos 6–10, aislamientos 10–15.</li>
      <li><b>Descanso:</b> 2–3 min en compuestos rinde más que 1 min (Schoenfeld et al. 2016).</li>
      <li><b>Posición estirada:</b> femoral sentado (Maeo 2021), tríceps sobre la cabeza (Maeo 2023), pantorrilla con pausa abajo (Kassiano 2023), extensión de cuádriceps reclinado (Pedrosa 2022).</li>
      <li><b>Progresión doble:</b> cuando haces el tope del rango de reps en todas las series al RIR indicado, sube 2–5% el peso. La app te avisa.</li>
      <li><b>Descarga:</b> el consenso de expertos sugiere cada 4–8 semanas, ~1 semana, bajando volumen y esfuerzo (Bell et al. 2023); una semana de descarga no frena la hipertrofia (Coleman et al. 2024).</li>
    </ul>
  </details>`;
}

function viewMyRoutine() {
  const r = state.routine, vol = weeklyVolume();
  return `
  ${r.days.length ? r.days.map((d, di) => `
    <section class="card">
      <div class="row" style="gap:6px">
        <input class="input" style="flex:1;min-width:120px;font-weight:700" id="dn-${di}" data-input="day-name" data-d="${di}" value="${esc(d.name)}" aria-label="Nombre del día">
        ${di ? `<button class="icon-btn" data-action="r-day-up" data-d="${di}" aria-label="Subir día">${ICON.up}</button>` : ""}
        <button class="icon-btn" data-action="r-day-dup" data-d="${di}" aria-label="Duplicar día">${ICON.copy}</button>
        <button class="icon-btn" data-action="r-day-del" data-d="${di}" aria-label="Borrar día">${ICON.x}</button>
      </div>
      <p class="small muted">${d.items.length} ejercicios · ${d.items.reduce((a, it) => a + num(it.sets), 0)} series</p>
      <div>${d.items.map((it, ii) => { const ex = exById(it.exId); return `<div class="day-item">
        <button class="grow-btn" data-action="r-item-edit" data-d="${di}" data-i="${ii}"><b>${esc(ex?.name || "?")}</b> <span class="tag gray">${esc(ex?.variants[it.variant] || "")}</span><br><span class="num small">${esc(it.sets)} × ${esc(it.reps)}${it.rest ? ` · ${restLabel(it.rest)}` : ""}</span></button>
        <span class="row" style="gap:4px">${ii ? `<button class="icon-btn" data-action="r-item-move" data-dir="-1" data-d="${di}" data-i="${ii}" aria-label="Subir">${ICON.up}</button>` : ""}${ii < d.items.length - 1 ? `<button class="icon-btn" data-action="r-item-move" data-dir="1" data-d="${di}" data-i="${ii}" aria-label="Bajar">${ICON.down}</button>` : ""}<button class="icon-btn" data-action="r-item-del" data-d="${di}" data-i="${ii}" aria-label="Quitar">${ICON.x}</button></span>
        ${it.note ? `<span class="note">${esc(it.note)}</span>` : ""}
      </div>`; }).join("")}</div>
      <button class="btn ghost small" data-action="picker" data-mode="routine" data-d="${di}">${ICON.plus} Ejercicio</button>
    </section>`).join("") : `<section class="card"><div class="empty"><p>No tienes rutina todavía. Créala en <b>Plan</b> o arma tus días a mano.</p></div></section>`}
  <div class="row"><button class="btn primary" data-action="r-day-add">${ICON.plus} Día</button>${r.days.length ? `<button class="btn danger small" data-action="r-clear">Vaciar rutina</button>` : ""}</div>
  ${r.days.length ? `<section class="card"><h3>Series por semana (objetivo)</h3><div class="chips wrap">${MUSCLES.filter((m) => vol[m] || weeklyTarget(m)).map((m) => { const t = weeklyTarget(m), v = vol[m] || 0; return `<span class="chip ${v < t * 0.75 ? "pri-alta" : ""}">${esc(m)} <span class="num">${v}/${t}</span></span>`; }).join("")}</div><p class="small muted">En naranja: músculos por debajo de su objetivo.</p></section>` : ""}`;
}
const restLabel = (s) => (s >= 120 ? `${round(s / 60, 0.5)} min` : `${s} s`);

function itemEditSheet(di, ii) {
  const it = state.routine.days[di].items[ii];
  const ex = exById(it.exId);
  return `<div class="row between"><h2>${esc(ex?.name)}</h2><button class="icon-btn" data-action="close-sheet" aria-label="Cerrar">${ICON.x}</button></div>
  <button class="btn ghost" data-action="r-swap" data-d="${di}" data-i="${ii}">Cambiar por otro ejercicio</button>
  <form class="stack" data-form="r-item" data-d="${di}" data-i="${ii}">
    <label class="field">Variante<select class="input" name="variant" id="ie-var">${ex.variants.map((v, i) => `<option value="${i}" ${it.variant === i ? "selected" : ""}>${esc(v)}</option>`).join("")}</select></label>
    <div class="grid-3"><label class="field">Series<input class="input num" name="sets" id="ie-sets" inputmode="numeric" value="${esc(it.sets)}"></label>
    <label class="field">Reps<input class="input num" name="reps" id="ie-reps" value="${esc(it.reps)}"></label>
    <label class="field">Descanso (s)<input class="input num" name="rest" id="ie-rest" inputmode="numeric" value="${esc(it.rest || 90)}"></label></div>
    <label class="field">Nota<input class="input" name="note" id="ie-note" value="${esc(it.note || "")}" placeholder="Ej. 2 seg en la bajada"></label>
    <p class="small muted">Las series son las de una semana normal; el programa las ajusta cada semana (descarga = mitad).</p>
    <button class="btn primary" type="submit">Guardar</button>
  </form>`;
}

/* Artículos guardados: alimentan la creación de rutinas con Claude */
const scholarURL = (t) => "https://scholar.google.com/scholar?q=" + encodeURIComponent(t);
const SRC_KIND = { link: ["Link", "gray"], file: ["Doc", "peach"], note: ["Nota", "gray"], science: ["Estudio", ""] };
function viewArticles() {
  const act = state.sources.filter((s) => s.active).length;
  const added = new Set(state.sources.map((s) => s.sciId).filter(Boolean));
  const topics = [...new Set(SCI_LIB.map((x) => x.topic))];
  return `
  <section class="card">
    <h2>Agregar artículos</h2>
    <p class="muted small">Se guardan aquí y Claude los usa cada vez que crea o ajusta tu rutina. Puedes pegar varios links a la vez (uno por línea) y subir varios PDF. Para videos de YouTube pega también la transcripción o los puntos clave: Claude lee páginas, pero no ve videos.</p>
    <form class="stack" data-form="r-src">
      <textarea class="input" name="urls" id="src-urls" placeholder="https://… (un link por línea)"></textarea>
      <textarea class="input" name="text" id="src-text" placeholder="Notas o transcripción (opcional). Ej. Jeff Nippard: mejores ejercicios de hombro = laterales en polea, press en máquina…"></textarea>
      <p class="eyebrow">¿A qué músculos aplica?</p>
      <div class="chips wrap">${MUSCLES.map((m) => `<button type="button" class="chip ${ui.srcTags?.includes(m) ? "on" : ""}" data-action="r-src-tag" data-m="${esc(m)}">${esc(m)}</button>`).join("")}</div>
      <div class="row"><button class="btn primary" type="submit">Guardar</button>
        <label class="btn ghost">Subir PDF / texto<input type="file" id="src-file" data-input="src-file" accept=".pdf,.txt,.md,text/plain,application/pdf" hidden multiple></label></div>
    </form>
  </section>
  <section class="card">
    <div class="section-title"><h2>Tu biblioteca</h2><span class="tag">${act} en uso</span></div>
    ${state.sources.length ? `<div>${state.sources.map((s) => { const [kl, kc] = SRC_KIND[s.kind] || SRC_KIND.note; return `<div class="source">
      <input type="checkbox" class="tick" id="use-${s.id}" data-input="r-src-active" data-id="${s.id}" ${s.active ? "checked" : ""} aria-label="Usar al crear rutina">
      <div class="grow"><b>${esc(s.title)}</b> <span class="tag ${kc}">${kl}</span>
        ${s.url || s.ref ? `<br><a class="small" href="${esc(s.url || s.ref)}" target="_blank" rel="noopener">${s.url ? esc(s.url) : "Buscar el estudio"}</a>` : ""}
        ${(s.tags || []).length ? `<br>${s.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join(" ")}` : ""}
        ${s.text ? `<br><span class="small muted">${esc(s.text.slice(0, 160))}${s.text.length > 160 ? "…" : ""}</span>` : ""}</div>
      <button class="icon-btn" data-action="del-src" data-id="${s.id}" aria-label="Quitar">${ICON.x}</button></div>`; }).join("")}</div>`
      : `<div class="empty"><p>Aún no guardas artículos. Empieza con los estudios de abajo.</p></div>`}
  </section>
  <section class="card">
    <div class="section-title"><h2>Biblioteca científica</h2><button class="btn small ghost" data-action="x-sci-all">Agregar todos</button></div>
    <p class="small muted">Estudios y revisiones que elegí como base. Agrégalos a tu biblioteca para que Claude los use al crear tu rutina, tus descargas o tu dieta.</p>
    ${topics.map((t) => `<p class="eyebrow">${esc(t)}</p>${SCI_LIB.filter((x) => x.topic === t).map((x) => `<div class="source">
      <div class="grow"><b>${esc(x.authors)} (${x.year})</b> <span class="small muted">· ${esc(x.journal)}</span><br>
        <span class="small">${esc(x.finding)}</span><br>
        <a class="small" href="${esc(scholarURL(x.title))}" target="_blank" rel="noopener">${esc(x.title)}</a></div>
      ${added.has(x.id) ? `<span class="tag">Agregado</span>` : `<button class="btn small primary" data-action="x-sci-add" data-id="${x.id}">Agregar</button>`}
    </div>`).join("")}`).join("")}
  </section>
  <section class="card">
    <h2>Crear o ajustar con Claude</h2>
    <textarea class="input" id="ai-ask" data-input="ai-ask" placeholder="Ej. Usa el artículo de hombro para cambiar mis ejercicios de hombro. Tengo 60 min por sesión.">${esc(ui.aiAsk || "")}</textarea>
    <div class="row"><button class="btn peach" data-action="r-ai" ${ui.aiBusy ? "disabled" : ""}>${ui.aiBusy ? "Leyendo artículos…" : state.routine.days.length ? "Ajustar mi rutina" : "Crear rutina"}</button>
      ${state.settings.apiKey ? "" : `<button class="btn ghost small" data-action="settings">Configurar API key</button>`}</div>
    <div id="ai-box">${aiBoxHTML()}</div>
  </section>`;
}
function addScience(x) {
  if (state.sources.some((s) => s.sciId === x.id)) return;
  state.sources.push({ id: uid(), kind: "science", sciId: x.id, title: `${x.authors} ${x.year} · ${x.topic}`, url: "", ref: scholarURL(x.title), text: `${x.title}. ${x.journal}. Hallazgo: ${x.finding}`, tags: x.tags || [], active: true, addedAt: todayISO() });
}

function aiBoxHTML() {
  const res = ui.aiResult;
  if (!res) return "";
  if (res.error) return `<div class="ai-out" style="color:var(--bad)">${esc(res.error)}</div>`;
  const vol = weeklyVolume(res.days);
  return `<div class="stack">
    <div class="ai-out"><b>${esc(res.resumen || "Propuesta lista")}</b>${(res.cambios || []).length ? "\n\n" + res.cambios.map((c) => "• " + c).join("\n") : ""}</div>
    ${res.days.map((d) => `<div class="day"><h3>${esc(d.name)}</h3>${d.items.map((it) => { const ex = exById(it.exId); return `<div class="day-item"><span><b>${esc(ex?.name)}</b> <span class="tag gray">${esc(ex?.variants[it.variant])}</span>${it.isNew ? ' <span class="tag peach">Nuevo</span>' : ""}</span><span class="num small">${esc(it.sets)} × ${esc(it.reps)}</span>${it.note ? `<span class="note">${esc(it.note)}</span>` : ""}</div>`; }).join("")}</div>`).join("")}
    <p class="small muted">Series/semana: ${MUSCLES.filter((m) => vol[m]).map((m) => `${m} ${vol[m]}`).join(" · ")}</p>
    <div class="row"><button class="btn primary" data-action="r-ai-apply">Aplicar a mi rutina</button><button class="btn ghost" data-action="ai-discard">Descartar</button></div>
  </div>`;
}

/* =========================================================
   CLAUDE (API de Anthropic desde el navegador)
   ========================================================= */
async function callClaude(content, { webFetch = false } = {}) {
  const { apiKey, model } = state.settings;
  if (!apiKey) throw new Error("Agrega tu API key de Anthropic en Ajustes (engrane en Rutina).");
  const messages = [{ role: "user", content }];
  const useFallback = model !== "claude-haiku-5-5";
  for (let round = 0; round < 5; round++) {
    const body = { model, max_tokens: 16000, output_config: { effort: "medium" }, messages };
    if (webFetch) body.tools = [{ type: "web_fetch_20260209", name: "web_fetch", max_uses: 10 }];
    if (useFallback) body.fallbacks = "default";
    const headers = { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" };
    if (useFallback) headers["anthropic-beta"] = "server-side-fallback-2026-07-01";
    const res = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data?.error?.message || res.statusText;
      if (res.status === 401) throw new Error("La API key no es válida. Revísala en Ajustes.");
      if (res.status === 429) throw new Error("Demasiadas solicitudes o sin saldo. Intenta en un momento.");
      throw new Error(`Error de la API (${res.status}): ${msg}`);
    }
    if (data.stop_reason === "refusal") throw new Error("Claude no pudo responder esta solicitud. Cambia el texto e intenta de nuevo.");
    if (data.stop_reason === "pause_turn") { messages.push({ role: "assistant", content: data.content }); continue; }
    return data.content.filter((b) => b.type === "text").map((b) => b.text).join("\n");
  }
  throw new Error("La respuesta tardó demasiado. Intenta con menos artículos.");
}
function parseJSON(text) {
  const fence = [...text.matchAll(/```(?:json)?\s*([\s\S]*?)```/g)].pop();
  const raw = fence ? fence[1] : text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  return JSON.parse(raw);
}

async function aiRoutine() {
  ui.aiBusy = true; ui.aiResult = null; ui.rTab = "articulos"; render();
  try {
    const lib = allExercises().map((e) => `${e.id} | ${e.name} | ${e.muscle} | ${e.variants.join(" / ")}`).join("\n");
    const current = state.routine.days.map((d) => ({ nombre: d.name, ejercicios: d.items.map((it) => ({ id: it.exId, variante: exById(it.exId)?.variants[it.variant], series: it.sets, reps: it.reps, descanso: it.rest, nota: it.note })) }));
    const pris = [1, 2, 3, 4].map((n) => rankHolder(n) && `${n}. ${rankHolder(n)} (${weeklyTarget(rankHolder(n))} series/sem)`).filter(Boolean).join(", ") || "ninguna";
    const keep = MUSCLES.filter((m) => priOf(m) === "baja").join(", ") || "ninguno";
    const targets = MUSCLES.map((m) => `${m} ${weeklyTarget(m)}`).join(", ");
    const content = [], lines = [];
    const active = state.sources.filter((s) => s.active);
    for (const s of active) {
      const tags = s.tags.length ? ` [aplica a: ${s.tags.join(", ")}]` : "";
      if (s.kind === "file" && s.mime === "application/pdf") {
        const blob = await fileGet(s.fileId);
        if (blob) content.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: await blobToB64(blob) }, title: s.title + tags });
      } else lines.push(`- ${s.title}${tags}${s.url ? ` (${s.url})` : ""}${s.text ? `\n  Contenido/notas: ${s.text.slice(0, 20000)}` : ""}`);
    }
    const hasLinks = active.some((s) => s.url);
    content.push({ type: "text", text:
`Eres un entrenador de hipertrofia basado en evidencia científica. ${state.routine.days.length ? "Ajusta" : "Crea"} la rutina semanal de esta persona.

Días por semana: ${state.routine.daysPerWeek}
Duración del programa: ${state.routine.program.weeks} semanas, con ${deloadCfg().weeks} semana(s) de descarga cada ${deloadCfg().work} de carga (la app aplica la progresión semanal y las descargas; tú define la semana base).
Tipo de split que quiere: ${SPLIT_TYPES[state.routine.split || "auto"][0]}${state.routine.startMuscle ? `. Quiere empezar la semana con ${state.routine.startMuscle}: pon primero el día que lo trabaja, con ese músculo al inicio.` : ""}
Prioridades musculares en orden: ${pris}
Músculos solo a mantener: ${keep}
Series semanales directas objetivo por músculo: ${targets}

Principios a seguir: 10-20 series/semana por músculo según prioridad; cada músculo 2 veces por semana; máximo ~10 series por músculo por sesión; los músculos prioritarios primero en la sesión; preferir ejercicios estables y con carga en la posición estirada; compuestos 6-10 reps y aislamientos 10-15; descanso 2-3 min en compuestos y 60-120 s en aislamientos; sesiones de máximo ~25-30 series.

Rutina actual (JSON): ${current.length ? JSON.stringify(current) : "no tiene; créala desde cero"}

Artículos guardados por la persona${hasLinks ? " (abre cada link con web_fetch; si es un video que no puedes ver, usa sus notas y lo que sabes del autor)" : ""}. Dales más peso que a tus preferencias, sobre todo a los que aplican a sus músculos prioritarios:
${lines.join("\n") || (content.length ? "(ver documentos adjuntos)" : "ninguno")}

Petición de la persona: ${ui.aiAsk?.trim() || "Arma la mejor rutina según sus prioridades y artículos."}

Biblioteca de ejercicios (id | nombre | músculo | variante 1 / variante 2). Usa estos ids cuando exista el ejercicio; si recomiendas uno que no está, pon "id": null y da nombre, músculo (uno de: ${MUSCLES.join(", ")}) y dos variantes.
${lib}

Responde en español. Al final escribe SOLO un bloque \`\`\`json con esta forma exacta:
{"resumen": "1-2 frases de qué hiciste y por qué", "cambios": ["cambio concreto citando el artículo o estudio cuando aplique"], "dias": [{"nombre": "Torso A", "ejercicios": [{"id": "laterales", "nombre": "Elevaciones laterales", "musculo": "Hombro", "variantes": ["Mancuerna", "Polea"], "variante": 1, "series": 4, "reps": "10-15", "descanso": 90, "nota": "técnica o razón breve"}]}]}
"variante" es 0 o 1 (índice dentro de variantes); "descanso" en segundos.` });
    const text = await callClaude(content, { webFetch: hasLinks });
    const j = parseJSON(text);
    const days = (j.dias || []).map((d) => ({ name: String(d.nombre || "Día"), items: (d.ejercicios || []).map((e) => {
      let ex = (e.id && exById(e.id)) || exByName(e.nombre || "");
      let isNew = false;
      if (!ex) {
        const v = Array.isArray(e.variantes) && e.variantes.length >= 2 ? e.variantes.slice(0, 2).map(String) : ["Libre", "Polea"];
        ex = { id: "c-" + uid(), name: String(e.nombre || "Ejercicio"), muscle: MUSCLES.includes(e.musculo) ? e.musculo : "Abdomen", variants: v, tier: 2, custom: true, _pending: true };
        state.customExercises.push(ex);
        isNew = true;
      }
      return { exId: ex.id, isNew, variant: e.variante === 1 ? 1 : 0, sets: num(e.series) || 3, reps: String(e.reps || "8-12"), rest: num(e.descanso) || (COMPOUND.has(ex.id) ? 150 : 90), note: String(e.nota || "") };
    }) }));
    ui.aiResult = { resumen: j.resumen, cambios: j.cambios || [], days };
  } catch (e) {
    ui.aiResult = { error: e.message || "No se pudo leer la respuesta de Claude. Intenta de nuevo." };
  }
  ui.aiBusy = false; render();
}
function aiCleanupPending(keep) {
  state.customExercises = state.customExercises.filter((e) => !e._pending || keep);
  state.customExercises.forEach((e) => delete e._pending);
}
function needsKey() {
  if (state.settings.apiKey) return false;
  openSheet(settingsSheet); toast("Primero agrega tu API key"); return true;
}

/* Eventos de Rutina */
document.addEventListener("click", (ev) => {
  const el = ev.target.closest("[data-action^='r-']");
  if (!el) return;
  const d = el.dataset, r = state.routine;
  switch (d.action) {
    case "r-tab": ui.rTab = d.k; render(); break;
    case "r-keep": r.priorities[d.m] = priOf(d.m) === "baja" ? "normal" : "baja"; save(); render(); break;
    case "r-generate": r.days.length ? confirmBox("¿Reemplazar tu rutina actual?", "Generar nueva", generateRoutine) : generateRoutine(); break;
    case "r-ai-create": case "r-ai": if (!needsKey()) aiRoutine(); break;
    case "r-ai-apply":
      aiCleanupPending(true);
      r.days = ui.aiResult.days.map((dy) => ({ name: dy.name, items: dy.items.map(({ exId, variant, sets, reps, rest, note }) => ({ exId, variant, sets, reps, rest, note })) }));
      r.summary = ui.aiResult.resumen || "";
      r.program.start = todayISO();
      ui.aiResult = null; ui.rTab = "rutina"; save(); render(); toast("Rutina actualizada"); break;
    case "r-day-add": r.days.push({ name: `Día ${r.days.length + 1}`, items: [] }); save(); render(); break;
    case "r-day-up": { const i = +d.d; [r.days[i - 1], r.days[i]] = [r.days[i], r.days[i - 1]]; save(); render(); break; }
    case "r-day-dup": { const c = structuredClone(r.days[+d.d]); c.name += " (copia)"; r.days.splice(+d.d + 1, 0, c); save(); render(); break; }
    case "r-day-del": confirmBox(`¿Borrar ${r.days[+d.d].name}?`, "Borrar día", () => { r.days.splice(+d.d, 1); save(); render(); }); break;
    case "r-clear": confirmBox("¿Vaciar toda la rutina?", "Vaciar", () => { r.days = []; r.summary = ""; save(); render(); }); break;
    case "r-item-move": { const it = r.days[+d.d].items, i = +d.i, j = i + +d.dir; [it[i], it[j]] = [it[j], it[i]]; save(); render(); break; }
    case "r-item-del": r.days[+d.d].items.splice(+d.i, 1); save(); render(); break;
    case "r-item-edit": openSheet(() => itemEditSheet(+d.d, +d.i)); break;
    case "r-swap": ui.picker = { mode: "swap", day: +d.d, item: +d.i }; ui.query = ""; openSheet(pickerSheet); break;
    case "r-swap-pick": {
      const it = r.days[ui.picker.day].items[ui.picker.item];
      Object.assign(it, { exId: d.id, variant: 0, note: "" });
      closeSheet(); save(); render(); toast("Ejercicio cambiado"); break;
    }
    case "r-src-tag": ui.srcTags = ui.srcTags?.includes(d.m) ? ui.srcTags.filter((x) => x !== d.m) : [...(ui.srcTags || []), d.m]; el.classList.toggle("on"); break;
  }
});
document.addEventListener("input", (ev) => {
  const el = ev.target, d = el.dataset, prog = state.routine.program;
  if (d.input === "r-weeks") { const w = Math.round(num(el.value)); if (w >= 1 && w <= 52) { prog.weeks = w; save(); } }
  if (d.input === "r-start" && el.value) { prog.start = el.value; save(); render(); }
});
document.addEventListener("change", (ev) => {
  const el = ev.target, d = el.dataset, r = state.routine;
  if (d.input === "r-dur") { r.program.weeks = el.value === "custom" ? r.program.weeks + 1 : +el.value; save(); render(); }
  if (d.input === "r-weeks") render();
  if (d.input === "r-pri") {
    const n = +d.n;
    for (const m of MUSCLES) if (r.priorities[m] === n) r.priorities[m] = "normal";
    if (el.value) r.priorities[el.value] = n;
    save(); render();
  }
  if (d.input === "r-src-active") { const s = state.sources.find((x) => x.id === d.id); if (s) { s.active = el.checked; save(); render(); } }
});
document.addEventListener("submit", (ev) => {
  const f = ev.target;
  if (!f.dataset.form?.startsWith("r-")) return;
  ev.preventDefault();
  const v = Object.fromEntries(new FormData(f));
  if (f.dataset.form === "r-item") {
    const it = state.routine.days[+f.dataset.d].items[+f.dataset.i];
    Object.assign(it, { variant: +v.variant, sets: num(v.sets) || 3, reps: v.reps || "8-12", rest: num(v.rest) || 90, note: v.note });
    save(); closeSheet(); render();
  }
  if (f.dataset.form === "r-src") {
    const urls = v.urls.split(/\s+/).map((u) => u.trim()).filter(Boolean), text = v.text.trim(), tags = ui.srcTags || [];
    if (!urls.length && !text) { toast("Pega al menos un link o escribe una nota"); return; }
    const bad = urls.filter((u) => { try { new URL(u); return false; } catch { return true; } });
    if (bad.length) { toast(`Link no válido: ${bad[0]}`); return; }
    for (const url of urls) {
      const u = new URL(url);
      state.sources.push({ id: uid(), kind: "link", title: u.hostname.replace("www.", "") + (u.hostname.includes("youtu") ? " · video" : u.pathname.length > 1 ? " · " + decodeURIComponent(u.pathname.split("/").filter(Boolean).pop()).replace(/[-_]/g, " ").slice(0, 50) : ""), url, text: urls.length === 1 ? text : "", tags, active: true, addedAt: todayISO() });
    }
    if (text && urls.length !== 1) state.sources.push({ id: uid(), kind: "note", title: text.split("\n")[0].slice(0, 60), url: "", text, tags, active: true, addedAt: todayISO() });
    ui.srcTags = []; save(); render(); toast(`${urls.length + (text && urls.length !== 1 ? 1 : 0)} guardado(s) en tu biblioteca`);
  }
});

/* =========================================================
   RANGO (jerarquía de un ejército medieval según tu fuerza)
   ========================================================= */
// Estándares de fuerza aproximados: 1RM estimado / peso corporal (hombre) para
// principiante, novato, intermedio, avanzado y élite.
const LIFTS = [
  { id: "press-banca", v: [0], name: "Press de banca", std: [0.5, 0.75, 1.0, 1.5, 2.0], kind: "up" },
  { id: "sentadilla", v: [0], name: "Sentadilla", std: [0.75, 1.25, 1.5, 2.25, 2.75], kind: "low" },
  { id: "peso-muerto", v: [0, 1], name: "Peso muerto", std: [1.0, 1.5, 2.0, 2.5, 3.0], kind: "low" },
  { id: "press-militar", v: [0], name: "Press militar", std: [0.35, 0.55, 0.75, 1.0, 1.3], kind: "up" },
  { id: "dominadas", v: [0, 1], name: "Dominadas", std: [1.0, 1.15, 1.35, 1.6, 1.9], kind: "bw" },
];
const LEVELS = ["Principiante", "Novato", "Intermedio", "Avanzado", "Élite"];
const LEVEL_PTS = [15, 35, 55, 78, 100];
const RANKS = [
  [0, "Campesino de leva", "Te llamaron a filas con una horca. Todo empieza aquí."],
  [8, "Lancero", "Ya sostienes la lanza sin temblar."],
  [16, "Infante", "Marchas con la tropa y aguantas la línea."],
  [24, "Ballestero", "Tensar la ballesta ya no te cuesta."],
  [32, "Sargento", "Los reclutas te miran como ejemplo."],
  [40, "Escudero", "Cargas tu armadura y la de tu señor."],
  [48, "Hombre de armas", "Soldado profesional con cota de malla y oficio."],
  [56, "Caballero", "Armado caballero: tu fuerza ya es de élite local."],
  [64, "Caballero estandarte", "Llevas tu propio estandarte y hombres a tu cargo."],
  [72, "Capitán", "Comandas compañías enteras en batalla."],
  [80, "Mariscal", "Organizas el ejército del reino."],
  [88, "Condestable", "La mano derecha del rey en la guerra."],
  [96, "Rey", "Nadie en el reino levanta más que tú."],
];
const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII"];
const METAL = (i) => (i >= 10 ? ["#E3B341", "#8A6512"] : i >= 7 ? ["#CDD3DB", "#6B7480"] : i >= 4 ? ["#C98A4B", "#6E4219"] : ["#8E9599", "#454B4F"]);
function bodyweight() { return weightSeries().pop()?.kg || num(state.diet.weight); }
function liftStd(L) {
  const f = state.diet.sex === "m" ? { up: 0.6, low: 0.7, bw: 0.85 }[L.kind] : 1;
  return L.std.map((s) => (L.kind === "bw" ? s * f + (1 - f) * 0.7 : s * f));
}
function liftScore(r, s) {
  if (r <= 0) return 0;
  if (r < s[0]) return (r / s[0]) * LEVEL_PTS[0];
  for (let i = 1; i < s.length; i++) if (r < s[i]) return LEVEL_PTS[i - 1] + ((r - s[i - 1]) / (s[i] - s[i - 1])) * (LEVEL_PTS[i] - LEVEL_PTS[i - 1]);
  return 100;
}
function strengthReport() {
  const bw = bodyweight();
  const lifts = LIFTS.map((L) => {
    let best = 0;
    for (const v of L.v) for (const h of setsFor(L.id, v)) for (const st of h.sets) best = Math.max(best, e1rm(num(st.w) + (L.kind === "bw" ? bw : 0), num(st.r)));
    const s = liftStd(L), ratio = bw ? best / bw : 0, score = liftScore(ratio, s);
    const lvl = s.filter((x) => ratio >= x).length;
    const nextKg = lvl < 5 ? s[lvl] * bw - (L.kind === "bw" ? bw : 0) : null;
    return { ...L, best, ratio, score, lvl, nextKg };
  });
  const tested = lifts.filter((l) => l.best);
  const score = tested.length ? tested.reduce((a, l) => a + l.score, 0) / tested.length : 0;
  let ri = 0; RANKS.forEach(([t], i) => { if (score >= t) ri = i; });
  return { bw, lifts, tested, score, ri };
}
function shieldSVG(i, size = 104) {
  const [fill, dark] = METAL(i);
  return `<svg class="shield" width="${size}" viewBox="0 0 100 116" role="img" aria-label="Escudo de rango ${ROMAN[i]}">
    <path d="M50 3 L93 16 V54 C93 84 74 102 50 113 C26 102 7 84 7 54 V16 Z" fill="${fill}" stroke="${dark}" stroke-width="4"/>
    <path d="M50 14 L83 24 V54 C83 77 69 92 50 101 C31 92 17 77 17 54 V24 Z" fill="none" stroke="${dark}" stroke-width="1.5" opacity=".55"/>
    ${i === RANKS.length - 1 ? `<path d="M30 40 L36 26 L44 36 L50 22 L56 36 L64 26 L70 40 Z" fill="${dark}"/>` : `<path d="M50 24 V44 M42 32 H58" stroke="${dark}" stroke-width="3" stroke-linecap="round"/>`}
    <text x="50" y="${i === RANKS.length - 1 ? 76 : 78}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="${ROMAN[i].length > 3 ? 22 : 28}" font-weight="700" fill="${dark}">${ROMAN[i]}</text>
  </svg>`;
}
function viewRango() {
  const rep = strengthReport();
  const [t, name, desc] = RANKS[rep.ri];
  const next = RANKS[rep.ri + 1];
  const pct = next ? ((rep.score - t) / (next[0] - t)) * 100 : 100;
  return `
  <header class="page-head"><div><p class="eyebrow">Ejército del reino</p><h1>Tu rango</h1></div></header>
  <section class="card rank-hero">
    <div class="row" style="flex-wrap:nowrap;align-items:center;gap:16px">
      ${shieldSVG(rep.ri)}
      <div class="stack" style="gap:4px;min-width:0">
        <p class="eyebrow">Rango ${ROMAN[rep.ri]} de ${ROMAN[RANKS.length - 1]}</p>
        <h2 class="rank-name">${esc(name)}</h2>
        <p class="small muted">${esc(desc)}</p>
      </div>
    </div>
    ${rep.tested.length ? `<div class="stack" style="gap:6px">
      <div class="row between small"><span>Fuerza <b class="num">${round(rep.score)}</b>/100</span><span class="muted">${next ? `Faltan ${round(next[0] - rep.score, 0.1)} pts para ${esc(next[1])}` : "Rango máximo"}</span></div>
      <div class="bar"><span style="width:${Math.max(3, pct)}%"></span></div></div>`
      : `<p class="small">Registra en Entreno al menos uno de estos levantamientos para recibir tu rango: press de banca, sentadilla, peso muerto, press militar o dominadas.</p>`}
    ${rep.tested.length && rep.tested.length < 3 ? `<p class="small muted">Solo cuentan ${rep.tested.length} levantamiento(s). Registra más para un rango más justo.</p>` : ""}
  </section>
  <section class="card">
    <h2>Tus levantamientos</h2>
    <p class="small muted">Relativo a tu peso corporal (${rep.bw ? round(rep.bw, 0.1) + " kg" : "sin peso"}, ${state.diet.sex === "m" ? "mujer" : "hombre"}). Cámbialo en Dieta o Progreso.</p>
    ${rep.lifts.map((l) => `<div class="stack" style="gap:6px;padding:8px 0;border-bottom:1px solid var(--line)">
      <div class="row between"><b>${esc(l.name)}</b>${l.best ? `<span class="tag ${l.lvl >= 3 ? "peach" : ""}">${LEVELS[Math.max(0, l.lvl - 1)]}${l.lvl ? "" : " (en camino)"}</span>` : `<span class="tag gray">Sin registrar</span>`}</div>
      ${l.best ? `<div class="row between small"><span class="num">1RM est. ${round(l.best)} kg · ${round(l.ratio, 0.01)}× tu peso</span><span class="muted">${l.nextKg != null ? `${LEVELS[l.lvl]}: ${round(l.nextKg, 2.5)} kg${l.kind === "bw" ? " de lastre" : ""}` : "Nivel máximo"}</span></div>
      <div class="bar"><span style="width:${l.score}%"></span></div>` : ""}
    </div>`).join("")}
  </section>
  <section class="card">
    <h2>Jerarquía</h2>
    <div>${RANKS.map(([th, n], i) => `<div class="rank-row ${i === rep.ri ? "now" : i > rep.ri ? "locked" : ""}">${shieldSVG(i, 30)}<span class="grow">${esc(n)}</span><span class="num small muted">${th}+</span></div>`).slice().reverse().join("")}</div>
    <p class="small muted">El puntaje promedia tus levantamientos registrados con el 1RM estimado (peso × (1 + reps/30)) contra estándares de fuerza comunes.</p>
  </section>`;
}

/* =========================================================
   DIETA
   ========================================================= */
const ACTIVITY = [["1.2", "Sedentario (oficina, sin ejercicio)"], ["1.375", "Ligero (1–3 entrenos/sem)"], ["1.55", "Moderado (3–5 entrenos/sem)"], ["1.725", "Alto (6–7 entrenos/sem)"], ["1.9", "Muy alto (trabajo físico + entreno)"]];
(() => {
  const d = state.diet;
  d.prot ||= ["pollo", "res", "huevo", "atun", "yogur"];
  d.carbs ||= ["arroz", "tortilla", "avena", "papa", "platano"];
  d.fats ||= ["aguacate", "aceite", "cacahuate"];
  if (d.snacks == null) d.snacks = 2;
  state.cardio ||= { stepsGoal: 8000, minGoal: 30, log: {} };
})();
function calcDiet(d = state.diet) {
  const w = num(d.weight), h = num(d.height), a = num(d.age), bf = num(d.bf);
  if (!w || !h || !a) return null;
  const lbm = bf ? w * (1 - bf / 100) : null;
  const bmr = lbm ? 370 + 21.6 * lbm : 10 * w + 6.25 * h - 5 * a + (d.sex === "h" ? 5 : -161);
  const tdee = bmr * num(d.activity);
  const rate = num(d.rate);
  let kcal = tdee, weekly = 0;
  if (d.goal === "perder") { kcal = tdee - (rate * 7700) / 7; weekly = -rate; }
  if (d.goal === "ganar") { kcal = tdee + { 0.25: 200, 0.5: 350, 0.75: 500 }[rate]; weekly = rate / 2; }
  kcal = Math.max(kcal, d.sex === "h" ? 1500 : 1200);
  const pPerKg = d.goal === "perder" ? 2.2 : 2.0;
  const protein = bf > 25 && lbm ? 2.6 * lbm : pPerKg * w;
  const fat = Math.max(0.8 * w, (kcal * 0.22) / 9);
  const carbs = Math.max(0, (kcal - protein * 4 - fat * 9) / 4);
  const gw = num(d.goalWeight);
  const weeks = gw && weekly && Math.sign(gw - w) === Math.sign(weekly) ? Math.ceil(Math.abs(gw - w) / Math.abs(weekly)) : null;
  return { bmr, tdee, kcal, protein, fat, carbs, fiber: (kcal / 1000) * 14, water: w * 0.035 + 0.5, weekly, weeks };
}
// Cantidad legible: piezas para tortillas, pan, fruta y huevo; gramos cocidos para lo demás
function amountOf(food, g) {
  if (food.unit) { const n = Math.max(1, Math.round(g / food.ug)); return { g: n * food.ug, label: `${n} ${food.unit}${n > 1 ? "s" : ""}`, sub: `${n * food.ug} g` }; }
  const gg = Math.max(5, round(g, 5));
  return { g: gg, label: `${gg} g`, sub: food.cooked ? "cocido" : "" };
}
function foodsOf(ids, cat, snack) {
  let list = ids.map((id) => FOODS[id] && { id, ...FOODS[id] }).filter(Boolean);
  const all = Object.entries(FOODS).filter(([, f]) => f.cat === cat).map(([id, f]) => ({ id, ...f }));
  if (snack) { const s = list.filter((f) => f.snack); list = s.length ? s : all.filter((f) => f.snack); }
  else { const m = list.filter((f) => !f.snackOnly); list = m.length ? m : all.filter((f) => !f.snackOnly); }
  return list.length ? list : all;
}
function mealPlan(r, seed = 0) {
  const d = state.diet, ns = Math.min(2, num(d.snacks));
  const mainShare = 1 - ns * 0.1;
  const meals = [["Desayuno", 0.3], ["Comida", 0.37], ["Cena", 0.33]].map(([name, p]) => ({ name, pct: p * mainShare, snack: false }));
  for (let i = 0; i < ns; i++) meals.splice(i === 0 ? 1 : 3, 0, { name: `Snack ${i + 1}`, pct: 0.1, snack: true });
  let k = seed;
  return meals.map((m) => {
    const ps = foodsOf(d.prot, "p", m.snack), cs = foodsOf(d.carbs, "c", m.snack), fs = foodsOf(d.fats, "f", m.snack);
    // Cada platillo puede rotarse solo con su botón "Cambiar"
    const s = k + (ui.mealShift?.[m.name] || 0);
    const P = ps[s % ps.length], C = cs[(s + 1) % cs.length], F = fs[s % fs.length];
    k++;
    const mp = r.protein * m.pct, mc = r.carbs * m.pct, mf = r.fat * m.pct;
    const items = [];
    const got = () => items.reduce((t, [f, x]) => ({ p: t.p + (f.p * x.g) / 100, c: t.c + (f.c * x.g) / 100, f: t.f + (f.f * x.g) / 100 }), { p: 0, c: 0, f: 0 });
    let a = amountOf(P, (mp / P.p) * 100);
    // Proteínas grasosas (huevo, salmón…): se limitan y se completa con una magra
    if ((a.g * P.f) / 100 > mf * 0.8) {
      a = amountOf(P, ((mf * 0.6) / P.f) * 100);
      items.push([P, a]);
      const lean = ps.find((f) => f.f < 4 && f.id !== P.id) || { id: "claras", ...FOODS.claras };
      const missing = mp - got().p;
      if (missing > 5) items.push([lean, amountOf(lean, (missing / lean.p) * 100)]);
    } else items.push([P, a]);
    items.push([C, amountOf(C, Math.max(0, ((mc - got().c) / C.c) * 100))]);
    const fatNeed = mf - got().f;
    if (fatNeed > 3) items.push([F, amountOf(F, (fatNeed / F.f) * 100)]);
    const tot = items.reduce((t, [f, x]) => ({ k: t.k + (f.k * x.g) / 100, p: t.p + (f.p * x.g) / 100, c: t.c + (f.c * x.g) / 100, f: t.f + (f.f * x.g) / 100 }), { k: 0, p: 0, c: 0, f: 0 });
    return { ...m, items, tot };
  });
}
function viewDieta() {
  const d = state.diet;
  const chips = (cat, key, label) => `<p class="eyebrow">${label}</p><div class="chips wrap">${Object.entries(FOODS).filter(([, f]) => f.cat === cat).map(([id, f]) => `<button class="chip ${d[key].includes(id) ? "on" : ""}" data-action="x-food" data-key="${key}" data-id="${id}">${esc(f.name)}</button>`).join("")}</div>`;
  return `
  <header class="page-head"><div><p class="eyebrow">Tu plan</p><h1>Dieta</h1></div></header>
  <div id="diet-out" class="stack" style="gap:18px">${dietOutHTML()}</div>
  <section class="card">
    <h2>Tus alimentos</h2>
    <p class="small muted">Elige lo que te gusta comer. El menú rota entre ellos para que tengas variedad.</p>
    ${chips("p", "prot", "Proteínas")}
    ${chips("c", "carbs", "Carbohidratos")}
    ${chips("f", "fats", "Grasas")}
  </section>
  <details class="card calc" id="calc" ${ui.calcOpen ?? !calcDiet() ? "open" : ""}>
    <summary><span class="calc-title">Calculadora</span><span class="small muted">Tus datos, actividad y objetivo. Se llena una vez.</span></summary>
    <div class="seg" style="align-self:flex-start">${[["h", "Hombre"], ["m", "Mujer"]].map(([v, l]) => `<button class="${d.sex === v ? "on" : ""}" data-action="diet-set" data-k="sex" data-v="${v}">${l}</button>`).join("")}</div>
    <div class="grid-3">
      <label class="field">Edad<input class="input num" id="d-age" data-input="diet" data-k="age" inputmode="numeric" value="${esc(d.age)}"></label>
      <label class="field">Altura (cm)<input class="input num" id="d-height" data-input="diet" data-k="height" inputmode="numeric" value="${esc(d.height)}"></label>
      <label class="field">Peso (kg)<input class="input num" id="d-weight" data-input="diet" data-k="weight" inputmode="decimal" value="${esc(d.weight)}"></label>
      <label class="field">% grasa<input class="input num" id="d-bf" data-input="diet" data-k="bf" inputmode="decimal" value="${esc(d.bf)}" placeholder="—"></label>
      <label class="field">Peso meta (kg)<input class="input num" id="d-gw" data-input="diet" data-k="goalWeight" inputmode="decimal" value="${esc(d.goalWeight)}" placeholder="—"></label>
      <label class="field">Snacks al día<select class="input" id="d-snacks" data-input="diet" data-k="snacks">${[0, 1, 2].map((n) => `<option ${num(d.snacks) === n ? "selected" : ""}>${n}</option>`).join("")}</select></label>
    </div>
    <label class="field">Actividad<select class="input" id="d-act" data-input="diet" data-k="activity">${ACTIVITY.map(([v, l]) => `<option value="${v}" ${d.activity === v ? "selected" : ""}>${l}</option>`).join("")}</select></label>
    <div class="grid-2">
      <label class="field">Objetivo<select class="input" id="d-goal" data-input="diet" data-k="goal">${[["perder", "Perder grasa"], ["mantener", "Mantener / recomposición"], ["ganar", "Ganar músculo"]].map(([v, l]) => `<option value="${v}" ${d.goal === v ? "selected" : ""}>${l}</option>`).join("")}</select></label>
      <label class="field">Ritmo<select class="input" id="d-rate" data-input="diet" data-k="rate" ${d.goal === "mantener" ? "disabled" : ""}>${[["0.25", "Suave"], ["0.5", "Moderado"], ["0.75", "Agresivo"]].map(([v, l]) => `<option value="${v}" ${d.rate === v ? "selected" : ""}>${l}</option>`).join("")}</select></label>
    </div>
  </details>`;
}
// Recuerda si la calculadora quedó abierta o cerrada entre renders
document.addEventListener("toggle", (ev) => { if (ev.target.id === "calc") ui.calcOpen = ev.target.open; }, true);
function dietOutHTML() {
  const r = calcDiet();
  if (!r) return `<section class="card"><p class="muted">Llena tu edad, altura y peso en la <b>Calculadora</b> (abajo) para ver tu dieta.</p></section>`;
  const kc = [r.protein * 4, r.carbs * 4, r.fat * 9], tot = kc[0] + kc[1] + kc[2];
  const colors = ["var(--accent)", "var(--peach)", "var(--warn)"];
  const meals = mealPlan(r, ui.dietSeed || 0);
  const day = meals.reduce((t, m) => ({ k: t.k + m.tot.k, p: t.p + m.tot.p, c: t.c + m.tot.c, f: t.f + m.tot.f }), { k: 0, p: 0, c: 0, f: 0 });
  return `
  <section class="card hero">
    <p class="eyebrow" style="color:inherit;opacity:.8">Tu objetivo diario</p>
    <div class="row between"><div><span class="num" style="font-family:var(--font-display);font-size:44px;font-weight:800;line-height:1">${round(r.kcal, 10)}</span> <span>kcal</span></div>
    <p class="muted small" style="text-align:right">${r.weekly ? `${r.weekly > 0 ? "+" : ""}${r.weekly} kg por semana` : "Mantenimiento"}${r.weeks ? `<br>≈ ${r.weeks} semanas a tu meta` : ""}</p></div>
    <div class="grid-3">
      <div class="stat"><span class="v num">${round(r.bmr, 10)}</span><span class="l" style="color:inherit">metabolismo basal</span></div>
      <div class="stat"><span class="v num">${round(r.tdee, 10)}</span><span class="l" style="color:inherit">gasto total (TDEE)</span></div>
      <div class="stat"><span class="v num">${round(r.water, 0.1)} L</span><span class="l" style="color:inherit">agua al día</span></div>
    </div>
  </section>
  <section class="card">
    <h2>Macros</h2>
    <div class="macro-bar">${kc.map((k, i) => `<span style="width:${(k / tot) * 100}%;background:${colors[i]}"></span>`).join("")}</div>
    <div class="grid-3">
      ${[["Proteína", r.protein, kc[0]], ["Carbohidratos", r.carbs, kc[1]], ["Grasa", r.fat, kc[2]]].map(([l, g, k], i) => `<div class="stat"><span class="l"><span class="dot" style="background:${colors[i]}"></span> ${l}</span><span class="v num">${round(g)} g</span><span class="l">${round(k)} kcal · ${round((k / tot) * 100)}%</span></div>`).join("")}
    </div>
    <p class="muted small">Fibra: ${round(r.fiber)} g. Proteína a ${round(r.protein / num(state.diet.weight), 0.1)} g/kg para conservar o ganar músculo (Morton 2018; Helms 2014). Fórmula: ${num(state.diet.bf) ? "Katch-McArdle (usa tu % de grasa)" : "Mifflin-St Jeor"}.</p>
  </section>
  <section class="card">
    <div class="section-title"><h2>Menú de ejemplo</h2><button class="btn small ghost" data-action="x-reshuffle">Otro menú</button></div>
    <p class="small muted">Pesos de comida <b>ya cocida</b>. Tortillas, pan, fruta y huevo van en piezas.</p>
    ${meals.map((m) => `<div class="day">
      <div class="row between"><h3>${esc(m.name)}</h3><button class="btn small ghost" data-action="x-meal-swap" data-name="${esc(m.name)}">Cambiar</button></div>
      <p class="num small muted">${round(m.tot.k, 5)} kcal · P${round(m.tot.p)} C${round(m.tot.c)} G${round(m.tot.f)}</p>
      ${m.items.map(([f, x]) => `<div class="row between small"><span>${esc(f.name)}</span><span class="num">${esc(x.label)}${x.sub ? ` <span class="muted">· ${esc(x.sub)}</span>` : ""}</span></div>`).join("")}
      ${m.snack ? "" : `<div class="row between small muted"><span>Verduras</span><span>libres</span></div>`}
    </div>`).join("")}
    <div class="row between small"><b>Total del menú</b><span class="num">${round(day.k, 10)} kcal · P${round(day.p)} C${round(day.c)} G${round(day.f)}</span></div>
    <p class="muted small">Al redondear a piezas el total puede variar unas decenas de kcal de tu objetivo.</p>
  </section>
  <section class="card">
    <h2>Menú con Claude</h2>
    <textarea class="input" id="diet-prefs" data-input="diet-prefs" placeholder="Gustos, alergias, presupuesto… Ej. comida mexicana, sin lácteos, entreno a las 7 pm">${esc(state.diet.prefs || "")}</textarea>
    <button class="btn peach" data-action="ai-diet" ${ui.dietBusy ? "disabled" : ""}>${ui.dietBusy ? "Armando menú…" : "Generar menú de 1 día"}</button>
    ${ui.dietOut ? `<div class="ai-out">${esc(ui.dietOut)}</div>` : ""}
  </section>`;
}
async function aiDiet() {
  const r = calcDiet(); if (!r) return;
  const d = state.diet, names = (ids) => ids.map((id) => FOODS[id]?.name).filter(Boolean).join(", ");
  ui.dietBusy = true; ui.dietOut = ""; render();
  try {
    ui.dietOut = await callClaude([{ type: "text", text: `Arma un menú de un día en español con desayuno, comida, cena y ${d.snacks} snack(s) para alguien con objetivo de ${d.goal === "perder" ? "perder grasa" : d.goal === "ganar" ? "ganar músculo" : "mantener"}. Metas: ${round(r.kcal, 10)} kcal, ${round(r.protein)} g proteína, ${round(r.carbs)} g carbohidratos, ${round(r.fat)} g grasa. Usa sobre todo estos alimentos: proteínas ${names(d.prot)}; carbohidratos ${names(d.carbs)}; grasas ${names(d.fats)}. Da los pesos de la comida YA COCIDA, y las tortillas, pan, fruta y huevos en piezas. Preferencias: ${d.prefs || "ninguna"}. Para cada comida lista los alimentos con cantidades y los macros de la comida. Termina con el total del día. Texto plano, sin tablas markdown, sin encabezados con #.` }]);
  } catch (e) { ui.dietOut = e.message; }
  ui.dietBusy = false; render();
}

/* =========================================================
   CARDIO (meta diaria: pasos o minutos, cualquiera cuenta)
   ========================================================= */
const CARDIO_TYPES = ["Caminar", "Correr", "Bici", "Elíptica", "Escaladora", "Cuerda", "Natación", "Otro"];
const isoDaysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
const cardioDone = (e = {}) => num(e.steps) >= state.cardio.stepsGoal || num(e.min) >= state.cardio.minGoal;
function cardioCard() {
  const c = state.cardio, e = c.log[todayISO()] || {}, done = cardioDone(e);
  let streak = 0;
  for (let i = done ? 0 : 1; i < 400 && cardioDone(c.log[isoDaysAgo(i)]); i++) streak++;
  const pctS = Math.min(100, (num(e.steps) / c.stepsGoal) * 100), pctM = Math.min(100, (num(e.min) / c.minGoal) * 100);
  return `<section class="card">
    <div class="section-title"><h2>Cardio de hoy</h2>${done ? `<span class="tag">Meta cumplida</span>` : `<span class="tag peach">Cumple una de las dos</span>`}</div>
    <div class="grid-2">
      <div class="stat" style="gap:6px"><span class="l">Opción A · Pasos</span>
        <span class="v num">${num(e.steps).toLocaleString("es-MX")}<span class="small muted"> / ${c.stepsGoal.toLocaleString("es-MX")}</span></span>
        <div class="bar"><span style="width:${pctS}%"></span></div>
        <input class="input num" id="cd-steps" data-input="x-cardio" data-k="steps" inputmode="numeric" placeholder="Pasos de hoy" value="${esc(e.steps || "")}"></div>
      <div class="stat" style="gap:6px"><span class="l">Opción B · Minutos</span>
        <span class="v num">${num(e.min)}<span class="small muted"> / ${c.minGoal} min</span></span>
        <div class="bar"><span style="width:${pctM}%"></span></div>
        <input class="input num" id="cd-min" data-input="x-cardio" data-k="min" inputmode="numeric" placeholder="Minutos" value="${esc(e.min || "")}">
        <select class="input" id="cd-type" data-input="x-cardio" data-k="type">${CARDIO_TYPES.map((t) => `<option ${e.type === t ? "selected" : ""}>${t}</option>`).join("")}</select></div>
    </div>
    <div class="row between">
      <div class="dots7">${[6, 5, 4, 3, 2, 1, 0].map((i) => { const iso = isoDaysAgo(i); return `<span class="d7 ${cardioDone(c.log[iso]) ? "on" : ""}" title="${esc(fmtDate(iso))}">${fmtDate(iso, { weekday: "narrow" })}</span>`; }).join("")}</div>
      <span class="small"><b class="num">${streak}</b> día${streak === 1 ? "" : "s"} seguidos</span>
    </div>
    <button class="btn ghost small" data-action="x-cardio-goals">Cambiar metas</button>
  </section>`;
}
function cardioGoalsSheet() {
  const c = state.cardio;
  return `<div class="row between"><h2>Metas de cardio</h2><button class="icon-btn" data-action="close-sheet" aria-label="Cerrar">${ICON.x}</button></div>
  <form class="stack" data-form="x-goals">
    <div class="grid-2">
      <label class="field">Pasos al día<input class="input num" name="steps" id="cg-steps" inputmode="numeric" value="${c.stepsGoal}"></label>
      <label class="field">Minutos al día<input class="input num" name="min" id="cg-min" inputmode="numeric" value="${c.minGoal}"></label>
    </div>
    <p class="small muted">Referencias: el beneficio de los pasos se estabiliza en ~8,000–10,000 al día en menores de 60 años (Paluch et al. 2022). La OMS recomienda 150–300 min de cardio moderado por semana, unos 30 min al día (Bull et al. 2020). Caminar o bici interfieren poco con la ganancia muscular (Wilson et al. 2012).</p>
    <button class="btn primary" type="submit">Guardar metas</button>
  </form>`;
}

/* Eventos de dieta, cardio, estructura y descargas */
async function aiDeload() {
  const s = state.sources.find((x) => x.id === state.routine.program.deloadSrc);
  if (!s) return;
  ui.dlBusy = true; ui.dlMsg = ""; render();
  try {
    const content = [];
    if (s.kind === "file" && s.mime === "application/pdf") { const b = await fileGet(s.fileId); if (b) content.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: await blobToB64(b) }, title: s.title }); }
    content.push({ type: "text", text: `Lee esta fuente sobre descargas (deload) en entrenamiento de fuerza e hipertrofia y configura las descargas de un programa de ${state.routine.program.weeks} semanas.\nFuente: ${s.title}${s.url ? ` (${s.url}, ábrelo con web_fetch)` : ""}${s.text ? `\nContenido: ${s.text.slice(0, 20000)}` : ""}\n\nResponde en español con una frase de razón y al final SOLO un bloque \`\`\`json: {"cada": semanas de carga entre 3 y 8, "semanas": semanas de descarga entre 1 y 3, "series": fracción de series en descarga entre 0.3 y 0.7, "razon": "1-2 frases citando la fuente"}` });
    const j = parseJSON(await callClaude(content, { webFetch: !!s.url }));
    const clamp = (v, a, b, def) => (Number.isFinite(+v) ? Math.min(b, Math.max(a, +v)) : def);
    state.routine.program.deload = { work: Math.round(clamp(j.cada, 3, 8, 4)), weeks: Math.round(clamp(j.semanas, 1, 3, 1)), mult: Math.round(clamp(j.series, 0.3, 0.7, 0.5) * 10) / 10 };
    ui.dlMsg = j.razon || "Descargas ajustadas según el artículo.";
    save();
  } catch (e) { ui.dlMsg = e.message || "No se pudo leer la respuesta de Claude."; }
  ui.dlBusy = false; render();
}
document.addEventListener("click", (ev) => {
  const el = ev.target.closest("[data-action^='x-']");
  if (!el) return;
  const d = el.dataset;
  switch (d.action) {
    case "x-food": {
      const list = state.diet[d.key];
      if (list.includes(d.id)) { if (list.length > 1) list.splice(list.indexOf(d.id), 1); else { toast("Deja al menos uno"); return; } }
      else list.push(d.id);
      save(); el.classList.toggle("on"); $("#diet-out").innerHTML = dietOutHTML(); break;
    }
    case "x-reshuffle": ui.dietSeed = (ui.dietSeed || 0) + 1; $("#diet-out").innerHTML = dietOutHTML(); break;
    case "x-cardio-goals": openSheet(cardioGoalsSheet); break;
    case "x-dl-preset": { const [work, weeks, mult] = d.v.split(",").map(Number); state.routine.program.deload = { work, weeks, mult }; save(); render(); toast("Descargas actualizadas"); break; }
    case "x-dl-ai": if (!needsKey()) aiDeload(); break;
    case "x-sci-add": addScience(SCI_LIB.find((x) => x.id === d.id)); save(); render(); toast("Agregado a tu biblioteca"); break;
    case "x-sci-all": SCI_LIB.forEach(addScience); save(); render(); toast("Biblioteca científica agregada"); break;
  }
});
document.addEventListener("change", (ev) => {
  const el = ev.target, d = el.dataset, r = state.routine;
  switch (d.input) {
    case "x-cardio": {
      const log = state.cardio.log, t = todayISO();
      log[t] = { ...(log[t] || {}), [d.k]: d.k === "type" ? el.value : Math.max(0, int(el.value)) };
      save(); render(); if (cardioDone(log[t])) toast("Meta de cardio cumplida"); break;
    }
    case "x-split": r.split = el.value; save(); render(); break;
    case "x-start-m": r.startMuscle = el.value; save(); break;
    case "x-dl": r.program.deload = { ...deloadCfg(), [d.k]: num(el.value) }; save(); render(); break;
    case "x-dl-src": r.program.deloadSrc = el.value; ui.dlMsg = ""; save(); render(); break;
  }
});
document.addEventListener("submit", (ev) => {
  const f = ev.target;
  if (f.dataset.form !== "x-goals") return;
  ev.preventDefault();
  const v = Object.fromEntries(new FormData(f));
  state.cardio.stepsGoal = Math.max(1000, int(v.steps)) || 8000;
  state.cardio.minGoal = Math.max(5, int(v.min)) || 30;
  save(); closeSheet(); render(); toast("Metas guardadas");
});

/* =========================================================
   PROGRESO (fotos y peso)
   ========================================================= */
function weightSeries() {
  const map = new Map();
  for (const w of state.weights) map.set(w.date, w.kg);
  for (const p of state.photos) if (num(p.weight) && !map.has(p.date)) map.set(p.date, num(p.weight));
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([date, kg]) => ({ date, kg }));
}
function viewProgreso() {
  const ws = weightSeries();
  const cur = ws[ws.length - 1], first = ws[0];
  const delta = cur && first ? cur.kg - first.kg : 0;
  const byDate = {};
  [...state.photos].sort((a, b) => b.date.localeCompare(a.date)).forEach((p) => (byDate[p.date] ||= []).push(p));
  return `
  <header class="page-head"><div><p class="eyebrow">Cuerpo</p><h1>Progreso</h1></div>
    ${state.photos.length > 1 ? `<button class="btn ${ui.compareMode ? "peach" : "ghost"} small" data-action="compare-mode">${ui.compareMode ? `Elige 2 fotos (${ui.compare.length}/2)` : "Comparar fotos"}</button>` : ""}</header>
  ${photosHTML(byDate)}
  ${coachHTML()}
  <section class="card">
    <div class="row between"><div><p class="eyebrow">Peso actual</p><span class="num" style="font-family:var(--font-display);font-size:34px;font-weight:800">${cur ? cur.kg : "–"}</span> kg</div>
      ${ws.length > 1 ? `<span class="tag ${delta <= 0 ? "" : "peach"}">${delta > 0 ? "+" : ""}${round(delta, 0.1)} kg desde ${esc(fmtDate(first.date))}</span>` : ""}</div>
    ${lineChart(ws.map((w) => ({ y: w.kg, label: fmtDate(w.date) })), { unit: "kg" })}
    <form class="row" data-form="weight">
      <input class="input" style="flex:1;min-width:130px" type="date" name="date" id="wt-date" value="${todayISO()}">
      <input class="input num" style="width:110px" name="kg" id="wt-kg" inputmode="decimal" placeholder="kg" required>
      <button class="btn primary" type="submit">Registrar</button>
    </form>
  </section>`;
}
// Orden de Progreso: Fotos → Coach → Físico ideal → Peso
function photosHTML(byDate) {
  return `
  <section class="card">
    <h2>Fotos</h2>
    <label class="drop" id="drop">Toca para subir fotos o arrástralas aquí<br><span class="small">Frente, lado y espalda con la misma luz ayudan a comparar</span>
      <input type="file" id="photo-in" data-input="photos" accept="image/*" multiple hidden></label>
    ${Object.keys(byDate).length ? Object.entries(byDate).map(([date, ps]) => `
      <div class="stack"><div class="row between"><b>${esc(fmtDate(date, { day: "numeric", month: "long", year: "numeric" }))}</b>${ps.find((p) => num(p.weight)) ? `<span class="num small muted">${num(ps.find((p) => num(p.weight)).weight)} kg</span>` : ""}</div>
      <div class="photos">${ps.map((p) => `<button class="photo ${ui.compare.includes(p.id) ? "sel" : ""}" data-action="photo" data-id="${p.id}"><img data-photo="${p.fileId}" alt="Foto ${esc(p.pose)} ${esc(date)}"><span class="cap">${esc(p.pose)}${num(p.weight) ? " · " + num(p.weight) + " kg" : ""}</span></button>`).join("")}</div></div>`).join("")
      : `<div class="empty"><p>Sube tu primera foto. Se guarda solo en este navegador con su fecha y peso.</p></div>`}
  </section>`;
}
function photoFormSheet() {
  const files = ui.pendingFiles;
  const d = files[0]?.lastModified ? new Date(files[0].lastModified) : new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  const lastW = weightSeries().pop()?.kg || state.diet.weight;
  return `<div class="row between"><h2>${files.length} foto${files.length > 1 ? "s" : ""}</h2><button class="icon-btn" data-action="close-sheet" aria-label="Cerrar">${ICON.x}</button></div>
  <form class="stack" data-form="photos">
    <div class="grid-2">
      <label class="field">Fecha<input class="input" type="date" name="date" id="ph-date" value="${d.toISOString().slice(0, 10)}" required></label>
      <label class="field">Peso (kg)<input class="input num" name="weight" id="ph-w" inputmode="decimal" value="${esc(lastW)}"></label>
    </div>
    <label class="field">Pose${files.length > 1 ? " (de la primera; las demás siguen el orden)" : ""}<select class="input" name="pose" id="ph-pose">${["Frente", "Lado", "Espalda", "Otra"].map((p) => `<option>${p}</option>`).join("")}</select></label>
    <label class="field">Nota<input class="input" name="note" id="ph-note" placeholder="Ej. en ayunas, semana 4 de definición"></label>
    <button class="btn primary" type="submit">Guardar</button>
  </form>`;
}
function photoViewSheet(id) {
  const p = state.photos.find((x) => x.id === id);
  if (!p) return "";
  return `<div class="row between"><div><p class="eyebrow">${esc(p.pose)}</p><h2>${esc(fmtDate(p.date, { day: "numeric", month: "long", year: "numeric" }))}</h2></div><button class="icon-btn" data-action="close-sheet" aria-label="Cerrar">${ICON.x}</button></div>
  <img data-photo="${p.fileId}" alt="" style="border-radius:var(--r-md);max-height:62vh;object-fit:contain;margin:0 auto">
  <p>${num(p.weight) ? `<b class="num">${num(p.weight)} kg</b>` : ""} ${p.note ? `<span class="muted">· ${esc(p.note)}</span>` : ""}</p>
  <button class="btn danger" data-action="del-photo" data-id="${p.id}">Borrar foto</button>`;
}
function compareSheet() {
  const [a, b] = ui.compare.map((id) => state.photos.find((p) => p.id === id)).sort((x, y) => x.date.localeCompare(y.date));
  const days = Math.round((new Date(b.date) - new Date(a.date)) / 864e5);
  const dw = num(b.weight) && num(a.weight) ? round(num(b.weight) - num(a.weight), 0.1) : null;
  return `<div class="row between"><h2>Comparación</h2><button class="icon-btn" data-action="close-sheet" aria-label="Cerrar">${ICON.x}</button></div>
  <p class="muted">${days} días de diferencia${dw != null ? ` · ${dw > 0 ? "+" : ""}${dw} kg` : ""}</p>
  <div class="compare">${[a, b].map((p) => `<figure><img data-photo="${p.fileId}" alt=""><figcaption class="small"><b>${esc(fmtDate(p.date, { day: "numeric", month: "short", year: "2-digit" }))}</b>${num(p.weight) ? ` · ${num(p.weight)} kg` : ""}</figcaption></figure>`).join("")}</div>`;
}
async function hydratePhotos(root) {
  for (const img of root.querySelectorAll("img[data-photo]")) {
    const u = await fileURL(img.dataset.photo);
    if (u) img.src = u;
  }
}

/* =========================================================
   AJUSTES Y RESPALDO
   ========================================================= */
/* Coach de fotos: Claude compara tus fotos (inicio vs. hoy) y con tu físico ideal */
state.coach ||= [];
async function photoForAI(fileId, max = 1024) {
  const b = await fileGet(fileId);
  if (!b) return null;
  const small = await shrinkImage(b, max);
  return { type: "image", source: { type: "base64", media_type: small.type || "image/jpeg", data: await blobToB64(small) } };
}
function photoGroups() {
  const by = {};
  state.photos.forEach((p) => (by[p.date] ||= []).push(p));
  const dates = Object.keys(by).sort();
  const f = dates[0], l = dates[dates.length - 1];
  return { first: by[f], last: by[l], firstDate: f, lastDate: l };
}
function coachHTML() {
  const ideal = state.ideal, coach = (state.coach ||= []), last = coach[coach.length - 1];
  const pct = last?.pct, start = last?.startPct;
  const list = (title, arr) => (arr?.length ? `<p class="eyebrow">${title}</p><ul class="small stack" style="padding-left:18px;margin:0;gap:4px">${arr.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : "");
  const idealCard = `
  <section class="card">
    <div class="section-title"><h2>Físico ideal</h2>${ideal ? `<button class="btn small ghost" data-action="x-ideal-del">Quitar</button>` : ""}</div>
    ${ideal ? `<div class="row" style="flex-wrap:nowrap;align-items:flex-start">
        <button class="photo" style="width:120px;flex:none" data-action="x-ideal-view" aria-label="Ver físico ideal"><img data-photo="${ideal.fileId}" alt="Físico ideal"></button>
        <div class="stack" style="gap:8px;min-width:0;flex:1">
          <input class="input" id="ideal-note" data-input="x-ideal-note" placeholder="Nota: ej. físico de definición, 10% de grasa" value="${esc(ideal.note || "")}">
          <label class="btn ghost small">Cambiar foto<input type="file" id="ideal-in" data-input="x-ideal" accept="image/*" hidden></label>
        </div></div>`
      : `<label class="drop">Sube una foto del físico que quieres lograr<br><span class="small">Cuerpo completo y de frente funciona mejor</span><input type="file" id="ideal-in" data-input="x-ideal" accept="image/*" hidden></label>`}
  </section>`;
  // Orden: Coach y después Físico ideal
  return `
  <section class="card">
    <div class="section-title"><h2>Coach</h2>${last ? `<span class="small muted">Análisis del ${esc(fmtDate(last.date))}</span>` : ""}</div>
    ${pct != null ? `<div class="stack" style="gap:6px">
        <div class="row between"><span class="eyebrow">Hacia tu físico ideal</span><b class="num" style="font-size:24px">${pct}%</b></div>
        <div class="goalbar" role="img" aria-label="Estás al ${pct}% de tu físico ideal"><span class="fill" style="width:${pct}%"></span>${start != null ? `<span class="mark" style="left:${start}%" title="Al empezar: ${start}%"></span>` : ""}</div>
        <div class="row between small"><span>Estás al <b>${pct}%</b></span><span class="muted">Te falta ${100 - pct}%</span></div>
        ${start != null ? `<p class="small">Al empezar estabas al <b>${start}%</b> (la rayita). Avanzaste <b>${pct - start >= 0 ? "+" : ""}${pct - start}</b> puntos.</p>` : ""}
      </div>` : last ? `<p class="small muted">Sube tu físico ideal para ver qué porcentaje te falta.</p>` : ""}
    ${last ? `${last.resumen ? `<div class="ai-out">${esc(last.resumen)}${last.grasa ? `\nGrasa corporal estimada: ${esc(last.grasa)}` : ""}</div>` : ""}
      ${list("Lo que mejoraste", last.mejoras)}${list("Lo que te falta", last.pendientes)}${list("Plan del coach", last.plan)}`
      : `<p class="small muted">El coach compara tus primeras fotos con las más recientes, te dice qué mejoraste y, si subes tu físico ideal, qué porcentaje llevas y qué te falta.</p>`}
    ${ui.coachErr ? `<p class="small" style="color:var(--bad)">${esc(ui.coachErr)}</p>` : ""}
    <button class="btn peach" data-action="x-coach" ${ui.coachBusy || !state.photos.length ? "disabled" : ""}>${ICON.spark} ${ui.coachBusy ? "Analizando fotos…" : state.photos.length ? "Analizar mi progreso" : "Sube fotos para analizar"}</button>
    <p class="small muted">Tus fotos solo se envían a Claude cuando tocas Analizar. Es una estimación visual, no una medición exacta.${state.settings.apiKey ? "" : " Necesita tu API key en Ajustes."}</p>
  </section>${idealCard}`;
}
async function aiCoach() {
  const g = photoGroups();
  if (!g.last) return;
  ui.coachBusy = true; ui.coachErr = ""; render();
  try {
    const content = [];
    const weightOf = (ps) => ps.map((p) => num(p.weight)).find(Boolean);
    const add = async (label, ps) => {
      content.push({ type: "text", text: `${label} — poses: ${ps.slice(0, 3).map((p) => p.pose).join(", ")}${weightOf(ps) ? ` — peso ${weightOf(ps)} kg` : ""}` });
      for (const p of ps.slice(0, 3)) { const im = await photoForAI(p.fileId); if (im) content.push(im); }
    };
    const same = g.firstDate === g.lastDate;
    if (!same) await add(`FOTOS INICIALES (${g.firstDate})`, g.first);
    await add(`FOTOS ACTUALES (${g.lastDate})`, g.last);
    if (state.ideal) {
      content.push({ type: "text", text: `FÍSICO IDEAL (la meta de la persona)${state.ideal.note ? `: ${state.ideal.note}` : ""}` });
      const im = await photoForAI(state.ideal.fileId); if (im) content.push(im);
    }
    const prev = state.coach[state.coach.length - 1];
    const pri = [1, 2, 3, 4].map(rankHolder).filter(Boolean).join(", ") || "ninguna";
    content.push({ type: "text", text:
`Eres un coach de físico (culturismo natural), honesto y motivador. Analiza las fotos de arriba.
Datos: ${state.diet.sex === "m" ? "mujer" : "hombre"}, ${state.diet.age} años, ${state.diet.height} cm; objetivo de dieta: ${state.diet.goal}; músculos prioritarios: ${pri}; entrenos registrados: ${state.sessions.length}.
${prev?.pct != null ? `Análisis anterior (${prev.date}): estaba al ${prev.pct}% del ideal. Mantén una escala consistente con ese número.` : ""}
1. ${same ? "Solo hay un set de fotos: describe el punto de partida (no inventes mejoras)." : "Compara las fotos iniciales con las actuales y di concretamente qué mejoró (definición, volumen por grupo muscular, cintura, postura)."}
2. ${state.ideal ? "Estima qué tan cerca está la persona HOY del físico ideal, de 0 a 100 (100 = igual), según grasa corporal, tamaño muscular por grupo y proporciones. Estima lo mismo para las fotos iniciales. Sé realista; no infles los números." : "No hay físico ideal: deja los porcentajes en null."}
3. Di qué le falta, por músculo, y un plan concreto de 3 a 5 puntos (entrenamiento y dieta).
Si las fotos no dejan ver bien el cuerpo, dilo en el resumen.
Responde en español. Al final escribe SOLO un bloque \`\`\`json: {"resumen": "2-3 frases", "pct_actual": número 0-100 o null, "pct_inicial": número 0-100 o null, "grasa_estimada": "ej. 15-18%", "mejoras": ["..."], "pendientes": ["..."], "plan": ["..."]}` });
    const j = parseJSON(await callClaude(content));
    const pctOf = (v) => (v == null || !Number.isFinite(+v) ? null : Math.max(0, Math.min(100, Math.round(+v))));
    const startPct = same ? (state.coach.find((c) => c.startPct != null)?.startPct ?? pctOf(j.pct_actual)) : pctOf(j.pct_inicial);
    state.coach.push({ date: todayISO(), pct: state.ideal ? pctOf(j.pct_actual) : null, startPct: state.ideal ? startPct : null, grasa: String(j.grasa_estimada || ""), resumen: String(j.resumen || ""), mejoras: (j.mejoras || []).map(String), pendientes: (j.pendientes || []).map(String), plan: (j.plan || []).map(String) });
    state.coach = state.coach.slice(-20);
    save(true);
  } catch (e) { ui.coachErr = e.message || "No se pudo leer la respuesta del coach. Intenta de nuevo."; }
  ui.coachBusy = false; render();
}
document.addEventListener("click", (ev) => {
  const el = ev.target.closest("[data-action^='x-']");
  if (!el) return;
  const d = el.dataset;
  if (d.action === "x-coach") { if (!needsKey()) aiCoach(); }
  if (d.action === "x-ideal-view") openSheet(() => `<div class="row between"><h2>Físico ideal</h2><button class="icon-btn" data-action="close-sheet" aria-label="Cerrar">${ICON.x}</button></div><img data-photo="${state.ideal.fileId}" alt="" style="border-radius:var(--r-md);max-height:70vh;object-fit:contain;margin:0 auto">`);
  if (d.action === "x-ideal-del") confirmBox("¿Quitar tu foto de físico ideal?", "Quitar", async () => { await fileDel(state.ideal.fileId); state.ideal = null; save(); render(); });
  if (d.action === "x-meal-swap") { ui.mealShift ||= {}; ui.mealShift[d.name] = (ui.mealShift[d.name] || 0) + 1; $("#diet-out").innerHTML = dietOutHTML(); }
});
document.addEventListener("change", async (ev) => {
  const el = ev.target;
  if (el.dataset.input !== "x-ideal" || !el.files[0]) return;
  const fileId = "ideal-" + uid();
  await fileSet(fileId, await shrinkImage(el.files[0]));
  if (state.ideal?.fileId) fileDel(state.ideal.fileId);
  state.ideal = { fileId, note: state.ideal?.note || "" };
  el.value = ""; save(true); render(); toast("Físico ideal guardado");
});
document.addEventListener("input", (ev) => {
  if (ev.target.dataset.input === "x-ideal-note" && state.ideal) { state.ideal.note = ev.target.value; save(); }
});

function settingsSheet() {
  const s = state.settings;
  return `<div class="row between"><h2>Ajustes</h2><button class="icon-btn" data-action="close-sheet" aria-label="Cerrar">${ICON.x}</button></div>
  <form class="stack" data-form="settings">
    <label class="field">API key de Anthropic (para las funciones con Claude)<input class="input" type="password" name="apiKey" id="st-key" autocomplete="off" value="${esc(s.apiKey)}" placeholder="sk-ant-…"></label>
    <p class="muted small">Se guarda solo en este navegador y se envía únicamente a api.anthropic.com. Consíguela en console.anthropic.com → API Keys. Cada consulta consume saldo de tu cuenta.</p>
    <label class="field">Modelo<select class="input" name="model" id="st-model">${[["claude-opus-5-5", "Claude Opus 5.5 (mejor calidad)"], ["claude-sonnet-5-5", "Claude Sonnet 5.5 (más barato)"], ["claude-haiku-5-5", "Claude Haiku 5.5 (el más barato)"]].map(([v, l]) => `<option value="${v}" ${s.model === v ? "selected" : ""}>${l}</option>`).join("")}</select></label>
    <label class="field">Descanso entre series (segundos)<input class="input num" name="rest" id="st-rest" inputmode="numeric" value="${esc(s.rest)}"></label>
    <button class="btn primary" type="submit">Guardar ajustes</button>
  </form>
  ${window.EDGIM_USER ? `<div class="divider"></div>
  <h3>Cuenta</h3>
  <p class="small">Sesión iniciada como <b>${esc(window.EDGIM_USER.email)}</b>. ${window.EDGIM_USER.offline ? "Sin conexión: los cambios se suben cuando vuelvas a abrir la app con internet." : "Tus datos y fotos se guardan en tu cuenta y se sincronizan entre dispositivos."}</p>
  <button class="btn danger" data-action="x-logout">Cerrar sesión</button>` : ""}
  <div class="divider"></div>
  <h3>Respaldo</h3>
  <p class="muted small">${window.EDGIM_USER ? "Copia de seguridad extra de tu cuenta" : "Tus datos viven en este navegador. Descarga un respaldo"} (incluye fotos y documentos).</p>
  <div class="row"><button class="btn ghost" data-action="export">Descargar respaldo</button>
    <label class="btn ghost">Restaurar respaldo<input type="file" id="import-in" data-input="import" accept=".json,application/json" hidden></label></div>`;
}
async function exportBackup() {
  toast("Preparando respaldo…");
  const files = {};
  const ids = [...state.photos.map((p) => p.fileId), ...state.sources.filter((s) => s.fileId).map((s) => s.fileId)];
  for (const id of ids) { const b = await fileGet(id); if (b) files[id] = await blobToDataURL(b); }
  const blob = new Blob([JSON.stringify({ app: "repa", version: 1, state: { ...state, settings: { ...state.settings, apiKey: "" } }, files })], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = `edgim-respaldo-${todayISO()}.json`;
  document.body.append(a); a.click(); a.remove();
}
async function importBackup(file) {
  try {
    const j = JSON.parse(await file.text());
    if (j.app !== "repa") throw new Error();
    for (const [id, dataURL] of Object.entries(j.files || {})) await fileSet(id, await (await fetch(dataURL)).blob());
    const key = state.settings.apiKey;
    state = { ...structuredClone(DEFAULT_STATE), ...j.state };
    state.settings.apiKey = key;
    save(true); closeSheet(); render(); toast("Respaldo restaurado");
  } catch { toast("Ese archivo no es un respaldo válido de EDGIM"); }
}

/* =========================================================
   EVENTOS
   ========================================================= */
document.addEventListener("click", async (ev) => {
  const tab = ev.target.closest(".tab");
  if (tab) return go(tab.dataset.tab);
  const el = ev.target.closest("[data-action]");
  if (!el) return;
  const A = el.dataset.action, d = el.dataset;
  const act = state.active;
  switch (A) {
    case "close-sheet": closeSheet(); break;
    case "confirm-yes": { const cb = ui.confirmCb; ui.confirmCb = null; closeSheet(); cb?.(); break; }
    // Entreno
    case "start": startSession(+d.day); break;
    case "cancel-session": confirmBox("¿Descartar este entreno?", "Descartar", () => { state.active = null; stopTimer(); save(); render(); }); break;
    case "finish": finishSession(); break;
    case "variant": act.entries[+d.e].variant = +d.v; save(); render(); break;
    case "add-set": { const s = act.entries[+d.e].sets; const last = s[s.length - 1]; s.push({ w: last?.w || "", r: "", done: false }); save(); render(); break; }
    case "rm-set": act.entries[+d.e].sets.splice(+d.s, 1); save(); render(); break;
    case "rm-entry": act.entries.splice(+d.e, 1); save(); render(); break;
    case "done": {
      const en = act.entries[+d.e], st = en.sets[+d.s];
      if (!st.done) {
        const w = $(`#w-${d.e}-${d.s}`), r = $(`#r-${d.e}-${d.s}`);
        if (!st.w && w?.placeholder && w.placeholder !== "0") st.w = w.placeholder;
        if (!st.r && r?.placeholder && r.placeholder !== "0") st.r = r.placeholder;
        if (!num(st.r)) { toast("Escribe las repeticiones de la serie"); return; }
        st.done = true; startTimer();
      } else st.done = false;
      save(); render(); break;
    }
    case "timer-add": timerEnd += 30000; tickTimer(); break;
    case "timer-stop": stopTimer(); break;
    case "del-session": confirmBox("¿Borrar este entreno del historial?", "Borrar", () => { state.sessions = state.sessions.filter((s) => s.id !== d.id); save(); render(); }); break;
    case "picker": ui.picker = { mode: d.mode, day: +d.d }; ui.query = ""; openSheet(pickerSheet); setTimeout(() => $("#picker-q")?.focus(), 50); break;
    case "pick": {
      if (ui.picker.mode === "session") { act.entries.push(newEntry(d.id)); closeSheet(); save(); render(); setTimeout(() => window.scrollTo(0, document.body.scrollHeight), 30); }
      else { state.routine.days[ui.picker.day].items.push({ exId: d.id, variant: 0, sets: 3, reps: COMPOUND.has(d.id) ? "6-10" : "8-12", note: "" }); closeSheet(); save(); render(); toast("Añadido a " + state.routine.days[ui.picker.day].name); }
      break;
    }
    case "muscle-filter": ui.muscleFilter = d.m; if (sheetRender) refreshSheet(); else render(); break;
    // Ejercicios
    case "new-ex": openSheet(() => newExSheet(d.name || "")); break;
    case "ex-detail": ui.detail = d.id; ui.detailVar = 0; openSheet(exDetailSheet); break;
    case "detail-var": ui.detailVar = +d.v; refreshSheet(); break;
    case "del-ex": confirmBox("¿Borrar este ejercicio?", "Borrar", () => { state.customExercises = state.customExercises.filter((e) => e.id !== d.id); state.routine.days.forEach((dy) => (dy.items = dy.items.filter((it) => it.exId !== d.id))); save(); render(); }); break;
    // Rutina
    case "cycle-pri": { const cur = state.routine.priorities[d.m] || "normal"; state.routine.priorities[d.m] = { normal: "alta", alta: "baja", baja: "normal" }[cur]; save(); render(); break; }
    case "gen-routine": state.routine.days.length ? confirmBox("¿Reemplazar tu rutina actual?", "Generar nueva", generateRoutine) : generateRoutine(); break;
    case "add-day": state.routine.days.push({ name: `Día ${state.routine.days.length + 1}`, items: [] }); save(); render(); break;
    case "del-day": confirmBox(`¿Borrar ${state.routine.days[+d.d].name}?`, "Borrar día", () => { state.routine.days.splice(+d.d, 1); save(); render(); }); break;
    case "item-up": { const it = state.routine.days[+d.d].items; [it[+d.i - 1], it[+d.i]] = [it[+d.i], it[+d.i - 1]]; save(); render(); break; }
    case "item-del": state.routine.days[+d.d].items.splice(+d.i, 1); save(); render(); break;
    case "item-edit": openSheet(() => itemEditSheet(+d.d, +d.i)); break;
    case "del-src": { const s = state.sources.find((x) => x.id === d.id); if (s?.fileId) fileDel(s.fileId); state.sources = state.sources.filter((x) => x.id !== d.id); save(); render(); break; }
    case "settings": openSheet(settingsSheet); break;
    case "ai-routine": if (!state.settings.apiKey) { openSheet(settingsSheet); toast("Primero agrega tu API key"); } else aiRoutine(); break;
    case "ai-apply": {
      aiCleanupPending(true);
      state.routine.days = ui.aiResult.days.map((dy) => ({ name: dy.name, items: dy.items.map(({ exId, variant, sets, reps, note }) => ({ exId, variant, sets, reps, note })) }));
      state.routine.summary = ui.aiResult.resumen || "";
      ui.aiResult = null; save(); render(); toast("Rutina actualizada"); break;
    }
    case "ai-discard": aiCleanupPending(false); ui.aiResult = null; save(); render(); break;
    case "export": exportBackup(); break;
    // Dieta
    case "diet-set": state.diet[d.k] = d.v; save(); render(); break;
    case "ai-diet": if (!state.settings.apiKey) { openSheet(settingsSheet); toast("Primero agrega tu API key"); } else aiDiet(); break;
    // Progreso
    case "compare-mode": ui.compareMode = !ui.compareMode; ui.compare = []; render(); break;
    case "photo":
      if (ui.compareMode) {
        ui.compare = ui.compare.includes(d.id) ? ui.compare.filter((x) => x !== d.id) : [...ui.compare, d.id].slice(-2);
        if (ui.compare.length === 2) { openSheet(compareSheet); ui.compareMode = false; ui.compare = []; }
        render();
      } else openSheet(() => photoViewSheet(d.id));
      break;
    case "del-photo": confirmBox("¿Borrar esta foto?", "Borrar", async () => { const p = state.photos.find((x) => x.id === d.id); if (p) await fileDel(p.fileId); state.photos = state.photos.filter((x) => x.id !== d.id); save(); render(); }); break;
  }
});

document.addEventListener("input", (ev) => {
  const el = ev.target, d = el.dataset;
  switch (d.input) {
    case "set": state.active.entries[+d.e].sets[+d.s][d.f] = el.value; save(); break;
    case "ex-q": ui.query = el.value; $("#ex-list").innerHTML = exListHTML(); break;
    case "picker-q": ui.query = el.value; $("#picker-list").outerHTML = pickerSheet().match(/<div class="list" id="picker-list">[\s\S]*$/)[0]; break;
    case "day-name": state.routine.days[+d.d].name = el.value; save(); break;
    case "ai-ask": ui.aiAsk = el.value; break;
    case "diet": state.diet[d.k] = el.value; save(); $("#diet-out").innerHTML = dietOutHTML(); break;
    case "diet-prefs": state.diet.prefs = el.value; save(); break;
  }
});
document.addEventListener("change", async (ev) => {
  const el = ev.target, d = el.dataset;
  if (d.input === "days-pw") { state.routine.daysPerWeek = +el.value; save(); }
  if (d.input === "diet" && (d.k === "goal" || el.tagName === "SELECT")) render();
  if (d.input === "photos" && el.files.length) { ui.pendingFiles = [...el.files]; el.value = ""; openSheet(photoFormSheet); }
  if (d.input === "import" && el.files[0]) importBackup(el.files[0]);
  if (d.input === "src-file") {
    for (const f of el.files) {
      const isPdf = f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");
      if (isPdf) {
        if (f.size > 25e6) { toast(`${f.name} pesa más de 25 MB`); continue; }
        const fileId = "doc-" + uid(); await fileSet(fileId, f);
        state.sources.push({ id: uid(), kind: "file", title: f.name, mime: "application/pdf", fileId, tags: ui.srcTags || [], active: true, addedAt: todayISO() });
      } else {
        state.sources.push({ id: uid(), kind: "file", title: f.name, mime: "text/plain", text: (await f.text()).slice(0, 200000), tags: ui.srcTags || [], active: true, addedAt: todayISO() });
      }
    }
    el.value = ""; save(); render(); toast("Documento agregado");
  }
});
document.addEventListener("submit", async (ev) => {
  const f = ev.target; if (!f.dataset.form) return;
  ev.preventDefault();
  const v = Object.fromEntries(new FormData(f));
  switch (f.dataset.form) {
    case "new-ex": {
      const name = v.name.trim(); if (!name) return;
      if (exByName(name)) { toast("Ya existe un ejercicio con ese nombre"); return; }
      state.customExercises.push({ id: "c-" + uid(), name, muscle: v.muscle, variants: [v.v1.trim() || "Libre", v.v2.trim() || "Polea"], tier: 2, custom: true });
      ui.query = ""; ui.muscleFilter = v.muscle; save(); closeSheet(); render(); toast("Ejercicio creado"); break;
    }
    case "item-edit": {
      const it = state.routine.days[+f.dataset.d].items[+f.dataset.i];
      Object.assign(it, { variant: +v.variant, sets: num(v.sets) || 3, reps: v.reps || "8-12", note: v.note });
      save(); closeSheet(); render(); break;
    }
    case "add-link": {
      const url = v.url.trim(), text = v.text.trim();
      if (!url && !text) { toast("Pega un link o escribe una nota"); return; }
      let title = text.split("\n")[0].slice(0, 60) || "Nota";
      if (url) { try { const u = new URL(url); title = u.hostname.replace("www.", "") + (u.hostname.includes("youtu") ? " · video" : ""); } catch { toast("Ese link no es válido"); return; } }
      state.sources.push({ id: uid(), kind: url ? "link" : "note", title, url, text, addedAt: todayISO() });
      save(); render(); toast("Fuente agregada"); break;
    }
    case "settings":
      Object.assign(state.settings, { apiKey: v.apiKey.trim(), model: v.model, rest: num(v.rest) || 90 });
      save(true); closeSheet(); render(); toast("Ajustes guardados"); break;
    case "weight":
      if (!num(v.kg)) return;
      state.weights = state.weights.filter((w) => w.date !== v.date);
      state.weights.push({ date: v.date, kg: num(v.kg) });
      state.diet.weight = num(v.kg);
      save(); render(); toast("Peso registrado"); break;
    case "photos": {
      const poses = ["Frente", "Lado", "Espalda", "Otra"];
      let pi = poses.indexOf(v.pose);
      toast("Guardando fotos…");
      for (const file of ui.pendingFiles) {
        const fileId = "img-" + uid();
        await fileSet(fileId, await shrinkImage(file));
        state.photos.push({ id: uid(), fileId, date: v.date, weight: num(v.weight) || "", pose: poses[Math.min(pi, 3)], note: v.note });
        if (pi < 2) pi++;
      }
      if (num(v.weight)) { state.weights = state.weights.filter((w) => w.date !== v.date); state.weights.push({ date: v.date, kg: num(v.weight) }); }
      ui.pendingFiles = []; save(true); closeSheet(); render(); toast("Fotos guardadas"); break;
    }
  }
});

// Arrastrar fotos a la zona de subida
document.addEventListener("dragover", (e) => { const z = e.target.closest?.("#drop"); if (z) { e.preventDefault(); z.classList.add("over"); } });
document.addEventListener("dragleave", (e) => e.target.closest?.("#drop")?.classList.remove("over"));
document.addEventListener("drop", (e) => {
  const z = e.target.closest?.("#drop"); if (!z) return;
  e.preventDefault(); z.classList.remove("over");
  const files = [...e.dataTransfer.files].filter((f) => f.type.startsWith("image/"));
  if (files.length) { ui.pendingFiles = files; openSheet(photoFormSheet); }
});
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("#sheet").hidden) closeSheet(); });

render();
