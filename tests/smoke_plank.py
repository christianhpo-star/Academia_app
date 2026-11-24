"""FORJA plank can be searched, logged as seconds, saved, mapped and restored on mobile."""
import json
import os
import re
import shutil
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
RAW=(ROOT/'index.html').read_text()
HTML=re.sub(r'<script defer src="\./[^"]+"></script>','',RAW)
SCRIPTS=re.findall(r'<script defer src="\./([^?"#]+)(?:\?[^"]*)?"></script>',RAW)

def open_app(context,storage=None):
    page=context.new_page()
    page.set_content(HTML)
    page.evaluate("""seed=>{
      window.__stored={...seed};
      Object.defineProperty(window,'localStorage',{configurable:true,value:{
        getItem(k){return window.__stored[k]??null},
        setItem(k,v){window.__stored[k]=String(v)},
        removeItem(k){delete window.__stored[k]}
      }});
    }""",storage or {})
    page.add_style_tag(path=str(ROOT/'styles.css'))
    for script in SCRIPTS:
        page.add_script_tag(path=str(ROOT/script))
    page.locator('#screen h1').wait_for()
    return page

with sync_playwright() as p:
    browser_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium') or shutil.which('google-chrome')
    browser=p.chromium.launch(headless=True,executable_path=browser_path,args=['--no-sandbox']) if browser_path else p.chromium.launch(headless=True,args=['--no-sandbox'])
    ctx=browser.new_context(viewport={'width':390,'height':844},locale='pt-BR')
    errors=[]
    page=open_app(ctx)
    page.on('pageerror',lambda error:errors.append(str(error)))
    page.locator('[data-action="free-start"]').first.click()
    assert page.get_by_role('heading',name='Treino livre').count()==1
    picker=page.locator('#free-exercise-results')
    for exercise in ['prancha-frontal','prancha-joelhos','prancha-lateral']:
        assert picker.locator(f'[data-ex="{exercise}"]').count()==1
    picker.locator('[data-ex="prancha-frontal"]').click()
    card=page.locator('[data-free-exercise="prancha-frontal"]')
    assert card.count()==1
    assert 'Seg (s)' in card.inner_text()
    input_seconds=card.locator('[data-field="reps"]').first
    assert input_seconds.get_attribute('max')=='300'
    assert input_seconds.get_attribute('min')=='5'
    assert input_seconds.get_attribute('placeholder')=='Seg'
    assert card.locator('[data-field="load"]').first.input_value()=='0'
    assert page.locator('#free-count').inner_text().startswith('0 exercícios')
    input_seconds.fill('35')
    assert page.locator('#free-count').inner_text()=='1 exercícios · 1 séries'
    page.locator('[data-action="add-set"][data-ex="prancha-frontal"]').click()
    assert page.locator('#free-count').inner_text()=='1 exercícios · 1 séries', 'blank second hold cannot count'
    page.locator('[data-free-exercise="prancha-frontal"] [data-field="reps"]').last.fill('30')
    assert page.locator('#free-count').inner_text()=='1 exercícios · 2 séries'
    shots=ROOT/'screenshots'
    shots.mkdir(exist_ok=True)
    page.screenshot(path=str(shots/'plank-free-390.png'),full_page=True)
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'),'overflow at 390 px'
    page.set_viewport_size({'width':320,'height':740})
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'),'overflow at 320 px'
    page.screenshot(path=str(shots/'plank-free-320.png'),full_page=True)
    page.set_viewport_size({'width':390,'height':844})
    stored=page.evaluate('structuredClone(window.__stored)')
    assert json.loads(stored['forja.academia.draft.v1'])['draft']['entries']['prancha-frontal']['sets'][0]['reps']=='35'
    page.close()
    page=open_app(ctx,stored)
    page.on('pageerror',lambda error:errors.append(str(error)))
    assert page.locator('[data-free-exercise="prancha-frontal"]').count()==1
    assert page.locator('[data-free-exercise="prancha-frontal"] [data-field="reps"]').last.input_value()=='30'
    page.get_by_role('button',name='Salvar treino livre').click()
    state=page.evaluate('JSON.parse(window.__stored["forja.academia.v1"])')
    assert len(state['sessions'])==1
    saved=state['sessions'][0]
    assert saved['planId']=='FREE'
    assert saved['entries'][0]['id']=='prancha-frontal'
    assert [r['reps'] for r in saved['entries'][0]['sets']]==[35,30]
    assert [r['load'] for r in saved['entries'][0]['sets']]==[0,0]
    assert not saved['plannedIds'] and not saved['skipped']
    page.locator('.history-card > summary').first.click()
    history=page.locator('.history-card').first
    history.locator('.history-details > summary').first.click()
    assert '35 s' in history.inner_text() and '30 s' in history.inner_text()
    page.locator('#nav [data-tab="progress"]').click()
    page.locator('[data-action="evo-view"][data-view="training"]').click()
    assert page.locator('.muscle-map-card').count()==1
    assert page.locator('.muscle-body-region[data-muscle="abs"]').count()==1
    assert float(page.locator('.muscle-body-region[data-muscle="abs"]').get_attribute('data-total'))>=2
    assert not errors,errors

    # A phone with older records and no plank gets an inactive additive entry.
    old=json.loads(json.dumps(state))
    old['sessions']=[];old['exercises']=[x for x in old['exercises'] if x['id']!='prancha-frontal']
    old.pop('plankDefaultsVersion',None)
    old['referenceDefaultsVersion']=1
    legacy={'forja.academia.v1':json.dumps(old)}
    migrated=open_app(ctx,legacy)
    migrated.on('pageerror',lambda error:errors.append(str(error)))
    after=migrated.evaluate('JSON.parse(window.__stored["forja.academia.v1"])')
    found=[ex for ex in after['exercises'] if ex['id']=='prancha-frontal']
    assert len(found)==1 and found[0]['active'] is False
    assert after['plankDefaultsVersion']==1
    # A personalized timed duration above the ordinary 50-rep maximum must
    # survive a fresh launch without triggering the protected-recovery screen.
    for exercise in after['exercises']:
        if exercise['id']=='prancha-frontal':
            exercise['low']=40
            exercise['high']=120
            exercise['sets']=3
    extended=open_app(ctx,{'forja.academia.v1':json.dumps(after)})
    extended.on('pageerror',lambda error:errors.append(str(error)))
    assert extended.locator('[aria-label="Proteção de histórico"]').count()==0
    assert extended.locator('#screen h1').count()>=1
    kept=extended.evaluate('JSON.parse(window.__stored["forja.academia.v1"])')
    edited=next(ex for ex in kept['exercises'] if ex['id']=='prancha-frontal')
    assert edited['high']==120 and edited['low']==40 and edited['sets']==3
    assert not errors,errors
    browser.close()
    print('PASS plank: search, timed real series, save/reload, history s, anatomy, migration, 390/320px')
