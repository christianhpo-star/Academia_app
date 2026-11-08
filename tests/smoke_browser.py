"""Teste manual automatizado opcional: python tests/smoke_browser.py"""
from playwright.sync_api import sync_playwright
import os,re,shutil
from pathlib import Path

URL=os.environ.get('FORJA_URL','http://127.0.0.1:8765/')
with sync_playwright() as p:
    browser_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium') or shutil.which('google-chrome')
    kwargs={'headless':True,'args':['--no-sandbox']}
    if browser_path: kwargs['executable_path']=browser_path
    browser=p.chromium.launch(**kwargs)
    page=browser.new_page(viewport={'width':390,'height':844},device_scale_factor=1,locale='pt-BR')
    errors=[]
    page.on('pageerror', lambda error: errors.append(str(error)))
    # Navegacao local pode ser bloqueada no ambiente CI; injeta os assets diretamente.
    root=Path(__file__).resolve().parents[1]
    html=(root/'index.html').read_text()
    html=re.sub(r'<script defer src="\./[^"]+"></script>','',html)
    html=html.replace('<link rel="stylesheet" href="./styles.css?v=20261108-ux4-refresh1" />','')
    page.set_content(html)
    page.evaluate("Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem(){return null},setItem(){}}})")
    page.add_style_tag(path=str(root/'styles.css'))
    for js in ['data.js','engine.js','muay.js','calendar.js','flex.js','dose.js','focus.js','app.js']:
        page.add_script_tag(path=str(root/js))
    page.wait_for_selector('text=Evolua com método.')
    assert '82' in page.locator('#screen').inner_text()
    assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
    screenshots=root/'screenshots';screenshots.mkdir(exist_ok=True)
    page.screenshot(path=str(screenshots/'home.png'),full_page=True)
    page.get_by_role('button',name='Treinos',exact=True).click()
    page.locator('[data-action="select-plan"][data-plan="B"]').click()
    page.get_by_role('button',name='Iniciar treino B').click()
    page.wait_for_selector('text=Sessão em andamento')
    cards=page.locator('.exercise-card')
    assert cards.count()>=5
    first=page.locator('[data-exercise="supino-halteres"]')
    assert first.locator('[data-field="load"]').first.input_value()=='20'
    assert first.locator('[data-field="load"]').nth(1).input_value()=='22.5'
    assert 'não é histórico' in first.inner_text().lower()
    page.screenshot(path=str(screenshots/'treino.png'),full_page=True)
    for i in range(4):
        first.locator('[data-field="reps"]').nth(i).fill('12')
        first.locator('[data-field="rir"]').nth(i).fill('2')
    page.get_by_role('button',name='Salvar treino').click()
    assert 'Seu histórico' in page.locator('#screen').inner_text()
    page.get_by_role('button',name='Início',exact=True).click()
    assert '25 kg/halter' in page.locator('#screen').inner_text()
    page.get_by_role('button',name='Treinos',exact=True).click()
    page.get_by_role('button',name='Iniciar treino B').click()
    first=page.locator('[data-exercise="supino-halteres"]')
    for i in range(4):
        first.locator('[data-field="reps"]').nth(i).fill('12')
        first.locator('[data-field="rir"]').nth(i).fill('2')
    page.get_by_role('button',name='Salvar treino').click()
    page.get_by_role('button',name='Treinos',exact=True).click()
    page.get_by_role('button',name='Iniciar treino B').click()
    first=page.locator('[data-exercise="supino-halteres"]')
    assert 'Pode testar 27,5' in first.inner_text()
    first.get_by_role('button',name='Usar 27,5 kg/halter').click()
    assert first.locator('[data-field="load"]').nth(3).input_value()=='27.5'
    assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
    assert not errors,errors
    print('Smoke browser OK. Screenshots:',screenshots)
    browser.close()
