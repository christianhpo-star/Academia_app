"""Abdominal complements, migration and explicit bodyweight logging.

Uses isolated synthetic storage only. The key regression is an actual 0 kg
bodyweight set surviving the whole UI path without making blank or machine
sets valid. Chromium screenshots are responsive QA, not a physical-phone test.
"""
import copy
import json
import os
import shutil
from pathlib import Path

from playwright.sync_api import sync_playwright

from smoke_muscle_history import (
    ROOT, KEY, DRAFT_KEY, NOW, TODAY, SCRIPTS, open_app, snapshot,
    readonly_baseline, assert_readonly, open_map, assert_total, assert_bounds,
)


BASE_IDS = ('abdominal-solo', 'abdominal-inverso')


def state_of(page):
    return json.loads(snapshot(page)[KEY])


def start_plan(page, plan):
    page.locator('#nav [data-tab="plans"]').click()
    page.locator(f'[data-action="select-plan"][data-plan="{plan}"]').click()
    page.locator(f'[data-action="start"][data-plan="{plan}"]').click()


def assert_width(page, element):
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
    assert element.evaluate("""node => {
      const box = node.getBoundingClientRect();
      return box.width > 200 && box.left >= -1 && box.right <= innerWidth + 1 &&
        node.scrollWidth <= box.width + 1;
    }""")


def make_seed(context, errors):
    page = open_app(context, {}, errors)
    page.locator('#home-step-count').fill('3100')
    page.locator('#home-steps-form button[type="submit"]').click()
    seed = snapshot(page)
    state = state_of(page)
    assert state['abdomenDefaultsVersion'] == 1
    for exercise_id, group in zip(BASE_IDS, ('A', 'B')):
        found = [ex for ex in state['exercises'] if ex['id'] == exercise_id]
        assert len(found) == 1
        exercise = found[0]
        assert exercise['active'] is True and exercise['group'] == group
        assert exercise['sets'] == 2 and exercise['low'] == 10 and exercise['high'] == 15
        assert exercise['mode'] == 'bodyweight' and exercise['bodyweight'] is True
    assert state['sessions'] == []
    assert DRAFT_KEY not in seed
    page.close()
    return seed


