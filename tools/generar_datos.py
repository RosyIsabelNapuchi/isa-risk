"""Genera la cartera sintética de ISA Risk.

Todos los clientes, nombres y cifras son ficticios. Cada cliente nace de un
"riesgo latente" (un número aleatorio) del que se derivan sus variables, para
que los datos sean coherentes entre sí: quien suele pagar tarde también tiende
a usar más su línea y a tener peor calificación en el sistema financiero.

Uso:  python tools/generar_datos.py
Salida: data/clientes.js
"""

import json
import math
import random
from pathlib import Path

SEMILLA = 2026
N_CLIENTES = 60

PREFIJOS = [
    "Andina", "Cóndor", "Quillay", "Huarango", "Totora", "Rumi", "Inti",
    "Yaku", "Wayra", "Qori", "Sierra Alta", "Costa Verde", "Pachak",
    "Illari", "Kallpa", "Tumi", "Ichu", "Lúcuma", "Molle", "Sacha",
]

SECTORES = {
    "Construcción": ["Constructora", "Obras", "Edificaciones"],
    "Agroindustria": ["Agroexport", "Agrícola", "Frutos"],
    "Manufactura": ["Industrias", "Metalmecánica", "Plásticos"],
    "Transporte": ["Logística", "Transportes", "Carga"],
    "Energía": ["Energía", "Solar", "Térmica"],
    "Comercio": ["Distribuidora", "Comercial", "Suministros"],
}

SUFIJOS = ["S.A.C.", "S.A.", "E.I.R.L.", "S.R.L."]
VENDEDORES = ["Zona Norte", "Zona Sur", "Zona Centro", "Zona Oriente"]
CALIFICACIONES = ["Normal", "CPP", "Deficiente", "Dudoso", "Pérdida"]


def entre(valor, minimo, maximo):
    return max(minimo, min(maximo, valor))


def redondear(valor, a=1000):
    return int(round(valor / a) * a)


