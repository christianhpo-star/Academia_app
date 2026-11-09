"""Mobile QA: contextual catalog first, explicit full-list toggle, safety and persistence."""
import re,os,shutil
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
HTML=re.sub(r'<script defer src="./[^"]+"></script>','',(ROOT/'index.html').read_text())
HTML=HTML.replace('<link rel="stylesheet" href="./styles.css?v=20261108-ux4-refresh1" />','')
FILES=['data.js','engine.js','muay.js','calendar.js','flex.js','dose.js','focus.js','catalog-advice.js','app.js']
def start(context,stored,errors):
    page=context.new_page()
    page.on('pageerror',lambda error:errors.append(str(error)))
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
    for js in FILES:page.add_script_tag(path=str(ROOT/js))
    page.locator('#screen h1').wait_for()
    return page
with sync_playwright() as p:
    path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium') or shutil.which('google-chrome')
    opts={'headless':True,'args':['--no-sandbox']}
    if path:opts['executable_path']=path
    browser=p.chromium.launch(**opts)
    ctx=browser.new_context(viewport={'width':390,'height':844},locale='pt-BR')
    errors=[]
    page=start(ctx,{},errors)
    page.get_by_role('button',name='Treinos',exact=True).click()
    page.get_by_role('button',name='Iniciar treino A').click()
    page.get_by_role('button',name='+ Adicionar exercício do catálogo').click()
    assert page.get_by_role('heading',name='Sugestões para este treino').count()==1
    assert page.locator('.catalog-suggestion').count() in [1,2,3]
    assert page.locator('#flex-catalog-search').count()==0
    assert page.locator('.catalog-suggestion [data-action="flex-add"]').count()>0
    assert 'Histórico ainda limitado' in page.locator('.catalog-contextual').inner_text()
    shots=ROOT/'screenshots';shots.mkdir(exist_ok=True)
    page.screenshot(path=str(shots/'catalog-recommended-390.png'),full_page=True)
    page.get_by_role('button',name='Explorar todos os exercícios',exact=False).click()
    page.locator('#flex-catalog-search').fill('Puxada alta')
    assert page.locator('[data-flex-name]:visible').count()>0
    page.screenshot(path=str(shots/'catalog-full-390.png'),full_page=True)
    page.get_by_role('button',name='Ocultar catálogo completo').click()
    assert page.locator('.catalog-suggestion').count()>0
    assert page.locator('#flex-catalog-search').count()==0
    # Real user still chooses an exercise; no auto-added entries.
    before=page.evaluate('Object.keys(JSON.parse(window.__testStorage["forja.academia.draft.v1"]).draft.entries).length')
    choice=page.locator('.catalog-suggestion [data-action="flex-add"]').first
    candidate=choice.get_attribute('data-ex')
    choice.click()
    assert page.locator('[data-exercise="'+candidate+'"]').count()==1
    after=page.evaluate('Object.keys(JSON.parse(window.__testStorage["forja.academia.draft.v1"]).draft.entries).length')
    assert after==before+1
    assert page.locator('#flex-catalog-search').count()==0
    snapshot=page.evaluate('structuredClone(window.__testStorage)')
    page.close()
    page=start(ctx,snapshot,errors)
    assert page.locator('[data-exercise="'+candidate+'"]').count()==1
    # New session with knee concern: nothing should promote leg loading.
    state=page.evaluate('JSON.parse(window.__testStorage["forja.academia.v1"])')
    state['settings']['kneePain']=2
    snapshot['forja.academia.v1']=__import__('json').dumps(state,ensure_ascii=False)
    page.close()
    page=start(ctx,snapshot,errors)
    # Load existing A session and check that caution is visible.
    page.get_by_role('button',name='+ Adicionar exercício do catálogo').click()
    assert 'joelho' in page.locator('.catalog-caution').inner_text()
    for width in [320,390,768]:
        page.set_viewport_size({'width':width,'height':844})
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),f'overflow {width}'
        for card in page.locator('.catalog-suggestion').all():
            assert card.evaluate('e=>e.scrollWidth<=e.clientWidth+1'),f'clipping {width}'
        if width==320:page.screenshot(path=str(shots/'catalog-recommended-320.png'),full_page=True)
    assert not errors,errors
    print('PASS catalog: contextual first, 3 max, manual addition, full list search, recovery, 320/390/768, autosave')
    browser.close()
