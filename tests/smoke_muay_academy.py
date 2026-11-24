"""Mobile Playwright smoke: academy Muay exhaustion, timed combos, sparring and safe persistence."""
import json
import os
import re
import shutil
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
HTML = re.sub(r'<script defer src="./[^"]+"></script>', '', (ROOT / 'index.html').read_text())


def open_app(context, storage=None):
    page = context.new_page()
    page.set_content(HTML)
    page.evaluate("""seed=>{
      window.__testStorage={...seed};
      Object.defineProperty(window,'localStorage',{configurable:true,value:{
        getItem(k){return window.__testStorage[k]??null},
        setItem(k,v){window.__testStorage[k]=String(v)},
        removeItem(k){delete window.__testStorage[k]}
      }});
    }""", storage or {})
    page.add_style_tag(path=str(ROOT / 'styles.css'))
    scripts = [
        'data.js', 'cardio.js', 'training-sets.js', 'engine.js', 'muay.js',
        'calendar.js', 'flex.js','free-workout.js', 'catalog-session.js', 'dose.js', 'focus.js',
        'catalog-advice.js', 'body-measures.js', 'activity.js', 'health-import.js',
        'nutrition-goals.js', 'goal-planner.js', 'reminders.js', 'daily-routine.js',
        'nutrition.js', 'nutrition-catalog.js', 'nutrition-balance.js',
        'nutrition-ui.js', 'evolution-dashboard.js', 'performance-trends.js',
        'exercise-anatomy.js', 'muscle-history.js', 'muscle-body.js',
        'muscle-map.js', 'training-balance.js', 'catalog-recommendations.js',
        'share-summary.js', 'share-sticker.js', 'app.js'
    ]
    for filename in scripts:
        page.add_script_tag(path=str(ROOT / filename))
    page.locator('#screen h1').wait_for()
    return page


with sync_playwright() as p:
    executable = os.environ.get('CHROMIUM_PATH') or shutil.which('chromium') or shutil.which('google-chrome')
    browser = p.chromium.launch(headless=True, executable_path=executable, args=['--no-sandbox']) if executable else p.chromium.launch(headless=True, args=['--no-sandbox'])
    context = browser.new_context(viewport={'width': 390, 'height': 844}, locale='pt-BR', accept_downloads=True)
    page = open_app(context)
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))

    page.get_by_role('button', name='Registrar Muay Thai').click()
    page.get_by_role('button', name='Aula na academia').click()
    assert page.locator('.muay-academy-modes button').count() == 3
    assert page.locator('[data-action="muay-quick-mode"][data-value="exhaustion"]').get_attribute('aria-pressed') == 'true'
    assert page.locator('[data-action="muay-quick-choice"][data-quick-field="preset"][data-value="50"]').get_attribute('aria-pressed') == 'true'
    assert page.get_by_text('Registrar treino na academia').count() == 1
    page.locator('[data-action="muay-quick-add"]').click()
    assert page.locator('.muay-academy-record').count() == 1
    assert '50 repetições por lado' in page.locator('.muay-academy-record').first.inner_text()

    page.locator('[data-action="muay-quick-mode"][data-value="combination"]').click()
    for strike in ['jab', 'direto', 'chute_d', 'cruzado', 'joelho_d']:
        page.locator('[data-action="muay-combo-add"][data-value="%s"]' % strike).click()
    assert page.locator('.muay-combo-steps li').count() == 5
    assert page.locator('#muay-sequence-minutes').input_value() == '5'
    page.locator('[data-action="muay-quick-add"]').click()
    assert page.locator('.muay-academy-record').count() == 2

    page.locator('[data-action="muay-quick-mode"][data-value="sparring"]').click()
    page.locator('[data-action="muay-quick-choice"][data-quick-field="exchange"][data-value="three"]').click()
    page.locator('[data-action="muay-quick-choice"][data-quick-field="rules"][data-value="kicks"]').click()
    page.locator('#muay-spar-rounds').fill('2')
    page.locator('#muay-spar-minutes').fill('4')
    page.locator('[data-action="muay-quick-add"]').click()
    assert page.locator('.muay-academy-record').count() == 3
    assert '2 round(s) × 4 min' in page.locator('.muay-academy-record').last.inner_text()
    page.locator('[data-action="muay-effort"][data-value="7"]').click()

    shots = ROOT / 'screenshots'
    shots.mkdir(exist_ok=True)
    page.screenshot(path=str(shots / 'muay-academy-390.png'), full_page=True)
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'), 'academy overflow at 390px'
    page.set_viewport_size({'width': 320, 'height': 740})
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'), 'academy overflow at 320px'
    page.screenshot(path=str(shots / 'muay-academy-320.png'), full_page=True)
    page.set_viewport_size({'width': 390, 'height': 844})

    snapshot = page.evaluate('structuredClone(window.__testStorage)')
    assert json.loads(snapshot['forja.academia.v1'])['muay']['draft']['activities'][1]['combo'] == ['jab', 'direto', 'chute_d', 'cruzado', 'joelho_d']
    page.close()
    page = open_app(context, snapshot)
    page.on('pageerror', lambda error: errors.append(str(error)))
    assert page.locator('.muay-academy-record').count() == 3, 'draft must survive reload'
    page.locator('[data-action="muay-finish"]').click()
    record = page.evaluate('JSON.parse(window.__testStorage["forja.academia.v1"])')
    assert record['sessions'] == [], 'Muay cannot write strength entries'
    assert len(record['muay']['sessions']) == 1
    saved = record['muay']['sessions'][0]
    assert saved['fastVersion'] == 2
    assert len(saved['activities']) == 3
    assert saved['activities'][0]['quantity'] == 50 and saved['activities'][0]['side'] == 'each'
    assert saved['activities'][1]['quantity'] == 5 and len(saved['activities'][1]['combo']) == 5
    assert saved['activities'][2]['category'] == 'sparring'
    assert saved['activities'][2]['sets'] == 2 and saved['activities'][2]['quantity'] == 4
    assert saved['activities'][2]['rules'] == 'kicks' and saved['activities'][2]['exchange'] == 'three'
    assert record['muay']['draft'] is None
    page.locator('.muay-record > summary').first.click()
    assert '3 golpes' in page.locator('.muay-record').first.inner_text()
    page.locator('[data-action="muay-edit"]').first.click()
    assert page.locator('.muay-academy-record').count() == 3
    assert page.locator('.muay-academy-modes').count() == 1
    page.set_viewport_size({'width': 320, 'height': 740})
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'), 'editing overflow at 320px'
    assert not errors, errors
    print('PASS Muay academy 3 blocks, persistence, edit, mobile 320px and isolation from strength')
    browser.close()