def check_migration(context, seed, errors):
    legacy = copy.deepcopy(seed)
    state = json.loads(legacy[KEY])
    state.pop('abdomenDefaultsVersion', None)
    state['exercises'] = [ex for ex in state['exercises'] if ex['id'] not in BASE_IDS]
    state['exercises'][0].update(name='Pulley personalizado sintético', sets=2)
    state['sessions'] = [{
        'id': 'synthetic-old-session', 'planId': 'A', 'day': '2026-11-10',
        'timestamp': '2026-11-10T15:00:00Z', 'notes': 'Histórico sintético a preservar',
        'energy': 'normal', 'kneeNextDay': None,
        'entries': [{'id': 'pulley-aberto', 'pain': None, 'sets': [
            {'load': 30, 'reps': 12, 'rir': 2, 'warmup': False}]}],
    }]
    legacy[KEY] = json.dumps(state, ensure_ascii=False)
    draft = {'version': 1, 'savedAt': NOW.isoformat(), 'draft': {
        'planId': 'A', 'energy': 'normal', 'notes': 'Rascunho sintético em andamento',
        'plannedIds': ['pulley-aberto'], 'addedIds': [], 'skipped': [],
        'entries': {'pulley-aberto': {'id': 'pulley-aberto', 'pain': '', 'sets': [
            {'load': '30', 'reps': '11', 'rir': '2', 'warmup': False}]}}
    }}
    legacy[DRAFT_KEY] = json.dumps(draft, ensure_ascii=False)
    legacy.pop('forja.academia.safety-backup.v1', None)
    page = open_app(context, legacy, errors)
    upgraded = state_of(page)
    assert upgraded['abdomenDefaultsVersion'] == 1
    assert len(upgraded['exercises']) == len(state['exercises']) + 2
    assert [ex for ex in upgraded['exercises'] if ex['id'] not in BASE_IDS] == state['exercises']
    for key, value in state.items():
        if key != 'exercises':
            assert upgraded[key] == value, key
    assert json.loads(snapshot(page)[DRAFT_KEY]) == draft
    assert json.loads(snapshot(page)['forja.academia.safety-backup.v1']) == state
    assert page.locator('.exercise-card').count() == 1
    assert page.locator('[data-exercise="abdominal-solo"]').count() == 0, 'An upgrade changed a running workout'
    assert page.locator('[data-exercise="pulley-aberto"] [data-field="reps"]').first.input_value() == '11'

    migrated = snapshot(page)
    page.close()
    page = open_app(context, migrated, errors)
    assert snapshot(page) == migrated, 'Reload must not migrate twice or rewrite the draft'
    page.once('dialog', lambda dialog: dialog.accept())
    page.get_by_role('button', name='Cancelar', exact=True).click()
    page.locator('#nav [data-tab="plans"]').click()
    page.locator('[data-action="select-plan"][data-plan="A"]').click()
    page.locator('#plan-editor > summary').click()
    page.locator('[data-action="edit-ex"][data-ex="abdominal-solo"]').click()
    page.locator('#ex-name').fill('Abdominal solo personalizado sintético')
    page.locator('#ex-sets').fill('3')
    page.locator('#exercise-form input[name="active"]').uncheck()
    page.locator('#exercise-form button[type="submit"]').click()
    changed = next(ex for ex in state_of(page)['exercises'] if ex['id'] == 'abdominal-solo')
    assert changed['sets'] == 3 and changed['active'] is False
    assert changed['mode'] == 'bodyweight' and changed['bodyweight'] is True
    stable = snapshot(page)
    page.close()
    page = open_app(context, stable, errors)
    assert snapshot(page) == stable
    matches = [ex for ex in state_of(page)['exercises'] if ex['id'] == 'abdominal-solo']
    assert matches == [changed], 'User edits/deactivation must survive every reload'
    start_plan(page, 'A')
    assert page.locator('[data-exercise="abdominal-solo"]').count() == 0
    assert state_of(page)['sessions'] == state['sessions']
    page.close()


def check_catalog(context, seed, errors, folder):
    page = open_app(context, seed, errors)
    page.locator('#nav [data-tab="plans"]').click()
    page.locator('[data-action="training-destination"][data-to="catalog"]').click()
    before = readonly_baseline(page)
    for exercise_id, query, muscle in (
        ('abdominal-solo', 'abdominal', 'abs'),
        ('abdominal-inverso', 'abdominal', 'abs'),
        ('abdominal-polia', 'abdominal', 'abs'),
        ('pallof-press', 'pallof', 'obliques'),
    ):
        page.locator('#catalog-search').fill(query)
        page.locator(f'[data-action="catalog-view"][data-ex="{exercise_id}"]').click()
        assert page.locator('.catalog-detail-unmapped').count() == 0
        viewer = page.locator('.catalog-detail .ex-anatomy-viewer')
        assert viewer.get_attribute('data-anatomy-view') == 'front'
        svg = viewer.locator('svg[role="img"]')
        assert svg.locator(f'.ex-anatomy-primary [data-muscle="{muscle}"]').count() > 0
        assert svg.locator('title').text_content().strip()
        viewer.get_by_role('button', name='Costas', exact=True).click()
        assert viewer.get_attribute('data-anatomy-view') == 'back'
        assert viewer.locator('.ex-anatomy-primary [data-muscle="abs"], .ex-anatomy-primary [data-muscle="obliques"]').count() == 0
        assert 'Veja Frente' in viewer.inner_text()
        front = viewer.get_by_role('button', name='Frente', exact=True)
        front.focus()
        front.press('Space')
        assert front.get_attribute('aria-pressed') == 'true'
        assert front.evaluate('node => document.activeElement === node')
        if exercise_id in ('abdominal-solo', 'pallof-press'):
            for width in (320, 390, 412):
                page.set_viewport_size({'width': width, 'height': 900})
                assert_width(page, viewer)
                viewer.screenshot(path=str(folder / f'abdomen-catalog-{exercise_id}-{width}.png'))
        assert_readonly(page, before)
        page.locator('[data-action="catalog-back"]').click()
    assert_readonly(page, before)
    page.close()


