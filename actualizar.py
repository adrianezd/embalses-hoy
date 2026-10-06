"""Genera datos.json con el estado de los embalses a partir de la base oficial del MITECO.

Uso: python actualizar.py [ruta/BD-Embalses.mdb]
Sin ruta, descarga el zip del Boletín Hidrológico. Si la descarga falla, no toca datos.json.
"""
import io, json, sys, zipfile, urllib.request, datetime, collections, tempfile, os
from access_parser import AccessParser

URL = ("https://www.miteco.gob.es/content/dam/miteco/es/agua/temas/evaluacion-de-los-recursos-hidricos/"
       "boletin-hidrologico/Historico-de-embalses/BD-Embalses.zip")


def ruta_mdb():
    if len(sys.argv) > 1:
        return sys.argv[1]
    datos = urllib.request.urlopen(URL, timeout=120).read()
    z = zipfile.ZipFile(io.BytesIO(datos))
    nombre = [n for n in z.namelist() if n.lower().endswith(".mdb")][0]
    destino = os.path.join(tempfile.gettempdir(), "BD-Embalses.mdb")
    with open(destino, "wb") as f:
        f.write(z.read(nombre))
    return destino


def num(v):
    return float(str(v).replace(".", "").replace(",", ".")) if v not in (None, "") else 0.0


def main():
    db = AccessParser(ruta_mdb())
    tabla = [k for k in db.catalog if k.startswith("T_Datos Embalses")][0]
    t = db.parse_table(tabla)
    filas = []
    for i in range(len(t["FECHA"])):
        fecha = str(t["FECHA"][i])[:10]
        filas.append((fecha, t["AMBITO_NOMBRE"][i], t["EMBALSE_NOMBRE"][i], num(t["AGUA_TOTAL"][i]),
                      num(t["AGUA_ACTUAL"][i]), str(t["ELECTRICO_FLAG"][i]).startswith("1")))

    por_fecha = collections.defaultdict(list)
    for f in filas:
        por_fecha[f[0]].append(f)
    fechas = sorted(por_fecha)
    ultima = fechas[-1]
    d_ult = datetime.date.fromisoformat(ultima)

    def cercana(objetivo):
        return min(fechas, key=lambda x: abs((datetime.date.fromisoformat(x) - objetivo).days))

    anterior = fechas[-2]
    hace_anyo = cercana(d_ult - datetime.timedelta(days=364))

    def indice(fecha):
        return {(f[1], f[2]): f for f in por_fecha[fecha]}

    def pct(a, t):
        return round(a / t * 100, 1) if t else 0

    act, prev, anyo = indice(ultima), indice(anterior), indice(hace_anyo)

    embalses = []
    for k, f in sorted(act.items()):
        p, y = prev.get(k), anyo.get(k)
        embalses.append({"n": f[2], "c": f[1], "a": f[4], "t": f[3], "p": pct(f[4], f[3]),
                         "s": round(f[4] - p[4], 1) if p else None,
                         "y": pct(y[4], y[3]) if y else None, "e": f[5]})

    def agregado(idx, filtro=lambda f: True):
        a = sum(f[4] for f in idx.values() if filtro(f))
        tt = sum(f[3] for f in idx.values() if filtro(f))
        return a, tt

    cuencas = []
    for c in sorted({f[1] for f in act.values()}):
        a, tt = agregado(act, lambda f: f[1] == c)
        ay, ty = agregado(anyo, lambda f: f[1] == c)
        cuencas.append({"n": c, "a": round(a), "t": round(tt), "p": pct(a, tt), "y": pct(ay, ty)})

    a, tt = agregado(act)
    ay, ty = agregado(anyo)
    # Media de la misma semana en los diez años anteriores.
    medias = []
    for k in range(1, 11):
        fx = cercana(d_ult - datetime.timedelta(days=round(365.25 * k)))
        aa, tx = agregado(indice(fx))
        medias.append(pct(aa, tx))

    serie = []
    desde = (d_ult - datetime.timedelta(days=365 * 10 + 3)).isoformat()
    for fx in fechas:
        if fx >= desde:
            aa, tx = agregado(indice(fx))
            serie.append([fx, pct(aa, tx)])

    salida = {
        "fecha": ultima, "fechaAnyo": hace_anyo,
        "nacional": {"a": round(a), "t": round(tt), "p": pct(a, tt), "y": pct(ay, ty),
                     "s": round(a - agregado(prev)[0]), "m10": round(sum(medias) / len(medias), 1)},
        "cuencas": cuencas, "embalses": embalses, "serie": serie,
    }
    with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "datos.json"), "w", encoding="utf-8") as f:
        json.dump(salida, f, ensure_ascii=False, separators=(",", ":"))
    print("datos.json", ultima, salida["nacional"])


if __name__ == "__main__":
    main()
