// ISA Risk — modelo de riesgo crediticio.
// Reglas teóricas y explicables, sin modelo entrenado ni datos reales:
//  1. Probabilidad de atraso por horizonte (regresión logística con pesos fijos).
//  2. Puntaje consolidado 0–100 (más alto = más riesgo) que suma 7 componentes con tope.
//  3. Decisión, línea sugerida, plazo y nivel de aprobación.

(function () {
  "use strict";

  const CALIF_NIVEL = { "Normal": 0, "CPP": 1, "Deficiente": 2, "Dudoso": 3, "Pérdida": 4 };

  // ---------- 1. Probabilidad de atraso ----------
  const VARIABLES = [
    { clave: "prom", nombre: "Días de atraso promedio", peso: 0.55, x: (c) => c.atraso_prom_dias / 10 },
    { clave: "max", nombre: "Atraso máximo en 12 meses", peso: 0.35, x: (c) => c.atraso_max_dias / 30 },
    { clave: "util", nombre: "Uso de la línea de crédito", peso: 1.2, x: (c) => utilizacion(c) },
    { clave: "antig", nombre: "Antigüedad como cliente", peso: -0.45, x: (c) => Math.log(1 + c.antiguedad_anios) },
    { clave: "calif", nombre: "Calificación en el sistema financiero", peso: 0.75, x: (c) => CALIF_NIVEL[c.calificacion] },
    { clave: "apal", nombre: "Deuda bancaria sobre ventas", peso: 1.1, x: (c) => c.deuda_sistema / c.ventas_anuales },
    { clave: "prot", nombre: "Documentos protestados", peso: 0.6, x: (c) => c.protestos_12m },
  ];
  const INTERCEPTO = { 30: -4.0, 60: -4.55, 90: -5.05 };

  // ---------- 2. Puntaje consolidado (0 = sin riesgo, 100 = máximo riesgo) ----------
  const RIESGO_SECTOR = { "Construcción": 0.75, "Transporte": 0.6, "Comercio": 0.5, "Manufactura": 0.45, "Agroindustria": 0.55, "Energía": 0.3 };
  const COMPONENTES = [
    { clave: "pd", nombre: "Probabilidad de atraso", max: 25, valor: (c, e) => Math.min(1, e.pd30 / 0.3), detalle: (c, e) => pct(e.pd30) + " a 30 días" },
    { clave: "atraso", nombre: "Días de atraso", max: 20, valor: (c) => Math.min(1, c.atraso_prom_dias / 45), detalle: (c) => c.atraso_prom_dias + " días en promedio" },
    { clave: "vencido", nombre: "Saldo vencido / deuda", max: 15, valor: (c) => Math.min(1, ratioVencido(c) / 0.5), detalle: (c) => pct(ratioVencido(c)) },
    { clave: "uso", nombre: "Uso de línea", max: 15, valor: (c) => utilizacion(c), detalle: (c) => pct(utilizacion(c)) },
    { clave: "buro", nombre: "Score de buró", max: 15, valor: (c) => 1 - buroHoy(c) / 999, detalle: (c) => buroHoy(c) + " / 999" },
    { clave: "sector", nombre: "Riesgo sectorial", max: 5, valor: (c) => RIESGO_SECTOR[c.sector] ?? 0.5, detalle: (c) => c.sector },
    { clave: "tend", nombre: "Tendencia", max: 5, valor: (c) => ({ "Empeora": 1, "Estable": 0.4, "Mejora": 0 })[c.tendencia], detalle: (c) => c.tendencia },
  ];
  const NIVELES = [
    { nivel: "Bajo", hasta: 30, color: "#2E9E5B" },
    { nivel: "Medio", hasta: 45, color: "#D9A400" },
    { nivel: "Alto", hasta: 60, color: "#E07A00" },
    { nivel: "Crítico", hasta: 101, color: "#C93C3C" },
  ];

  // ---------- 3. Decisión ----------
  const UMBRALES = { 30: [0.05, 0.15], 60: [0.025, 0.08], 90: [0.012, 0.04] }; // [aprobar hasta, ajustar hasta]
  const FACTOR_NIVEL = { "Bajo": 1.0, "Medio": 0.75, "Alto": 0.45, "Crítico": 0.2 };
  const MARGEN = 1.5;        // holgura sobre las compras del plazo (estacionalidad)
  const TOPE_VENTAS = 0.10;  // la línea no supera el 10 % de las ventas anuales
  const APROBADORES = [
    { nivel: "Analista de Créditos", monto: 25000, plazo: 30 },
    { nivel: "Jefe de Créditos y Cobranzas", monto: 100000, plazo: 60 },
    { nivel: "Gerencia de Finanzas", monto: 250000, plazo: 90 },
    { nivel: "Comité de Crédito", monto: Infinity, plazo: Infinity },
  ];

  // ---------- utilidades ----------
  function utilizacion(c) { return c.linea_actual > 0 ? Math.min(1, c.linea_utilizada / c.linea_actual) : 0; }
  function ratioVencido(c) { return c.saldo > 0 ? c.vencido / c.saldo : 0; }
  function buroHoy(c) { return c.buro[c.buro.length - 1].score; }
  function pct(x) { return (x * 100).toLocaleString("es-PE", { maximumFractionDigits: 1 }) + " %"; }
  function usd(n) { return "USD " + Math.round(n).toLocaleString("en-US"); }
  const logistica = (z) => 1 / (1 + Math.exp(-z));

  let medias = null;
  function iniciar(cartera) {
    medias = {};
    VARIABLES.forEach((v) => { medias[v.clave] = cartera.reduce((s, c) => s + v.x(c), 0) / cartera.length; });
  }

  function probabilidad(c, h) {
    const z = VARIABLES.reduce((s, v) => s + v.peso * v.x(c), INTERCEPTO[h]);
    return Math.min(0.995, Math.max(0.002, logistica(z)));
  }

  function formatoAnios(a) {
    if (a < 1) return `${Math.round(a * 12)} meses`;
    return `${a.toLocaleString("es-PE", { maximumFractionDigits: 1 })} años`;
  }

  function frase(clave, c) {
    switch (clave) {
      case "prom": return c.atraso_prom_dias === 0 ? "Paga a tiempo" : `Paga en promedio ${c.atraso_prom_dias} días tarde`;
      case "max": return `Su mayor atraso fue de ${c.atraso_max_dias} días`;
      case "util": return `Usa el ${Math.round(utilizacion(c) * 100)} % de su línea`;
      case "antig": return `${formatoAnios(c.antiguedad_anios)} como cliente`;
      case "calif": return `Calificación ${c.calificacion} en el sistema financiero`;
      case "apal": return `Su deuda bancaria es el ${Math.round((c.deuda_sistema / c.ventas_anuales) * 100)} % de sus ventas`;
      case "prot": return c.protestos_12m === 1 ? "1 documento protestado este año" : `${c.protestos_12m} documentos protestados este año`;
      default: return clave;
    }
  }

  function factores(c) {
    return VARIABLES
      .map((v) => ({ clave: v.clave, aporte: v.peso * (v.x(c) - medias[v.clave]), texto: frase(v.clave, c) }))
      .filter((f) => Math.abs(f.aporte) > 0.05)
      .sort((a, b) => Math.abs(b.aporte) - Math.abs(a.aporte))
      .slice(0, 4);
  }

  function consolidado(c) {
    const base = { pd30: probabilidad(c, 30) };
    const partes = COMPONENTES.map((k) => ({
      clave: k.clave, nombre: k.nombre, max: k.max,
      puntos: Math.round(k.max * k.valor(c, base) * 10) / 10,
      detalle: k.detalle(c, base),
    }));
    const total = Math.round(partes.reduce((s, p) => s + p.puntos, 0));
    const n = NIVELES.find((x) => total < x.hasta);
    return { total, partes, nivel: n.nivel, color: n.color };
  }

  function exclusiones(c) {
    const lista = [];
    if (CALIF_NIVEL[c.calificacion] >= 3) lista.push({ tipo: "rechazo", texto: `Calificación ${c.calificacion} en el sistema financiero` });
    if (c.protestos_12m > 0) lista.push({ tipo: "tope", texto: "Tiene documentos protestados en los últimos 12 meses" });
    if (c.atraso_max_dias > 90) lista.push({ tipo: "tope", texto: `Tuvo un atraso de ${c.atraso_max_dias} días` });
    if (ratioVencido(c) > 0.3) lista.push({ tipo: "tope", texto: `El ${Math.round(ratioVencido(c) * 100)} % de su deuda está vencida` });
    return lista;
  }

  function aprobador(monto, plazo) {
    const i = Math.max(APROBADORES.findIndex((a) => monto <= a.monto), APROBADORES.findIndex((a) => plazo <= a.plazo));
    return APROBADORES[i].nivel;
  }

  function capacidad(c, plazo, nivel) {
    const bruto = c.compras_mensuales * (plazo / 30) * MARGEN * FACTOR_NIVEL[nivel];
    return Math.round(Math.min(bruto, c.ventas_anuales * TOPE_VENTAS) / 1000) * 1000;
  }

  function accionSugerida(c, decision, cons) {
    if (decision === "Rechazar") return c.vencido > 0
      ? `Vender al contado y gestionar el cobro de ${usd(c.vencido)} vencidos.`
      : "Vender al contado hasta que mejore su perfil.";
    if (c.vencido > 0 && ratioVencido(c) > 0.15) return `Regularizar el saldo vencido de ${usd(c.vencido)} antes de liberar la línea. Revisar en 15 días.`;
    if (decision === "Ajustar") return "Aprobar con la línea y el plazo sugeridos. Revisar en 30 días.";
    if (cons.nivel === "Bajo") return "Mantener condiciones y revisar en el próximo corte.";
    return "Aprobar y monitorear el uso de la línea cada mes.";
  }

  function evaluar(c, h) {
    const pd = probabilidad(c, h);
    const cons = consolidado(c);
    const [tAprobar, tAjustar] = UMBRALES[h];
    const excl = exclusiones(c);

    let decision = pd <= tAprobar ? "Aprobar" : pd <= tAjustar ? "Ajustar" : "Rechazar";
    let motivo = decision === "Aprobar"
      ? `Probabilidad de atraso dentro del límite para ${h} días`
      : decision === "Ajustar"
        ? `Probabilidad de atraso por encima del límite de aprobación a ${h} días`
        : `Probabilidad de atraso demasiado alta a ${h} días`;

    const rechazo = excl.find((e) => e.tipo === "rechazo");
    const tope = excl.find((e) => e.tipo === "tope");
    if (rechazo) { decision = "Rechazar"; motivo = rechazo.texto; }
    else if (tope && decision === "Aprobar") { decision = "Ajustar"; motivo = tope.texto; }

    let plazo = c.plazo_solicitado, monto = 0;
    if (decision !== "Rechazar") {
      if (decision === "Ajustar") plazo = Math.max(30, plazo - 30);
      monto = Math.min(c.monto_solicitado, capacidad(c, plazo, cons.nivel));
      if (monto <= 0) { decision = "Rechazar"; motivo = "Sin capacidad de crédito"; }
      else if (decision === "Aprobar" && monto < c.monto_solicitado) { decision = "Ajustar"; motivo = "Lo solicitado supera la capacidad de pago estimada"; }
    }
    const rechazada = decision === "Rechazar";

    return {
      horizonte: h, pd, pd30: probabilidad(c, 30), consolidado: cons, decision, motivo,
      etiqueta: decision === "Aprobar" ? "Aprobar" : decision === "Ajustar" ? "Aprobar con condiciones" : "Rechazar",
      plazo: rechazada ? 0 : plazo,
      monto: rechazada ? 0 : monto,
      aprobador: rechazada ? aprobador(c.monto_solicitado, c.plazo_solicitado) : aprobador(monto, plazo),
      factores: factores(c),
      exclusiones: excl,
      umbrales: UMBRALES[h],
      accion: accionSugerida(c, decision, cons),
    };
  }

  // Alertas de cartera que salen de los datos del cliente.
  function alertas(c) {
    const a = [];
    if (CALIF_NIVEL[c.calificacion] >= 2) a.push({ prioridad: "Crítica", titulo: "Calificación deteriorada", texto: `Calificación ${c.calificacion} en el sistema financiero` });
    if (c.atraso_max_dias > 60) a.push({ prioridad: "Crítica", titulo: "Mora crítica", texto: `${c.atraso_max_dias} días de atraso · ${pct(ratioVencido(c))} de la deuda está vencida` });
    if (ratioVencido(c) > 0.2) a.push({ prioridad: "Alta", titulo: "Concentración de vencido", texto: `${pct(ratioVencido(c))} de la deuda está vencida` });
    if (utilizacion(c) > 0.85) a.push({ prioridad: "Alta", titulo: "Línea casi agotada", texto: `Usa el ${Math.round(utilizacion(c) * 100)} % de su línea` });
    const b = c.buro;
    if (b[b.length - 1].score < b[0].score - 60) a.push({ prioridad: "Media", titulo: "Caída en el buró", texto: `De ${b[0].score} a ${b[b.length - 1].score} puntos` });
    if (c.tendencia === "Empeora") a.push({ prioridad: "Media", titulo: "Vencido en aumento", texto: "Su saldo vencido creció en los últimos dos meses" });
    return a;
  }

  window.Modelo = {
    iniciar, evaluar, probabilidad, consolidado, alertas, utilizacion, ratioVencido, buroHoy, formatoAnios,
    VARIABLES, COMPONENTES, NIVELES, UMBRALES, APROBADORES, FACTOR_NIVEL, MARGEN, TOPE_VENTAS, RIESGO_SECTOR,
  };
})();
