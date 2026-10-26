---
doc: scope
status: approved
---

# ISA Risk

Herramienta ejecutiva que, para un cliente empresarial, estima su probabilidad de atraso a 30, 60 y 90 días y recomienda si aprobar, ajustar o rechazar su crédito, cuánto darle y quién lo debe aprobar.

## The Unique Kernel
Una sola pantalla convierte el riesgo de un cliente en una decisión lista para firmar: probabilidad de atraso a 30/60/90 días (con selector que cambia todo el panel), puntaje consolidado con reglas teóricas de crédito, monto y plazo sugeridos y el nivel de aprobación que corresponde. No es un reporte de riesgo: es la decisión y quién la firma.

## Who It's For
El área de créditos y cobranzas de un distribuidor industrial que vende a crédito a otras empresas (B2B). Hoy decide con reportes sueltos, criterio personal y hojas de cálculo, sin un puntaje común ni una regla clara de quién aprueba cuánto.

## The Core Loop
Buscar un cliente → abrir su Ficha 360 → mirar el riesgo predictivo a 30, 60 o 90 días → leer la recomendación (aprobar / ajustar / rechazar), el monto y plazo sugeridos y quién aprueba. Se repite con cada solicitud de crédito.

## Inspiration & Identity
Estilo ejecutivo: poco texto, nada técnico en pantalla, palabras como "modelo" (no "motor") y "Riesgo predictivo". Identidad industrial: grafito, acero y amarillo de seguridad, con semáforo verde/ámbar/rojo. Todos los datos, nombres y empresas son ficticios.

## Why This Matters to the Learner
Es su idea de producto y quiere mostrarla como propia, con datos sintéticos y una marca nueva.

## What "Working" Looks Like
Abrir la app, buscar un cliente ficticio, entrar a su Ficha 360 y ver su puntaje y probabilidades. El momento "oh, qué bueno": cambiar el selector de 30 a 90 días y ver cómo cambian la probabilidad, la recomendación, el monto sugerido y el aprobador; luego abrir otro cliente con alerta (por ejemplo, calificación Dudoso) y ver el rechazo explicado.

## The POC Boundary
- Base sintética de clientes empresariales generada con un script (datos ficticios, reproducible).
- Ingreso con 3 perfiles de demostración: Jefatura, Analista y Comercial, cada uno con su menú.
- Dashboard ejecutivo de la cartera: indicadores, prioridades, vencido real y proyectado, niveles de riesgo, sectores.
- Bandeja de decisiones y registro de solicitudes por el Comercial, con aprobación de Jefatura.
- Ficha 360 por cliente: puntaje consolidado 0–100 y sus componentes, comportamiento de pago, selector 30/60/90, una sola caja de Recomendación (decisión + línea + plazo + aprobador), buró, alertas y documentos.
- Modelo teórico: regresión logística con pesos explicables, puntaje consolidado con topes, reglas de exclusión, regla de línea y matriz de aprobación genérica.

## Later
Login real con contraseña; carga y lectura de reportes de buró en PDF; modelo entrenado con datos reales; conexión a un ERP; base de datos compartida.

## Explicitly Cut
- Datos, nombres o código de empresas reales: el repositorio es público y la regla del hackathon exige código nuevo.
- Integración con burós de crédito: requiere contratos y credenciales, no cabe en una tarde.
- Guardado en servidor: la demo guarda las solicitudes en el navegador.
