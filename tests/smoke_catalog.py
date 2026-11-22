"""Mobile QA: contextual catalog first, explicit full-list toggle, safety and persistence."""
import re,os,shutil
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
RAW=(ROOT/'index.html').read_text(encoding='utf-8')
FILES=re.findall(r'<script defer src="\\./([^?"#]+)(?:\\?[^"]*)?"></script>',RAW)
HTML=re.sub(r'<script defer src="\\./[^"]+"></script>','',RAW)
HTML=re.sub(r'<link rel="stylesheet" href="\\./styles\\.css\\?v=[^"]+" />','',HTML)
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
    assert page.locator('[data-action="training-destination"]').count()==2
    assert page.locator('[data-action="training-destination"][data-to="plans"]').get_attribute('aria-pressed')=='true'
    assert page.locator('.plan-editor-accordion').count()==1
    assert page.locator('.plan-editor-accordion').get_attribute('open') is None
    original=page.evaluate('JSON.stringify(window.__testStorage)')
    page.locator('[data-action="training-destination"][data-to="catalog"]').click()
    assert page.locator('[data-action="training-destination"][data-to="catalog"]').get_attribute('aria-pressed')=='true'
    assert page.locator('.plan-editor-accordion').count()==0
    assert page.evaluate('JSON.stringify(window.__testStorage)')==original
    assert page.locator('.catalog-browser-item').count()>=40
    # 390px and 320px mobile layouts must keep both destinations in viewport.
    screenshots=ROOT/'screenshots';screenshots.mkdir(exist_ok=True)
    page.screenshot(path=str(screenshots/'catalog-direct-390.png'),full_page=True)
    page.set_viewport_size({'width':320,'height':740})
    buttons=page.locator('.training-destinations [data-action="training-destination"]')
    assert buttons.count()==2
    for button in buttons.all():
        rect=button.bounding_box()
        assert rect and rect['height']>=44
        assert rect['x']>=0 and rect['x']+rect['width']<=321
    page.screenshot(path=str(screenshots/'catalog-direct-320.png'),full_page=True)
    page.set_viewport_size({'width':390,'height':844})
    assert page.locator('#catalog-search').count()==1
    assert page.locator('#catalog-count').count()==1
    assert page.locator('#nav [data-tab="plans"][aria-current="page"]').count()==1
    initial_count=page.locator('.catalog-browser-item').count()
    assert initial_count>=65  # new options supplement original, not overwrite
    # Rear-delt reverse fly is distinct from the existing chest peck deck.
    page.locator('#catalog-search').fill('voador inverso')
    rear=page.locator('.catalog-browser-item:visible')
    assert rear.count()==1
    assert 'Ombros posteriores' in rear.inner_text()
    assert rear.locator('[data-action="catalog-view"][data-ex="voador-inverso"]').count()==1
    original_store=page.evaluate('JSON.stringify(window.__testStorage)')
    rear.locator('[data-action="catalog-view"]').click()
    assert page.locator('#catalog-search').count()==0
    assert 'Voador inverso' in page.locator('#catalog-detail-heading').inner_text()
    assert 'Deltoide posterior' in page.locator('.catalog-detail-muscles').inner_text()
    assert 'Trapézio médio e romboides' in page.locator('.catalog-detail-muscles').inner_text()
    assert page.locator('.catalog-detail svg[role="img"]').count()==1
    assert page.locator('.catalog-detail-technique').count()==1
    assert page.evaluate('JSON.stringify(window.__testStorage)')==original_store
    page.locator('[data-action="catalog-back"]').click()
    assert page.locator('#catalog-search').input_value()=='voador inverso'
    assert page.locator('.catalog-browser-item:visible').count()==1
    assert page.evaluate('JSON.stringify(window.__testStorage)')==original_store
    page.locator('#catalog-search').fill('peck deck inverso')
    assert page.locator('.catalog-browser-item:visible').count()==1
    page.locator('#catalog-search').fill('crucifixo inverso na maquina')
    assert page.locator('.catalog-browser-item:visible').count()==1
    page.locator('#catalog-search').fill('voador')
    assert page.locator('.catalog-browser-item:visible').count()==2
    page.locator('#catalog-search').fill('hip thrust maquina')
    assert page.locator('.catalog-browser-item:visible').count()==1
    assert page.locator('.catalog-browser-item:visible').locator('h3').inner_text().startswith('Elevação pélvica na máquina')
    assert page.evaluate('localStorage.getItem("forja.academia.draft.v1")') is None
    page.locator('#catalog-search').fill('canadense')
    assert page.locator('.catalog-browser-item:visible').count()==1
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
    before_confirm=page.evaluate('JSON.stringify(window.__testStorage)')
    page.locator('[data-action="catalog-view"][data-ex="supino-canadense"]').click()
    assert page.locator('.catalog-detail').count()==1
    assert 'Peitoral maior' in page.locator('.catalog-detail-muscles').inner_text()
    assert page.evaluate('JSON.stringify(window.__testStorage)')==before_confirm
    page.locator('[data-action="catalog-intent"][data-ex="supino-canadense"]').click()
    assert 'bloco B' in page.locator('#catalog-confirm-message').inner_text()
    assert page.evaluate('JSON.stringify(window.__testStorage)')==before_confirm
    page.locator('[data-action="catalog-cancel"]').click()
    assert page.locator('[data-action="catalog-confirm"]').count()==0
    assert page.evaluate('JSON.stringify(window.__testStorage)')==before_confirm
    page.locator('[data-action="catalog-intent"][data-ex="supino-canadense"]').click()
    page.locator('[data-action="catalog-confirm"][data-ex="supino-canadense"]').click()
    assert 'Na minha ficha' in page.locator('.catalog-detail-intro').inner_text()
    assert page.locator('[data-action="catalog-edit-in-plan"]').count()==1
    assert page.evaluate('localStorage.getItem("forja.academia.draft.v1")') is None
    page.locator('[data-action="catalog-back"]').click()
    assert page.locator('.catalog-browser-item').filter(has_text='Supino canadense').locator('.catalog-state').inner_text()=='Na ficha'
    page.get_by_role('button',name='Treinos',exact=True).click()
    page.get_by_role('button',name='Iniciar treino A').click()
    assert page.locator('[data-action="training-destination"][data-to="plans"]').get_attribute('aria-pressed')=='true'
    page.locator('[data-exercise="pulley-aberto"] [data-field="load"]').first.fill('40')
    page.locator('[data-exercise="pulley-aberto"] [data-field="reps"]').first.fill('10')
    # Focusing away from the numeric input commits its change event. The draft
    # envelope's savedAt changes whenever autosave runs; compare user entries.
    page.locator('[data-action="training-destination"][data-to="plans"]').focus()
    snapshot=page.evaluate('JSON.parse(localStorage.getItem("forja.academia.draft.v1")).draft')
    assert snapshot
    page.locator('[data-action="training-destination"][data-to="catalog"]').click()
    assert page.locator('.training-draft-notice').count()==1
    assert 'Treino em andamento preservado' in page.locator('.training-draft-notice').inner_text()
    assert page.evaluate('JSON.parse(localStorage.getItem("forja.academia.draft.v1")).draft')==snapshot
    page.locator('.training-draft-notice [data-to="plans"]').click()
    assert page.locator('[data-exercise="pulley-aberto"] [data-field="load"]').first.input_value()=='40'
    assert page.locator('[data-exercise="pulley-aberto"] [data-field="reps"]').first.input_value()=='10'
    assert page.evaluate('JSON.parse(localStorage.getItem("forja.academia.draft.v1")).draft')==snapshot
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