def generar():
    rnd = random.Random(SEMILLA)
    usados = set()
    clientes = []

    for i in range(1, N_CLIENTES + 1):
        sector = rnd.choice(list(SECTORES))
        while True:
            nombre = f"{rnd.choice(SECTORES[sector])} {rnd.choice(PREFIJOS)} {rnd.choice(SUFIJOS)}"
            if nombre not in usados:
                usados.add(nombre)
                break

        z = rnd.gauss(0, 1)  # riesgo latente: más alto = más riesgoso

        antiguedad = round(entre(rnd.gammavariate(2.2, 3.2) - 0.8 * z, 0.5, 30), 1)
        ventas = redondear(math.exp(rnd.gauss(math.log(9_000_000), 0.8)), 10_000)
        compras = redondear(ventas * rnd.uniform(0.03, 0.10) / 12, 500)
        linea = redondear(compras * rnd.uniform(1.0, 2.5))
        utilizacion = entre(0.45 + 0.18 * z + rnd.gauss(0, 0.12), 0.05, 1.0)

        atraso_prom = max(0, round(4 + 9 * z + rnd.gauss(0, 4)))
        atraso_max = max(atraso_prom, round(atraso_prom * rnd.uniform(1.5, 3.5) + rnd.gauss(3, 4)))

        c = z + rnd.gauss(0, 0.45)
        if c < 0.7:
            calificacion = "Normal"
        elif c < 1.2:
            calificacion = "CPP"
        elif c < 1.6:
            calificacion = "Deficiente"
        elif c < 2.0:
            calificacion = "Dudoso"
        else:
            calificacion = "Pérdida"

        deuda = redondear(ventas * entre(0.25 + 0.12 * z + rnd.gauss(0, 0.08), 0.02, 0.9), 10_000)

        if z > 1.2:
            protestos = rnd.choice([0, 1, 1, 2, 3])
        elif z > 0.5:
            protestos = rnd.choice([0] * 9 + [1])
        else:
            protestos = 0

        plazo = rnd.choices([30, 60, 90], weights=[3, 4, 2])[0]
        monto = redondear(compras * plazo / 30 * rnd.uniform(0.9, 1.6))

        # --- comportamiento con ISA (cuentas por cobrar) ---
        saldo = redondear(linea * utilizacion, 500)
        frac_vencido = entre(0.06 + 0.13 * z + rnd.gauss(0, 0.06), 0.0, 0.7) if atraso_prom > 0 else 0.0
        vencido = redondear(saldo * frac_vencido, 100)
        # reparto por antigüedad: quien es más riesgoso tiene vencidos más viejos
        pesos = [
            max(0.05, 1.0 - 0.25 * z),
            max(0.02, 0.45 + 0.1 * z),
            max(0.0, 0.15 + 0.15 * z),
            max(0.0, 0.05 + 0.2 * z) if atraso_max > 60 else 0.0,
        ]
        total_p = sum(pesos)
        tramos = [redondear(vencido * p / total_p, 100) for p in pesos]
        tramos[0] += vencido - sum(tramos)

        # historia de vencido de los últimos 6 meses (abr–sep 2026)
        deriva = rnd.gauss(0.03 * z, 0.06)
        historia = []
        v = vencido
        for _ in range(6):
            historia.append(max(0, redondear(v, 100)))
            v = v / max(0.6, 1 + deriva + rnd.gauss(0, 0.08))
        historia.reverse()
        cambio = (historia[-1] - historia[-3]) / max(1, historia[-3]) if historia[-3] else (1 if historia[-1] else 0)
        tendencia = "Empeora" if cambio > 0.15 else "Mejora" if cambio < -0.15 else "Estable"

        # buró de crédito (0–999, más alto = mejor), tres bases trimestrales
        buro_hoy = int(entre(round(820 - 170 * z + rnd.gauss(0, 50)), 120, 990))
        buro = [
            {"base": "31 ene. 2026", "score": int(entre(buro_hoy + rnd.gauss(25 * (z > 0) - 10, 35), 100, 999))},
            {"base": "30 abr. 2026", "score": int(entre(buro_hoy + rnd.gauss(12 * (z > 0) - 5, 25), 100, 999))},
            {"base": "31 jul. 2026", "score": buro_hoy},
        ]

        condicion = {30: "Factura 30 días", 60: "Factura 45 días", 90: "Factura 60 días"}[rnd.choice([30, 60, 60, 90])]

        clientes.append({
            "id": f"C-{i:04d}",
            "nombre": nombre,
            "sector": sector,
            "antiguedad_anios": antiguedad,
            "ventas_anuales": ventas,
            "compras_mensuales": compras,
            "linea_actual": linea,
            "linea_utilizada": redondear(linea * utilizacion, 500),
            "atraso_prom_dias": atraso_prom,
            "atraso_max_dias": atraso_max,
            "calificacion": calificacion,
            "deuda_sistema": deuda,
            "protestos_12m": protestos,
            "plazo_solicitado": plazo,
            "monto_solicitado": monto,
            "vendedor": rnd.choice(VENDEDORES),
            "condicion_pago": condicion,
            "ventas_12m": redondear(compras * 12 * rnd.uniform(0.85, 1.1), 1000),
            "movimientos_12m": rnd.randint(12, 90),
            "saldo": saldo,
            "vencido": vencido,
            "vencido_tramos": tramos,
            "vencido_historia": historia,
            "tendencia": tendencia,
            "buro": buro,
        })

    # solicitudes de crédito y documentos (para 14 clientes)
    elegidos = rnd.sample(clientes, 14)
    for n, cli in enumerate(sorted(elegidos, key=lambda c: c["id"]), start=1):
        codigo = f"SOL-2026-{n:04d}"
        estado = rnd.choices(["Por evaluar", "Aprobada", "Rechazada"], weights=[6, 4, 2])[0]
        dias = rnd.randint(-6, 9)  # negativo = vencida (fuera de plazo)
        cli["solicitud"] = {
            "codigo": codigo,
            "estado": estado,
            "monto": cli["monto_solicitado"],
            "plazo": cli["plazo_solicitado"],
            "vence_en_dias": dias if estado == "Por evaluar" else None,
            "vendedor": cli["vendedor"],
        }
        cli["documentos"] = [{"nombre": f"{codigo}_Solicitud_comercial.pdf", "origen": cli["vendedor"]}]
        if rnd.random() < 0.6:
            cli["documentos"].append({"nombre": f"{codigo}_Orden_de_compra.pdf", "origen": cli["vendedor"]})
        if estado != "Por evaluar":
            cli["documentos"].append({"nombre": f"{codigo}_Evaluacion.pdf", "origen": "Analista de Créditos"})

    return clientes


def main():
    clientes = generar()
    salida = Path(__file__).resolve().parent.parent / "data" / "clientes.js"
    salida.parent.mkdir(exist_ok=True)
    contenido = (
        "// Cartera sintética generada por tools/generar_datos.py. Datos ficticios.\n"
        "window.CLIENTES = " + json.dumps(clientes, ensure_ascii=False, indent=1) + ";\n"
    )
    salida.write_text(contenido, encoding="utf-8")
    print(f"{len(clientes)} clientes escritos en {salida}")


if __name__ == "__main__":
    main()
