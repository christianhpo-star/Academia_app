"""Integration smoke for PWA UI and persistence, using an isolated localStorage shim.

Run: python tests/smoke_persistence.py
Requires Playwright Python and Chromium. Browser navigation is not required.
A fresh browser page is created to simulate a reload, seeded with the saved storage snapshot.
"""
import os
import re
import shutil
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
          getItem(key){ return Object.hasOwn(window.__testStorage, key) ? window.__testStorage[key] : null; },
          setItem(key, value){ window.__testStorage[key] = String(value); },
          removeItem(key){ delete window.__testStorage[key]; },
        }
      });
    }""", storage)
    page.add_style_tag(path=str(ROOT / 'styles.css'))
    for script in ['data.js', 'engine.js', 'muay.js', 'calendar.js', 'app.js']:
        page.add_script_tag(path=str(ROOT / script))
    page.wait_for_selector('#screen h1')
    return page


def storage_snapshot(page):
    return page.evaluate('structuredClone(window.__testStorage)')


with sync_playwright() as p:
    chrome = os.environ.get('CHROMIUM_PATH') or shutil.which('chromium') or shutil.which('google-chrome')
    kwargs = {'headless': True, 'args': ['--no-sandbox']}
    if chrome:
        kwargs['executable_path'] = chrome
    browser = p.chromium.launch(**kwargs)
    context = browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=1, locale='pt-BR')
    errors = []
    page = open_app(context, {}, errors)
    assert 'Evolua com método.' in page.locator('#screen').inner_text()
    assert 'Bloco A' in page.locator('#screen').inner_text()
    page.get_by_role('button', name='Escolher outro bloco').click()
    page.get_by_role('button', name='B · Peito').click()
    page.get_by_role('button', name='Iniciar treino B').click()
    assert 'Salvamento automático ativo' in page.locator('#screen').inner_text()
    supino = page.locator('[data-exercise="supino-halteres"]')
    assert supino.locator('[data-field="load"]').nth(0).input_value() == '20'
    supino.locator('[data-field="reps"]').nth(0).fill('12')
    supino.locator('[data-field="rir"]').nth(0).fill('5')
    supino.locator('[data-field="reps"]').nth(3).fill('10')
    supino.locator('[data-field="rir"]').nth(3).fill('2')
    page.locator('[data-draft-meta="notes"]').fill('Muay Thai antes do treino; fadiga moderada')
    raw = storage_snapshot(page).get('forja.academia.draft.v1')
    assert raw and '"planId":"B"' in raw and '"reps":"10"' in raw
    snapshot = storage_snapshot(page)
    page.close()
    page = open_app(context, snapshot, errors)
    assert 'Treino recuperado após interrupção.' in page.locator('#screen').inner_text()
    supino = page.locator('[data-exercise="supino-halteres"]')
    assert supino.locator('[data-field="reps"]').nth(0).input_value() == '12'
    assert supino.locator('[data-field="reps"]').nth(3).input_value() == '10'
    assert supino.locator('[data-field="rir"]').nth(3).input_value() == '2'
    assert 'Muay Thai antes do treino' in page.locator('[data-draft-meta="notes"]').input_value()
    page.get_by_role('button', name='Início', exact=True).click()
    assert 'Continuar treino salvo' in page.locator('#screen').inner_text()
    page.get_by_role('button', name='Continuar treino salvo').click()
    supino = page.locator('[data-exercise="supino-halteres"]')
    assert supino.locator('[data-field="reps"]').nth(3).input_value() == '10'
    for i in range(4):
        supino.locator('[data-field="reps"]').nth(i).fill('10' if i == 3 else '12')
        supino.locator('[data-field="rir"]').nth(i).fill('5' if i == 0 else '2')
    page.get_by_role('button', name='Salvar treino').click()
    assert 'Seu histórico' in page.locator('#screen').inner_text()
    assert 'forja.academia.draft.v1' not in storage_snapshot(page)
    page.locator('.history-details summary').first.click()
    assert '25 kg/halter × 10 rep.' in page.locator('.history-details').first.inner_text()
    page.get_by_role('button', name='Início', exact=True).click()
    home = page.locator('#screen').inner_text()
    assert 'Bloco A' in home
    assert '1 de 4 blocos concluídos' in home
    page.get_by_role('button', name='Treinos', exact=True).click()
    page.get_by_role('button', name='B · Peito').click()
    page.get_by_role('button', name='Iniciar treino B').click()
    supino = page.locator('[data-exercise="supino-halteres"]')
    assert 'Anterior: 25 kg/halter × 10 rep.' in supino.inner_text()
    supino.locator('[data-field="reps"]').nth(3).fill('12')
    assert '+2 repetição(ões) com a mesma carga!' in supino.inner_text()
    out = ROOT / 'screenshots'
    out.mkdir(exist_ok=True)
    page.screenshot(path=str(out / 'forja-v2-training.png'), full_page=True)
    supino.locator('[data-action="toggle-warmup"]').nth(3).click()
    snapshot = storage_snapshot(page)
    page.close()
    page = open_app(context, snapshot, errors)
    assert 'Treino recuperado após interrupção.' in page.locator('#screen').inner_text()
    supino = page.locator('[data-exercise="supino-halteres"]')
    assert supino.locator('[data-field="reps"]').nth(3).input_value() == '12'
    assert supino.locator('[data-action="toggle-warmup"]').nth(3).inner_text().strip() == 'Aquec.'
    assert 'Tipo de série diferente' in supino.inner_text()
    page.on('dialog', lambda dialog: dialog.accept())
    page.get_by_role('button', name='Cancelar').click()
    assert 'forja.academia.draft.v1' not in storage_snapshot(page)
    page.get_by_role('button', name='Histórico', exact=True).click()
    assert 'Supino reto com halteres' in page.locator('#screen').inner_text()
    assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
    page.set_viewport_size({'width': 320, 'height': 720})
    assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'), 'horizontal overflow on small phones'
    assert errors == [], errors
    page.get_by_role('button', name='Início', exact=True).click()
    page.screenshot(path=str(out / 'forja-v2-home.png'), full_page=True)
    # Saving the history can fail while the in-progress draft remains recoverable.
    failed = open_app(context, {}, errors)
    failed.get_by_role('button', name='Escolher outro bloco').click()
    failed.get_by_role('button', name='B · Peito').click()
    failed.get_by_role('button', name='Iniciar treino B').click()
    failed_supino = failed.locator('[data-exercise="supino-halteres"]')
    failed_supino.locator('[data-field="reps"]').nth(1).fill('10')
    failed_supino.locator('[data-field="rir"]').nth(1).fill('2')
    failed.evaluate("""() => {
      const setter = localStorage.setItem.bind(localStorage);
      localStorage.setItem = (key, value) => {
        if (key === 'forja.academia.v1') throw new Error('simulated quota failure');
        setter(key, value);
      };
    }""")
    failed.get_by_role('button', name='Salvar treino').click()
    assert 'Não foi possível salvar o histórico' in failed.locator('#toast').inner_text()
    failing_snapshot = storage_snapshot(failed)
    assert 'forja.academia.draft.v1' in failing_snapshot
    assert 'forja.academia.v1' not in failing_snapshot
    failed.close()
    recovered = open_app(context, failing_snapshot, errors)
    assert 'Treino recuperado após interrupção.' in recovered.locator('#screen').inner_text()
    assert recovered.locator('[data-exercise="supino-halteres"] [data-field="reps"]').nth(1).input_value() == '10'
    recovered.close()
    assert errors == [], errors
    print('PASS: autosave, simulated reload recovery, navigation, queue, set comparisons, warmup, discard and history')
    browser.close()
