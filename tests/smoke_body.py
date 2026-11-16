"""Smoke UX9: body diagram, dated measures, history, safe migration and 320px layout."""
import json,os,re,shutil
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
HTML=re.sub(r'<script defer src="./[^"]+"></script>','',(ROOT/'index.html').read_text())
HTML=re.sub(r'<link rel="stylesheet" href="./styles.css\?v=[^"]+" />','',HTML)
SCRIPTS=['data.js','engine.js','muay.js','calendar.js','flex.js','dose.js','focus.js','catalog-advice.js','body-measures.js','activity.js','health-import.js','nutrition-goals.js','goal-planner.js','reminders.js','daily-routine.js','nutrition.js','nutrition-catalog.js','nutrition-balance.js','nutrition-ui.js','evolution-dashboard.js','app.js']
def launch(ctx,seed,errors):
    page=ctx.new_page()
    page.on('pageerror',lambda exc:errors.append(str(exc)))
    page.set_content(HTML)
    page.evaluate("""seed=>{
      window.__storage={...seed};
      Object.defineProperty(window,'localStorage',{configurable:true,value:{
        getItem(k){return window.__storage[k]??null},
        setItem(k,v){window.__storage[k]=String(v)},
        removeItem(k){delete window.__storage[k]}
      }});
    }""",seed)
    page.add_style_tag(path=str(ROOT/'styles.css'))
    for file in SCRIPTS:page.add_script_tag(path=str(ROOT/file))
    page.wait_for_selector('#screen h1')
    return page
with sync_playwright() as p:
    browser_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium') or shutil.which('google-chrome')
    opts={'headless':True,'args':['--no-sandbox']}
    if browser_path:opts['executable_path']=browser_path
    browser=p.chromium.launch(**opts)
    ctx=browser.new_context(viewport={'width':390,'height':844},locale='pt-BR')
    errors=[]
    page=launch(ctx,{},errors)
    page.get_by_role('button',name='Evolução',exact=True).click()
    page.locator('.evo-extras > summary').click()
    page.locator('[data-action="body-open"]').click()
    assert page.get_by_role('heading',name='Medidas corporais.').count()==1
    assert page.locator('.body-figure svg').count()==1
    assert page.locator('.body-measure-pin').count()==0
    # Save a purely synthetic record. Never commit real measurements to public tests.
    page.locator('#body-date').fill('2026-11-14')
    for field,value in {'neck':42,'chest':100,'abdomen':90,'hip':101,'armRight':34,'armLeft':35,
                        'thighRight':61,'thighLeft':62}.items():
        page.locator('#measure-'+field).fill(str(value))
    page.get_by_role('button',name='Salvar medidas').click()
    state=json.loads(page.evaluate('window.__storage["forja.academia.v1"]'))
    assert len(state['bodyMeasurements'])==1
    assert state['bodyMeasurements'][0]['values']['chest']==100
    assert page.locator('.body-measure-pin').count()==8
    assert '100 cm' in page.locator('.body-figure').inner_text()
    # A second recording has its own day and history comparison.
    page.locator('#body-date').fill('2026-11-21')
    page.locator('#measure-chest').fill('101')
    page.get_by_role('button',name='Salvar medidas').click()
    state=json.loads(page.evaluate('window.__storage["forja.academia.v1"]'))
    assert len(state['bodyMeasurements'])==2
    page.locator('[data-action="body-view"][data-view="history"]').click()
    assert page.locator('.body-history-entry').count()==2
    assert '+1 cm' in page.locator('.body-history-list').inner_text()
    page.locator('[data-action="body-edit"][data-date="2026-11-14"]').click()
    assert page.locator('#measure-chest').input_value()=='100'
    page.locator('#measure-chest').fill('99.5')
    page.get_by_role('button',name='Salvar medidas').click()
    state=json.loads(page.evaluate('window.__storage["forja.academia.v1"]'))
    assert len(state['bodyMeasurements'])==2
    assert next(x for x in state['bodyMeasurements'] if x['date']=='2026-11-14')['values']['chest']==99.5
    page.locator('[data-action="body-back"]').click()
    assert page.locator('.body-quick-card').count()==1
    # Duplicate-date backup must not overwrite the phone's entry; new dates are added.
    incoming=json.loads(page.evaluate('window.__storage["forja.academia.v1"]'))
    incoming['bodyMeasurements']=[
      {'id':'body-2026-11-14','date':'2026-11-14','values':{'chest':150}},
      {'id':'body-2026-10-25','date':'2026-10-25','values':{'chest':98}}]
    page.locator('.top-settings').click()
    page.once('dialog',lambda dlg:dlg.accept())
    page.locator('#import-file').set_input_files({
      'name':'synthetic-body-backup.json','mimeType':'application/json',
      'buffer':json.dumps(incoming).encode('utf-8')})
    page.wait_for_function('JSON.parse(window.__storage["forja.academia.v1"]).bodyMeasurements.length === 3',timeout=8000)
    merged=json.loads(page.evaluate('window.__storage["forja.academia.v1"]'))
    assert len(merged['bodyMeasurements'])==3
    assert next(x for x in merged['bodyMeasurements'] if x['date']=='2026-11-14')['values']['chest']==99.5
    page.locator('.top-settings').click()
    page.once('dialog',lambda dlg:dlg.accept())
    page.locator('#import-file').set_input_files({
      'name':'synthetic-body-backup.json','mimeType':'application/json',
      'buffer':json.dumps(incoming).encode('utf-8')})
    assert len(json.loads(page.evaluate('window.__storage["forja.academia.v1"]'))['bodyMeasurements'])==3
    page.set_viewport_size({'width':320,'height':700})
    page.get_by_role('button',name='Evolução',exact=True).click()
    page.locator('[data-action="body-open"]').click()
    assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
    out=ROOT/'screenshots';out.mkdir(exist_ok=True)
    page.screenshot(path=str(out/'body-320.png'),full_page=True)
    assert errors==[],errors
    browser.close()
    print('PASS body: illustration, 12-field editor, history, merging, idempotence and 320px')
