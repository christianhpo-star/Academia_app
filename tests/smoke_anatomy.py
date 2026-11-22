"""Mobile regression: anatomy disclosure, accurate muscle labels and unchanged set logging.
Images are generated from original offline SVG; no network source or image permissions.
"""
import json,re,os,shutil
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
ORIGINAL=(ROOT/'index.html').read_text(encoding='utf-8')
SCRIPTS=re.findall(r'<script defer src="\./([^?"#]+)(?:\?[^"]*)?"></script>',ORIGINAL)
HTML=re.sub(r'<script defer src="\./[^"]+"></script>','',ORIGINAL)
KEY='forja.academia.v1'
def start(context,stored,errors):
    page=context.new_page()
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_content(HTML)
    page.evaluate("""seed=>{
      window.__testStorage={...seed};
      Object.defineProperty(window,'localStorage',{configurable:true,value:{
        getItem(k){return window.__testStorage[k]??null},
        setItem(k,v){window.__testStorage[k]=String(v)},
        removeItem(k){delete window.__testStorage[k]}
      }});
    }""",stored)
    page.add_style_tag(path=str(ROOT/'styles.css'))
    for file in SCRIPTS:page.add_script_tag(path=str(ROOT/file))
    page.wait_for_selector('#screen h1',timeout=12000)
    return page
with sync_playwright() as p:
    exe=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium') or shutil.which('google-chrome')
    opts={'headless':True,'args':['--no-sandbox']}
    if exe:opts['executable_path']=exe
    browser=p.chromium.launch(**opts)
    ctx=browser.new_context(viewport={'width':390,'height':844},device_scale_factor=1,locale='pt-BR')
    errors=[]
    page=start(ctx,{},errors)
    assert 'exercise-anatomy.js' in SCRIPTS
    page.get_by_role('button',name='Treinos',exact=True).click()
    page.get_by_role('button',name='Iniciar treino A').click()
    first=page.locator('[data-exercise="pulley-aberto"]')
    guide=first.locator('.ex-anatomy')
    assert guide.count()==1
    assert guide.get_attribute('open') is None
    assert guide.locator('.ex-anatomy-thumb svg[aria-hidden="true"]').count()==1
    before=page.evaluate('structuredClone(window.__testStorage)')
    guide.locator('summary').click()
    assert guide.get_attribute('open') is not None
    assert guide.locator('.ex-anatomy-expanded svg[role="img"]').count()==1
    assert 'Latíssimo do dorso' in guide.inner_text()
    assert 'Ilustração orientativa' in guide.inner_text()
    assert page.locator('[data-exercise="pulley-aberto"] .set-grid input[data-field="reps"]').count()>0
    assert page.evaluate('JSON.stringify(window.__testStorage)')==json.dumps(before,ensure_ascii=False,separators=(',',':')) or page.evaluate('window.__testStorage')==before
    page.locator('[data-exercise="pulley-aberto"] .ex-anatomy summary').click()
    assert guide.get_attribute('open') is None
    page.locator('[data-action="catalog-session-open"][data-mode="add"]').click()
    page.locator('#catalog-search').fill('voador inverso')
    view=page.locator('[data-action="catalog-view"][data-ex="voador-inverso"]')
    assert view.count()==1
    view.click()
    assert 'Deltoide posterior' in page.locator('.catalog-detail').inner_text()
    page.locator('[data-action="catalog-intent"]').click()
    page.locator('[data-action="catalog-confirm"]').click()
    reverse=page.locator('[data-exercise="voador-inverso"] .ex-anatomy')
    assert reverse.count()==1
    assert 'Deltoide posterior' in reverse.inner_text()
    reverse.locator('summary').click()
    assert reverse.get_attribute('open') is not None
    assert 'Trapézio médio e romboides' in reverse.inner_text()
    assert reverse.locator('svg[role="img"] title').count()==1
    assert reverse.locator('svg[role="img"] desc').count()==1
    assert page.locator('[data-exercise="voador-inverso"] .set-grid input').count()>0
    assert page.evaluate('JSON.parse(localStorage.getItem("forja.academia.draft.v1")).draft.entries["voador-inverso"]!==undefined')
    folder=ROOT/'screenshots';folder.mkdir(exist_ok=True)
    page.screenshot(path=str(folder/'anatomy-rear-fly-390.png'),full_page=True)
    page.set_viewport_size({'width':320,'height':780})
    assert page.evaluate("""() => {
      const x=document.querySelector('[data-exercise="voador-inverso"] .ex-anatomy').getBoundingClientRect();
      return x.width>220 && x.left>=-1 && x.right<=innerWidth+1;
    }""")
    page.screenshot(path=str(folder/'anatomy-rear-fly-320.png'),full_page=True)
    assert not errors,errors
    browser.close()
print('PASS anatomy: A/B illustrations, native disclosure, rear-delt specificity, no history write from toggling, mobile widths')
