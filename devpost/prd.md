---
doc: prd
status: approved
---

# ISA Risk — Product Requirements

Aplicación ejecutiva para la Jefatura de Créditos y Cobranzas de un distribuidor industrial ficticio: muestra el riesgo de la cartera, estima el atraso de cada cliente empresarial y recomienda la decisión de crédito. Fuente: `scope.md > The Unique Kernel`.

## The Core Journey
1. Se abre ISA Risk en el **Dashboard ejecutivo**: filtros arriba (código, razón social, sector, vendedor, periodo), aviso de datos sintéticos y 5 indicadores (cartera total, saldo vencido, cartera alto/crítico, solicitudes por decidir, probabilidad de atraso).
2. **Prioridades de hoy** muestra las solicitudes más atrasadas y las alertas más urgentes; clic en una abre la Ficha 360 del cliente.
3. El gráfico **Saldo vencido: real y proyectado** tiene selector 30/60/90 días y explica cuánto subiría el vencido sin gestión de cobranza, con rango optimista y pesimista.
4. **Cartera por nivel de riesgo**, **Clientes que mueven ISA** (filtrable por nivel), **Antigüedad del vencido** y **Exposición por sector** completan la vista.
5. En la **Bandeja de decisiones**, las solicitudes se ven por estado (Por evaluar / Aprobada / Rechazada) con la recomendación del modelo, la línea sugerida, quién aprueba y el plazo de respuesta.
6. En la **Ficha 360 del cliente**: franja con recomendación, puntaje consolidado, score de buró, exposición y probabilidad de atraso; medidor del **puntaje consolidado** con su composición y acción sugerida; **componentes del puntaje**; **comportamiento con ISA**; **Riesgo predictivo** con selector 30/60/90 que cambia la decisión, la línea, el plazo y el aprobador; **evolución en el buró**; alertas, solicitudes y documentos.
7. **Cómo decide el modelo** explica todas las reglas.
Éxito: en menos de un minuto se entiende la cartera y se obtiene una decisión justificada para cualquier cliente.

## Screens and Layout
Barra lateral oscura con la marca ISA Risk, rol "Jefatura" y menú: Dashboard ejecutivo, Bandeja de decisiones (con contador), Ficha 360 del cliente, Cómo decide el modelo; tarjeta de usuario demo abajo. Encabezado con rol, título, fecha de análisis, Exportar reporte (CSV), actualizar y campana de alertas. Barra de filtros compartida por Dashboard, Bandeja y Ficha.

## Profiles
Pantalla de ingreso con 3 perfiles de demostración (sin contraseña):
- **Jefatura**: Dashboard ejecutivo, Bandeja de decisiones, Ficha 360, Cómo decide el modelo.
- **Analista**: Mi bandeja (evalúa; aprueba quien indica la matriz), Ficha 360, Cómo decide el modelo.
- **Comercial**: Inicio ("¿Mis clientes aprobarían hoy?", clasificación, línea posible, avisos), Clientes (ve cualquier cliente, no solo los suyos), Mis solicitudes. Así no sobrecarga a Cobranzas.

## Look and Feel
Ejecutivo e industrial: barra lateral grafito con franja de seguridad amarillo/negro, acentos amarillo de seguridad y naranja, tarjetas blancas, números grandes. Semáforo verde / amarillo / naranja / rojo solo para riesgo. Poco texto y nada técnico en pantalla. Paleta y marca propias.

## Features and Behavior

### Base sintética
- 60 clientes ficticios (construcción, agroindustria, manufactura, transporte, energía, comercio) con: antigüedad, ventas, compras, línea y uso, atraso promedio y máximo, calificación en el sistema financiero, deuda bancaria, protestos, saldo y vencido por tramos, historia de 6 meses de vencido, tendencia, 3 bases de buró, vendedor, condición de pago.
- 14 solicitudes de crédito con estado, plazo de respuesta y documentos.

### Probabilidad de atraso
Regresión logística con pesos teóricos sobre 7 datos; un intercepto por horizonte (30, 60, 90 días).

### Puntaje consolidado 0–100 (más alto = más riesgo)
Suma de 7 componentes con tope: probabilidad de atraso 25, días de atraso 20, saldo vencido/deuda 15, uso de línea 15, score de buró 15, riesgo sectorial 5, tendencia 5. Niveles: Bajo < 30, Medio 30–44, Alto 45–59, Crítico ≥ 60.

### Reglas de decisión
- Exclusión: calificación Dudoso o Pérdida → Rechazar. Protestos, atraso máximo > 90 días o más de 30 % vencido → como máximo "Aprobar con condiciones".
- Límites por horizonte: 30 d aprobar ≤ 5 %, con condiciones ≤ 15 %; 60 d ≤ 2,5 % / ≤ 8 %; 90 d ≤ 1,2 % / ≤ 4 %.
- Línea sugerida = el menor entre lo solicitado y la capacidad: compras mensuales × (plazo/30) × 1,5 × factor de nivel (Bajo 100 %, Medio 75 %, Alto 45 %, Crítico 20 %), con tope de 10 % de las ventas. Con condiciones, el plazo baja un escalón.
- Matriz de aprobación genérica: Analista de Créditos (≤ USD 25 000 y 30 d), Jefe de Créditos y Cobranzas (≤ 100 000 y 60 d), Gerencia de Finanzas (≤ 250 000 y 90 d), Comité de Crédito (más). Manda el más alto entre monto y plazo.

### Alertas
Calificación deteriorada, mora crítica (> 60 días), concentración de vencido (> 20 %), línea casi agotada (> 85 %), caída en el buró (> 60 puntos), vencido en aumento.

## States and Boundaries
- Filtros sin resultados: mensaje claro. Ficha sin cliente elegido: abre el de mayor pérdida esperada.
- Botones de demo (crear seguimiento, adjuntar) muestran un aviso, no guardan nada.
- Funciona sin conexión y sin instalar nada.

## Product Decisions
Una sola caja de Recomendación; el selector de horizonte cambia todo el panel; vocabulario ejecutivo ("modelo", "Riesgo predictivo"); la recomendación es una propuesta, la decide una persona.

## What We're Building
Dashboard ejecutivo, Bandeja de decisiones, Ficha 360 del cliente y Cómo decide el modelo, sobre la base sintética.

## Deferred From the POC
Login real con contraseña; registrar decisiones; carga y lectura de reportes de buró en PDF; seguimiento real de alertas.

## Non-Goals
No consulta burós reales ni usa datos de empresas reales; no es un ERP.
