"""FORJA mobile free workout after Muay: catalog, real bodyweight sets, recovery and map."""
import json
import os
import re
import shutil
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
HTML=re.sub(r'<script defer src="./[^"]+"></script>','',(ROOT/'index.html').read_text())

def open_app(ctx,storage=None):
    page=ctx.new_page()
    page.set_content(HTML)
    page.evaluate("""seed=>{
      window.__testStorage={...seed};
      Object.defineProperty(window,'localStorage',{configurable:true,value:{
        getItem(k){return window.__testStorage[k]??null},
        setItem(k,v){window.__testStorage[k]=String(v)},
        removeItem(k){delete window.__testStorage[k]}
      }});
    }""",storage or {})
    page.add_style_tag(path=str(ROOT/'styles.css'))
    for js in ['data.js','cardio.js','training-sets.js','engine.js','muay.js','calendar.js',
        'flex.js','free-workout.js','catalog-session.js','dose.js','focus.js','catalog-advice.js',
        'body-measures.js','activity.js','health-import.js','nutrition-goals.js','goal-planner.js',
        'reminders.js','daily-routine.js','nutrition.js','nutrition-catalog.js','nutrition-balance.js',
        'nutrition-ui.js','evolution-dashboard.js','performance-trends.js','exercise-anatomy.js',
        'muscle-history.js','muscle-body.js','muscle-map.js','training-balance.js',
        'catalog-recommendations.js','share-summary.js','share-sticker.js','app.js']:
        page.add_script_tag(path=str(ROOT/js))
    page.locator('#screen h1').wait_for()
    return page

