"""Chromium QA: isolated preview lab, offline cache and no horizontal overflow."""
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from functools import partial
from threading import Thread
from playwright.sync_api import sync_playwright
import subprocess,os,shutil

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/"qa_preview_dist"
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args):pass

def run():
    subprocess.run(["python3",str(ROOT/"tests"/"build_move_qa_preview.py")],check=True,timeout=60)
    server=ThreadingHTTPServer(("127.0.0.1",0),partial(Quiet,directory=str(OUT)))
    thread=Thread(target=server.serve_forever,daemon=True);thread.start()
    origin=f"http://127.0.0.1:{server.server_port}/"
    try:
      with sync_playwright() as p:
        exe=os.environ.get("CHROMIUM_PATH") or shutil.which("chromium") or shutil.which("google-chrome")
        browser=p.chromium.launch(headless=True,args=["--no-sandbox"],**({"executable_path":exe} if exe else {}))
        errors=[]
        for width in (320,390,768):
          ctx=browser.new_context(viewport={"width":width,"height":844},service_workers="allow")
          page=ctx.new_page()
          page.on("pageerror",lambda e:errors.append(str(e)))
          page.goto(origin,wait_until="domcontentloaded")
          assert page.locator(".qa-banner").is_visible()
          assert page.locator("#screen h1").count()==1
          assert page.evaluate("document.documentElement.scrollWidth<=innerWidth")
          page.goto(origin+"avaliar-3d.html",wait_until="domcontentloaded")
          assert page.get_by_role("heading",name="Laboratório de demonstrações 3D").is_visible()
          assert page.locator("#video").is_hidden()
          page.locator("#synthetic").click()
          page.locator("#video").wait_for(state="visible",timeout=15000)
          page.wait_for_function("document.querySelector('#video')?.readyState>=1",timeout=15000)
          page.locator("#speed").select_option(".5")
          assert page.locator("#video").evaluate("(v)=>v.playbackRate")==.5
          assert page.evaluate("document.documentElement.scrollWidth<=innerWidth")
          page.locator("#anatomy").check()
          page.locator("#equipment").check()
          page.locator("#clear").click()
          assert page.locator("#video").is_hidden()
          ctx.close()
        assert not errors,errors
        # Loopback is a secure context for SW; verify QA cache survives offline navigation.
        ctx=browser.new_context(service_workers="allow")
        page=ctx.new_page()
        page.goto(origin,wait_until="domcontentloaded")
        page.evaluate("() => navigator.serviceWorker.ready")
        page.reload(wait_until="domcontentloaded")
        page.wait_for_function("navigator.serviceWorker.controller!==null",timeout=20000)
        cache=page.evaluate("() => caches.keys()")
        assert any(x.startswith("forja-qa-shell-") for x in cache),cache
        ctx.set_offline(True)
        page.goto(origin+"avaliar-3d.html",wait_until="domcontentloaded",timeout=20000)
        assert page.locator("#video").is_hidden()
        page.locator("#synthetic").click()
        page.wait_for_function("document.querySelector('#video')?.readyState>=1",timeout=20000)
        page.goto(origin+"diagnostico.html",wait_until="domcontentloaded",timeout=20000)
        assert page.get_by_role("heading",name="Diagnóstico Android").is_visible()
        browser.close()
    finally:
      server.shutdown();server.server_close();thread.join(timeout=4)
    print("PASS FORJA MOVE isolated QA preview: labs 320/390/768 and offline pages")

if __name__=="__main__":run()
