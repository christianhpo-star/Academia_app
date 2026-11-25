"""FORJA mobile: hamburgão seen as a low-confidence snack with editable mass.

Synthetic storage only; verifies choosing an item does not auto-log a user meal.
"""
import json,os,shutil
from pathlib import Path
from playwright.sync_api import sync_playwright
from smoke_muscle_history import ROOT,KEY,open_app,snapshot

FOOD='recipe:hamburgao-assado-carne-presunto-2026'

with sync_playwright() as p:
    binary=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium') or shutil.which('google-chrome')
    opts={'headless':True,'args':['--no-sandbox']}
    if binary: opts['executable_path']=binary
    browser=p.chromium.launch(**opts)
    ctx=browser.new_context(viewport={'width':390,'height':844},locale='pt-BR',
        timezone_id='America/Sao_Paulo')
    errors=[]
    page=open_app(ctx,{},errors)
    page.locator('#nav [data-tab="nutrition"]').click()
    before=snapshot(page)
    assert json.loads(before[KEY])['nutrition']['entries']==[]
    page.locator('.nd-meal-top [data-nd="add"][data-meal="snack"]').click()
    assert page.locator('[data-nd="pick"][data-id="'+FOOD+'"]').count()==1
    assert page.locator('[data-nd="pick"][data-id="'+FOOD+'"] [data-food-icon="burger"]').count()==1
    assert len(json.loads(snapshot(page)[KEY])['nutrition']['entries'])==0
    page.locator('[data-nd="pick"][data-id="'+FOOD+'"]').click()
    assert page.locator('#nd-catalog select[name="portion"]').input_value()=='one'
    assert page.locator('#nd-catalog input[name="count"]').input_value()=='1'
    assert '594 kcal' in page.locator('#nd-food-preview').inner_text()
    assert 'estimativa' in page.locator('#nd-catalog').inner_text().lower()
    page.locator('#nd-catalog select[name="portion"]').select_option('half')
    assert '297 kcal' in page.locator('#nd-food-preview').inner_text()
    page.locator('#nd-catalog select[name="portion"]').select_option('custom')
    page.locator('#nd-catalog input[name="count"]').fill('121.5')
    assert '328,1 kcal' in page.locator('#nd-food-preview').inner_text()
    for width in [320,390,412]:
        page.set_viewport_size({'width':width,'height':844})
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),width
    page.set_viewport_size({'width':390,'height':844})
    page.locator('#nd-catalog select[name="portion"]').select_option('one')
    assert '594 kcal' in page.locator('#nd-food-preview').inner_text()
    shots=ROOT/'screenshots'
    shots.mkdir(exist_ok=True)
    page.screenshot(path=str(shots/'hamburgao-390.png'),full_page=True)
    page.locator('#nd-catalog button[type="submit"]').click()
    assert page.locator('#nd-items .nd-item').count()==1
    page.locator('.nd-save-sticky button[type="submit"]').click()
    stored=snapshot(page)
    state=json.loads(stored[KEY])
    assert len(state['nutrition']['entries'])==1
    meal=state['nutrition']['entries'][0]
    assert len(meal['items'])==1
    item=meal['items'][0]
    assert item['foodId']==FOOD
    assert item['grams']==220
    assert item['estimate']['central']['energyKcal']==594
    assert item['nutrientsPer100g']['energyKcal'] is None
    assert '594' in page.locator('#screen').inner_text()
    page.close()
    reloaded=open_app(ctx,stored,errors)
    again=json.loads(snapshot(reloaded)[KEY])
    assert again['nutrition']['entries']==state['nutrition']['entries']
    assert again['sessions']==state['sessions']
    assert again['weights']==state['weights']
    assert not errors,errors
    browser.close()
    print('PASS hamburgão: icon, low-confidence estimate, whole/half/custom grams, persisted snack, 320/390/412')
