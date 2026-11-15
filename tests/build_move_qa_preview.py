"""Build an isolated FORJA MOVE QA PWA; never change production assets.

Usage: python3 tests/build_move_qa_preview.py
Output: qa_preview_dist/ (upload as a new HTTPS site, never over main).
"""
from pathlib import Path
import json
import os
import re
import shutil
import subprocess
from html import escape

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/"qa_preview_dist"
QA_LAB=ROOT/"tests"/"qa_preview"/"avaliar-3d.html"

DIAGNOSTIC=r"""<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta name="theme-color" content="#0b111a"><title>FORJA QA · Diagnóstico Android</title>
<style>:root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;background:#0b111a;color:#f3f6fb;font:14px/1.5 system-ui,sans-serif}.strip{background:#30451b;color:#edffc5;border-bottom:1px solid #c5f56b;padding:10px;text-align:center;font-weight:800}main{max-width:670px;margin:auto;padding:18px 14px 60px}h1{font-size:25px}p{color:#b6cada}.card{background:#151e2c;border:1px solid #5d758a;border-radius:15px;padding:15px;margin:13px 0}.row{display:flex;gap:10px;flex-wrap:wrap;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid #304455}.row:last-child{border:0}.result{color:#c5f56b;font-weight:700}.result[data-ok=false]{color:#ffd49b}button,a.btn{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:10px;border:1px solid #5d758a;border-radius:10px;background:#203342;color:#f3f6fb;text-decoration:none;font:700 13px system-ui;cursor:pointer}button:focus-visible,a:focus-visible{outline:3px solid #80beff;outline-offset:2px}.actions{display:flex;gap:8px;flex-wrap:wrap}.actions>*{flex:1 1 140px}</style></head>
<body><div class="strip">AMBIENTE DE TESTE · FORJA QA · SEM DADOS PESSOAIS</div><main><div class="actions"><a class="btn" href="./">FORJA QA</a><a class="btn" href="./avaliar-3d.html">Laboratório 3D</a></div><h1>Diagnóstico Android</h1><p>Verifica HTTPS, armazenamento IndexedDB, cache e codecs de vídeo. Não altera dados de musculação e não envia arquivos.</p><div class="card" id="checks" role="status" aria-live="polite">Verificando compatibilidade...</div><button id="rerun" type="button">Repetir diagnóstico</button><p>Se o cache ou o IndexedDB não estiverem disponíveis, teste no Chrome sem modo anônimo. O site QA precisa ter sido aberto em HTTPS ao menos uma vez antes do teste em modo avião.</p></main><script>
(()=>{'use strict';const root=document.getElementById('checks');const row=(n,ok,info)=>'<div class="row"><span>'+n+'</span><span class="result" data-ok="'+!!ok+'">'+(ok?'Disponível':'Verificar')+(info?' · '+info:'')+'</span></div>';
async function inspect(){let out='';const secure=location.protocol==='https:'||location.hostname==='localhost'||location.hostname==='127.0.0.1';out+=row('Origem segura HTTPS',secure,location.protocol.replace(':',''));
out+=row('Service worker','serviceWorker' in navigator);
if('serviceWorker' in navigator){const c=navigator.serviceWorker.controller;out+=row('Controle offline ativo',!!c);const regs=await navigator.serviceWorker.getRegistrations();out+=row('Worker instalado',regs.some(r=>r.scope.startsWith(location.origin)),String(regs.length));}
out+=row('CacheStorage','caches' in window);
if('caches' in window){const keys=await caches.keys();out+=row('Cache FORJA QA',keys.some(k=>k.startsWith('forja-qa-shell-')));}
out+=row('IndexedDB','indexedDB' in window);
if('indexedDB' in window)try{const req=indexedDB.open('forja.qa.exercise.video.v1',1);const db=await new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('clips'))req.result.createObjectStore('clips',{keyPath:'id'});};req.onerror=()=>reject(req.error);});const tx=db.transaction('clips','readonly');const count=await new Promise((resolve,reject)=>{const q=tx.objectStore('clips').count();q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);});db.close();out+=row('Vídeos locais neste navegador',true,String(count));}catch(e){out+=row('Acesso aos vídeos locais',false);}
const v=document.createElement('video');out+=row('MP4/H.264',!!v.canPlayType('video/mp4; codecs="avc1.42E01E"'));out+=row('WebM/VP8',!!v.canPlayType('video/webm; codecs="vp8"'));root.innerHTML=out;}
document.getElementById('rerun').addEventListener('click',()=>inspect().catch(()=>{root.textContent='Falha ao verificar o navegador.';}));inspect().catch(()=>{root.textContent='Falha ao verificar o navegador.';});
})();
</script></body></html>"""

def replace_one(source, old, new, label):
    if source.count(old)!=1: raise RuntimeError(f"{label}: expected 1 match, got {source.count(old)}")
    return source.replace(old,new)

def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(value, encoding="utf-8")

