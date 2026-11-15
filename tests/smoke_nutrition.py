"""Synthetic mobile browser smoke for FORJA nutrition."""
import json,os,re,shutil
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
HTML=re.sub(r'<script defer src="./[^"]+"></script>','',(ROOT/'index.html').read_text(encoding='utf-8'))
HTML=re.sub(r'<link rel="stylesheet" href="./styles.css\?v=[^"]+" />','',HTML)
SCRIPTS=['data.js','engine.js','muay.js','calendar.js','flex.js','dose.js','focus.js','catalog-advice.js','body-measures.js','nutrition.js','nutrition-catalog.js','nutrition-ui.js','app.js']

def start(context,stored,errors):
    page=context.new_page()
    page.on('pageerror',lambda error:errors.append(str(error)))
    page.set_content(HTML)
    page.evaluate("""seed => {
      window.__testStorage={...seed};
      Object.defineProperty(window,'localStorage',{configurable:true,value:{
        getItem(k){return window.__testStorage[k]??null},
        setItem(k,v){window.__testStorage[k]=String(v)},
        removeItem(k){delete window.__testStorage[k]}
      }});
    }""",stored)
    page.add_style_tag(path=str(ROOT/'styles.css'))
    for script in SCRIPTS:page.add_script_tag(path=str(ROOT/script))
    page.wait_for_selector('#screen h1',timeout=10000)
    return page

