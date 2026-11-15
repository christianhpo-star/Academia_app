"""Mobile QA: contextual catalog first, explicit full-list toggle, safety and persistence."""
import re,os,shutil
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
HTML=re.sub(r'<script defer src="./[^"]+"></script>','',(ROOT/'index.html').read_text())
HTML=HTML.replace('<link rel="stylesheet" href="./styles.css?v=20261115-diary1" />','')
FILES=['data.js','engine.js','muay.js','calendar.js','flex.js','dose.js','focus.js','catalog-advice.js','body-measures.js','activity.js','health-import.js','nutrition-goals.js','goal-planner.js','nutrition.js','nutrition-catalog.js','nutrition-ui.js','exercise-motion.js','app.js']
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
    # Catálogo global existe fora do treino, com todos os grupos.
    page.get_by_role('button',name='Treinos',exact=True).click()
    page.get_by_role('button',name='Catálogo de exercícios',exact=True).click()
    assert page.locator('.catalog-browser-item').count()>=40
    # Movement illustrations are static in lists and animate only on demand.
    first=page.locator('.catalog-browser-item').first
    assert first.locator('.motion-thumb .motion-svg').count()==1
    assert first.locator('svg animate').count()==0
    first.locator('[data-action="motion-open"]').click()
    assert page.locator('#motion-dialog').is_visible()
    assert page.locator('#motion-dialog svg animate').count()>0
    page.locator('#motion-dialog [data-action="motion-pause"]').click()
    assert page.locator('#motion-dialog [aria-pressed="true"]').count()==1
    page.locator('#motion-dialog [data-action="motion-close"]').click()
    assert not page.locator('#motion-dialog').is_visible()
    assert page.evaluate('localStorage.getItem("forja.academia.draft.v1")') is None
    assert page.locator('#catalog-search').count()==1
    assert page.locator('#catalog-count').count()==1
    assert page.locator('#nav [data-tab="plans"][aria-current="page"]').count()==1
    initial_count=page.locator('.catalog-browser-item').count()
    page.locator('#catalog-search').fill('canadense')
    assert page.locator('.catalog-browser-item:visible').count()==1
    # Variant preview describes a decline bench, not a generic horizontal one.
    before_motion=page.evaluate('localStorage.getItem("forja.academia.draft.v1")')
    page.locator('[data-action="motion-open"][data-ex="supino-canadense"]').click()
    assert page.locator('#motion-dialog').is_visible()
    assert page.locator('#motion-dialog .motion-variant-chip').inner_text()=='Banco declinado · barra'
    assert page.locator('#motion-dialog svg').get_attribute('data-motion-id')=='supino-canadense'
    assert page.locator('#motion-dialog svg animate').count()>0
    assert page.locator('#motion-dialog .m-joint-active').count()>0
    assert page.locator('#motion-dialog .m-motion-track').count()>0
    page.locator('#motion-dialog [data-action="motion-phase"][data-phase="end"]').click()
    assert page.locator('#motion-dialog [data-action="motion-phase"][data-phase="end"]').get_attribute('aria-pressed')=='true'
    assert page.locator('#motion-dialog [data-action="motion-pause"]').inner_text()=='Retomar animação'
    assert page.evaluate('document.querySelector("#motion-dialog .motion-svg").animationsPaused()')
    page.locator('#motion-dialog [data-action="motion-pause"]').click()
    assert not page.evaluate('document.querySelector("#motion-dialog .motion-svg").animationsPaused()')
    assert page.locator('#motion-dialog [data-action="motion-pause"]').inner_text()=='Pausar animação'
    page.locator('#motion-dialog [data-action="motion-close"]').click()
    assert not page.locator('#motion-dialog').is_visible()
    assert page.evaluate('localStorage.getItem("forja.academia.draft.v1")')==before_motion
    page.emulate_media(reduced_motion="reduce")
    page.locator('[data-action="motion-open"][data-ex="supino-canadense"]').click()
    assert page.locator('#motion-dialog .motion-static-pair .motion-svg').count()==2
    assert page.locator('#motion-dialog svg animate').count()==0
    assert page.locator('#motion-dialog .motion-static-pair figcaption').all_text_contents()==['Início','Fim']
    assert page.locator('#motion-dialog [data-action="motion-pause"]').count()==0
    page.locator('#motion-dialog [data-action="motion-close"]').click()
    page.emulate_media(reduced_motion="no-preference")
    assert 'canadense' in page.locator('.catalog-browser-item:visible').inner_text().lower()
    page.locator('#catalog-search').fill('nao-existe-exercicio')
    assert page.locator('.catalog-browser-item:visible').count()==0
    assert page.locator('#catalog-empty-state:visible').count()==1
    page.locator('#catalog-search').fill('canadense')
    page.locator('[data-action="catalog-filter"][data-group="A"]').click()
    assert page.locator('.catalog-browser-item:visible').count()==0
    assert page.locator('#catalog-empty-state:visible').count()==1
    page.locator('[data-action="catalog-filter"][data-group="B"]').click()
    assert page.locator('.catalog-browser-item:visible').count()==1
    page.locator('#catalog-search').fill('')
    page.locator('[data-action="catalog-filter"][data-group="B"]').click()
    assert page.locator('.catalog-browser-item').count()<initial_count
    assert page.locator('.catalog-browser-item').count()>0
    assert page.locator('#catalog-count').inner_text().startswith(str(page.locator('.catalog-browser-item').count()))
    # Explorar não inicia nem altera sessão.
    assert page.evaluate('localStorage.getItem("forja.academia.draft.v1")') is None
    page.locator('[data-action="catalog-filter"][data-group="all"]').click()
    page.locator('[data-action="catalog-add-plan"][data-ex="supino-canadense"]').click()
    assert page.locator('[data-action="catalog-activate"][data-ex="supino-canadense"]').count()==0
    assert page.locator('.catalog-browser-item').filter(has_text='Supino canadense').locator('.catalog-state').inner_text()=='Na ficha'
    assert page.evaluate('localStorage.getItem("forja.academia.draft.v1")') is None
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
    import json
    draft=json.loads(snapshot['forja.academia.draft.v1'])
    first_id=next(iter(draft['draft']['entries']))
    draft['draft']['entries'][first_id]['pain']=2
    snapshot['forja.academia.draft.v1']=json.dumps(draft,ensure_ascii=False)
    page.close()
    page=start(ctx,snapshot,errors)
    # Recover the existing A session with a recorded discomfort signal.
    page.get_by_role('button',name='+ Adicionar exercício do catálogo').click()
    assert 'joelho' in page.locator('.catalog-caution').inner_text()
    for width in [320,390,768]:
        page.set_viewport_size({'width':width,'height':844})
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),f'overflow {width}'
        for card in page.locator('.catalog-suggestion').all():
            assert card.evaluate('e=>e.scrollWidth<=e.clientWidth+1'),f'clipping {width}'
        if width==320:page.screenshot(path=str(shots/'catalog-recommended-320.png'),full_page=True)
    import json
    # Exercício disponível na ficha B, buscável e persistente sem criar treino realizado.
    page.close()
    page=start(ctx,{},errors)
    page.get_by_role('button',name='Treinos',exact=True).click()
    page.locator('[data-action="select-plan"][data-plan="B"]').click()
    page.locator('[data-action="start"][data-plan="B"]').click()
    assert page.locator('[data-exercise="supino-canadense"]').count()==0
    page.get_by_role('button',name='+ Adicionar exercício do catálogo').click()
    # A lista automática é limitada às três melhores opções; a alternativa fica no catálogo completo.
    page.get_by_role('button',name='Explorar todos os exercícios',exact=False).click()
    page.locator('#flex-catalog-search').fill('canadense')
    choice=page.locator('.catalog-all [data-action="flex-add"][data-ex="supino-canadense"]')
    assert choice.count()==1
    choice.click()
    assert page.locator('[data-exercise="supino-canadense"]').count()==1
    snapshot=page.evaluate('structuredClone(window.__testStorage)')
    exercise=next(ex for ex in json.loads(snapshot['forja.academia.v1'])['exercises'] if ex['id']=='supino-canadense')
    assert exercise['active'] is False
    assert json.loads(snapshot['forja.academia.v1'])['sessions']==[]
    page.close()
    page=start(ctx,snapshot,errors)
    assert page.locator('[data-exercise="supino-canadense"]').count()==1
    assert not errors,errors
    print('PASS catalog: contextual first, 3 max, manual addition, full list search, recovery, 320/390/768, autosave')
    browser.close()