def main():
    if OUT.exists():shutil.rmtree(OUT)
    OUT.mkdir()
    for glob in ("*.html","*.js","*.css","*.webmanifest"):
        for item in ROOT.glob(glob):
            shutil.copy2(item, OUT/item.name)
    for item in (ROOT/"icons").glob("*.png"):
        target=OUT/"icons"/item.name
        target.parent.mkdir(parents=True,exist_ok=True)
        shutil.copy2(item,target)
    manifest=json.loads((OUT/"manifest.webmanifest").read_text(encoding="utf-8"))
    manifest.update(id="./forja-qa-pr27",name="FORJA MOVE v5 — Ambiente de Teste",short_name="FORJA QA",description="Versão isolada: não importe seu backup real.")
    write(OUT/"manifest.webmanifest",json.dumps(manifest,ensure_ascii=False,indent=2))
    index=(OUT/"index.html").read_text(encoding="utf-8")
    index=replace_one(index,"<body>","<body>\n<div class=\"qa-banner\" role=\"note\">AMBIENTE DE TESTE · FORJA QA · NÃO IMPORTE SEU BACKUP · <a href=\"./avaliar-3d.html\">Laboratório 3D</a> · <a href=\"./diagnostico.html\">Diagnóstico Android</a></div>","QA index banner")
    index=replace_one(index,"</head>",'<meta name="robots" content="noindex,nofollow,noarchive"></head>',"robots")
    index=index.replace("<title>FORJA — Evolução de força</title>","<title>FORJA QA — Avaliação 3D</title>")
    write(OUT/"index.html",index)
    style=(OUT/"styles.css").read_text(encoding="utf-8")
    style+="\n/* FORJA QA only; the production CSS is unchanged. */\n.qa-banner{position:relative;z-index:40;background:#30451b;border-bottom:1px solid #c5f56b;color:#edffc5;text-align:center;padding:10px 12px;font:800 12px/1.5 system-ui,sans-serif}.qa-banner a{color:#e8ffb8;text-decoration:underline}\n"
    write(OUT/"styles.css",style)
    for file,pairs in {
        "app.js":{"'forja.academia.v1'":"'forja.qa.academia.v1'","'forja.academia.draft.v1'":"'forja.qa.academia.draft.v1'"},
        "exercise-video.js":{"'forja.exercise.video.v1'":"'forja.qa.exercise.video.v1'"},
    }.items():
        content=(OUT/file).read_text(encoding="utf-8")
        for old,new in pairs.items():
            if old not in content:raise RuntimeError(f"expected QA storage key {file} {old}")
            content=content.replace(old,new)
        write(OUT/file,content)
    version=os.environ.get("GITHUB_SHA","local-preview")[:9]
    sw=(OUT/"sw.js").read_text(encoding="utf-8")
    sw,count=re.subn(r"const CACHE\s*=\s*'forja-shell-[^']+';",f"const CACHE = 'forja-qa-shell-{version}';",sw)
    if count!=1:raise RuntimeError("Unexpected service worker cache name")
    sw=replace_one(sw,"'./', './index.html',","'./', './index.html', './avaliar-3d.html', './diagnostico.html', './video-teste.mp4', './video-teste.webm',","SW precache")
    sw=sw.replace("key.startsWith('forja-shell-')","key.startsWith('forja-qa-shell-')")
    if "forja-shell-" in sw:raise RuntimeError("Production shell references persisted")
    write(OUT/"sw.js",sw)
    write(OUT/"avaliar-3d.html",QA_LAB.read_text(encoding="utf-8"))
    write(OUT/"diagnostico.html",DIAGNOSTIC)
    write(OUT/"robots.txt","User-agent: *\nDisallow: /\n")
    write(OUT/"_headers","/*\n  X-Robots-Tag: noindex, nofollow, noarchive\n  X-Content-Type-Options: nosniff\n\n/sw.js\n  Cache-Control: no-cache, must-revalidate\n")
    ffmpeg=shutil.which("ffmpeg")
    if not ffmpeg:raise RuntimeError("ffmpeg required for original, synthetic non-exercise video")
    subprocess.run([ffmpeg,"-nostdin","-v","error","-y","-f","lavfi","-i","testsrc2=size=160x90:rate=12:duration=3","-an","-c:v","libx264","-pix_fmt","yuv420p","-movflags","+faststart",str(OUT/"video-teste.mp4")],check=True,timeout=45)
    if (OUT/"video-teste.mp4").stat().st_size<1024:raise RuntimeError("Empty MP4 fixture")
    # Chromium CI may lack proprietary H.264 codecs; VP8/WebM is an open video smoke fixture.
    subprocess.run([ffmpeg,"-nostdin","-v","error","-y","-f","lavfi","-i","testsrc2=size=160x90:rate=12:duration=3","-an","-c:v","libvpx","-deadline","realtime","-cpu-used","5","-b:v","160k",str(OUT/"video-teste.webm")],check=True,timeout=45)
    if (OUT/"video-teste.webm").stat().st_size<1024:raise RuntimeError("Empty WebM fixture")
    for path in OUT.glob("*.js"):
        source=path.read_text(encoding="utf-8")
        if path.name in ("app.js","exercise-video.js"):
            for prod in ("'forja.academia.v1'","'forja.academia.draft.v1'","'forja.exercise.video.v1'"):
                if prod in source:raise RuntimeError(f"Production storage key left in QA: {path}")
    index=(OUT/"index.html").read_text(encoding="utf-8")
    sw=(OUT/"sw.js").read_text(encoding="utf-8")
    paths=set(re.findall(r'(?:src|href)="\./([^"?#]+)',index))
    paths|=set(re.findall(r"'\\./([^']+)'",sw))
    missing=[p for p in paths if not (OUT/p.split("?",1)[0]).exists()]
    if missing:raise RuntimeError(f"Missing PWA resources {missing}")
    print(f"PASS isolated FORJA QA preview: {len([x for x in OUT.rglob('*') if x.is_file()])} files, {OUT}")

if __name__=="__main__":main()