with sync_playwright() as p:
    executable=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium') or shutil.which('google-chrome')
    browser=p.chromium.launch(headless=True,executable_path=executable,args=['--no-sandbox']) if executable else p.chromium.launch(headless=True,args=['--no-sandbox'])
    context=browser.new_context(viewport={'width':390,'height':844},locale='pt-BR',accept_downloads=True)
    errors=[]
    page=open_app(context)
    page.on('pageerror',lambda err:errors.append(str(err)))
    # Save a single Muay academy block using the new fast editor.
    page.get_by_role('button',name='Registrar Muay Thai').click()
    page.get_by_role('button',name='Aula na academia').click()
    page.locator('[data-action="muay-quick-add"]').click()
    page.get_by_role('button',name='Salvar treino',exact=True).click()
    assert page.locator('.history-entry.muay-record').count()==1
    assert page.locator('.free-after-muay [data-action="free-start"]').count()==1

    page.locator('.free-after-muay [data-action="free-start"]').click()
    assert page.get_by_role('heading',name='Treino livre').count()==1
    assert 'Após Muay Thai' in page.locator('.free-workout-linked').inner_text()
    assert page.locator('#free-count').inner_text().startswith('0 exercícios')
    assert page.locator('#free-exercise-results [data-ex="abdominal-solo"]').count()==1
    page.locator('#free-exercise-results [data-ex="abdominal-solo"]').click()
    assert page.locator('.free-exercise-card').count()==1
    assert page.locator('[data-free-exercise="abdominal-solo"] [data-field="load"]').first.input_value()=='0'
    page.locator('[data-free-exercise="abdominal-solo"] [data-field="reps"]').first.fill('20')
    assert page.locator('#free-count').inner_text()=='1 exercícios · 1 séries'
    page.locator('[data-action="add-set"][data-ex="abdominal-solo"]').click()
    page.locator('[data-free-exercise="abdominal-solo"] [data-field="reps"]').last.fill('15')
    assert page.locator('#free-count').inner_text()=='1 exercícios · 2 séries'

    page.locator('#free-search').fill('abdominal inverso')
    assert page.locator('#free-exercise-results [data-ex="abdominal-inverso"]').count()==1
    page.locator('#free-exercise-results [data-ex="abdominal-inverso"]').click()
    page.locator('[data-free-exercise="abdominal-inverso"] [data-field="reps"]').first.fill('12')
    assert page.locator('#free-count').inner_text()=='2 exercícios · 3 séries'

    # Create a custom movement with no external load. It is not counted in
    # anatomical map unless the exercise receives a reviewed mapping.
    page.locator('.free-custom > summary').click()
    page.locator('#free-custom-name').fill('Abdominal com bola')
    page.locator('#free-custom-mode').select_option('bodyweight')
    page.locator('[data-action="free-custom-add"]').click()
    custom=page.locator('[data-free-exercise^="free-bodyweight-"]')
    assert custom.count()==1
    assert custom.locator('[data-field="load"]').first.input_value()=='0'
    custom.locator('[data-field="reps"]').first.fill('14')

    # Mixed session: reuse the shared cardio controls.
    if not page.locator('#session-cardio-panel').evaluate('(e)=>e.open'):
        page.locator('#session-cardio-panel > summary').click()
    page.locator('[data-action="cardio-add"]').click()
    page.locator('#cardio-minutes-0').fill('10')
    page.locator('#cardio-distance-0').fill('1.25')
    assert page.locator('[data-treadmill-speed="0"]').inner_text()=='7,5 km/h'
    page.locator('[data-action="cardio-add"]').click()
    page.locator('#cardio-type-1').select_option('escada')
    page.locator('#cardio-minutes-1').fill('8')
    page.locator('#cardio-speed-1').fill('55')
    assert page.locator('.cardio-total').inner_text()=='18 min'
    assert '18 min' in page.locator('#free-completion-status').inner_text()
    shots=ROOT/'screenshots'
    shots.mkdir(exist_ok=True)
    page.screenshot(path=str(shots/'free-workout-390.png'),full_page=True)
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),'free workout overflows at 390px'
    page.set_viewport_size({'width':320,'height':740})
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),'free workout overflows at 320px'
    page.screenshot(path=str(shots/'free-workout-320.png'),full_page=True)
    page.set_viewport_size({'width':390,'height':844})

    storage=page.evaluate('structuredClone(window.__testStorage)')
    draft=json.loads(storage['forja.academia.draft.v1'])['draft']
    assert draft['planId']=='FREE'
    assert draft['afterMuayId']
    assert len(draft['entries'])==3
    assert draft['cardio'][0]['minutes']=='10'
    assert draft['cardio'][0]['distanceKm']=='1.25'
    page.close()

    page=open_app(context,storage)
    page.on('pageerror',lambda err:errors.append(str(err)))
    assert page.locator('.free-exercise-card').count()==3, 'saved free draft must survive reload'
    assert page.locator('#free-count').inner_text()=='3 exercícios · 4 séries'
    assert page.locator('#cardio-minutes-0').input_value()=='10'
    assert page.locator('#cardio-distance-0').input_value()=='1.25'
    assert page.locator('#cardio-speed-1').input_value()=='55'
    page.get_by_role('button',name='Salvar treino livre').click()
    state=page.evaluate('JSON.parse(window.__testStorage["forja.academia.v1"])')
    assert len(state['muay']['sessions'])==1
    assert len(state['sessions'])==1
    saved=state['sessions'][0]
    assert saved['planId']=='FREE' and saved['kind']=='free'
    assert saved['afterMuayId']==state['muay']['sessions'][0]['id']
    assert len(saved['entries'])==3
    assert [len(item['sets']) for item in saved['entries']]==[2,1,1]
    assert saved['plannedIds']==[] and saved['skipped']==[]
    assert saved['cardio']==[{'type':'esteira','minutes':10,'distanceKm':1.25},{'type':'escada','minutes':8,'avgSpeed':55,'speedUnit':'steps_min'}]
    assert len([ex for ex in state['exercises'] if ex['group']=='FREE'])==1
    assert not any(ex['active'] for ex in state['exercises'] if ex['group']=='FREE')
    pending=page.evaluate("""s=>window.AcademiaEngine.pendingWorkouts(s.sessions).completed""",state)
    assert pending==[], 'free session must not complete an A/B/C/D workout'
    page.locator('.history-card > summary').first.click()
    assert 'Treino livre' in page.locator('.history-card').first.inner_text()
    assert 'Após Muay Thai' in page.locator('.history-card').first.inner_text()
    assert '18 min' in page.locator('.history-card').first.locator('.cardio-history').inner_text()
    page.locator('#nav [data-tab="progress"]').click()
    page.locator('[data-action="evo-view"][data-view="training"]').click()
    assert page.locator('.muscle-map-card').count()==1
    assert page.locator('.muscle-body-region[data-muscle="abs"]').count()==1
    abssets=page.locator('.muscle-body-region[data-muscle="abs"]').get_attribute('data-total')
    assert float(abssets)>=3,abssets
    assert page.locator('.muscle-map-muay-summary').count()==1

    # Cardio alone is valid; an empty free session still cannot be saved.
    page.locator('#nav [data-tab="home"]').click()
    page.locator('[data-action="free-start"]').first.click()
    assert page.locator('.free-exercise-card').count()==0
    page.get_by_role('button',name='Salvar treino livre').click()
    assert page.get_by_role('heading',name='Treino livre').count()==1
    page.locator('[data-action="cardio-add"]').click()
    page.locator('#cardio-type-0').select_option('bicicleta')
    page.locator('#cardio-minutes-0').fill('15')
    page.get_by_role('button',name='Salvar treino livre').click()
    updated=page.evaluate('JSON.parse(window.__testStorage["forja.academia.v1"])')
    assert len(updated['sessions'])==2
    standalone=updated['sessions'][-1]
    assert standalone['planId']=='FREE' and standalone['entries']==[]
    assert standalone['cardio']==[{'type':'bicicleta','minutes':15}]
    assert standalone['plannedIds']==[] and standalone['skipped']==[]
    assert updated['sessions'][0]==saved
    assert 'Somente cardio' in page.locator('.history-card').first.locator('summary').first.inner_text()
    page.locator('.history-card > summary').first.click()
    assert 'Bicicleta' in page.locator('.history-card').first.locator('.cardio-history').inner_text()
    storage=page.evaluate('structuredClone(window.__testStorage)')
    page.close()
    page=open_app(context,storage)
    page.on('pageerror',lambda err:errors.append(str(err)))
    assert page.evaluate('JSON.parse(window.__testStorage["forja.academia.v1"]).sessions')==updated['sessions']
    assert not errors, errors
    print('PASS free workout after Muay: catalog and custom abs, real sets, reload, rotation, map, 320px')
    browser.close()
