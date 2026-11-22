"""Mobile regression: front/back anatomy, accessible controls and unchanged logging.
All browser data is synthetic; anatomy is rendered from the local SVG module.
"""
import os,re,shutil
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
ORIGINAL=(ROOT/'index.html').read_text(encoding='utf-8')
SCRIPTS=re.findall(r'<script defer src="\./([^?"#]+)(?:\?[^"]*)?"></script>',ORIGINAL)
HTML=re.sub(r'<script defer src="\./[^"]+"></script>','',ORIGINAL)
HTML=re.sub(r'<link rel="stylesheet" href="\./styles\.css\?v=[^"]+" />','',HTML)

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

def switch(viewer,view,keyboard=False):
    button=viewer.get_by_role('button',name='Frente' if view=='front' else 'Costas',exact=True)
    if keyboard:
        button.focus()
        button.press('Space')
    else:
        button.click()
    assert viewer.get_attribute('data-anatomy-view')==view
    assert button.get_attribute('aria-pressed')=='true'
    assert viewer.locator('button[aria-pressed="true"]').count()==1
    assert button.evaluate('(node)=>document.activeElement===node')
    svg=viewer.locator('.ex-anatomy-canvas svg')
    assert ('Vista anterior' if view=='front' else 'Vista posterior') in svg.locator('title').text_content()
    assert svg.evaluate("""node=>node.getAttribute('aria-labelledby').split(/\\s+/).every(
      id=>node.querySelector('[id="'+id+'"]'))""")
    return svg

def no_duplicate_svg_ids(page):
    assert page.evaluate("""()=>{
      const ids=Array.from(document.querySelectorAll('.ex-anatomy-svg [id]'),node=>node.id);
      return ids.length===new Set(ids).size;
    }""")

