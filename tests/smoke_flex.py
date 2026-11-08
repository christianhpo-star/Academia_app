"""PWA mobile test: flexible workout, optional skip reason, catalogue, recovery and save."""
import os,re,shutil
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
HTML=re.sub(r'<script defer src="./[^"]+"></script>','',(ROOT/'index.html').read_text()).replace('<link rel="stylesheet" href="./styles.css?v=20261108-ui-cache-11" />','')
SCRIPTS=['data.js','engine.js','muay.js','calendar.js','flex.js','dose.js','app.js']
def open_app(context,data,errors):
    page=context.new_page()
    page.on('pageerror',lambda err:errors.append(str(err)))
    page.set_content(HTML)
    page.evaluate("""values=>{
      window.__testStorage={...values};
      Object.defineProperty(window,'localStorage',{configurable:true,value:{
        getItem(k){return window.__testStorage[k]??null},
        setItem(k,v){window.__testStorage[k]=String(v)},
        removeItem(k){delete window.__testStorage[k]}
      }});
    }""",data)
    page.add_style_tag(path=str(ROOT/'styles.css'))
    for script in SCRIPTS:page.add_script_tag(path=str(ROOT/script))
    page.locator('#screen h1').wait_for()
    return page
with sync_playwright() as p:
    executable=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium') or shutil.which('google-chrome')
    opts={'headless':True,'args':['--no-sandbox']}
    if executable:opts['executable_path']=executable
    browser=p.chromium.launch(**opts)
    context=browser.new_context(viewport={'width':390,'height':844},locale='pt-BR')
    errors=[]
    page=open_app(context,{},errors)
    page.get_by_role('button',name='Treinos',exact=True).click()
    page.get_by_role('button',name='Iniciar treino A').click()
    assert page.get_by_role('heading',name='Ajustar este treino').count()==1
    page.locator('[data-action="flex-withdraw"][data-ex="pulley-aberto"]').click()
    assert page.locator('[data-exercise="pulley-aberto"]').count()==0
    page.locator('[data-skip-reason="pulley-aberto"]').select_option('tempo')
    page.get_by_role('button',name='+ Adicionar exercício do catálogo').click()
    page.locator('#flex-catalog-search').fill('Puxada alta')
    assert page.locator('[data-flex-name]:visible').count()>0
    page.locator('[data-action="flex-add"][data-ex="puxada-neutra"]').click()
    target=page.locator('[data-exercise="puxada-neutra"]')
    assert target.count()==1
    target.locator('[data-field="load"]').first.fill('45')
    target.locator('[data-field="reps"]').first.fill('10')
    target.locator('[data-field="rir"]').first.fill('2')
    assert page.get_by_role('heading',name='Volume por grupo muscular').count()==1
    assert 'Costas' in page.locator('.dose-card').inner_text()
    assert 'Mantenha o volume' in page.locator('.dose-card').inner_text()

    snapshot=page.evaluate('structuredClone(window.__testStorage)')
    page.close()
    page=open_app(context,snapshot,errors)
    target=page.locator('[data-exercise="puxada-neutra"]')
    assert target.locator('[data-field="reps"]').first.input_value()=='10'
    assert page.locator('[data-exercise="pulley-aberto"]').count()==0
    assert page.locator('[data-skip-reason="pulley-aberto"]').input_value()=='tempo'
    assert page.locator('input[data-field="load"][data-ex="puxada-neutra"]').first.input_value()=='45'
    screenshot=ROOT/'screenshots';screenshot.mkdir(exist_ok=True)
    page.screenshot(path=str(screenshot/'flex-training-390.png'),full_page=True)
    page.set_viewport_size({'width':320,'height':740})
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),'overflow at 320'
    page.screenshot(path=str(screenshot/'flex-training-320.png'),full_page=True)
    page.get_by_role('button',name='Salvar treino',exact=True).click()
    stored=page.evaluate('JSON.parse(window.__testStorage["forja.academia.v1"])')
    assert len(stored['sessions'])==1
    saved=stored['sessions'][0]
    assert 'pulley-aberto' in saved['plannedIds']
    assert saved['skipped']==[{'id':'pulley-aberto','reason':'tempo'}]
    assert any(e['id']=='puxada-neutra' for e in saved['entries'])
    assert not any(e['id']=='pulley-aberto' for e in saved['entries'])
    assert next(e for e in stored['exercises'] if e['id']=='puxada-neutra')['active'] is False
    page.get_by_role('button',name='Evolução',exact=True).click()
    assert page.get_by_role('heading',name='Volume por grupo muscular').count()==1
    assert 'Costas' in page.locator('.dose-card').inner_text()

    assert not errors,errors
    print('PASS flexible workout: skip only today, optional reason, catalogue, reload, completed history and 320px')
    browser.close()
