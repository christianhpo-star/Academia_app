"""FORJA MOVE: real HTTP/PWA mobile smoke for private exercise-video storage.

The fixture is freshly generated from FFmpeg testsrc2 (not a copyrighted
exercise animation). The test never uploads or fetches exercise media.
"""
import os
import shutil
import subprocess
import tempfile
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
WIDTHS=(320,390)
class SilentHandler(SimpleHTTPRequestHandler):
    def log_message(self, fmt, *args):
        return

def create_original_fixture(target:Path):
    ffmpeg=shutil.which("ffmpeg")
    assert ffmpeg, "ffmpeg is required to create a self-authored synthetic WebM playback fixture"
    subprocess.run([
        ffmpeg,"-hide_banner","-loglevel","error","-nostdin","-y",
        "-f","lavfi","-i","testsrc2=size=96x96:rate=10:duration=2",
        "-an","-c:v","libvpx","-deadline","realtime","-cpu-used","5",
        "-b:v","160k","-pix_fmt","yuv420p",str(target)
    ],check=True,timeout=40)
    assert target.stat().st_size>1024

def go_catalog(page):
    page.locator("#screen h1").wait_for(timeout=25000)
    page.get_by_role("button",name="Treinos",exact=True).click()
    page.get_by_role("button",name="Catálogo de exercícios",exact=True).click()
    assert page.locator(".catalog-browser-item").count()>=40

def open_video(page,exercise="supino-canadense"):
    button=page.locator(f'.catalog-browser-item [data-action="video-open"][data-ex="{exercise}"]')
    button.click()
    dialog=page.locator("#exercise-video-dialog")
    dialog.wait_for(state="visible")
    assert dialog.get_attribute("open") is not None
    return dialog

def wait_video(page):
    page.locator("#exercise-video-preview video").wait_for(timeout=15000)
    page.wait_for_function("""() => {
        const v=document.querySelector('#exercise-video-preview video');
        return !!v && v.readyState>=1 && Number.isFinite(v.duration) && v.duration>0;
    }""",timeout=25000)

def clip_record(page,exercise):
    return page.evaluate("""async id => Promise.race([new Promise((resolve,reject)=>{
      const request=indexedDB.open('forja.exercise.video.v1',1);
      request.onerror=()=>reject(request.error);
      request.onsuccess=()=>{
        const db=request.result,tx=db.transaction('clips','readonly');
        const get=tx.objectStore('clips').get(id);
        get.onsuccess=()=>{
          const x=get.result;
          resolve(x?{id:x.id,name:x.name,size:x.blob.size,mime:x.mime}:null);
        };
        get.onerror=()=>reject(get.error);
        tx.oncomplete=()=>db.close();
      };
    }),new Promise((_,reject)=>setTimeout(()=>reject(new Error('IndexedDB lookup timeout')),12000))])""",exercise)

