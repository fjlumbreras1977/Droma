#!/usr/bin/env python3
"""Configura el dominio y el sitemap de la web estática, sin dependencias."""
from pathlib import Path
from urllib.parse import urlsplit
import sys,re,json
from xml.sax.saxutils import escape

def main():
 if len(sys.argv)!=2:
  print('Uso: python CONFIGURAR-SEO.py https://tudominio.com/droma/');return 1
 base=sys.argv[1].rstrip('/')+'/'
 parsed=urlsplit(base)
 if parsed.scheme not in ('https','http') or not parsed.hostname or parsed.query or parsed.fragment or parsed.username or parsed.password:
  print('Introduce una URL http o https, sin usuario, contraseña, parámetros ni fragmentos.');return 1
 root=Path(__file__).resolve().parent
 if not (root/'index.html').is_file():
  print('No se encuentra index.html junto a este archivo.');return 1
 urls=[]
 for file in root.rglob('*.html'):
  rel=file.relative_to(root).as_posix()
  route=rel[:-10] if rel.endswith('index.html') else rel
  canonical=base+route
  text=file.read_text(encoding='utf-8')
  for kind,value in [('canonical',canonical),('og:url',canonical),('og:image',base+'assets/social-card.png')]:
   if kind=='canonical':
    text=re.sub(r'(<link\b[^>]*rel="canonical"[^>]*href=")[^"]*(")',lambda m:m[1]+value+m[2],text)
   else:
    text=re.sub(r'(<meta\b[^>]*property="'+re.escape(kind)+r'"[^>]*content=")[^"]*(")',lambda m:m[1]+value+m[2],text)
  def update_data(item):
   if isinstance(item,list):return [update_data(v) for v in item]
   if not isinstance(item,dict):return item
   result={k:update_data(v) for k,v in item.items()}
   if result.get('@type')=='WebSite':result['url']=base
   if result.get('@type')=='WebPage':result['url']=canonical
   return result
  text=re.sub(r'(<script type="application/ld\+json">)(.*?)(</script>)',lambda m:m[1]+json.dumps(update_data(json.loads(m[2])),ensure_ascii=False)+m[3],text,flags=re.S)
  file.write_text(text,encoding='utf-8')
  if rel not in ('404.html','404/index.html','estudio-sonido/app.html','estudio-sonido/separar-voz.html','estudio-sonido/audiogramas.html','estudio-sonido/extraer-audio.html','estudio-sonido/mezclador.html'):urls.append(canonical)
 sitemap='<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+''.join('  <url><loc>'+escape(u)+'</loc></url>\n' for u in sorted(set(urls)))+'</urlset>\n'
 (root/'sitemap.xml').write_text(sitemap,encoding='utf-8')
 (root/'robots.txt').write_text('User-agent: *\nAllow: /\nSitemap: '+base+'sitemap.xml\n',encoding='utf-8')
 print('Dominio configurado:',base)
 print('Sitemap creado con',len(set(urls)),'páginas.')
 print('Sube el contenido de esta carpeta a tu hosting.')
 return 0
if __name__=='__main__':sys.exit(main())
