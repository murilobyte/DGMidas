#!/usr/bin/env python3
"""
Verificacao pre-deploy do site estatico.

Pega a classe de erro que ja aconteceu aqui: referencia de arquivo que
nao existe, og:image apontando para um 404, mistura de www com sem-www
e pagina que ficou sem o pixel. Nao precisa de dependencia: roda com o
python3 do sistema.

    python3 tools/verificar.py

Sai com codigo 1 se achar problema, para poder virar passo de CI depois.
"""
import os
import re
import sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGINAS = ["index.html", "ativos/index.html"]
DOMINIO = "https://www.dgmidias.com"
PIXEL_ID = "4688691654751288"

problemas = []


def ler(rel):
    with open(os.path.join(RAIZ, rel), encoding="utf-8") as fh:
        return fh.read()


def existe(rel):
    return os.path.exists(os.path.join(RAIZ, rel))


for pagina in PAGINAS:
    html = ler(pagina)
    base = os.path.dirname(pagina)

    # 1. toda referencia local tem de existir em disco
    for ref in re.findall(r'(?:href|src)="([^"]+)"', html):
        if ref.startswith(("http", "#", "mailto:", "tel:", "data:")):
            continue
        alvo = ref.split("#")[0].split("?")[0]
        if not alvo:
            continue
        caminho = alvo.lstrip("/") if alvo.startswith("/") else os.path.normpath(os.path.join(base, alvo))
        if not (existe(caminho) or existe(caminho + "/index.html")):
            problemas.append("%s: referencia quebrada -> %s" % (pagina, ref))

    # 2. og:image precisa existir de fato: preview quebrado nao da erro visivel
    for url in re.findall(r'<meta property="og:image" content="([^"]+)"', html):
        if url.startswith(DOMINIO):
            local = url[len(DOMINIO):].lstrip("/")
            if not existe(local):
                problemas.append("%s: og:image nao existe em disco -> %s" % (pagina, local))
        else:
            problemas.append("%s: og:image fora do dominio canonico -> %s" % (pagina, url))

    # 3. o dominio sem www responde 308; canonical/og:url tem de ja apontar ao final
    for achado in re.findall(r'https://dgmidias\.com[^"\s]*', html):
        problemas.append("%s: URL sem www (redireciona 308) -> %s" % (pagina, achado))

    # 4. pagina sem pixel some do rastreamento sem ninguem perceber
    if PIXEL_ID not in html:
        problemas.append("%s: sem o Meta Pixel" % pagina)
    elif "fbq('track', 'PageView')" not in html:
        problemas.append("%s: pixel sem PageView" % pagina)

# 5. o telefone e um so no site inteiro: numero trocado pela metade manda
#    lead para uma linha desativada sem nenhum sinal de erro
numeros = set()
for rel in PAGINAS + ["js/lead-modal.js", "js/ativos-config.js"]:
    conteudo = ler(rel)
    numeros.update(re.findall(r"wa\.me/(\d{12,13})", conteudo))
    numeros.update(re.findall(r'tel:\+(\d{12,13})', conteudo))
    numeros.update(re.findall(r'WHATSAPP_NUMBER\s*=\s*"(\d{12,13})"', conteudo))
    numeros.update(d.replace(" ", "").replace("-", "") for d in re.findall(r'\+55 \d{2} \d{4,5}-\d{4}', conteudo))
numeros = {n.lstrip("+") for n in numeros}
if len(numeros) > 1:
    problemas.append("telefone divergente no site: %s" % ", ".join(sorted(numeros)))

# 6. sitemap e robots seguem o mesmo dominio
for arquivo in ("sitemap.xml", "robots.txt"):
    for achado in re.findall(r'https://dgmidias\.com[^"\s<]*', ler(arquivo)):
        problemas.append("%s: URL sem www -> %s" % (arquivo, achado))

# 7. toda pagina do site esta no sitemap
sitemap = ler("sitemap.xml")
for pagina in PAGINAS:
    rota = "/" if pagina == "index.html" else "/" + os.path.dirname(pagina)
    if DOMINIO + rota not in sitemap:
        problemas.append("sitemap.xml: falta a rota %s" % rota)

if problemas:
    print("%d problema(s):\n" % len(problemas))
    for p in problemas:
        print("  x " + p)
    sys.exit(1)

print("ok: %d paginas verificadas, nenhum problema." % len(PAGINAS))
