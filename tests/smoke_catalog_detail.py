"""Catalog details are independent of any workout and preserve all local data.
Visual snapshots cover 390px and 320px; only a confirmed plan edit can write.
"""
import json
import os
import re
import shutil
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
RAW = (ROOT / 'index.html').read_text(encoding='utf-8')
SCRIPTS = re.findall(r'<script defer src="\./([^?"#]+)(?:\?[^"]*)?"></script>', RAW)
HTML = re.sub(r'<script defer src="\./[^"]+"></script>', '', RAW)
HTML = re.sub(r'<link rel="stylesheet" href="\./styles\.css\?v=[^"]+" />', '', HTML)
KEY = 'forja.academia.v1'

def start(context, store, errors):
    page=context.new_page()
    page.on('pageerror', lambda err:errors.append(str(err)))
    page.set_content(HTML)
    page.evaluate("""saved=>{
      window.__testStorage={...saved};
      Object.defineProperty(window,'localStorage',{configurable:true,value:{
        getItem(k){return window.__testStorage[k]??null},
        setItem(k,v){window.__testStorage[k]=String(v)},
        removeItem(k){delete window.__testStorage[k]}
      }});
    }""",store)
    page.add_style_tag(path=str(ROOT/'styles.css'))
    for script in SCRIPTS:
        page.add_script_tag(path=str(ROOT/script))
    page.locator('#screen h1').wait_for(timeout=12000)
    return page

with sync_playwright() as p:
    exe=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium') or shutil.which('google-chrome')
    opts={'headless':True, 'args':['--no-sandbox']}
    if exe:opts['executable_path']=exe
    browser=p.chromium.launch(**opts)
    context=browser.new_context(viewport={'width':390,'height':844},locale='pt-BR')
    errors=[]
    page=start(context,{},errors)
    page.get_by_role('button',name='Treinos',exact=True).click()
    page.locator('[data-action="training-destination"][data-to="catalog"]').click()
    page.locator('#catalog-search').fill('voador inverso')
    before=page.evaluate('JSON.stringify(window.__testStorage)')
    page.locator('[data-action="catalog-view"][data-ex="voador-inverso"]').click()
    assert page.locator('.catalog-detail').count()==1
    assert page.locator('.catalog-browser-item').count()==0
    assert page.locator('.catalog-detail-figure svg[role="img"]').count()==1
    assert 'Deltoide posterior' in page.locator('.catalog-detail-muscles').inner_text()
    assert 'Trapézio médio e romboides' in page.locator('.catalog-detail-muscles').inner_text()
    assert 'Máquina' in page.locator('.catalog-detail-facts').inner_text()
    assert page.locator('#catalog-detail-heading').evaluate('(node)=>document.activeElement===node')
    assert page.evaluate('JSON.stringify(window.__testStorage)')==before
    shots=ROOT/'screenshots';shots.mkdir(exist_ok=True)
    page.screenshot(path=str(shots/'catalog-detail-rear-fly-390.png'),full_page=True)
    page.set_viewport_size({'width':320,'height':740})
    assert page.evaluate("""()=>{
      const box=document.querySelector('.catalog-detail').getBoundingClientRect();
      return box.left>=-1&&box.right<=innerWidth+1;
    }""")
    for selector in ['.catalog-detail-back','.catalog-detail-actions button']:
        for button in page.locator(selector).all():
            rect=button.bounding_box()
            assert rect and rect['height']>=44,(selector,rect)
            assert rect['x']>=-1 and rect['x']+rect['width']<=321,(selector,rect)
    page.screenshot(path=str(shots/'catalog-detail-rear-fly-320.png'),full_page=True)
    page.locator('[data-action="catalog-back"]').click()
    assert page.locator('#catalog-search').input_value()=='voador inverso'
    assert page.locator('.catalog-browser-item:visible').count()==1
    assert page.evaluate('JSON.stringify(window.__testStorage)')==before

    # Unmapped lower-body movements get accurate metadata but no invented drawing.
    page.locator('#catalog-search').fill('hip thrust maquina')
    page.locator('[data-action="catalog-view"][data-ex="hip-thrust-maquina"]').click()
    assert page.locator('.catalog-detail-unmapped').count()==1
    assert page.locator('.catalog-detail-figure').count()==0
    assert 'Glúteos' in page.locator('.catalog-detail-facts').inner_text()
    assert 'ainda não revisada' in page.locator('.catalog-detail-technique').inner_text()
    assert page.evaluate('JSON.stringify(window.__testStorage)')==before
    page.locator('[data-action="catalog-intent"]').click()
    assert page.locator('[data-action="catalog-confirm"]').count()==1
    assert page.evaluate('JSON.stringify(window.__testStorage)')==before
    page.locator('[data-action="catalog-cancel"]').click()
    assert page.locator('[data-action="catalog-confirm"]').count()==0
    assert page.evaluate('JSON.stringify(window.__testStorage)')==before
    page.locator('[data-action="catalog-intent"]').click()
    page.locator('[data-action="catalog-confirm"]').click()
    newdata=json.loads(page.evaluate('localStorage.getItem("'+KEY+'")'))
    saved=[ex for ex in newdata['exercises'] if ex['id']=='hip-thrust-maquina']
    assert len(saved)==1 and saved[0]['active'] is True
    assert page.locator('[data-action="catalog-edit-in-plan"]').count()==1
    assert page.evaluate('localStorage.getItem("forja.academia.draft.v1")') is None
    page.locator('[data-action="catalog-edit-in-plan"]').click()
    assert page.locator('[data-action="exit-editor"]').count()>0
    assert 'Elevação pélvica na máquina' in page.locator('#screen').inner_text()
    assert page.evaluate('localStorage.getItem("forja.academia.draft.v1")') is None
    assert not errors,errors
    browser.close()
print('PASS catalog detail: independent, accurate, cancellable, confirmed, mobile-safe')
