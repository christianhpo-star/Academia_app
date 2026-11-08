"""Focused workout and quick-load mobile acceptance checks."""
import re,os,shutil
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
HTML=re.sub(r'<script defer src="./[^"]+"></script>','',(ROOT/'index.html').read_text()).replace('<link rel="stylesheet" href="./styles.css?v=20261108-ux4-refresh1" />','')
FILES=['data.js','engine.js','muay.js','calendar.js','flex.js','dose.js','focus.js','app.js']
def app(ctx,storage,errors):
    page=ctx.new_page()
    page.on('pageerror',lambda error:errors.append(str(error)))
    page.set_content(HTML)
    page.evaluate("""seed=>{
      window.__testStorage={...seed};
      Object.defineProperty(window,'localStorage',{configurable:true,value:{
        getItem(k){return window.__testStorage[k]??null},
        setItem(k,v){window.__testStorage[k]=String(v)},
        removeItem(k){delete window.__testStorage[k]}
      }});
    }""",storage)
    page.add_style_tag(path=str(ROOT/'styles.css'))
    for file in FILES:page.add_script_tag(path=str(ROOT/file))
    page.locator('#screen h1').wait_for()
    return page
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,args=['--no-sandbox'])
    ctx=browser.new_context(viewport={'width':390,'height':844},locale='pt-BR')
    errors=[]
    page=app(ctx,{},errors)
    page.get_by_role('button',name='Treinos',exact=True).click()
    page.locator('[data-action="start"][data-plan="A"]').click()
    total=page.locator('.exercise-card').count()
    assert total>=3,total
    assert page.get_by_role('button',name='Ativar modo focado').count()==1
    page.get_by_role('button',name='Ativar modo focado').click()
    assert page.locator('.exercise-card').count()==1
    assert page.locator('.focus-exercise-pill').count()==total
    first=page.locator('.exercise-card').get_attribute('data-exercise')
    page.locator('[data-action="focus-next"]').click()
    assert page.locator('.exercise-card').count()==1
    assert page.locator('.exercise-card').get_attribute('data-exercise')!=first
    page.locator('[data-action="focus-select"][data-ex="'+first+'"]').click()
    entry=page.locator('[data-exercise="'+first+'"]')
    # Fill first working set. Quick copy must prepare only load for remaining rows.
    entry.locator('[data-field="load"]').first.fill('55')
    entry.locator('[data-field="reps"]').first.fill('10')
    entry.locator('[data-field="rir"]').first.fill('2')
    assert '1 série efetiva registrada' in page.locator('.focus-progress-label').inner_text()
    entry.locator('[data-action="quick-current"]').click()
    entry=page.locator('[data-exercise="'+first+'"]')
    assert entry.locator('[data-field="load"]').nth(1).input_value()=='55'
    assert entry.locator('[data-field="reps"]').nth(1).input_value()==''
    assert entry.locator('[data-field="rir"]').nth(1).input_value()==''
    assert '1 série efetiva registrada' in page.locator('.focus-progress-label').inner_text()
    data=page.evaluate('JSON.parse(window.__testStorage["forja.academia.draft.v1"]).draft')
    assert data['entries'][first]['sets'][1]['reps']==''
    page.get_by_role('button',name='Ver ficha completa').click()
    assert page.locator('.exercise-card').count()==total
    page.get_by_role('button',name='Ativar modo focado').click()
    shots=ROOT/'screenshots';shots.mkdir(exist_ok=True)
    for width in [320,390,768]:
        page.set_viewport_size({'width':width,'height':844})
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),f'overflow {width}'
        if width in [320,390]:page.screenshot(path=str(shots/f'focus-{width}.png'),full_page=True)
    snapshot=page.evaluate('structuredClone(window.__testStorage)')
    page.close()
    page=app(ctx,snapshot,errors)
    assert page.locator('.exercise-card').count()==total # default full mode on new session
    assert page.locator('[data-exercise="'+first+'"] [data-field="reps"]').nth(0).input_value()=='10'
    assert page.locator('[data-exercise="'+first+'"] [data-field="reps"]').nth(1).input_value()==''
    page.get_by_role('button',name='Salvar treino',exact=True).click()
    state=page.evaluate('JSON.parse(window.__testStorage["forja.academia.v1"])')
    assert len(state['sessions'])==1
    saved=next(x for x in state['sessions'][0]['entries'] if x['id']==first)
    assert len(saved['sets'])==1, saved
    assert not errors,errors
    print('PASS focus: single exercise, switches, quick load without invented reps, recovery and history, 320/390/768px')
    browser.close()
