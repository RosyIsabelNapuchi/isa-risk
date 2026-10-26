---
doc: spec
status: approved
---

# ISA Risk — Technical Spec

## How This Works, In Plain Language
Un script en Python inventa una cartera de 60 clientes (con historia de vencido, buró, solicitudes y documentos) con reglas realistas y la guarda en un archivo de datos. La app es una página web que se abre en el navegador: lee esos datos, calcula el riesgo de cada cliente con fórmulas conocidas de riesgo crediticio y muestra la decisión. No hay servidor, base de datos externa ni instalación.

## The Core Journey Through the System
`data/clientes.js` (generado) → `js/modelo.js` calcula probabilidad, puntaje consolidado, nivel, factores, decisión, monto, plazo y aprobador → `js/app.js` dibuja Dashboard ejecutivo, Bandeja de decisiones, Ficha 360 y Cómo decide el modelo → el selector 30/60/90 vuelve a llamar al modelo y redibuja el panel.

## Stack
- HTML, CSS y JavaScript sin frameworks ni paso de compilación.
- Python 3 (solo biblioteca estándar) para generar la base sintética con semilla fija.

## Where It Runs and How Someone Tries It
Abrir `index.html` en cualquier navegador, o la versión publicada en GitHub Pages desde el repositorio público.

## Look and Feel
Variables CSS en `:root`: grafito `#1B1F24`, acero `#44505D`, amarillo seguridad `#F5B700`, naranja `#E07A00`, fondo `#EEF0F2`, verde `#2E9E5B`, ámbar `#D9A400`, rojo `#C93C3C`. Gráficos y medidores en SVG dibujado a mano. Tipografía del sistema, números en negrita grande. Diseño adaptable a celular.

## Components

### Generador (`tools/generar_datos.py`)
Genera clientes con variables correlacionadas por un "riesgo latente" para que los datos sean coherentes (quien paga tarde suele tener peor calificación y más uso de línea). Escribe `data/clientes.js` como `window.CLIENTES = [...]`.

### Modelo (`js/modelo.js`)
- Variables transformadas: atraso promedio, atraso máximo, utilización, antigüedad, calificación (0–4), deuda/ventas, protestos.
- `logit_h = b0_h + Σ βi·xi`; mismos βi, intercepto distinto por horizonte (más largo = menos probable).
- Puntaje consolidado 0–100: suma de 7 componentes con tope (ver `prd.md > Puntaje consolidado`).
- Proyección del vencido: cada mes, la deuda al día pasa a vencida según la probabilidad a 30 días (× 0,25) y se recupera 12 % del vencido; optimista y pesimista varían esos factores.
- Alertas derivadas de los datos del cliente.
- Factores = βi·(xi − media de cartera), ordenados por valor absoluto.
- Reglas de exclusión, umbrales, monto y matriz de aprobación según `prd.md > Reglas de decisión`.

### Interfaz (`js/app.js`, `css/styles.css`, `index.html`)
Rutas por hash: `#dashboard`, `#bandeja`, `#ficha/ID`, `#modelo`. Filtros compartidos, exportar CSV, selector 30/60/90 global.

## Data Model
Cliente: `id, nombre, sector, vendedor, antiguedad_anios, ventas_anuales, compras_mensuales, ventas_12m, movimientos_12m, condicion_pago, linea_actual, linea_utilizada, saldo, vencido, vencido_tramos[4], vencido_historia[6], tendencia, atraso_prom_dias, atraso_max_dias, calificacion, deuda_sistema, protestos_12m, buro[3], plazo_solicitado, monto_solicitado, solicitud?, documentos?`.

## File Structure
```
index.html
css/styles.css
js/modelo.js
js/app.js
data/clientes.js        (generado)
tools/generar_datos.py
devpost/                (planificación)
README.md
```

## External Services and Dependencies
Ninguno.

## Important Failure Modes
- Datos que no cargan: mensaje claro en pantalla.
- Probabilidades extremas: recortadas entre 0,2 % y 99,5 %.

## What Was Simplified and Why
Pesos teóricos en lugar de modelo entrenado (no hay datos reales que usar ni publicar). Sin login ni base de datos: no son necesarios para demostrar la decisión.

## Decisions and Open Issues
Paleta grafito, acero y amarillo de seguridad.
