"""Optional cardio minutes alongside a workout, with isolated synthetic data.

Checks the visible form, draft recovery, saved history and backup round trip.
Cardio durations must not create strength sets or color additional muscles.
"""
import json
import os
import shutil
from pathlib import Path

from playwright.sync_api import sync_playwright

from smoke_muscle_history import ROOT, KEY, DRAFT_KEY, TODAY, SCRIPTS, open_app, snapshot
from smoke_abdomen import make_seed, state_of, start_plan, assert_width


def strength_set(page):
    exercise = page.locator('[data-exercise="pulley-aberto"]')
    exercise.locator('[data-field="load"]').first.fill('30')
    exercise.locator('[data-field="reps"]').first.fill('10')
    exercise.locator('[data-field="rir"]').first.fill('2')
    return exercise


def minutes(page, index):
    return page.locator(f'[data-cardio-field="minutes"][data-cardio-index="{index}"]')


def modality(page, index):
    return page.locator(f'[data-cardio-field="type"][data-cardio-index="{index}"]')


def add_row(page, kind, value=None):
    page.locator('[data-action="cardio-add"]').click()
    index = page.locator('[data-cardio-field="type"]').count() - 1
    modality(page, index).select_option(kind)
    if value is not None:
        minutes(page, index).fill(value)
    return index


def check_optional(context, seed, errors):
    page = open_app(context, seed, errors)
    start_plan(page, 'A')
    panel = page.locator('.session-cardio')
    assert panel.count() == 1
    assert not panel.evaluate('node => node.open')
    assert 'cardio' not in json.loads(snapshot(page)[DRAFT_KEY])['draft']
    strength_set(page)
    page.get_by_role('button', name='Salvar treino', exact=True).click()
    saved = state_of(page)['sessions']
    assert len(saved) == 1 and 'cardio' not in saved[0]
    page.locator('.history-card > summary').first.click()
    assert page.locator('.cardio-history').count() == 0
    page.close()

    # Selecting the optional form alone must not invent activity or a workout.
    page = open_app(context, seed, errors)
    start_plan(page, 'A')
    page.locator('.session-cardio > summary').click()
    add_row(page, 'esteira', '10')
    page.get_by_role('button', name='Salvar treino', exact=True).click()
    assert state_of(page)['sessions'] == []
    assert DRAFT_KEY in snapshot(page)
    minutes(page, 0).fill('')
    strength_set(page)
    page.get_by_role('button', name='Salvar treino', exact=True).click()
    assert len(state_of(page)['sessions']) == 1
    assert 'cardio' not in state_of(page)['sessions'][0]
    page.close()


