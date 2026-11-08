"""Mobile UX regression: full block labels and hierarchical previous-set values."""
import os,re,shutil
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
HTML=re.sub(r'<script defer src="./[^"]+"></script>','',(ROOT/'index.html').read_text())
HTML=HTML.replace('<link rel="stylesheet" href="./styles.css?v=20261108-ux4-refresh1" />','')
SCRIPTS=['data.js','engine.js','muay.js','calendar.js','flex.js','dose.js','app.js']
def open_app(ctx, storage, errors, width):
    page=ctx.new_page()
    page.set_viewport_size({'width':width,'height':800})
    page.on('pageerror',lambda err:errors.append(str(err)))
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
    for js in SCRIPTS:page.add_script_tag(path=str(ROOT/js))
    page.locator('#screen h1').wait_for()
    return page
with sync_playwright() as p:
    chrome=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium') or shutil.which('google-chrome')
    kwargs={'headless':True,'args':['--no-sandbox']}
    if chrome:kwargs['executable_path']=chrome
    browser=p.chromium.launch(**kwargs)
    ctx=browser.new_context(locale='pt-BR')
    errors=[]
    shots=ROOT/'screenshots'
    shots.mkdir(exist_ok=True)
    page=open_app(ctx,{},errors,390)
    page.get_by_role('button',name='Treinos',exact=True).click()
    labels=['Costas','Quadríceps','Peito','Posteriores']
    for width in [320,390,768]:
        page.set_viewport_size({'width':width,'height':800})
        buttons=page.locator('.plan-block-selector .plan-block-choice')
        assert buttons.count()==4
        for index,label in enumerate(labels):
            button=buttons.nth(index)
            assert label in button.inner_text()
            assert button.is_visible()
            metrics=button.evaluate("""el=>{
              const e=el.getBoundingClientRect(),t=el.querySelector('.plan-choice-name').getBoundingClientRect();
              return {left:e.left,right:e.right,top:e.top,bottom:e.bottom,
                textLeft:t.left,textRight:t.right,textWidth:el.querySelector('.plan-choice-name').scrollWidth,
                textClientWidth:el.querySelector('.plan-choice-name').clientWidth}
            }""")
            assert metrics['left']>=0 and metrics['right']<=width+1,(width,label,metrics)
            assert metrics['textRight']<=metrics['right']+1,(width,label,metrics)
            assert metrics['textWidth']<=metrics['textClientWidth']+1,(width,label,metrics)
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),f'overflow {width}'
        if width in [320,390]:page.screenshot(path=str(shots/f'blocks-{width}.png'),full_page=True)
    page.set_viewport_size({'width':390,'height':800})
    page.locator('[data-action="select-plan"][data-plan="B"]').click()
    page.locator('[data-action="start"][data-plan="B"]').click()
    supino=page.locator('[data-exercise="supino-halteres"]')
    assert supino.locator('.set-history-empty').count()>=1
    for i in range(4):
        supino.locator('[data-field="reps"]').nth(i).fill('12')
        supino.locator('[data-field="rir"]').nth(i).fill('2')
    page.get_by_role('button',name='Salvar treino',exact=True).click()
    page.get_by_role('button',name='Treinos',exact=True).click()
    page.locator('[data-action="select-plan"][data-plan="B"]').click()
    page.locator('[data-action="start"][data-plan="B"]').click()
    supino=page.locator('[data-exercise="supino-halteres"]')
    cards=supino.locator('.previous-workout-reference')
    assert cards.count()>=4
    first=cards.first
    assert first.locator('.history-metric').count()==3
    assert '20' in first.locator('.history-metric').nth(0).inner_text()
    assert '12' in first.locator('.history-metric').nth(1).inner_text()
    assert '2' in first.locator('.history-metric').nth(2).inner_text()
    assert 'REFERÊNCIA ANTERIOR' in first.inner_text()
    assert supino.locator('.exercise-last-session').count()==1
    first_metrics=first.locator('.history-metric')
    for width in [320,390,768]:
        page.set_viewport_size({'width':width,'height':800})
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),f'overflow in workout {width}'
        for metric in first_metrics.all():
            assert metric.evaluate('e=>e.scrollWidth<=e.clientWidth+1'),f'clipped metric at {width}'
        if width in [320,390]:page.screenshot(path=str(shots/f'previous-series-{width}.png'),full_page=True)
    # Editing a new set recomputes feedback without erasing the reference.
    supino.locator('[data-field="reps"]').nth(0).fill('10')
    assert '20' in first.locator('.history-metric').nth(0).inner_text()
    assert not errors,errors
    print('PASS UX: block names 320/390/768, prior series metrics, no overflow, dynamic comparison')
    browser.close()
