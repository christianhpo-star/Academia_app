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
INDEX = INDEX.replace('<link rel="stylesheet" href="./styles.css" />', '')


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
    for name in ['data.js','engine.js','app.js']:
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
    chrome = os.environ.get('CHROMIUM_PATH') or shutil.which('chromium') or shutil.which('google-chrome')
    kwargs = {'headless': True, 'args':['--no-sandbox']}
    if chrome:
        kwargs['executable_path'] = chrome
    browser = p.chromium.launch(**kwargs)
    context = browser.new_context(viewport={'width':390,'height':844},device_scale_factor=1, locale='pt-BR')
    errors = []
    empty = open_app(context, {}, errors)
    empty.get_by_role('button', name='Evolução', exact=True).click()
    assert empty.locator('.radar-axis-button').count() == 4
    assert 'O radar começará a mostrar evolução' in empty.locator('#screen').inner_text()
    empty.locator('[data-action="strength-group"][data-group="C"]').click()
    assert 'Quadríceps' in empty.locator('#strength-group-heading').inner_text()
    assert 'sem registros' in empty.locator('.strength-exercise-choice').first.inner_text().lower()
    assert empty.locator('.strength-empty').count() == 1
    empty.close()

    starter = open_app(context, {}, errors)
    ex = starter.evaluate('window.AcademiaData.exercises')
    starter.close()
    sessions = []
    scenarios = [('A','pulley-aberto',45,50),('B','supino-halteres',25,27.5),('C','leg-press',220,240),('D','stiff',80,90)]
    for group, exercise, first_load, second_load in scenarios:
        sessions += [make_session(group,exercise,1,first_load,10),make_session(group,exercise,2,second_load,12)]
    state = {
        'version':1,
        'settings':{'startWeight':88.3,'targetWeight':82,'goalDate':'2027-01-14','fatigue':'normal','kneePain':''},
        'weights':[{'id':'start','date':'2026-10-30','weight':88.3}],
        'sessions':sessions,
        'exercises':ex,
    }
    page = open_app(context, {'forja.academia.v1':json.dumps(state,ensure_ascii=False)}, errors)
    page.get_by_role('button', name='Evolução', exact=True).click()
    assert page.locator('.radar-axis-button').count() == 4
    assert page.locator('.strength-detail-card').count() == 0
    assert page.locator('svg').count() >= 2
    assert page.locator('.radar-axis-button').filter(has_text='Peito').count() == 1
    page.locator('[data-action="strength-group"][data-group="B"]').click()
    assert 'Peito' in page.locator('#strength-group-heading').inner_text()
    assert page.locator('.strength-exercise-choice').count() >= 4
    assert page.locator('#strength-exercise-panel svg[role="img"]').count() == 1
    panel = page.locator('#strength-exercise-panel')
    assert 'Supino reto com halteres' in panel.inner_text()
    panel.locator('.strength-records summary').click()
    assert '25 kg/halter' in panel.inner_text()
    assert '27,5 kg/halter' in panel.inner_text()
    assert page.locator('.strength-records li').count() == 2
    # Detalhar outro exercício do mesmo grupo que ainda não tem dados.
    page.locator('.strength-exercise-choice[data-ex="voador"]').click()
    assert 'Voador' in page.locator('#strength-exercise-panel').inner_text()
    assert page.locator('.strength-empty').count() == 1
    # Trocar grupo pelo proprio radar e recuperar a linha com dados.
    page.locator('[data-action="strength-group"][data-group="C"]').click()
    assert 'Quadríceps' in page.locator('#strength-group-heading').inner_text()
    assert 'Leg press' in page.locator('#strength-exercise-panel').inner_text()
    assert page.locator('#strength-exercise-panel svg[role="img"]').count() == 1
    assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
    path = ROOT / 'screenshots'
    path.mkdir(exist_ok=True)
    page.screenshot(path=str(path/'forja-v3-radar.png'),full_page=True)
    # Teclado: botoes da navegacao do radar recebem Enter nativamente.
    page.locator('[data-action="strength-group"][data-group="A"]').focus()
    page.keyboard.press('Enter')
    assert 'Costas' in page.locator('#strength-group-heading').inner_text()
    page.get_by_role('button',name='Fechar detalhamento').click()
    assert page.locator('.strength-detail-card').count() == 0
    page.set_viewport_size({'width':320,'height':740})
    assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'), 'horizontal overflow at 320px'
    assert not errors, errors
    print('PASS radar: seleção, detalhamento, gráficos, sem dados, teclado e 320px')
    browser.close()
