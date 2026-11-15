"""FORJA UX15 smoke: goal types, deadline warnings, no automatic nutrition targets."""
import json,os,re,shutil
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
HTML=re.sub(r'<script defer src="./[^"]+"></script>','',(ROOT/'index.html').read_text(encoding='utf-8'))
HTML=re.sub(r'<link rel="stylesheet" href="./styles.css\?v=[^"]+" />','',HTML)
SCRIPTS=['data.js','engine.js','muay.js','calendar.js','flex.js','dose.js','focus.js',
 'catalog-advice.js','body-measures.js','activity.js','health-import.js','nutrition-goals.js',
 'goal-planner.js','nutrition.js','nutrition-catalog.js','nutrition-ui.js','app.js']
with sync_playwright() as p:
    browser_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium') or shutil.which('google-chrome')
    opts={'headless':True,'args':['--no-sandbox']}
    if browser_path:opts['executable_path']=browser_path
    browser=p.chromium.launch(**opts)
    ctx=browser.new_context(viewport={'width':390,'height':844},locale='pt-BR')
    page=ctx.new_page()
    errors=[]
    page.on('pageerror',lambda exc:errors.append(str(exc)))
    page.set_content(HTML)
    page.evaluate("""() => {
      window.__storage={};
      Object.defineProperty(window,'localStorage',{configurable:true,value:{
        getItem(k){return window.__storage[k]??null;},
        setItem(k,v){window.__storage[k]=String(v);},
        removeItem(k){delete window.__storage[k];}
      }});
    }""")
    page.add_style_tag(path=str(ROOT/'styles.css'))
    for script in SCRIPTS:page.add_script_tag(path=str(ROOT/script))
    page.wait_for_selector('#screen h1')
    page.locator('.top-settings').click()
    assert page.locator('#goal-mode').count()==1
    assert page.locator('#goal-mode option').count()==5
    page.locator('#goal-mode').select_option('muscle_gain')
    page.locator('#initial-weight').fill('79.5')
    page.locator('#target-weight').fill('83')
    page.locator('#goal-date').fill('2027-02-01')
    page.locator('#goal-form button[type="submit"]').click()
    saved=json.loads(page.evaluate("localStorage.getItem('forja.academia.v1')"))
    assert saved['settings']['goalMode']=='muscle_gain'
    assert saved['nutrition']['settings'].get('targets',[])==[]
    page.locator('#nav [data-tab="progress"]').click()
    assert page.locator('.goal-plan-card').count()==1
    assert 'Ganhar massa muscular' in page.locator('.goal-plan-card').inner_text()
    assert 'Treinos:' in page.locator('.goal-plan-card').inner_text()
    page.locator('[data-action="goal-open"]').click()
    assert page.locator('#goal-mode').input_value()=='muscle_gain'
    page.locator('#goal-mode').select_option('weight')
    page.locator('#target-weight').fill('72')
    page.locator('#goal-date').fill('2026-11-22')
    page.locator('#goal-form button[type="submit"]').click()
    assert json.loads(page.evaluate("localStorage.getItem('forja.academia.v1')"))['settings']['goalMode']=='weight'
    page.locator('#nav [data-tab="progress"]').click()
    assert 'Plano por objetivo' in page.locator('.goal-plan-card').inner_text()
    assert 'Rever prazo' in page.locator('.goal-plan-card').inner_text() or 'Prazo encerrado' in page.locator('.goal-plan-card').inner_text()
    assert page.evaluate('document.documentElement.scrollWidth<=window.innerWidth')
    assert not errors,errors
    print('PASS UX15 goal planning mobile: five modes, weight gain, tight deadline and preservation')
    browser.close()