with sync_playwright() as p:
    chrome=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium') or shutil.which('google-chrome')
    opts={'headless':True,'args':['--no-sandbox']}
    if chrome:opts['executable_path']=chrome
    browser=p.chromium.launch(**opts)
    context=browser.new_context(viewport={'width':390,'height':844},locale='pt-BR')
    errors=[]
    page=start(context,{},errors)
    assert 'Seu próximo passo.' in page.locator('h1').inner_text()
    page.locator('[data-action="nutrition-open"]').first.click()
    assert page.locator('h1').inner_text()=='Alimentação.'
    assert page.locator('#nutrition-form').count()==1
    assert 'Ainda não há refeições registradas' in page.locator('#screen').inner_text()
    page.locator('#meal-name').fill('Exemplo sintético de almoço')
    page.locator('#meal-quantity').fill('2')
    page.locator('#meal-unit').select_option('portion')
    page.locator('#nutrition-form button[type="submit"]').click()
    saved=json.loads(page.evaluate("window.__testStorage['forja.academia.v1']"))
    assert len(saved['nutrition']['entries'])==1
    entry=saved['nutrition']['entries'][0]
    assert entry['items'][0]['nutrientsPer100g']['energyKcal'] is None
    assert entry['items'][0]['source'] is None
    assert len(saved['sessions'])==0
    page.locator('.nutrition-entry summary').first.click()
    page.locator('[data-action="nutrition-repeat"]').first.click()
    repeated=json.loads(page.evaluate("window.__testStorage['forja.academia.v1']"))
    assert len(repeated['nutrition']['entries'])==2
    assert len({v['id'] for v in repeated['nutrition']['entries']})==2
    page.locator('.nutrition-entry summary').first.click()
    page.locator('[data-action="nutrition-edit"]').first.click()
    page.locator('#meal-name').fill('Exemplo editado')
    page.locator('#nutrition-form button[type="submit"]').click()
    modified=json.loads(page.evaluate("window.__testStorage['forja.academia.v1']"))
    assert len(modified['nutrition']['entries'])==2
    assert 'Exemplo editado' in str(modified['nutrition']['entries'])
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    page.set_viewport_size({'width':320,'height':700})
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    storage=page.evaluate('structuredClone(window.__testStorage)')
    page.close()
    restored=start(context,storage,errors)
    restored.locator('[data-action="nutrition-open"]').first.click()
    assert restored.locator('.nutrition-entry').count()==2
    restored.locator('.nutrition-entry summary').first.click()
    restored.once('dialog',lambda dialog:dialog.accept())
    restored.locator('[data-action="nutrition-delete"]').first.click()
    final=json.loads(restored.evaluate("window.__testStorage['forja.academia.v1']"))
    assert len(final['nutrition']['entries'])==1
    # Packaged labels are captured per serving. 250 ml is not treated as 250 g.
    restored.locator('[data-action="nutrition-pick"][data-food="photo:itambe-zero-morango-200g"]').click()
    restored.locator('#nutrition-catalog-form button[type="submit"]').click()
    with_yogurt=json.loads(restored.evaluate("window.__testStorage['forja.academia.v1']"))
    y=next(row for row in with_yogurt['nutrition']['entries'] if row['items'][0]['foodId']=='photo:itambe-zero-morango-200g')
    assert y['items'][0]['nutrientsPerServing']['energyKcal']==52
    restored.locator('[data-action="nutrition-pick"][data-food="photo:piracanjuba-proforce-banoffee-250ml"]').click()
    restored.locator('#nutrition-catalog-form button[type="submit"]').click()
    with_drink=json.loads(restored.evaluate("window.__testStorage['forja.academia.v1']"))
    drink=next(row for row in with_drink['nutrition']['entries'] if row['items'][0]['foodId']=='photo:piracanjuba-proforce-banoffee-250ml')
    assert drink['items'][0]['grams'] is None
    assert drink['items'][0]['nutrientsPerServing']['proteinG']==23
    card=restored.locator('.nutrition-entry').filter(has=restored.locator('[data-action="nutrition-save-favorite"][data-id="'+drink['id']+'"]'))
    card.locator('summary').click()
    card.locator('[data-action="nutrition-save-favorite"]').click()
    fav_state=json.loads(restored.evaluate("window.__testStorage['forja.academia.v1']"))
    assert len(fav_state['nutrition']['mealTemplates'])==1
    restored.locator('[data-action="nutrition-use-favorite"]').first.click()
    repeated=json.loads(restored.evaluate("window.__testStorage['forja.academia.v1']"))
    assert len(repeated['nutrition']['entries'])==4
    assert sum(row['items'][0]['nutrientsPerServing']['proteinG']==23 for row in repeated['nutrition']['entries'] if row['items'][0].get('nutrientsPerServing'))==2
    assert restored.evaluate('document.documentElement.scrollWidth<=innerWidth')

    # Doce Cascão — estimates remain approximate, independent of packaged facts.
    restored.locator('[data-action="nutrition-pick"][data-food="local:doce-cascao-acai-trufado-branco-500ml"]').click()
    assert 'Faixa aproximada' in restored.locator('#nutrition-catalog-form').inner_text()
    restored.locator('#nutrition-portion').select_option('half')
    restored.locator('#nutrition-catalog-form button[type="submit"]').click()
    archive_half=json.loads(restored.evaluate("window.__testStorage['forja.academia.v1']"))
    half=next(row for row in archive_half['nutrition']['entries'] if row['items'][0]['foodId']=='local:doce-cascao-acai-trufado-branco-500ml')
    assert half['items'][0]['estimate']['central']['energyKcal']==407.2
    assert half['items'][0]['nutrientsPer100g']['energyKcal'] is None
    assert half['items'][0]['grams'] is None
    assert 'confiança baixa' in restored.locator('#screen').inner_text()
    restored.locator('[data-action="nutrition-pick"][data-food="local:doce-cascao-acai-trufado-preto-500ml"]').click()
    restored.locator('#nutrition-catalog-form button[type="submit"]').click()
    archive_whole=json.loads(restored.evaluate("window.__testStorage['forja.academia.v1']"))
    preto=next(row for row in archive_whole['nutrition']['entries'] if row['items'][0]['foodId']=='local:doce-cascao-acai-trufado-preto-500ml')
    assert preto['items'][0]['estimate']['central']['energyKcal']==1003.4
    assert all(row['items'][0]['foodId'] not in ('local:doce-cascao-adicional-avela','local:doce-cascao-adicional-ninho') for row in archive_whole['nutrition']['entries'])
    card=restored.locator('.nutrition-entry').filter(has=restored.locator('[data-action="nutrition-save-favorite"][data-id="'+preto['id']+'"]'))
    card.locator('summary').click()
    card.locator('[data-action="nutrition-save-favorite"]').click()
    restored.locator('[data-action="nutrition-use-favorite"]').first.click()
    saved=json.loads(restored.evaluate("window.__testStorage['forja.academia.v1']"))
    assert sum(row['items'][0].get('estimate',{}).get('central',{}).get('energyKcal',0)==1003.4 for row in saved['nutrition']['entries'])==2
    assert restored.evaluate('document.documentElement.scrollWidth <= innerWidth')

    assert errors==[],errors
    context.close();browser.close()
    print('PASS nutrition: quick log, repeat, edit, delete, reload, 320/390px and no invented macros')
