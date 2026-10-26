// ISA Risk — pantallas: Dashboard ejecutivo, Bandeja de decisiones, Ficha 360 del cliente y Cómo decide el modelo.
(function () {
  "use strict";

  const TODOS = window.CLIENTES || [];
  const M = window.Modelo;
  const vista = document.getElementById("vista");
  const titulo = document.getElementById("titulo");

  if (!TODOS.length || !M) {
    vista.innerHTML = '<div class="tarjeta vacio">No se pudieron cargar los datos de clientes.</div>';
    return;
  }
  M.iniciar(TODOS);

  // Solicitudes creadas o decididas en la demo: se guardan en este navegador.
  const CLAVE_LOCAL = "isarisk_solicitudes_v1";
  function guardarLocal() {
    try {
      const cambios = TODOS.filter((c) => c.solicitud && c.solicitud.local).map((c) => ({
        id: c.id, solicitud: c.solicitud, monto: c.monto_solicitado, plazo: c.plazo_solicitado, documentos: c.documentos,
      }));
      localStorage.setItem(CLAVE_LOCAL, JSON.stringify(cambios));
    } catch (e) { /* sin almacenamiento: la demo sigue funcionando en memoria */ }
  }
  try {
    const guardados = JSON.parse(localStorage.getItem(CLAVE_LOCAL) || "[]");
    guardados.forEach((g) => {
      const c = TODOS.find((x) => x.id === g.id);
      if (c) { c.solicitud = g.solicitud; c.monto_solicitado = g.monto; c.plazo_solicitado = g.plazo; c.documentos = g.documentos; }
    });
  } catch (e) { /* ignorar datos dañados */ }

  const estado = { h: 30, codigo: "", nombre: "", sector: "", vendedor: "", riesgoTop: "", pestana: "Por evaluar", rol: null };

  const ICONOS = {
    grid: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
    file: '<svg viewBox="0 0 24 24"><path d="M6 2h9l5 5v15H6z"/><path d="M14 2v6h6M9 13h8M9 17h6"/></svg>',
    shield: '<svg viewBox="0 0 24 24"><path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5z"/><path d="m8.5 12 2.5 2.5 4.5-5"/></svg>',
    chart: '<svg viewBox="0 0 24 24"><path d="M4 21V11M10 21V4M16 21v-7M22 21H2"/></svg>',
    users: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="4"/><path d="M2 21c0-4 3-6 7-6s7 2 7 6M16 4a4 4 0 0 1 0 8M22 21c0-3-2-5-4-5.6"/></svg>',
    home: '<svg viewBox="0 0 24 24"><path d="M3 11 12 3l9 8v10h-6v-6H9v6H3z"/></svg>',
  };
  const ZONA_COMERCIAL = "Zona Norte";
  const ROLES = {
    jefatura: { etiqueta: "JEFATURA", usuario: "Jefatura de Créditos", iniciales: "JF", inicio: "dashboard",
      menu: [["dashboard", "Dashboard ejecutivo", "grid"], ["bandeja", "Bandeja de decisiones", "file", true], ["ficha", "Ficha 360 del cliente", "shield"], ["modelo", "Cómo decide el modelo", "chart"]] },
    analista: { etiqueta: "ANALISTA", usuario: "Analista de Créditos", iniciales: "AN", inicio: "bandeja",
      menu: [["bandeja", "Mi bandeja", "file", true], ["ficha", "Ficha 360 del cliente", "shield"], ["modelo", "Cómo decide el modelo", "chart"]] },
    comercial: { etiqueta: "COMERCIAL", usuario: "Vendedor · " + ZONA_COMERCIAL, iniciales: "VN", inicio: "inicio",
      menu: [["inicio", "Inicio", "home"], ["clientes", "Clientes", "users"], ["solicitudes", "Mis solicitudes", "file"]] },
  };

  // ================= utilidades =================
  const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  const usd = (n) => "$" + Math.round(n).toLocaleString("en-US");
  const corto = (n) => {
    const a = Math.abs(n);
    if (a >= 1e6) return "$" + (n / 1e6).toLocaleString("en-US", { maximumFractionDigits: 2 }) + "M";
    if (a >= 1e3) return "$" + (n / 1e3).toLocaleString("en-US", { maximumFractionDigits: a >= 1e5 ? 0 : 1 }) + "K";
    return "$" + Math.round(n);
  };
  const pct = (x, d = 1) => (x * 100).toLocaleString("es-PE", { minimumFractionDigits: d, maximumFractionDigits: d }) + "%";
  const COLOR_NIVEL = Object.fromEntries(M.NIVELES.map((n) => [n.nivel, n.color]));
  const CHIP_NIVEL = { "Bajo": "verde", "Medio": "amarillo", "Alto": "naranja", "Crítico": "rojo" };
  const CHIP_DEC = { "Aprobar": "verde", "Ajustar": "amarillo", "Rechazar": "rojo" };
  const MESES = ["Abr 26", "May 26", "Jun 26", "Jul 26", "Ago 26", "Set 26"];
  const FECHA_H = { 30: "25 Nov", 60: "25 Dic", 90: "24 Ene" };
  const TRAMOS = ["1 a 30 días", "31 a 60 días", "61 a 90 días", "Más de 90 días"];
  const COLOR_TRAMO = ["#E9B3B3", "#D97B7B", "#C04848", "#7E1F2B"];
  const iniciales = (n) => n.split(" ").filter((p) => /^[A-ZÁÉÍÓÚ]/.test(p) && !p.includes(".")).slice(0, 2).map((p) => p[0]).join("");
  const porId = (id) => TODOS.find((c) => c.id === id);

  // Evaluaciones en caché por horizonte
  const cache = {};
  function ev(c, h = estado.h) {
    const k = c.id + "|" + h;
    if (!cache[k]) cache[k] = M.evaluar(c, h);
    return cache[k];
  }

  function filtrados() {
    const cod = estado.codigo.trim().toLowerCase();
    const nom = estado.nombre.trim().toLowerCase();
    return TODOS.filter((c) =>
      (!cod || c.id.toLowerCase().includes(cod)) &&
      (!nom || c.nombre.toLowerCase().includes(nom)) &&
      (!estado.sector || c.sector === estado.sector) &&
      (!estado.vendedor || c.vendedor === estado.vendedor));
  }

  function selectorH() {
    return `<div class="horizonte" role="group" aria-label="Días a proyectar">${[30, 60, 90].map((h) =>
      `<button type="button" data-h="${h}" class="${h === estado.h ? "activo" : ""}" aria-pressed="${h === estado.h}"><span>${h}</span> días</button>`).join("")}</div>`;
  }
  function enlazarH(redibujar) {
    vista.querySelectorAll(".horizonte button").forEach((b) => b.addEventListener("click", () => { estado.h = Number(b.dataset.h); redibujar(); }));
  }
  function chipNivel(n) { return `<span class="chip ${CHIP_NIVEL[n]}">${n}</span>`; }
  function irFicha(id) { location.hash = "#ficha/" + id; }
  function toast(msg) {
    const t = document.getElementById("toast");
    t.textContent = msg; t.classList.add("ver");
    clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("ver"), 2200);
  }
  function enlazarClics() {
    vista.querySelectorAll("[data-ir]").forEach((el) => {
      el.addEventListener("click", () => irFicha(el.dataset.ir));
      el.addEventListener("keydown", (e) => { if (e.key === "Enter") irFicha(el.dataset.ir); });
    });
  }
  const info = (t) => `<span class="info" title="${esc(t)}">i</span>`;

  // ================= Dashboard ejecutivo =================
  function proyeccion(lista) {
    // Real: suma de la historia de vencido. Proyección: cada mes una parte de la deuda al día
    // pasa a vencida según la probabilidad de atraso del cliente, y se recupera 12 % del vencido.
    const real = MESES.map((_, i) => lista.reduce((s, c) => s + c.vencido_historia[i], 0));
    const hoy = real[real.length - 1];
    const flujo = lista.reduce((s, c) => s + (c.saldo - c.vencido) * ev(c, 30).pd * 0.25, 0);
    const central = [], opt = [], pes = [];
    let v = hoy, vo = hoy, vp = hoy;
    for (let k = 1; k <= 3; k++) {
      v = v + flujo - 0.12 * v; vo = vo + flujo * 0.6 - 0.15 * vo; vp = vp + flujo * 1.6 - 0.08 * vp;
      central.push(v); opt.push(vo); pes.push(vp);
    }
    return { real, hoy, central, opt, pes };
  }

  function graficoVencido(p) {
    const W = 640, H = 250, L = 58, R = 16, T = 18, B = 40;
    const n = 9; // 6 reales + 3 proyectados
    const max = Math.max(...p.pes, ...p.real) * 1.12 || 1;
    const x = (i) => L + (i * (W - L - R)) / (n - 1);
    const y = (v) => T + (H - T - B) * (1 - v / max);
    const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);
    const realPts = p.real.map((v, i) => `${x(i)},${y(v)}`).join(" ");
    const proyPts = [p.hoy, ...p.central].map((v, i) => `${x(5 + i)},${y(v)}`).join(" ");
    const banda = [p.hoy, ...p.pes].map((v, i) => `${x(5 + i)},${y(v)}`).join(" ") + " " +
      [p.hoy, ...p.opt].map((v, i) => `${x(5 + i)},${y(v)}`).reverse().join(" ");
    const sel = { 30: 0, 60: 1, 90: 2 }[estado.h];
    const etiquetas = [...MESES, "+30d", "+60d", "+90d"];
    const subet = ["", "", "", "", "", "", FECHA_H[30], FECHA_H[60], FECHA_H[90]];
    return `<div class="grafico"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Saldo vencido real y proyectado">
      ${ticks.map((t) => `<line x1="${L}" x2="${W - R}" y1="${y(t)}" y2="${y(t)}" stroke="#E9ECEF"/><text x="${L - 8}" y="${y(t) + 4}" text-anchor="end" font-size="11" fill="#5D6873">${corto(t)}</text>`).join("")}
      <polygon points="${banda}" fill="#F5B700" opacity=".16"/>
      <polyline points="${[p.hoy, ...p.pes].map((v, i) => `${x(5 + i)},${y(v)}`).join(" ")}" fill="none" stroke="#C93C3C" stroke-width="1" opacity=".55"/>
      <polyline points="${[p.hoy, ...p.opt].map((v, i) => `${x(5 + i)},${y(v)}`).join(" ")}" fill="none" stroke="#2E9E5B" stroke-width="1" opacity=".6"/>
      <line x1="${x(5)}" x2="${x(5)}" y1="${T - 6}" y2="${H - B}" stroke="#1B1F24" stroke-dasharray="3 3"/>
      <text x="${x(5)}" y="${T - 8 + 4}" text-anchor="middle" font-size="11" font-weight="700" fill="#1B1F24">Hoy</text>
      <polyline points="${realPts}" fill="none" stroke="#1B1F24" stroke-width="2.4"/>
      ${p.real.map((v, i) => `<circle cx="${x(i)}" cy="${y(v)}" r="3.5" fill="#1B1F24"/>`).join("")}
      <polyline points="${proyPts}" fill="none" stroke="#E07A00" stroke-width="2.4" stroke-dasharray="6 5"/>
      ${p.central.map((v, i) => `<circle cx="${x(6 + i)}" cy="${y(v)}" r="${i === sel ? 7 : 4}" fill="${i === sel ? "#F5B700" : "#E07A00"}" stroke="${i === sel ? "#1B1F24" : "none"}" stroke-width="2"/>`).join("")}
      <text x="${x(6 + sel) - 10}" y="${y(p.pes[sel]) - 8}" text-anchor="end" font-size="11" fill="#9B2C2C">Pesimista: ${corto(p.pes[sel])}</text>
      <text x="${x(6 + sel) - 10}" y="${y(p.opt[sel]) + 16}" text-anchor="end" font-size="11" fill="#1D6B3D">Optimista: ${corto(p.opt[sel])}</text>
      ${etiquetas.map((e, i) => `<text x="${x(i)}" y="${H - B + 17}" text-anchor="middle" font-size="11" fill="${i === 6 + sel ? "#1B1F24" : "#5D6873"}" font-weight="${i === 6 + sel ? 800 : 400}">${e}</text>${subet[i] ? `<text x="${x(i)}" y="${H - B + 30}" text-anchor="middle" font-size="9.5" fill="#8A949E">${subet[i]}</text>` : ""}`).join("")}
    </svg></div>
    <div class="leyenda"><span><i style="background:#1B1F24"></i>Real</span><span><i style="background:#E07A00"></i>Proyección</span><span><i style="background:#C93C3C;opacity:.6"></i>Pesimista</span><span><i style="background:#2E9E5B;opacity:.7"></i>Optimista</span></div>`;
  }

  function dashboard() {
    titulo.textContent = "Dashboard ejecutivo";
    const lista = filtrados();
    if (!lista.length) { vista.innerHTML = '<div class="tarjeta vacio">No encontramos clientes con esos filtros.</div>'; return; }
    const h = estado.h;
    const evs = lista.map((c) => ({ c, e: ev(c) }));
    const saldo = lista.reduce((s, c) => s + c.saldo, 0);
    const vencido = lista.reduce((s, c) => s + c.vencido, 0);
    const vencidoAgo = lista.reduce((s, c) => s + c.vencido_historia[4], 0);
    const altos = evs.filter((x) => ["Alto", "Crítico"].includes(x.e.consolidado.nivel));
    const saldoAltos = altos.reduce((s, x) => s + x.c.saldo, 0);
    const pend = lista.filter((c) => c.solicitud && c.solicitud.estado === "Por evaluar");
    const fuera = pend.filter((c) => c.solicitud.vence_en_dias < 0);
    const pdPond = evs.reduce((s, x) => s + x.e.pd * x.c.saldo, 0) / (saldo || 1);
    const p = proyeccion(lista);
    const sel = { 30: 0, 60: 1, 90: 2 }[h];

    // Prioridades
    const prioSol = [...pend].sort((a, b) => a.solicitud.vence_en_dias - b.solicitud.vence_en_dias).slice(0, 3).map((c) => {
      const d = c.solicitud.vence_en_dias;
      const chip = d < 0 ? `<span class="chip rojo">Fuera de plazo</span>` : d <= 2 ? `<span class="chip naranja">Vence en ${d} día${d === 1 ? "" : "s"}</span>` : `<span class="chip gris">Vence en ${d} días</span>`;
      return `<div class="prioridad" data-ir="${c.id}" tabindex="0">${chip} <span class="tipo">&nbsp;Solicitud ${c.solicitud.codigo}</span>
        <div class="nombre">${esc(c.nombre)}</div><div class="det">${corto(c.solicitud.monto)} solicitados · riesgo ${ev(c).consolidado.nivel}</div></div>`;
    });
    const orden = { "Crítica": 0, "Alta": 1, "Media": 2 };
    const prioAl = lista.flatMap((c) => M.alertas(c).map((a) => ({ c, a })))
      .sort((x, y) => orden[x.a.prioridad] - orden[y.a.prioridad] || y.c.saldo - x.c.saldo)
      .slice(0, 6 - prioSol.length).map(({ c, a }) =>
        `<div class="prioridad" data-ir="${c.id}" tabindex="0"><span class="chip ${a.prioridad === "Crítica" ? "rojo" : a.prioridad === "Alta" ? "naranja" : "amarillo"}">${a.prioridad}</span> <span class="tipo">&nbsp;${a.titulo}</span>
          <div class="nombre">${esc(c.nombre)}</div><div class="det">${esc(a.texto)}</div></div>`);

    // Niveles
    const porNivel = M.NIVELES.map((n) => {
      const xs = evs.filter((x) => x.e.consolidado.nivel === n.nivel);
      return { ...n, n: xs.length, deuda: xs.reduce((s, x) => s + x.c.saldo, 0), venc: xs.reduce((s, x) => s + x.c.vencido, 0) };
    });
    const vAlt = porNivel.filter((x) => ["Alto", "Crítico"].includes(x.nivel));
    const vRes = porNivel.filter((x) => !["Alto", "Crítico"].includes(x.nivel));
    const ratio = (arr) => arr.reduce((s, x) => s + x.venc, 0) / (arr.reduce((s, x) => s + x.deuda, 0) || 1);
    const maxVencNivel = Math.max(...porNivel.map((x) => x.venc), 1);

    // Tramos
    const tramos = [0, 1, 2, 3].map((i) => ({ monto: lista.reduce((s, c) => s + c.vencido_tramos[i], 0), n: lista.filter((c) => c.vencido_tramos[i] > 0).length }));
    const mas60 = tramos[2].monto + tramos[3].monto;
    const maxTramo = Math.max(...tramos.map((t) => t.monto), 1);

    // Sectores
    const sectores = [...new Set(lista.map((c) => c.sector))].map((s) => {
      const xs = evs.filter((x) => x.c.sector === s);
      const prom = xs.reduce((a, x) => a + x.e.consolidado.total, 0) / xs.length;
      const nivel = M.NIVELES.find((n) => prom < n.hasta).nivel;
      return { s, deuda: xs.reduce((a, x) => a + x.c.saldo, 0), venc: xs.reduce((a, x) => a + x.c.vencido, 0), nivel, prom };
    }).sort((a, b) => b.deuda - a.deuda);
    const maxSector = Math.max(...sectores.map((x) => x.deuda), 1);
    const sectorRiesgo = [...sectores].sort((a, b) => b.prom - a.prom)[0];

    // Top clientes
    const conteo = Object.fromEntries(M.NIVELES.map((n) => [n.nivel, evs.filter((x) => x.e.consolidado.nivel === n.nivel).length]));
    const top = evs.filter((x) => !estado.riesgoTop || x.e.consolidado.nivel === estado.riesgoTop).sort((a, b) => b.c.ventas_12m - a.c.ventas_12m).slice(0, 10);
    const maxVenta = Math.max(...top.map((x) => x.c.ventas_12m), 1);

    vista.innerHTML = `
      <div class="grid kpis">
        <div class="tarjeta kpi"><div class="etq-kpi">Cartera total ${info("Lo que nos deben todos los clientes al corte")}</div><div class="valor">${corto(saldo)}</div><div class="nota">${lista.length} clientes · corte Set 26</div></div>
        <div class="tarjeta kpi alerta"><div class="etq-kpi">Saldo vencido ${info("Deuda que ya pasó su fecha de pago")}</div><div class="valor">${corto(vencido)}</div><div class="nota">${pct(vencido / saldo)} de morosidad</div><div class="delta ${vencido >= vencidoAgo ? "sube" : "baja"}">${vencido >= vencidoAgo ? "▲ +" : "▼ "}${corto(Math.abs(vencido - vencidoAgo))} vs Ago 26</div></div>
        <div class="tarjeta kpi cuidado"><div class="etq-kpi">Cartera alto / crítico ${info("Deuda de clientes con puntaje consolidado de 45 o más")}</div><div class="valor">${corto(saldoAltos)}</div><div class="nota">${pct(saldoAltos / saldo)} de la cartera · ${altos.length} clientes</div></div>
        <div class="tarjeta kpi dorado"><div class="etq-kpi">Solicitudes por decidir</div><div class="valor">${pend.length}</div><div class="nota">${corto(pend.reduce((s, c) => s + c.solicitud.monto, 0))} solicitados · ${fuera.length} fuera de plazo</div></div>
        <div class="tarjeta kpi"><div class="etq-kpi">Prob. de atraso ${info("Promedio ponderado por deuda")}</div><div class="valor">${pct(pdPond)}</div><div class="nota">a ${h} días · ponderada por deuda</div></div>
      </div>

      <div class="tarjeta" style="margin-bottom:16px" id="prioridades">
        <h2>Prioridades de hoy</h2>
        <div class="bajada">Decisiones que esperan a Jefatura (la más atrasada primero) y alertas más urgentes</div>
        <div class="prioridades">${[...prioSol, ...prioAl].join("") || '<div class="vacio">Sin pendientes.</div>'}</div>
      </div>

      <div class="grid g-2">
        <div class="tarjeta">
          <div class="cab-tarjeta"><div><h2>Saldo vencido: real y proyectado</h2><div class="bajada" style="margin-bottom:0">${lista.length === TODOS.length ? "Toda la cartera" : lista.length + " clientes filtrados"}</div></div>${selectorH()}</div>
          <div class="resumen">Sin gestión de cobranza, en <strong>${h} días (${FECHA_H[h]})</strong> el vencido llegaría a <strong>${corto(p.central[sel])}</strong> · <strong>+${corto(p.central[sel] - p.hoy)}</strong> vs hoy · rango probable ${corto(p.opt[sel])} – ${corto(p.pes[sel])}</div>
          ${graficoVencido(p)}
          <div class="cab-tarjeta" style="margin-top:8px;font-size:12.5px;color:var(--texto-2)"><span>Vencido de más de 90 días hoy: <strong style="color:var(--texto)">${corto(tramos[3].monto)}</strong></span><a class="enlace" href="#ficha">Ver predicción por cliente →</a></div>
        </div>

        <div class="tarjeta">
          <h2>Cartera por nivel de riesgo</h2>
          <div class="bajada">Cuánto nos deben según qué tan riesgoso es cada cliente</div>
          <div class="resumen">Los clientes <strong>Alto y Crítico</strong> tienen vencido el <strong>${pct(ratio(vAlt), 0)}</strong> de lo que deben, frente al <strong>${pct(ratio(vRes), 0)}</strong> del resto</div>
          <div class="barra-apilada">${porNivel.map((x) => `<span style="width:${(x.deuda / saldo) * 100}%;background:${x.color}" title="${x.nivel}"></span>`).join("")}</div>
          <table>
            <thead><tr><th>Nivel ${info("Según el puntaje consolidado 0–100")}</th><th class="num">Clientes</th><th class="num">Deuda</th><th class="num">% deuda</th><th class="num">Vencido</th></tr></thead>
            <tbody>${porNivel.map((x) => `<tr class="${["Alto", "Crítico"].includes(x.nivel) ? "resaltado" : ""}">
              <td><span class="nombre-cli"><span class="punto" style="background:${x.color}"></span>${x.nivel}</span></td>
              <td class="num">${x.n}</td><td class="num"><strong>${corto(x.deuda)}</strong></td><td class="num">${pct(x.deuda / saldo)}</td>
              <td class="num"><span style="display:inline-flex;gap:8px;align-items:center"><span class="barra" style="width:50px"><span style="width:${(x.venc / maxVencNivel) * 100}%;background:var(--rojo)"></span></span><strong>${corto(x.venc)}</strong></span></td></tr>`).join("")}</tbody>
            <tfoot><tr><td>Total</td><td class="num">${lista.length}</td><td class="num">${corto(saldo)}</td><td class="num">100%</td><td class="num">${corto(vencido)}</td></tr></tfoot>
          </table>
        </div>
      </div>

      <div class="grid g-2b">
        <div class="tarjeta">
          <div class="cab-tarjeta"><h2>Clientes que mueven ISA</h2><a class="enlace" href="#bandeja">Ver solicitudes →</a></div>
          <div class="bajada">Top por compras de 12 meses, con su riesgo y su probabilidad de atraso</div>
          <div class="filtro-riesgo">Riesgo:
            ${M.NIVELES.map((n) => `<button type="button" data-riesgo="${n.nivel}" class="${estado.riesgoTop === n.nivel ? "activo" : ""}"><span class="punto" style="background:${n.color}"></span>${n.nivel} <span class="n">${conteo[n.nivel]}</span></button>`).join("")}
          </div>
          <div class="tabla-wrap"><table>
            <thead><tr><th>#</th><th style="min-width:190px">Cliente</th><th class="num">Compra 12M</th><th class="num">Deuda</th><th class="num">Vencido</th><th class="num">Atraso</th><th class="num">Prob. atraso ${h}d</th></tr></thead>
            <tbody>${top.length ? top.map((x, i) => `<tr class="clic" data-ir="${x.c.id}" tabindex="0">
              <td>${i + 1}</td>
              <td><div class="nombre-cli"><span class="punto" style="background:${x.e.consolidado.color}"></span>${esc(x.c.nombre)}</div><div class="sub">${x.c.sector}</div></td>
              <td class="num">${corto(x.c.ventas_12m)}<div class="barra" style="margin-top:4px"><span style="width:${(x.c.ventas_12m / maxVenta) * 100}%"></span></div></td>
              <td class="num">${corto(x.c.saldo)}</td>
              <td class="num">${x.c.vencido ? `<span class="rojo-txt">${corto(x.c.vencido)}</span>` : '<span class="gris-txt">—</span>'}</td>
              <td class="num">${x.c.atraso_prom_dias ? `<span class="rojo-txt">${x.c.atraso_prom_dias} d</span>` : '<span class="gris-txt">Al día</span>'}</td>
              <td class="num"><strong>${pct(x.e.pd)}</strong></td></tr>`).join("") : '<tr><td colspan="7" class="vacio">Sin clientes en ese nivel.</td></tr>'}</tbody>
          </table></div>
        </div>

        <div class="columna">
          <div class="tarjeta">
            <h2>Antigüedad del vencido</h2>
            <div class="bajada">Hace cuánto venció lo que nos deben · ${corto(saldo - vencido)} aún por vencer</div>
            <div class="resumen"><strong>${corto(mas60)} (${pct(mas60 / (vencido || 1), 0)} del vencido)</strong> tiene más de 60 días · es lo más difícil de cobrar</div>
            <table>
              <thead><tr><th>Días vencido</th><th></th><th class="num">Monto</th><th class="num">% vencido</th><th class="num">Clientes</th></tr></thead>
              <tbody>${tramos.map((t, i) => `<tr class="${i >= 2 ? "resaltado" : ""}"><td><span class="nombre-cli"><span class="punto" style="background:${COLOR_TRAMO[i]};border-radius:2px"></span>${TRAMOS[i]}</span></td>
                <td style="width:30%"><div class="barra"><span style="width:${(t.monto / maxTramo) * 100}%;background:${COLOR_TRAMO[i]}"></span></div></td>
                <td class="num"><strong>${corto(t.monto)}</strong></td><td class="num">${pct(t.monto / (vencido || 1), 0)}</td><td class="num">${t.n}</td></tr>`).join("")}</tbody>
              <tfoot><tr><td>Total vencido</td><td></td><td class="num">${corto(vencido)}</td><td class="num">100%</td><td></td></tr></tfoot>
            </table>
          </div>

          <div class="tarjeta">
            <h2>Exposición por sector</h2>
            <div class="bajada">Cuánto nos debe cada sector y qué tan riesgoso es</div>
            <div class="resumen"><strong>${sectores[0].s}</strong> concentra el <strong>${pct(sectores[0].deuda / saldo, 0)}</strong> de la deuda (${corto(sectores[0].deuda)}) · sector de mayor riesgo: <strong>${sectorRiesgo.s}</strong> (${sectorRiesgo.nivel})</div>
            <div class="leyenda" style="margin:0 0 6px"><span><i style="background:var(--acero);height:8px"></i>Deuda</span><span><i style="background:var(--rojo);height:8px"></i>Vencido</span></div>
            ${sectores.map((x) => `<div class="sector-fila"><span>${x.s}</span>
              <div class="sector-barras"><span class="deuda" style="width:${(x.deuda / maxSector) * 100}%"></span><span class="venc" style="width:${(x.venc / maxSector) * 100}%"></span></div>
              <strong class="num">${corto(x.deuda)}</strong>${chipNivel(x.nivel)}</div>`).join("")}
          </div>
        </div>
      </div>`;

    enlazarH(dashboard);
    enlazarClics();
    vista.querySelectorAll("[data-riesgo]").forEach((b) => b.addEventListener("click", () => {
      estado.riesgoTop = estado.riesgoTop === b.dataset.riesgo ? "" : b.dataset.riesgo; dashboard();
    }));
  }

  // ================= Bandeja de decisiones =================
  function bandeja() {
    const comercial = estado.rol === "comercial";
    titulo.textContent = comercial ? "Mis solicitudes" : estado.rol === "analista" ? "Mi bandeja" : "Bandeja de decisiones";
    const sols = filtrados().filter((c) => c.solicitud && (!comercial || c.solicitud.vendedor === ZONA_COMERCIAL));
    const estados = ["Por evaluar", "Aprobada", "Rechazada"];
    const cuenta = Object.fromEntries(estados.map((e) => [e, sols.filter((c) => c.solicitud.estado === e).length]));
    const lista = sols.filter((c) => c.solicitud.estado === estado.pestana)
      .sort((a, b) => (a.solicitud.vence_en_dias ?? 99) - (b.solicitud.vence_en_dias ?? 99));

    vista.innerHTML = `<div class="tarjeta">
      <div class="cab-tarjeta"><div><h2>Solicitudes de crédito${comercial ? " · " + ZONA_COMERCIAL : ""}</h2><div class="bajada">${estado.rol === "analista" ? "Evalúas y dejas lista la recomendación; aprueba quien indica la matriz." : comercial ? "Así va cada solicitud de tus clientes." : "La recomendación es una propuesta del modelo; la decide una persona según la política."}</div></div><div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">${comercial ? '<button class="btn amarillo" id="btnNueva">+ Nueva solicitud</button>' : ""}${selectorH()}</div></div>
      <div class="pestanas">${estados.map((e) => `<button data-p="${e}" class="${e === estado.pestana ? "activo" : ""}">${e} <span class="contador">${cuenta[e]}</span></button>`).join("")}</div>
      <div class="tabla-wrap"><table>
        <thead><tr><th>Solicitud</th><th>Cliente</th><th>Vendedor</th><th class="num">Monto</th><th class="num">Plazo</th><th>Riesgo</th><th>Modelo a ${estado.h} días</th><th class="num">Línea sugerida</th><th>Aprueba</th><th>${estado.pestana === "Por evaluar" ? "Vence" : "Estado"}</th></tr></thead>
        <tbody>${lista.length ? lista.map((c) => {
          const e = ev(c), s = c.solicitud, d = s.vence_en_dias;
          const vence = s.estado !== "Por evaluar" ? `<span class="chip ${s.estado === "Aprobada" ? "verde" : "rojo"}">${s.estado}</span>`
            : d < 0 ? `<span class="chip rojo">Hace ${-d} d</span>` : d <= 2 ? `<span class="chip naranja">En ${d} d</span>` : `<span class="chip gris">En ${d} d</span>`;
          return `<tr class="clic" data-ir="${c.id}" tabindex="0">
            <td style="white-space:nowrap"><strong>${s.codigo}</strong></td>
            <td><div class="nombre-cli">${esc(c.nombre)}</div><div class="sub">${c.sector} · ${c.id}</div></td>
            <td>${s.vendedor}</td><td class="num"><strong>${usd(s.monto)}</strong></td><td class="num">${s.plazo} d</td>
            <td>${chipNivel(e.consolidado.nivel)} <span class="sub">${e.consolidado.total}/100</span></td>
            <td><span class="chip ${CHIP_DEC[e.decision]}">${e.etiqueta}</span></td>
            <td class="num">${e.monto ? usd(e.monto) : "Contado"}</td><td>${e.aprobador}</td><td>${vence}</td></tr>`;
        }).join("") : '<tr><td colspan="10" class="vacio">No hay solicitudes en este estado.</td></tr>'}</tbody>
      </table></div></div>`;
    vista.querySelectorAll("[data-p]").forEach((b) => b.addEventListener("click", () => { estado.pestana = b.dataset.p; bandeja(); }));
    const nueva = document.getElementById("btnNueva");
    if (nueva) nueva.addEventListener("click", () => abrirSolicitud(null));
    enlazarH(bandeja);
    enlazarClics();
  }

  // ================= Ficha 360 =================
  function puntoArco(cx, cy, r, f) { const a = Math.PI * (1 - f); return [cx + r * Math.cos(a), cy - r * Math.sin(a)]; }
  function arco(cx, cy, r, f1, f2) {
    const [x1, y1] = puntoArco(cx, cy, r, f1), [x2, y2] = puntoArco(cx, cy, r, f2);
    return `M${x1.toFixed(2)} ${y1.toFixed(2)} A${r} ${r} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
  }

  function medidorConsolidado(v) {
    const cx = 130, cy = 130, r = 100;
    const tramos = [[0, 30, "#2E9E5B"], [30, 45, "#D9A400"], [45, 60, "#E07A00"], [60, 100, "#C93C3C"]];
    const [mx, my] = puntoArco(cx, cy, r, v / 100);
    return `<div class="medidor-grande"><svg viewBox="0 0 260 150" role="img" aria-label="Puntaje consolidado ${v} de 100">
      ${tramos.map(([a, b, col]) => `<path d="${arco(cx, cy, r, a / 100 + 0.004, b / 100 - 0.004)}" fill="none" stroke="${col}" stroke-width="20"/>`).join("")}
      <circle cx="${mx}" cy="${my}" r="12" fill="#fff" stroke="#1B1F24" stroke-width="4"/>
    </svg><div class="valor-centro">${v}<small>/100</small></div></div>
    <div class="medidor-ext"><span>0</span><span>100</span></div>`;
  }

  function medidorSimple(f, color, texto, max) {
    const cx = 100, cy = 100, r = 78;
    return `<svg viewBox="0 0 200 112" role="img" aria-label="${esc(texto)}">
      <path d="${arco(cx, cy, r, 0, 1)}" fill="none" stroke="#EDEFF2" stroke-width="18" stroke-linecap="round"/>
      ${f > 0.005 ? `<path d="${arco(cx, cy, r, 0, Math.min(1, Math.max(0.02, f)))}" fill="none" stroke="${color}" stroke-width="18" stroke-linecap="round"/>` : ""}
      ${max ? `<text x="22" y="111" font-size="10" fill="#8A949E" text-anchor="middle">0</text><text x="178" y="111" font-size="10" fill="#8A949E" text-anchor="middle">${max}</text>` : ""}
    </svg>`;
  }

  function claseBuro(s) { return s >= 800 ? "A" : s >= 650 ? "B" : s >= 500 ? "C" : s >= 350 ? "D" : "E"; }

  function ficha(id) {
    titulo.textContent = "Ficha 360 del cliente";
    const lista = filtrados();
    const ordenados = (lista.length ? lista : TODOS).slice().sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
    let c = porId(id);
    if (!c || (lista.length && !lista.includes(c))) {
      // por defecto, el cliente con mayor pérdida esperada (vencido × probabilidad)
      c = [...(lista.length ? lista : TODOS)].sort((a, b) => b.vencido * ev(b).pd - a.vencido * ev(a).pd || b.saldo - a.saldo)[0];
    }
    if (location.hash !== "#ficha/" + c.id) history.replaceState(null, "", "#ficha/" + c.id);
    const e = ev(c), k = e.consolidado, h = estado.h;
    const u = M.utilizacion(c), rv = M.ratioVencido(c), buro = M.buroHoy(c);
    const al = M.alertas(c);
    const top3 = [...k.partes].sort((a, b) => b.puntos - a.puntos);
    const colComp = ["#E07A00", "#F5B700", "#44505D"];
    const otros = top3.slice(3).reduce((s, p) => s + p.puntos, 0);
    const pdColor = e.pd <= e.umbrales[0] ? "#2E9E5B" : e.pd <= e.umbrales[1] ? "#D9A400" : "#C93C3C";
    const sumaTramos = c.vencido_tramos.reduce((a, b) => a + b, 0);

    vista.innerHTML = `
      <div class="tarjeta cliente-cab">
        <div class="avatar">${iniciales(c.nombre)}</div>
        <div>
          <h2>${esc(c.nombre)}</h2>
          <div class="chips">
            <span class="chip ${CHIP_NIVEL[k.nivel]}">Riesgo ${k.nivel}</span>
            <span class="chip gris">${c.id}</span><span class="chip gris">${c.sector}</span>
            <span class="chip gris">Vendedor: ${c.vendedor}</span><span class="chip gris">Corte Septiembre 2026</span>
            <span class="chip gris">${M.formatoAnios(c.antiguedad_anios)} como cliente</span>
          </div>
        </div>
        <div class="der">
          <select id="selCliente" aria-label="Elegir cliente">${ordenados.map((x) => `<option value="${x.id}" ${x.id === c.id ? "selected" : ""}>${esc(x.nombre)}</option>`).join("")}</select>
        </div>
      </div>

      <div class="tarjeta franja">
        <div><div class="etq-kpi">Recomendación del modelo</div><div class="reco" style="color:${e.decision === "Aprobar" ? "#1D6B3D" : e.decision === "Ajustar" ? "#7A5C00" : "#9B2C2C"}">${e.etiqueta}</div><div class="nota">Propuesta de reglas; la decide una persona según la política</div></div>
        <div><div class="etq-kpi">Puntaje consolidado</div><div class="grande">${k.total} <small>/100</small> ${chipNivel(k.nivel)}</div><div class="nota">0–100 · más alto = más riesgo</div></div>
        <div><div class="etq-kpi">Score de buró</div><div class="grande">${buro} <small>/999</small> <span class="chip gris">${claseBuro(buro)}</span></div><div class="nota">Base ${c.buro[c.buro.length - 1].base}</div></div>
        <div><div class="etq-kpi">Exposición</div><div class="grande">${corto(c.saldo)}</div><div class="nota">Línea: ${pct(u, 0)} de ${corto(c.linea_actual)} · vencido ${corto(c.vencido)}</div></div>
        <div><div class="etq-kpi">Prob. de atraso a ${h} días</div><div class="grande" style="color:${pdColor}">${pct(e.pd)}</div><div class="nota">Calificación SBS: ${c.calificacion}</div></div>
      </div>

      <div class="grid g-3f">
        <div class="tarjeta puntaje-card ${k.nivel}">
          <div class="titulo-sec">Puntaje consolidado</div>
          <div class="bajada" style="margin:4px 0 0">Toda la información del cliente en un solo número · 0 = sin riesgo · 100 = máximo riesgo</div>
          ${medidorConsolidado(k.total)}
          <div class="nivel-pill" style="background:${k.color}22;color:${k.color}">Riesgo ${k.nivel.toLowerCase()}</div>
          <div style="font-size:13px">Recomendación del modelo: <strong>${e.etiqueta}</strong></div>
          <div class="composicion">
            <div class="tit">Cómo se compone el puntaje</div>
            <div class="barra-apilada">${top3.slice(0, 3).map((p, i) => `<span style="width:${p.puntos}%;background:${colComp[i]}"></span>`).join("")}<span style="width:${otros}%;background:#C9CFD6"></span><span style="flex:1;background:#F1F3F5"></span></div>
            <div class="comp-leyenda">${top3.slice(0, 3).map((p, i) => `<span><span class="punto" style="background:${colComp[i]};border-radius:2px"></span> ${p.nombre} +${p.puntos}</span>`).join("")}<span><span class="punto" style="background:#C9CFD6;border-radius:2px"></span> Otros +${Math.round(otros * 10) / 10}</span></div>
          </div>
          <div class="accion"><strong>Acción sugerida</strong>${esc(e.accion)}</div>
          <div class="botones">
            <button class="btn primario" id="btnEvaluar">${estado.rol === "comercial" ? "Ver si aprobaría" : "✓ Evaluar solicitud"}</button>
            <button class="btn" id="btnSeguimiento">${estado.rol === "comercial" ? "Nueva solicitud" : "Crear seguimiento"}</button>
          </div>
        </div>

        <div class="tarjeta">
          <h2>Componentes del puntaje ${info("Cada componente suma puntos hasta su tope")}</h2>
          <div class="bajada">Cómo se llegó a ${k.total} de 100 puntos</div>
          <table class="comp-tabla">
            <thead><tr><th>Señal</th><th>Aporte</th><th class="num">Puntos</th></tr></thead>
            <tbody>${k.partes.map((p) => `<tr><td><strong>${p.nombre}</strong><div class="sub">${esc(p.detalle)}</div></td>
              <td><div class="barra"><span style="width:${(p.puntos / p.max) * 100}%"></span></div></td>
              <td class="num"><strong>+${p.puntos}</strong> <span class="sub">de ${p.max}</span></td></tr>`).join("")}</tbody>
          </table>
          <div class="total-caja"><span>Puntaje consolidado</span><strong>${k.total} / 100</strong></div>
        </div>

        <div class="tarjeta">
          <h2>Comportamiento con ISA ${info("Cómo paga y compra este cliente")}</h2>
          <div class="bajada">Cómo paga y compra este cliente · Septiembre 2026</div>
          <div class="comp-fila"><span class="et">Línea utilizada</span><div><div class="vl">${pct(u, 0)}</div><div class="sub">${corto(c.linea_utilizada)} de ${corto(c.linea_actual)}</div><div class="barra"><span style="width:${u * 100}%;background:var(--acero)"></span></div></div></div>
          <div class="comp-fila"><span class="et">Vencido hoy</span><div><div class="vl">${corto(c.vencido)}</div><div class="sub">${pct(rv, 0)} de su deuda</div><div class="barra"><span style="width:${Math.min(100, rv * 100)}%;background:var(--rojo)"></span></div></div></div>
          <div class="comp-fila"><span class="et">Atraso máximo</span><div><div class="vl">${c.atraso_max_dias} días</div><div class="sub">promedio ${c.atraso_prom_dias} días</div><div class="barra"><span style="width:${Math.min(100, (c.atraso_max_dias / 120) * 100)}%;background:var(--naranja)"></span></div></div></div>
          <div class="comp-fila"><span class="et">Compras 12 meses</span><div><div class="vl">${corto(c.ventas_12m)}</div><div class="sub">${c.movimientos_12m} movimientos</div></div></div>
          <div class="comp-fila"><span class="et">Condición de pago</span><div class="vl">${c.condicion_pago}</div></div>
          <div class="comp-fila"><span class="et">Tendencia</span><div><div class="vl">${c.tendencia}</div><div class="sub">frente al corte de Agosto 2026</div></div></div>
          <div class="composicion">
            <div class="tit">Antigüedad del vencido</div>
            ${sumaTramos ? `<div class="barra-apilada">${c.vencido_tramos.map((t, i) => t ? `<span style="width:${(t / sumaTramos) * 100}%;background:${COLOR_TRAMO[i]}"></span>` : "").join("")}</div>
            <div class="comp-leyenda">${c.vencido_tramos.map((t, i) => `<span><span class="punto" style="background:${COLOR_TRAMO[i]};border-radius:2px"></span> ${["1–30 d", "31–60 d", "61–90 d", "90+ d"][i]} ${corto(t)}</span>`).join("")}</div>`
            : '<div class="sub">Sin saldo vencido</div>'}
          </div>
        </div>
      </div>

      <div class="grid g-2b">
        <div class="tarjeta" id="riesgoPredictivo">
          <div class="cab-tarjeta"><div><h2>Riesgo predictivo</h2><div class="bajada" style="margin:2px 0 0">Probabilidad de que se atrase más de ${h} días</div></div>${selectorH()}</div>
          <div class="riesgo-cuerpo">
            <div><div class="medidor-pd">${medidorSimple(e.pd / 0.3, pdColor, "Probabilidad de atraso " + pct(e.pd), "")}<div class="pd" style="color:${pdColor}">${pct(e.pd)}</div></div>
              <div class="pd-texto">Límite para aprobar: ${pct(e.umbrales[0])}</div></div>
            <div>
              <div class="reco-titulo" style="margin-bottom:6px">Factores que más pesan</div>
              <ul class="factores">${e.factores.length ? e.factores.map((f) => `<li><span class="flecha ${f.aporte > 0 ? "sube" : "baja"}" title="${f.aporte > 0 ? "Sube el riesgo" : "Baja el riesgo"}">${f.aporte > 0 ? "↑" : "↓"}</span>${esc(f.texto)}</li>`).join("") : "<li>Perfil similar al promedio de la cartera</li>"}</ul>
            </div>
          </div>
          <div class="recomendacion ${e.decision.toLowerCase()}">
            <div class="reco-titulo">Recomendación a ${h} días · solicitud de ${usd(c.monto_solicitado)} a ${c.plazo_solicitado} días</div>
            <div class="reco-decision">${e.etiqueta}</div>
            <div class="reco-motivo">${esc(e.motivo)}.</div>
            <div class="reco-datos">
              <div><div class="et">Línea sugerida</div><div class="vl">${e.monto ? usd(e.monto) : "$0"}</div>${e.monto < c.monto_solicitado ? `<span class="tachado">${usd(c.monto_solicitado)}</span>` : ""}</div>
              <div><div class="et">Plazo sugerido</div><div class="vl">${e.plazo ? e.plazo + " días" : "Contado"}</div>${e.plazo !== c.plazo_solicitado ? `<span class="tachado">${c.plazo_solicitado} días</span>` : ""}</div>
              <div><div class="et">${e.decision === "Rechazar" ? "Revisa el rechazo" : "Aprueba"}</div><div class="vl">${e.aprobador}</div></div>
            </div>
          </div>
        </div>

        <div class="tarjeta">
          <h2>Evolución en el buró ${info("Score de 0 a 999, más alto = mejor")}</h2>
          <div class="bajada">${c.buro.length} bases trimestrales registradas</div>
          <div class="medidor-pd" style="max-width:220px">${medidorSimple(buro / 999, "#44505D", "Score de buró " + buro, "999")}<div class="pd" style="color:var(--grafito);bottom:14px">${buro}</div></div>
          <div style="text-align:center;margin:4px 0 12px"><span class="chip gris">Clase ${claseBuro(buro)}</span></div>
          <table>
            <thead><tr><th>Base</th><th class="num">Score</th><th>Clase</th><th class="num">Cambio</th></tr></thead>
            <tbody>${c.buro.map((b, i) => {
              const d = i ? b.score - c.buro[i - 1].score : null;
              return `<tr><td>${b.base}</td><td class="num"><strong>${b.score}</strong></td><td>${claseBuro(b.score)}</td><td class="num">${d === null ? "—" : `<span style="color:${d < 0 ? "var(--rojo)" : "var(--verde)"};font-weight:700">${d > 0 ? "+" : ""}${d}</span>`}</td></tr>`;
            }).join("")}</tbody>
          </table>
        </div>
      </div>

      <div class="grid g-3">
        <div class="tarjeta">
          <h2>Alertas <span class="contador">${al.length}</span></h2>
          <div class="lista-mini">${al.length ? al.map((a) => `<div class="item"><span class="chip ${a.prioridad === "Crítica" ? "rojo" : a.prioridad === "Alta" ? "naranja" : "amarillo"}">${a.prioridad}</span><div class="t">${a.titulo}</div><div class="d">${esc(a.texto)} · Pendiente · Analista de Créditos</div></div>`).join("") : '<div class="vacio">Sin alertas abiertas.</div>'}</div>
        </div>
        <div class="tarjeta">
          <h2>Solicitudes <span class="contador">${c.solicitud ? 1 : 0}</span></h2>
          <div class="lista-mini">${c.solicitud ? `<div class="item"><div class="t">${c.solicitud.codigo} · ${usd(c.solicitud.monto)}</div>${c.solicitud.estado === "Por evaluar" ? "" : `<span class="chip ${c.solicitud.estado === "Aprobada" ? "verde" : "rojo"}" style="margin-top:6px">${c.solicitud.estado}${c.solicitud.decidida_por ? " por " + c.solicitud.decidida_por : ""}</span>`}${c.solicitud.estado === "Por evaluar" && estado.rol === "jefatura" ? `<div class="botones" style="justify-content:flex-start"><button class="btn primario" data-decidir="Aprobada">✓ Aprobar</button><button class="btn" data-decidir="Rechazada">Rechazar</button></div>` : ""}<div class="d">${c.solicitud.estado}${c.solicitud.vence_en_dias !== null ? (c.solicitud.vence_en_dias < 0 ? ` · venció hace ${-c.solicitud.vence_en_dias} días` : ` · vence en ${c.solicitud.vence_en_dias} días`) : ""} · ${c.solicitud.plazo} días · ${c.solicitud.vendedor}</div></div>` : '<div class="vacio">Sin solicitudes en curso.</div>'}</div>
        </div>
        <div class="tarjeta">
          <div class="cab-tarjeta"><h2>Documentos <span class="contador">${(c.documentos || []).length}</span></h2><button class="enlace" id="btnAdjuntar">+ Adjuntar</button></div>
          <div class="lista-mini">${(c.documentos || []).length ? c.documentos.map((d) => `<div class="item"><div class="t">${d.nombre}</div><div class="d">Expediente PDF · ${d.origen}</div></div>`).join("") : '<div class="vacio">Sin documentos.</div>'}</div>
        </div>
      </div>`;

    document.getElementById("selCliente").addEventListener("change", (ev2) => irFicha(ev2.target.value));
    document.getElementById("btnEvaluar").addEventListener("click", () => document.getElementById("riesgoPredictivo").scrollIntoView({ behavior: "smooth", block: "start" }));
    document.getElementById("btnSeguimiento").addEventListener("click", () => estado.rol === "comercial" ? abrirSolicitud(c.id) : toast("Seguimiento creado para " + c.nombre + " (demo)"));
    vista.querySelectorAll("[data-decidir]").forEach((b) => b.addEventListener("click", () => {
      c.solicitud.estado = b.dataset.decidir;
      c.solicitud.vence_en_dias = null;
      c.solicitud.local = true;
      c.solicitud.decidida_por = "Jefatura";
      if (!c.documentos) c.documentos = [];
      c.documentos.push({ nombre: `${c.solicitud.codigo}_Evaluacion.pdf`, origen: "Jefatura" });
      guardarLocal(); actualizarContadores();
      toast(`Solicitud ${c.solicitud.codigo} ${b.dataset.decidir.toLowerCase()}`);
      ficha(c.id);
    }));
    document.getElementById("btnAdjuntar").addEventListener("click", () => toast("Adjuntar documentos no está activo en la demo"));
    enlazarH(() => ficha(c.id));
  }

  // ================= Comercial =================
  function filaComercial(c) {
    const e = ev(c, 30);
    const txt = { "Aprobar": "Sí aprobaría", "Ajustar": "Con condiciones", "Rechazar": "No aprobaría" }[e.decision];
    const col = { "Aprobar": "var(--verde)", "Ajustar": "#B08500", "Rechazar": "var(--rojo)" }[e.decision];
    return `<tr class="clic" data-ir="${c.id}" tabindex="0">
      <td><div class="nombre-cli">${esc(c.nombre)}</div><div class="sub">${c.sector} · ${c.id} · ${c.vendedor}</div></td>
      <td>${chipNivel(e.consolidado.nivel)}</td>
      <td><span class="semaforo-grande" style="color:${col}">${txt}</span></td>
      <td class="num">${e.monto ? usd(e.monto) : "Contado"}<div class="sub">por ${usd(c.monto_solicitado)} a ${c.plazo_solicitado} d</div></td>
      <td class="num">${c.vencido ? `<span class="rojo-txt">${corto(c.vencido)}</span>` : '<span class="gris-txt">—</span>'}</td>
      <td class="num">${c.atraso_prom_dias ? `<span class="rojo-txt">${c.atraso_prom_dias} d</span>` : '<span class="gris-txt">Al día</span>'}</td></tr>`;
  }
  const cabComercial = '<thead><tr><th style="min-width:200px">Cliente</th><th>Clasificación</th><th>¿Aprobaría hoy?</th><th class="num">Línea posible</th><th class="num">Vencido</th><th class="num">Atraso</th></tr></thead>';

  function inicioComercial() {
    titulo.textContent = "Inicio";
    const mios = filtrados().filter((c) => c.vendedor === ZONA_COMERCIAL);
    const deuda = mios.reduce((s, c) => s + c.saldo, 0), venc = mios.reduce((s, c) => s + c.vencido, 0);
    const propias = TODOS.filter((c) => c.solicitud && c.solicitud.vendedor === ZONA_COMERCIAL);
    const enCurso = propias.filter((c) => c.solicitud.estado === "Por evaluar");
    const si = mios.filter((c) => ev(c, 30).decision === "Aprobar").length;
    const avisos = mios.flatMap((c) => M.alertas(c).filter((a) => a.prioridad !== "Media").map((a) => ({ c, a }))).slice(0, 5);
    vista.innerHTML = `
      <div class="grid kpis">
        <div class="tarjeta kpi"><div class="etq-kpi">Mis clientes</div><div class="valor">${mios.length}</div><div class="nota">${ZONA_COMERCIAL}</div></div>
        <div class="tarjeta kpi"><div class="etq-kpi">Me deben</div><div class="valor">${corto(deuda)}</div><div class="nota">saldo por cobrar</div></div>
        <div class="tarjeta kpi alerta"><div class="etq-kpi">Vencido</div><div class="valor">${corto(venc)}</div><div class="nota">${pct(venc / (deuda || 1))} de mi cartera</div></div>
        <div class="tarjeta kpi dorado"><div class="etq-kpi">Solicitudes en curso</div><div class="valor">${enCurso.length}</div><div class="nota">esperando evaluación</div></div>
        <div class="tarjeta kpi"><div class="etq-kpi">Aprobarían hoy</div><div class="valor">${si}</div><div class="nota">de ${mios.length} clientes, a 30 días</div></div>
      </div>
      <div class="grid g-2b" style="grid-template-columns:minmax(0,1.8fr) minmax(0,1fr)">
        <div class="tarjeta">
          <div class="cab-tarjeta"><div><h2>¿Mis clientes aprobarían hoy?</h2><div class="bajada">Antes de ofrecer crédito, mira la clasificación y la línea posible. Así no sobrecargas a Cobranzas.</div></div><div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap"><a class="enlace" href="#clientes">Buscar cualquier cliente →</a><button class="btn amarillo" id="btnNuevaInicio">+ Nueva solicitud</button></div></div>
          <div class="tabla-wrap"><table>${cabComercial}<tbody>${mios.length ? mios.sort((a, b) => b.ventas_12m - a.ventas_12m).map(filaComercial).join("") : '<tr><td colspan="6" class="vacio">Sin clientes con esos filtros.</td></tr>'}</tbody></table></div>
        </div>
        <div class="columna">
          <div class="tarjeta"><h2>Avisos de mis clientes <span class="contador">${avisos.length}</span></h2>
            <div class="lista-mini">${avisos.length ? avisos.map(({ c, a }) => `<div class="item clic" data-ir="${c.id}" tabindex="0" style="cursor:pointer"><span class="chip ${a.prioridad === "Crítica" ? "rojo" : "naranja"}">${a.prioridad}</span><div class="t">${esc(c.nombre)}</div><div class="d">${a.titulo} · ${esc(a.texto)}</div></div>`).join("") : '<div class="vacio">Sin avisos.</div>'}</div></div>
          <div class="tarjeta"><h2>Mis solicitudes <span class="contador">${propias.length}</span></h2>
            <div class="lista-mini">${propias.map((c) => `<div class="item clic" data-ir="${c.id}" tabindex="0" style="cursor:pointer"><div class="t">${c.solicitud.codigo} · ${usd(c.solicitud.monto)}</div><div class="d">${esc(c.nombre)} · ${c.solicitud.estado}</div></div>`).join("") || '<div class="vacio">Sin solicitudes.</div>'}</div>
            <a class="enlace" href="#solicitudes">Ver todas →</a></div>
        </div>
      </div>`;
    enlazarClics();
    document.getElementById("btnNuevaInicio").addEventListener("click", () => abrirSolicitud(null));
  }

  // ================= Nueva solicitud (Comercial) =================
  function siguienteCodigo() {
    const n = TODOS.filter((c) => c.solicitud).map((c) => Number(c.solicitud.codigo.split("-")[2])).reduce((a, b) => Math.max(a, b), 0);
    return `SOL-2026-${String(n + 1).padStart(4, "0")}`;
  }

  function abrirSolicitud(idCliente) {
    const ordenados = [...TODOS].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
    const ini = porId(idCliente) || null;
    const fondo = document.createElement("div");
    fondo.className = "modal-fondo";
    fondo.innerHTML = `<form class="modal" role="dialog" aria-modal="true" aria-labelledby="tituloModal">
      <div class="cab-tarjeta"><div><div class="rol-pagina">COMERCIAL · ${ZONA_COMERCIAL}</div><h2 id="tituloModal" style="font-size:20px">Nueva solicitud de crédito</h2></div><button type="button" class="icono-btn" id="mCerrar" aria-label="Cerrar">✕</button></div>
      <label class="campo">Cliente
        <select id="mCliente" required><option value="">Elige un cliente</option>${ordenados.map((x) => `<option value="${x.id}" ${ini && ini.id === x.id ? "selected" : ""}>${esc(x.nombre)} · ${x.id}</option>`).join("")}</select></label>
      <div class="campos-2">
        <label class="campo">Monto (USD)<input id="mMonto" type="number" min="1000" step="1000" required placeholder="Ej. 50000"></label>
        <label class="campo">Plazo<select id="mPlazo"><option value="30">30 días</option><option value="60">60 días</option><option value="90">90 días</option></select></label>
      </div>
      <label class="campo">Orden de compra<span class="adjunto"><input id="mOrden" type="checkbox" checked> Adjunto la orden de compra (PDF)</span></label>
      <label class="campo">Comentario para Créditos<textarea id="mComentario" rows="2" placeholder="Opcional"></textarea></label>
      <div id="mPrevia" class="previa"></div>
      <div class="botones" style="justify-content:flex-end"><button type="button" class="btn" id="mCancelar">Cancelar</button><button type="submit" class="btn amarillo" id="mEnviar">Enviar a Créditos</button></div>
    </form>`;
    document.body.appendChild(fondo);
    const $ = (id) => fondo.querySelector("#" + id);
    const cerrar = () => fondo.remove();
    $("mCerrar").addEventListener("click", cerrar);
    $("mCancelar").addEventListener("click", cerrar);
    fondo.addEventListener("click", (e) => { if (e.target === fondo) cerrar(); });
    fondo.addEventListener("keydown", (e) => { if (e.key === "Escape") cerrar(); });

    function previa() {
      const c = porId($("mCliente").value);
      const monto = Number($("mMonto").value), plazo = Number($("mPlazo").value);
      const caja = $("mPrevia");
      if (!c) { caja.innerHTML = '<span class="sub">Elige un cliente para ver qué diría el modelo.</span>'; return; }
      if (c.solicitud && c.solicitud.estado === "Por evaluar") {
        caja.innerHTML = `<span class="rojo-txt">Este cliente ya tiene la solicitud ${c.solicitud.codigo} por evaluar.</span>`;
        $("mEnviar").disabled = true; return;
      }
      $("mEnviar").disabled = false;
      if (!monto) { caja.innerHTML = `<span class="sub">${esc(c.nombre)}: clasificación ${ev(c, 30).consolidado.nivel}. Escribe el monto.</span>`; return; }
      const e = M.evaluar({ ...c, monto_solicitado: monto, plazo_solicitado: plazo }, 30);
      caja.innerHTML = `<div class="reco-titulo">Lo que diría el modelo hoy (a 30 días)</div>
        <div class="previa-fila"><span class="chip ${CHIP_DEC[e.decision]}">${e.etiqueta}</span> ${chipNivel(e.consolidado.nivel)}
        <span>Línea posible <strong>${e.monto ? usd(e.monto) : "Contado"}</strong>${e.plazo ? ` a ${e.plazo} días` : ""}</span>
        <span>Aprueba: <strong>${e.aprobador}</strong></span></div><div class="sub">${esc(e.motivo)}.</div>`;
    }
    ["mCliente", "mMonto", "mPlazo"].forEach((id) => $(id).addEventListener("input", previa));
    previa();
    ($("mCliente").value ? $("mMonto") : $("mCliente")).focus();

    fondo.querySelector("form").addEventListener("submit", (e) => {
      e.preventDefault();
      const c = porId($("mCliente").value);
      const monto = Math.round(Number($("mMonto").value));
      const plazo = Number($("mPlazo").value);
      if (!c || !monto) return;
      const codigo = siguienteCodigo();
      c.monto_solicitado = monto;
      c.plazo_solicitado = plazo;
      c.solicitud = { codigo, estado: "Por evaluar", monto, plazo, vence_en_dias: 3, vendedor: ZONA_COMERCIAL, comentario: $("mComentario").value.trim(), local: true };
      c.documentos = [{ nombre: `${codigo}_Solicitud_comercial.pdf`, origen: ZONA_COMERCIAL }];
      if ($("mOrden").checked) c.documentos.push({ nombre: `${codigo}_Orden_de_compra.pdf`, origen: ZONA_COMERCIAL });
      Object.keys(cache).filter((k) => k.startsWith(c.id + "|")).forEach((k) => delete cache[k]);
      guardarLocal();
      actualizarContadores();
      cerrar();
      toast(`Solicitud ${codigo} enviada a Créditos`);
      estado.pestana = "Por evaluar";
      if (location.hash === "#solicitudes") pintar(); else location.hash = "#solicitudes";
    });
  }

  function clientesComercial() {
    titulo.textContent = "Clientes";
    const lista = filtrados().sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
    vista.innerHTML = `<div class="tarjeta">
      <h2>Todos los clientes</h2>
      <div class="bajada">Puedes ver cualquier cliente, no solo los tuyos. Usa los filtros de arriba para buscar.</div>
      <div class="tabla-wrap"><table>${cabComercial}<tbody>${lista.length ? lista.map(filaComercial).join("") : '<tr><td colspan="6" class="vacio">No encontramos clientes con esos filtros.</td></tr>'}</tbody></table></div>
    </div>`;
    enlazarClics();
  }

  // ================= Cómo decide el modelo =================
  function modelo() {
    titulo.textContent = "Cómo decide el modelo";
    const maxPeso = Math.max(...M.VARIABLES.map((v) => Math.abs(v.peso)));
    vista.innerHTML = `
      <div class="pasos">
        <div class="tarjeta paso"><h3>Probabilidad de atraso</h3><p>Una regresión logística combina 7 datos del cliente y estima la probabilidad de que se atrase más de 30, 60 o 90 días.</p></div>
        <div class="tarjeta paso"><h3>Puntaje consolidado</h3><p>Siete señales suman puntos hasta su tope: 0 es sin riesgo y 100 es el máximo. El total define el nivel Bajo, Medio, Alto o Crítico.</p></div>
        <div class="tarjeta paso"><h3>Reglas que mandan</h3><p>Calificación Dudoso o Pérdida rechaza. Protestos, atrasos de más de 90 días o más del 30 % vencido impiden aprobar sin condiciones.</p></div>
        <div class="tarjeta paso"><h3>Línea, plazo y firma</h3><p>La línea cubre las compras del plazo con ${Math.round((M.MARGEN - 1) * 100)} % de holgura, ajustada por nivel y con tope del ${Math.round(M.TOPE_VENTAS * 100)} % de las ventas. Luego se asigna quién aprueba.</p></div>
      </div>
      <div class="grid g-2">
        <div class="tarjeta">
          <h2>Puntaje consolidado: componentes</h2><div class="bajada">Reglas ponderadas, cada una con su tope</div>
          <table><thead><tr><th>Señal</th><th class="num">Tope</th><th></th></tr></thead>
          <tbody>${M.COMPONENTES.map((k) => `<tr><td>${k.nombre}</td><td class="num"><strong>${k.max}</strong></td><td style="width:40%"><div class="barra"><span style="width:${(k.max / 25) * 100}%;background:var(--naranja)"></span></div></td></tr>`).join("")}</tbody>
          <tfoot><tr><td>Total</td><td class="num">100</td><td></td></tr></tfoot></table>
        </div>
        <div class="tarjeta">
          <h2>Probabilidad de atraso: qué pesa</h2><div class="bajada">Pesos de la regresión logística</div>
          <table><thead><tr><th>Dato del cliente</th><th>Efecto</th><th>Peso</th></tr></thead>
          <tbody>${M.VARIABLES.map((v) => `<tr><td>${v.nombre}</td><td>${v.peso > 0 ? '<span class="rojo-txt">↑ sube el riesgo</span>' : '<span style="color:var(--verde);font-weight:700">↓ baja el riesgo</span>'}</td>
            <td><div class="barra" style="width:100px"><span style="width:${(Math.abs(v.peso) / maxPeso) * 100}%;background:${v.peso > 0 ? "var(--rojo)" : "var(--verde)"}"></span></div></td></tr>`).join("")}</tbody></table>
        </div>
      </div>
      <div class="grid g-3">
        <div class="tarjeta"><h2>Niveles de riesgo</h2><div class="bajada">Según el puntaje consolidado</div>
          <table><thead><tr><th>Nivel</th><th>Puntaje</th><th class="num">Línea posible</th></tr></thead>
          <tbody>${M.NIVELES.map((n, i) => `<tr><td><span class="nombre-cli"><span class="punto" style="background:${n.color}"></span>${n.nivel}</span></td><td>${i ? M.NIVELES[i - 1].hasta : 0} – ${Math.min(100, n.hasta - 1)}</td><td class="num">${Math.round(M.FACTOR_NIVEL[n.nivel] * 100)}%</td></tr>`).join("")}</tbody></table></div>
        <div class="tarjeta"><h2>Límites por horizonte</h2><div class="bajada">Más exigente cuanto más largo el atraso</div>
          <table><thead><tr><th>Horizonte</th><th class="num">Aprobar hasta</th><th class="num">Con condiciones hasta</th></tr></thead>
          <tbody>${Object.entries(M.UMBRALES).map(([h, [a, b]]) => `<tr><td>${h} días</td><td class="num">${pct(a)}</td><td class="num">${pct(b)}</td></tr>`).join("")}</tbody></table></div>
        <div class="tarjeta"><h2>Quién aprueba</h2><div class="bajada">Manda el nivel más alto entre monto y plazo</div>
          <table><thead><tr><th>Nivel</th><th class="num">Monto hasta</th><th class="num">Plazo hasta</th></tr></thead>
          <tbody>${M.APROBADORES.map((a) => `<tr><td>${a.nivel}</td><td class="num">${a.monto === Infinity ? "Sin límite" : usd(a.monto)}</td><td class="num">${a.plazo === Infinity ? "+90 días" : a.plazo + " días"}</td></tr>`).join("")}</tbody></table></div>
      </div>`;
  }

  // ================= Exportar =================
  function exportar() {
    const filas = [["Codigo", "Cliente", "Sector", "Vendedor", "Deuda", "Vencido", "Puntaje consolidado", "Nivel", `Prob. atraso ${estado.h}d`, "Recomendacion", "Linea sugerida", "Plazo sugerido", "Aprueba"]];
    filtrados().forEach((c) => {
      const e = ev(c);
      filas.push([c.id, c.nombre, c.sector, c.vendedor, c.saldo, c.vencido, e.consolidado.total, e.consolidado.nivel, (e.pd * 100).toFixed(1) + "%", e.etiqueta, e.monto, e.plazo || "Contado", e.aprobador]);
    });
    const csv = "﻿" + filas.map((f) => f.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = `ISA_Risk_cartera_${estado.h}d.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast("Reporte exportado");
  }

  // ================= Filtros y rutas =================
  const fSector = document.getElementById("fSector"), fVendedor = document.getElementById("fVendedor");
  [...new Set(TODOS.map((c) => c.sector))].sort().forEach((s) => fSector.insertAdjacentHTML("beforeend", `<option>${s}</option>`));
  [...new Set(TODOS.map((c) => c.vendedor))].sort().forEach((s) => fVendedor.insertAdjacentHTML("beforeend", `<option>${s}</option>`));
  const campos = { fCodigo: "codigo", fNombre: "nombre", fSector: "sector", fVendedor: "vendedor" };
  Object.entries(campos).forEach(([idCampo, clave]) => {
    const el = document.getElementById(idCampo);
    el.addEventListener(el.tagName === "SELECT" ? "change" : "input", () => { estado[clave] = el.value; pintar(); });
  });
  document.getElementById("btnLimpiar").addEventListener("click", () => {
    Object.entries(campos).forEach(([idCampo, clave]) => { document.getElementById(idCampo).value = ""; estado[clave] = ""; });
    estado.riesgoTop = ""; pintar();
  });
  document.getElementById("btnExportar").addEventListener("click", exportar);
  document.getElementById("btnRefrescar").addEventListener("click", () => { pintar(); toast("Datos actualizados al corte de Septiembre 2026"); });
  document.getElementById("btnAlertas").addEventListener("click", () => {
    const destino = estado.rol === "jefatura" ? "#dashboard" : "#bandeja";
    if (location.hash !== destino) location.hash = destino;
    setTimeout(() => { const p = document.getElementById("prioridades"); if (p) p.scrollIntoView({ behavior: "smooth" }); }, 60);
  });
  const totalAlertas = TODOS.reduce((s, c) => s + M.alertas(c).filter((a) => a.prioridad === "Crítica").length, 0);
  document.getElementById("burbuja").textContent = totalAlertas;

  const pendientes = () => TODOS.filter((c) => c.solicitud && c.solicitud.estado === "Por evaluar").length;
  function actualizarContadores() { document.querySelectorAll("#menu .cuenta").forEach((el) => { el.textContent = pendientes(); }); }
  function ponerRol(rol) {
    estado.rol = rol;
    const R = ROLES[rol];
    document.getElementById("menu").innerHTML = R.menu.map(([ruta, texto, ico, cuenta]) =>
      `<a href="#${ruta}" data-ruta="${ruta}">${ICONOS[ico]}${texto}${cuenta ? ` <span class="cuenta">${pendientes()}</span>` : ""}</a>`).join("");
    document.getElementById("rolLateral").textContent = R.etiqueta;
    document.getElementById("rolPagina").textContent = R.etiqueta;
    document.getElementById("usuarioNombre").textContent = "Usuario demo";
    document.getElementById("usuarioRol").textContent = R.usuario;
    document.getElementById("usuarioAvatar").textContent = R.iniciales;
    document.getElementById("btnAlertas").style.display = rol === "comercial" ? "none" : "";
    document.getElementById("ingreso").hidden = true;
  }
  document.querySelectorAll(".perfil").forEach((b) => b.addEventListener("click", () => {
    ponerRol(b.dataset.rol);
    const destino = "#" + ROLES[b.dataset.rol].inicio;
    if (location.hash === destino) ruta(); else location.hash = destino;
  }));
  document.getElementById("btnSalir").addEventListener("click", () => { estado.rol = null; location.hash = ""; mostrarIngreso(); });
  function mostrarIngreso() { document.getElementById("ingreso").hidden = false; }

  function pintar() {
    if (!estado.rol) { mostrarIngreso(); return; }
    const R = ROLES[estado.rol];
    const permitidas = R.menu.map((m) => m[0]).concat(["ficha"]);
    let [r, id] = location.hash.replace("#", "").split("/");
    if (!permitidas.includes(r)) { r = R.inicio; history.replaceState(null, "", "#" + r); }
    document.querySelectorAll(".menu a").forEach((a) => a.classList.toggle("activo", a.dataset.ruta === r || (r === "ficha" && estado.rol === "comercial" && a.dataset.ruta === "clientes")));
    document.getElementById("sidebar").classList.remove("abierta");
    document.getElementById("filtros").style.display = r === "modelo" ? "none" : "";
    if (r === "ficha") ficha(id);
    else if (r === "bandeja" || r === "solicitudes") bandeja();
    else if (r === "modelo") modelo();
    else if (r === "inicio") inicioComercial();
    else if (r === "clientes") clientesComercial();
    else dashboard();
  }
  function ruta() { pintar(); window.scrollTo(0, 0); }

  document.getElementById("btnMenu").addEventListener("click", (e) => { e.stopPropagation(); document.getElementById("sidebar").classList.toggle("abierta"); });
  document.addEventListener("click", (e) => {
    const sb = document.getElementById("sidebar");
    if (sb.classList.contains("abierta") && !sb.contains(e.target)) sb.classList.remove("abierta");
  });
  window.addEventListener("hashchange", ruta);
  ruta();
})();
