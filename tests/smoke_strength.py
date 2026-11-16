"""Testa drill-down do radar de forca, grafico por exercicio e estados vazios."""
import json
import os
import re
import shutil
from datetime import datetime, timedelta, timezone
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
INDEX = re.sub(r'<script defer src="\./[^\"]+"></script>', '', (ROOT / 'index.html').read_text())
INDEX = INDEX.replace('<link rel="stylesheet" href="./styles.css?v=20261115-diary1" />', '')


def open_app(context, storage, errors):
    page = context.new_page()
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.set_content(INDEX)
    page.evaluate("""seed => {
      window.__testStorage = {...seed};
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        value: {
          getItem(k) { return Object.hasOwn(window.__testStorage, k) ? window.__testStorage[k] : null; },
          setItem(k, v) { window.__testStorage[k] = String(v); },
          removeItem(k) { delete window.__testStorage[k]; },
        }
      });
    }""", storage)
    page.add_style_tag(path=str(ROOT / 'styles.css'))
    for name in ['data.js','engine.js','muay.js','calendar.js','flex.js','dose.js','focus.js','catalog-advice.js','body-measures.js','activity.js','health-import.js','nutrition-goals.js','goal-planner.js','reminders.js','daily-routine.js','nutrition.js','nutrition-catalog.js','nutrition-balance.js','nutrition-ui.js','evolution-dashboard.js','app.js']:
        page.add_script_tag(path=str(ROOT / name))
    page.wait_for_selector('#screen h1')
    return page


def make_session(group, ex, idx, load, reps):
    stamp = datetime.now(timezone.utc) - timedelta(days=8-idx)
    return {
        'id': f'detail-{group}-{idx}', 'planId': group,
        'timestamp': stamp.isoformat().replace('+00:00','Z'),
        'day': stamp.date().isoformat(),
        'kneeNextDay': 0,
        'energy': 'normal',
        'notes': '',
        'entries': [{'id':ex, 'pain':0 if group=='C' else None,
          'sets':[{'load':load, 'reps':reps, 'rir':2, 'warmup':False}]}]
    }


with sync_playwright() as p:
    chrome=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium') or shutil.which('google-chrome')
    kwargs={'headless':True,'args':['--no-sandbox']}
    if chrome: kwargs['executable_path']=chrome
    browser=p.chromium.launch(**kwargs)
    context=browser.new_context(viewport={'width':390,'height':844},device_scale_factor=1,locale='pt-BR')
    errors=[]
    empty=open_app(context,{},errors)
    empty.get_by_role('button',name='Evolução',exact=True).click()
    assert empty.locator('.evo-volume-row').count()==4
    assert 'Ainda não há séries efetivas' in empty.locator('.evo-volume-card').inner_text()
    assert empty.locator('.progress-advanced-radar').count()==0
    assert empty.locator('.strength-radar-plot').count()==0
    assert empty.locator('.evo-hero').count()==0
    empty.close()

    starter=open_app(context,{},errors)
    exercises=starter.evaluate('window.AcademiaData.exercises')
    starter.close()
    scenarios=[('A','pulley-aberto',45,50),('B','supino-halteres',25,27.5),('C','leg-press',220,240),('D','stiff',80,90)]
    sessions=[]
    for group,exercise,first,second in scenarios:
        sessions.extend([make_session(group,exercise,1,first,10),make_session(group,exercise,2,second,12)])
    state={
        'version':1,
        'settings':{'startWeight':88.3,'targetWeight':82,'goalDate':'2027-01-14','fatigue':'normal','kneePain':''},
        'weights':[{'id':'start','date':'2026-10-30','weight':88.3}],
        'sessions':sessions,'exercises':exercises,
    }
    page=open_app(context,{'forja.academia.v1':json.dumps(state,ensure_ascii=False)},errors)
    page.get_by_role('button',name='Evolução',exact=True).click()
    assert page.locator('.evo-volume-row').count()==4
    assert page.locator('.evo-volume-track span').count()==4
    assert 'Costas' in page.locator('.evo-volume-card').inner_text()
    assert page.evaluate("""() => {
      const x=window.ForjaEvolutionDashboard.groupVolume(
        JSON.parse(window.__testStorage['forja.academia.v1']),
        new Date().toLocaleDateString('en-CA'),30);
      return x.length===4&&x.every(group=>group.sets===2);
    }""")
    page.locator('[data-action="evo-volume-days"][data-days="7"]').click()
    assert page.locator('[data-action="evo-volume-days"][data-days="7"]').get_attribute('aria-pressed')=='true'
    page.locator('[data-action="evo-volume-days"][data-days="90"]').click()
    assert page.locator('[data-action="evo-volume-days"][data-days="90"]').get_attribute('aria-pressed')=='true'
    page.locator('[data-action="evo-chart-mode"][data-mode="measures"]').click()
    assert page.locator('#evo-measure-field').is_visible()
    assert 'Sem medidas' in page.locator('.evo-body-chart').inner_text()
    page.locator('#evo-measure-field').select_option('chest')
    assert 'Peitoral' in page.locator('.evo-body-chart').inner_text()
    page.locator('[data-action="evo-chart-mode"][data-mode="weight"]').click()
    assert page.locator('.evo-body-chart svg[role="img"]').count()==1
    assert page.locator('.progress-steps-card').count()==1
    path=ROOT/'screenshots';path.mkdir(exist_ok=True)
    page.screenshot(path=str(path/'evolution-groups-390.png'),full_page=True)
    for width in (320,390):
        page.set_viewport_size({'width':width,'height':740})
        assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'),f'overflow at {width}px'
    assert not errors,errors
    browser.close()
    print('PASS evolução: grupos A-D por séries efetivas, seletor de medidas, sem radar, 320px e 390px')