def mobile_bounds(page,viewer):
    assert viewer.evaluate("""node=>{
      const box=node.getBoundingClientRect();
      return box.width>200&&box.left>=-1&&box.right<=innerWidth+1&&node.scrollWidth<=box.width+1;
    }""")
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
    for button in viewer.get_by_role('button').all():
        box=button.bounding_box()
        assert box and box['height']>=44,box
        assert box['x']>=-1 and box['x']+box['width']<=page.viewport_size['width']+1,box

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
    before=page.evaluate('JSON.stringify(window.__testStorage)')
    guide.locator('summary').click()
    assert guide.get_attribute('open') is not None
    assert guide.locator('.ex-anatomy-expanded svg[role="img"]').count()==1
    assert 'Latíssimo do dorso' in guide.inner_text()
    assert 'Ilustração orientativa' in guide.inner_text()
    assert page.evaluate('JSON.stringify(window.__testStorage)')==before

    # A view switch must not remount the current set input or rewrite its draft.
    reps=first.locator('.set-grid input[data-field="reps"]').first
    reps.fill('11')
    reps.evaluate('(node)=>{window.__anatomySetInput=node;}')
    before=page.evaluate('JSON.stringify(window.__testStorage)')
    viewer=guide.locator('.ex-anatomy-viewer')
    assert viewer.get_attribute('data-anatomy-view')=='back'
    assert viewer.locator('.ex-anatomy-secondary [data-muscle="biceps"]').count()==0
    svg=switch(viewer,'front',keyboard=True)
    assert svg.locator('.ex-anatomy-secondary [data-muscle="biceps"]').count()>0
    assert svg.locator('.ex-anatomy-primary [data-muscle="lats"]').count()==0
    assert 'Latíssimo' in viewer.locator('.ex-anatomy-view-note').inner_text()
    switch(viewer,'back')
    assert reps.input_value()=='11'
    assert reps.evaluate('(node)=>node===window.__anatomySetInput')
    assert page.evaluate('JSON.stringify(window.__testStorage)')==before
    no_duplicate_svg_ids(page)
    guide.locator('summary').click()
    assert guide.get_attribute('open') is None

    # Add through the real catalog, then keep the selected view across re-renders.
    page.locator('[data-action="catalog-session-open"][data-mode="add"]').click()
    page.locator('#catalog-search').fill('voador inverso')
    page.locator('[data-action="catalog-view"][data-ex="voador-inverso"]').click()
    assert 'Deltoide posterior' in page.locator('.catalog-detail').inner_text()
    page.locator('[data-action="catalog-intent"]').click()
    page.locator('[data-action="catalog-confirm"]').click()
    reverse=page.locator('[data-exercise="voador-inverso"] .ex-anatomy')
    reverse.locator('summary').click()
    assert reverse.get_attribute('open') is not None
    assert 'Trapézio médio e romboides' in reverse.inner_text()
    viewer=reverse.locator('.ex-anatomy-viewer')
    assert viewer.get_attribute('data-anatomy-view')=='back'
    assert viewer.locator('.ex-anatomy-primary [data-muscle="rearDelts"]').count()>0
    before=page.evaluate('JSON.stringify(window.__testStorage)')
    svg=switch(viewer,'front')
    assert svg.locator('.ex-anatomy-primary path,.ex-anatomy-secondary path').count()==0
    assert 'Sem músculos destacados' in viewer.locator('.ex-anatomy-view-note').inner_text()
    assert page.evaluate('JSON.stringify(window.__testStorage)')==before
    page.get_by_role('button',name='Início',exact=True).click()
    page.get_by_role('button',name='Treinos',exact=True).click()
    viewer=page.locator('[data-exercise="voador-inverso"] .ex-anatomy-viewer')
    assert viewer.get_attribute('data-anatomy-view')=='front'
    switch(viewer,'back')
    no_duplicate_svg_ids(page)
    folder=ROOT/'screenshots';folder.mkdir(exist_ok=True)
    for width,height in [(390,844),(320,780)]:
        page.set_viewport_size({'width':width,'height':height})
        mobile_bounds(page,viewer)
        viewer.screenshot(path=str(folder/f'anatomy-rear-fly-{width}.png'))
    assert page.locator('[data-exercise="voador-inverso"] .set-grid input').count()>0
    assert page.evaluate('JSON.parse(localStorage.getItem("forja.academia.draft.v1")).draft.entries["voador-inverso"]!==undefined')

    # Independent consultation: the exact bench-press case from the user screenshot.
    consult=start(ctx,{},errors)
    consult.get_by_role('button',name='Treinos',exact=True).click()
    consult.locator('[data-action="training-destination"][data-to="catalog"]').click()
    consult.locator('#catalog-search').fill('supino reto com barra')
    consult.locator('[data-action="catalog-view"][data-ex="supino-barra"]').click()
    viewer=consult.locator('.catalog-detail .ex-anatomy-viewer')
    before=consult.evaluate('JSON.stringify(window.__testStorage)')
    assert viewer.get_attribute('data-anatomy-view')=='front'
    assert viewer.locator('.ex-anatomy-primary [data-muscle="chest"]').count()>0
    assert viewer.locator('.ex-anatomy-secondary [data-muscle="frontDelts"]').count()>0
    assert viewer.locator('.ex-anatomy-secondary [data-muscle="triceps"]').count()==0
    assert 'Tríceps' in viewer.locator('.ex-anatomy-view-note').inner_text()
    mobile_bounds(consult,viewer)
    viewer.screenshot(path=str(folder/'anatomy-supino-front-390.png'))
    svg=switch(viewer,'back')
    assert svg.locator('.ex-anatomy-primary path').count()==0
    assert svg.locator('.ex-anatomy-secondary [data-muscle="triceps"]').count()>0
    assert 'Peitoral maior' not in svg.locator('desc').text_content()
    assert 'Tríceps' in svg.locator('desc').text_content()
    viewer.screenshot(path=str(folder/'anatomy-supino-back-390.png'))
    assert consult.evaluate('JSON.stringify(window.__testStorage)')==before
    assert consult.evaluate('localStorage.getItem("forja.academia.draft.v1")') is None
    consult.set_viewport_size({'width':320,'height':780})
    consult.emulate_media(reduced_motion='reduce')
    switch(viewer,'front',keyboard=True)
    mobile_bounds(consult,viewer)
    assert viewer.locator('.ex-anatomy-canvas').evaluate('(node)=>node.getAnimations({subtree:true}).length===0')
    viewer.screenshot(path=str(folder/'anatomy-supino-front-320.png'))
    no_duplicate_svg_ids(consult)
    assert consult.evaluate('JSON.stringify(window.__testStorage)')==before
    assert not errors,errors
    browser.close()
print('PASS anatomy: front/back anatomy, labels, native controls, preserved input/focus/data, reduced motion and 320/390px')