def check_logging(context, seed, errors, folder):
    page = open_app(context, seed, errors)
    start_plan(page, 'A')
    exercise = page.locator('[data-exercise="abdominal-solo"]')
    assert exercise.locator('[data-field="reps"]').count() == 2
    assert exercise.locator('[data-field="load"]').first.input_value() == '0'
    assert exercise.locator('[data-field="reps"]').first.input_value() == ''
    assert '0 séries efetivas registradas' in page.locator('.focus-progress-label').inner_text()
    assert exercise.locator('[data-action="apply-reco"]').count() == 0

    # Explicit zero is bodyweight; a missing load must stay incomplete.
    exercise.locator('[data-field="load"]').first.fill('')
    exercise.locator('[data-field="reps"]').first.fill('12')
    exercise.locator('[data-field="rir"]').first.fill('2')
    page.get_by_role('button', name='Salvar treino', exact=True).click()
    assert state_of(page)['sessions'] == []
    assert DRAFT_KEY in snapshot(page)
    exercise.locator('[data-field="load"]').first.fill('0')
    assert '1 série efetiva registrada' in page.locator('.focus-progress-label').inner_text()
    exercise.locator('[data-action="quick-set-confirm"]').first.click()
    assert 'Série registrada' in page.locator('#toast').inner_text()

    # A zero-load machine record must still prevent saving, even alongside a
    # valid bodyweight set. Clearing unperformed reps then makes it a skip.
    pulley = page.locator('[data-exercise="pulley-aberto"]')
    pulley.locator('[data-field="load"]').first.fill('0')
    pulley.locator('[data-field="reps"]').first.fill('10')
    page.get_by_role('button', name='Salvar treino', exact=True).click()
    assert state_of(page)['sessions'] == []
    assert DRAFT_KEY in snapshot(page)
    pulley.locator('[data-field="reps"]').first.fill('')
    page.get_by_role('button', name='Ativar modo focado', exact=True).click()
    page.locator('[data-action="focus-select"][data-ex="abdominal-solo"]').click()
    exercise.locator('.ex-anatomy > summary').click()
    for width in (320, 390, 412):
        page.set_viewport_size({'width': width, 'height': 960})
        assert_width(page, exercise)
        exercise.screenshot(path=str(folder / f'abdomen-session-{width}.png'))
    draft = json.loads(snapshot(page)[DRAFT_KEY])['draft']
    assert draft['entries']['abdominal-solo']['sets'][1]['reps'] == ''
    page.get_by_role('button', name='Salvar treino', exact=True).click()
    saved = state_of(page)
    assert len(saved['sessions']) == 1
    recorded = saved['sessions'][0]
    assert len(recorded['entries']) == 1
    assert recorded['entries'][0]['id'] == 'abdominal-solo'
    assert recorded['entries'][0]['sets'] == [{'load': 0, 'reps': 12, 'rir': 2, 'warmup': False}]
    assert any(row['id'] == 'pulley-aberto' for row in recorded['skipped'])
    assert not any(row['id'] == 'abdominal-solo' for row in recorded['skipped'])
    assert DRAFT_KEY not in snapshot(page)
    page.locator('.history-card > summary').first.click()
    assert 'Abdominal' in page.locator('.history-card').first.inner_text()
    assert '1 séries efetivas' in page.locator('.history-card').first.inner_text() or '1 série efetiva' in page.locator('.history-card').first.inner_text()

    before = readonly_baseline(page)
    card = open_map(page)
    assert card.get_by_label('Explorar músculo', exact=True).locator('option').count() == 20
    for days in (7, 30, 90):
        card.locator(f'[data-action="evo-volume-days"][data-days="{days}"]').click()
        assert_total(card, 'abs', 1)
        assert_total(card, 'obliques', .5)
    target = card.locator('svg [data-muscle-region="abs"]')
    target.locator('path').first.tap()
    assert card.get_by_label('Explorar músculo', exact=True).input_value() == 'abs'
    assert card.locator('#muscle-map-detail').get_attribute('data-selected-muscle') == 'abs'
    target.focus()
    target.press('Enter')
    assert card.locator('#muscle-map-detail').get_attribute('data-selected-muscle') == 'abs'
    assert 'Abdominal' in card.locator('#muscle-map-detail').inner_text()
    assert card.locator('.muscle-map-row:visible, .muscle-map-chip:visible').count() == 0
    assert card.locator('svg [data-muscle-unmapped="abs"], svg [data-muscle-unmapped="obliques"]').count() == 0
    for width in (320, 390, 412):
        page.set_viewport_size({'width': width, 'height': 960})
        assert_bounds(page, card)
        card.screenshot(path=str(folder / f'abdomen-map-{width}.png'))
    assert_readonly(page, before)
    page.locator('.top-settings').click()
    with page.expect_download() as download_info:
        page.locator('[data-action="export-json"]').click()
    download = download_info.value
    exported = json.loads(Path(download.path()).read_text(encoding='utf-8'))
    assert exported == saved, 'Backup must preserve zero load and bodyweight metadata'
    restored = open_app(context, {}, errors)
    for _ in range(2):
        restored.locator('.top-settings').click()
        restored.once('dialog', lambda dialog: dialog.accept())
        restored.locator('#import-file').set_input_files({
            'name': 'forja-synthetic-bodyweight-backup.json', 'mimeType': 'application/json',
            'buffer': json.dumps(exported, ensure_ascii=False).encode('utf-8'),
        })
        restored.wait_for_function("document.getElementById('import-file').value === ''", timeout=10000)
        assert state_of(restored)['sessions'] == saved['sessions']
        assert state_of(restored)['abdomenDefaultsVersion'] == 1
    restored.close()
    stable = snapshot(page)
    page.close()
    page = open_app(context, stable, errors)
    assert state_of(page)['sessions'] == saved['sessions']
    start_plan(page, 'A')
    exercise = page.locator('[data-exercise="abdominal-solo"]')
    assert exercise.locator('[data-field="load"]').first.input_value() == '0'
    assert exercise.locator('[data-field="reps"]').first.input_value() == ''
    assert exercise.locator('.previous-workout-reference').first.is_visible()
    assert exercise.locator('[data-action="apply-reco"]').count() == 0
    assert '0 séries efetivas registradas' in page.locator('.focus-progress-label').inner_text()
    page.close()

    inverse = open_app(context, seed, errors)
    start_plan(inverse, 'B')
    ex = inverse.locator('[data-exercise="abdominal-inverso"]')
    assert ex.locator('[data-field="load"]').first.input_value() == '0'
    ex.locator('[data-field="reps"]').first.fill('10')
    ex.locator('[data-field="rir"]').first.fill('2')
    inverse.get_by_role('button', name='Salvar treino', exact=True).click()
    recorded = state_of(inverse)['sessions'][0]['entries']
    assert len(recorded) == 1 and recorded[0]['id'] == 'abdominal-inverso'
    assert recorded[0]['sets'][0]['load'] == 0
    inverse.close()


def main():
    folder = ROOT / 'screenshots'
    folder.mkdir(exist_ok=True)
    errors = []
    assert 'training-sets.js' in SCRIPTS
    with sync_playwright() as playwright:
        executable = os.environ.get('CHROMIUM_PATH') or shutil.which('chromium') or shutil.which('google-chrome')
        options = {'headless': True, 'args': ['--no-sandbox']}
        if executable:
            options['executable_path'] = executable
        browser = playwright.chromium.launch(**options)
        context = browser.new_context(viewport={'width': 390, 'height': 844}, locale='pt-BR',
                                      timezone_id='America/Sao_Paulo', has_touch=True)
        seed = make_seed(context, errors)
        check_migration(context, seed, errors)
        check_catalog(context, seed, errors, folder)
        check_logging(context, seed, errors, folder)
        assert not errors, errors
        browser.close()
    print('PASS abdomen: A/B complements, additive migration and edited/deactivated defaults, preserved history/draft, read-only anatomy, explicit bodyweight 0kg through save/history/map, blank/machine-zero rejected, 320/390/412px')


if __name__ == '__main__':
    main()