def main():
  with tempfile.TemporaryDirectory(prefix="forja-video-qa-") as tmp:
    clip=Path(tmp)/"forja-original-test.webm"
    create_original_fixture(clip)
    server=ThreadingHTTPServer(("127.0.0.1",0),partial(SilentHandler,directory=str(ROOT)))
    thread=threading.Thread(target=server.serve_forever,daemon=True)
    thread.start()
    # app.js intentionally registers its service worker for HTTPS or localhost.
    origin=f"http://localhost:{server.server_port}/"
    try:
      with sync_playwright() as p:
        chrome=os.environ.get("CHROMIUM_PATH") or shutil.which("chromium") or shutil.which("google-chrome")
        opts={"headless":True,"args":["--no-sandbox","--autoplay-policy=no-user-gesture-required"]}
        if chrome:opts["executable_path"]=chrome
        browser=p.chromium.launch(**opts)
        context=browser.new_context(
            viewport={"width":390,"height":844},is_mobile=True,has_touch=True,
            device_scale_factor=2.75,locale="pt-BR",service_workers="allow")
        errors=[]
        page=context.new_page()
        page.on("pageerror",lambda e:errors.append(str(e)))
        page.on("console",lambda msg: print("VIDEO QA browser console:",msg.type,msg.text,flush=True) if msg.type in ["warning","error"] else None)
        page.on("requestfailed",lambda req: print("VIDEO QA request failed:",req.url,req.failure,flush=True))
        context.on("serviceworker",lambda worker: print("VIDEO QA registered worker:",worker.url,flush=True))
        page.goto(origin,wait_until="domcontentloaded")
        go_catalog(page)
        print("VIDEO QA: first online load",flush=True)
        page.wait_for_load_state("load",timeout=25000)
        diagnostics=page.evaluate("""async () => {
          const regs=await navigator.serviceWorker.getRegistrations();
          return {origin:location.origin,secure:isSecureContext,
            workers:regs.map(r=>({scope:r.scope,installing:r.installing?.state,waiting:r.waiting?.state,active:r.active?.state})),
            controller:navigator.serviceWorker.controller?.state||null};
        }""")
        print("VIDEO QA: before readiness",diagnostics,flush=True)
        # A fresh PWA install may need one online reload to become controlled.
        ready=page.evaluate("""async () => {
          if(!navigator.serviceWorker)throw Error('Service worker unavailable');
          const r=await Promise.race([
            navigator.serviceWorker.ready,
            new Promise((_,reject)=>setTimeout(()=>reject(Error('Service worker activation timeout')),15000))
          ]);
          return {scope:r.scope,state:r.active?.state};
        }""")
        print("VIDEO QA: service worker",ready,flush=True)
        page.reload(wait_until="load",timeout=25000)
        go_catalog(page)
        page.wait_for_function("navigator.serviceWorker && navigator.serviceWorker.controller !== null",timeout=15000)

        state_before=page.evaluate("""() => ({
          state:localStorage.getItem('forja.academia.v1'),
          draft:localStorage.getItem('forja.academia.draft.v1')
        })""")
        dialog=open_video(page)
        assert dialog.locator("a[href*='fitlapse.com']").count()==1
        assert dialog.locator("#exercise-video-preview video").count()==0
        assert "Nenhum vídeo" in dialog.inner_text()
        print("VIDEO QA: import fixture",flush=True)
        dialog.locator("#exercise-video-picker").set_input_files(str(clip))
        page.locator("#exercise-video-status").get_by_text("Vídeo disponível",exact=False).wait_for(timeout=20000)
        wait_video(page)
        media=clip_record(page,"supino-canadense")
        assert media and media["size"]==clip.stat().st_size and media["name"]==clip.name,media
        assert clip_record(page,"leg-press") is None
        page.locator("#exercise-video-preview video").evaluate("(v) => { v.play().catch(()=>{}); return true; }")
        page.wait_for_function("document.querySelector('#exercise-video-preview video')?.currentTime > 0.1",timeout=10000)

        shots=ROOT/"screenshots"
        shots.mkdir(exist_ok=True)
        for width in WIDTHS:
            page.set_viewport_size({"width":width,"height":844})
            assert page.evaluate("document.documentElement.scrollWidth<=innerWidth"),f"page overflow {width}"
            assert dialog.evaluate("(d) => d.scrollWidth<=d.clientWidth+2"),f"dialog overflow {width}"
            dialog.screenshot(path=str(shots/f"video-local-{width}.png"))
        dialog.locator('[data-video-action="close"]').click()
        assert not dialog.is_visible()

        # Complete offline PWA navigation in the SAME origin and browser profile.
        print("VIDEO QA: switch offline",flush=True)
        context.set_offline(True)
        page.reload(wait_until="domcontentloaded",timeout=25000)
        go_catalog(page)
        dialog=open_video(page)
        wait_video(page)
        assert clip_record(page,"supino-canadense")["size"]==clip.stat().st_size
        page.locator("#exercise-video-preview video").evaluate("(v) => { v.play().catch(()=>{}); return true; }")
        page.wait_for_function("document.querySelector('#exercise-video-preview video')?.currentTime > 0.1",timeout=10000)
        dialog.screenshot(path=str(shots/"video-offline-390.png"))
        dialog.locator('[data-video-action="close"]').click()
        page.close()

        # A new tab mimics reopening a PWA with retained IndexedDB data.
        print("VIDEO QA: offline new tab",flush=True)
        page=context.new_page()
        page.on("pageerror",lambda e:errors.append(str(e)))
        page.goto(origin,wait_until="domcontentloaded",timeout=25000)
        go_catalog(page)
        dialog=open_video(page)
        wait_video(page)
        assert clip_record(page,"supino-canadense")["size"]==clip.stat().st_size
        assert page.evaluate("""() => ({
          state:localStorage.getItem('forja.academia.v1'),
          draft:localStorage.getItem('forja.academia.draft.v1')
        })""")==state_before,"Opening offline video altered workout data"

        # Deletion must remove only the video record.
        dialog.locator('[data-video-action="remove"]').click()
        page.locator("#exercise-video-status").get_by_text("Vídeo removido",exact=False).wait_for(timeout=15000)
        assert dialog.locator("#exercise-video-preview video").count()==0
        assert clip_record(page,"supino-canadense") is None
        dialog.locator('[data-video-action="close"]').click()
        page.reload(wait_until="domcontentloaded",timeout=25000)
        go_catalog(page)
        dialog=open_video(page)
        assert dialog.locator("#exercise-video-preview video").count()==0
        assert "Nenhum vídeo" in dialog.inner_text()
        assert not errors,errors
        browser.close()
      print("PASS FORJA video: real WebM play, IndexedDB, offline SW, reopen, delete, data isolation, 320/390px")
    finally:
      server.shutdown()
      server.server_close()
      thread.join(timeout=5)

if __name__=="__main__":
    main()
