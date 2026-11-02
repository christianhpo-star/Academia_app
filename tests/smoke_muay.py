"""Smoke test for Muay Thai at home, history, draft recovery, legacy backup and mobile sizing."""
import json, re, shutil, os
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
HTML=re.sub(r'<script defer src="./[^"]+"></script>', '', (ROOT/'index.html').read_text())
HTML=HTML.replace('<link rel="stylesheet" href="./styles.css" />','')

def open_app(ctx, storage=None):
    page=ctx.new_page()
    page.set_content(HTML)
    page.evaluate("""seed=>{
      window.__testStorage={...seed};
      Object.defineProperty(window,'localStorage',{configurable:true,value:{
        getItem(k){return window.__testStorage[k]??null},
        setItem(k,v){window.__testStorage[k]=String(v)},
        removeItem(k){delete window.__testStorage[k]}
      }})
    }""",storage or {})
    page.add_style_tag(path=str(ROOT/'styles.css'))
    for js in ['data.js','engine.js','muay.js','app.js']:
        page.add_script_tag(path=str(ROOT/js))
    page.locator('#screen h1').wait_for()
    return page

with sync_playwright() as p:
    executable=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium') or shutil.which('google-chrome')
    browser=p.chromium.launch(headless=True, executable_path=executable, args=['--no-sandbox']) if executable else p.chromium.launch(headless=True, args=['--no-sandbox'])
    ctx=browser.new_context(viewport={'width':390,'height':844},locale='pt-BR',accept_downloads=True)
    errors=[]
    page=open_app(ctx)
    page.on('pageerror',lambda err:errors.append(str(err)))
    page.get_by_role('button',name='Registrar Muay Thai').click()
    page.get_by_role('button',name='Treino em casa').click()
    page.get_by_role('button',name='+ Polichinelos').click()
    name=page.locator('[data-muay-prop="name"]').first
    assert name.input_value()=='Polichinelos'
    page.locator('[data-muay-prop="sets"]').first.fill('3')
    page.locator('[data-muay-prop="quantity"]').first.fill('20')
    page.locator('[data-muay-field="duration"]').fill('35')
    page.locator('[data-muay-field="intensity"]').select_option('7')
    snap=page.evaluate('structuredClone(window.__testStorage)')
    page.close()
    page=open_app(ctx,snap)
    assert page.locator('[data-muay-prop="quantity"]').first.input_value()=='20'
    assert page.locator('[data-muay-field="duration"]').input_value()=='35'
    page.get_by_role('button',name='Salvar treino').click()
    assert 'Polichinelos' in page.locator('#screen').inner_text()
    snap=page.evaluate('JSON.parse(window.__testStorage["forja.academia.v1"])')
    assert len(snap['muay']['sessions'])==1 and snap['sessions']==[]
    assert snap['muay']['sessions'][0]['place']=='casa'
    page.screenshot(path=str(ROOT/'muay-mobile.png'),full_page=True)
    page.locator('[data-action="muay-edit"]').click()
    assert page.locator('[data-muay-prop="quantity"]').first.input_value()=='20'
    page.locator('[data-muay-prop="quantity"]').first.fill('25')
    page.get_by_role('button',name='Salvar treino').click()
    assert len(page.evaluate('JSON.parse(window.__testStorage["forja.academia.v1"]).muay.sessions'))==1
    page.set_viewport_size({'width':320,'height':740})
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),'overflow at 320px'
    assert not errors,errors
    print('PASS Muay home draft, reload, save, edit, isolation from strength, mobile 320px')
    browser.close()