def check_cardio(context, seed, errors, folder):
    page = open_app(context, seed, errors)
    start_plan(page, 'A')
    strength_set(page)
    original_entries = json.loads(snapshot(page)[DRAFT_KEY])['draft']['entries']
    page.locator('.session-cardio > summary').click()
    assert add_row(page, 'esteira', '10') == 0
    assert add_row(page, 'escada', '8') == 1
    assert modality(page, 1).locator('option[value="esteira"]').is_disabled()
    first_choice = modality(page, 0)
    first_choice.focus()
    first_choice.select_option('eliptico')
    assert first_choice.evaluate('node => document.activeElement === node')
    assert modality(page, 1).locator('option[value="eliptico"]').is_disabled()
    assert modality(page, 1).locator('option[value="esteira"]').is_enabled()
    first_choice.select_option('esteira')
    assert first_choice.evaluate('node => document.activeElement === node')
    assert modality(page, 1).locator('option[value="esteira"]').is_disabled()
    assert modality(page, 1).locator('option[value="eliptico"]').is_enabled()
    assert minutes(page, 0).input_value() == '10'
    assert add_row(page, 'bicicleta', '0') == 2
    assert add_row(page, 'eliptico') == 3
    assert page.locator('[data-cardio-field="minutes"][required]').count() == 0
    assert page.locator('.cardio-total').inner_text() == '18 min'
    assert 'Esteira · 10 min + Escada · 8 min' in page.locator('#workout-review').inner_text()
    assert '1 série efetiva registrada' in page.locator('.focus-progress-label').inner_text()
    assert json.loads(snapshot(page)[DRAFT_KEY])['draft']['entries'] == original_entries
    for invalid in ('-1', '301'):
        minutes(page, 0).fill(invalid)
        page.get_by_role('button', name='Salvar treino', exact=True).click()
        assert state_of(page)['sessions'] == []
        assert DRAFT_KEY in snapshot(page)
        assert 'entre 0 e 300' in page.locator('#toast').inner_text()
    minutes(page, 0).fill('10')

    saved_draft = snapshot(page)
    page.close()
    page = open_app(context, saved_draft, errors)
    assert snapshot(page) == saved_draft, 'Recovering a cardio draft must not rewrite it'
    panel = page.locator('.session-cardio')
    assert panel.evaluate('node => node.open')
    for index, kind, value in ((0, 'esteira', '10'), (1, 'escada', '8'), (2, 'bicicleta', '0'), (3, 'eliptico', '')):
        assert modality(page, index).input_value() == kind
        assert minutes(page, index).input_value() == value
    assert page.locator('[data-exercise="pulley-aberto"] [data-field="reps"]').first.input_value() == '10'
    for width in (320, 390, 412):
        page.set_viewport_size({'width': width, 'height': 900})
        assert_width(page, panel)
        for field in panel.locator('input, select, button').all():
            box = field.bounding_box()
            assert box and box['x'] >= -1 and box['x'] + box['width'] <= width + 1, box
        panel.screenshot(path=str(folder / f'cardio-form-{width}.png'))

    # Removing a row changes only cardio, while preserving other durations.
    page.locator('[data-action="cardio-remove"][data-index="3"]').click()
    assert page.locator('[data-cardio-field="type"]').count() == 3
    assert minutes(page, 0).input_value() == '10'
    assert minutes(page, 1).input_value() == '8'
    assert json.loads(snapshot(page)[DRAFT_KEY])['draft']['entries'] == original_entries
    page.get_by_role('button', name='Salvar treino', exact=True).click()
    state = state_of(page)
    assert len(state['sessions']) == 1
    saved = state['sessions'][0]
    assert saved['cardio'] == [{'type': 'esteira', 'minutes': 10}, {'type': 'escada', 'minutes': 8}]
    assert len(saved['entries']) == 1 and len(saved['entries'][0]['sets']) == 1
    assert saved['entries'][0]['sets'][0]['load'] == 30
    assert DRAFT_KEY not in snapshot(page)
    assert page.evaluate("""today => {
      const state = JSON.parse(window.__testStorage['forja.academia.v1']);
      const plain = state.sessions.map(session => {const copy = {...session}; delete copy.cardio; return copy;});
      const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
      return same(ForjaDose.volume({strengthSessions:state.sessions, today}),
                  ForjaDose.volume({strengthSessions:plain, today})) &&
        same(ForjaMuscleHistory.analyze({strengthSessions:state.sessions, today, days:7}),
             ForjaMuscleHistory.analyze({strengthSessions:plain, today, days:7})) &&
        same(AcademiaEngine.groupStrength(state.exercises,state.sessions),
             AcademiaEngine.groupStrength(state.exercises,plain));
    }""", TODAY.isoformat()), 'Cardio changed muscle distribution or strength estimates'
    page.locator('.history-card > summary').first.click()
    history = page.locator('.cardio-history')
    assert 'Cardio · 18 min' in history.inner_text()
    assert history.locator('li').count() == 2
    assert 'Esteira' in history.inner_text() and '10 min' in history.inner_text()
    assert 'Escada' in history.inner_text() and '8 min' in history.inner_text()
    for width in (320, 390, 412):
        page.set_viewport_size({'width': width, 'height': 900})
        assert_width(page, page.locator('.history-card').first)
        page.locator('.history-card').first.screenshot(path=str(folder / f'cardio-history-{width}.png'))

    page.locator('.top-settings').click()
    with page.expect_download() as download_info:
        page.locator('[data-action="export-json"]').click()
    exported = json.loads(Path(download_info.value.path()).read_text(encoding='utf-8'))
    assert exported['sessions'] == state['sessions']
    page.close()
    restored = open_app(context, {}, errors)
    for _ in range(2):
        restored.locator('.top-settings').click()
        restored.once('dialog', lambda dialog: dialog.accept())
        restored.locator('#import-file').set_input_files({
            'name': 'forja-synthetic-cardio-backup.json', 'mimeType': 'application/json',
            'buffer': json.dumps(exported, ensure_ascii=False).encode('utf-8'),
        })
        restored.wait_for_function("document.getElementById('import-file').value === ''", timeout=10000)
        assert state_of(restored)['sessions'] == state['sessions']
    stable = snapshot(restored)
    restored.close()
    restored = open_app(context, stable, errors)
    assert state_of(restored)['sessions'] == state['sessions']
    restored.locator('#nav [data-tab="history"]').click()
    restored.locator('.history-card > summary').first.click()
    assert '18 min' in restored.locator('.cardio-history').inner_text()
    restored.close()


def main():
    assert 'cardio.js' in SCRIPTS
    folder = ROOT / 'screenshots'
    folder.mkdir(exist_ok=True)
    errors = []
    with sync_playwright() as playwright:
        executable = os.environ.get('CHROMIUM_PATH') or shutil.which('chromium') or shutil.which('google-chrome')
        options = {'headless': True, 'args': ['--no-sandbox']}
        if executable:
            options['executable_path'] = executable
        browser = playwright.chromium.launch(**options)
        context = browser.new_context(viewport={'width': 390, 'height': 844}, locale='pt-BR',
                                      timezone_id='America/Sao_Paulo', has_touch=True)
        seed = make_seed(context, errors)
        check_optional(context, seed, errors)
        check_cardio(context, seed, errors, folder)
        assert not errors, errors
        browser.close()
    print('PASS cardio: optional fields, treadmill/stairs minutes, blank/zero omitted, invalid durations blocked, draft recovery, history/export/import, unchanged strength/muscle totals, 320/390/412px')


if __name__ == '__main__':
    main()
