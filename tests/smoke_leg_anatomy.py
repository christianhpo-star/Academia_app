"""Leg anatomy in the catalog and C/D sessions, using only synthetic records.

View switches must preserve two complete sets, input nodes, focus and storage.
This is a responsive Chromium test, not physical Android/PWA homologation.
"""
import json
import os
import re
import shutil
from pathlib import Path

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
RAW = (ROOT / 'index.html').read_text(encoding='utf-8')
SCRIPTS = re.findall(r'<script defer src="\./([^?"#]+)(?:\?[^"]*)?"></script>', RAW)
HTML = re.sub(r'<script defer src="\./[^"]+"></script>', '', RAW)
HTML = re.sub(r'<link rel="stylesheet" href="\./styles\.css\?v=[^"]+" />', '', HTML)
DRAFT_KEY = 'forja.academia.draft.v1'
WIDTHS = (320, 390, 412)


def open_app(context, stored, errors):
    page = context.new_page()
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.set_content(HTML)
    page.evaluate("""seed => {
      window.__testStorage = {...seed};
      window.__storageWrites = [];
      Object.defineProperty(window, 'localStorage', {configurable: true, value: {
        getItem(key) { return window.__testStorage[key] ?? null; },
        setItem(key, value) {
          window.__storageWrites.push(['set', key]);
          window.__testStorage[key] = String(value);
        },
        removeItem(key) {
          window.__storageWrites.push(['remove', key]);
          delete window.__testStorage[key];
        }
      }});
    }""", stored)
    page.add_style_tag(path=str(ROOT / 'styles.css'))
    for script in SCRIPTS:
        page.add_script_tag(path=str(ROOT / script))
    page.locator('#screen h1').wait_for(timeout=12000)
    return page


def snapshot(page):
    return page.evaluate('structuredClone(window.__testStorage)')


def readonly_baseline(page):
    page.evaluate('window.__storageWrites = []')
    return snapshot(page)


def assert_readonly(page, before):
    assert snapshot(page) == before, 'Anatomy consultation changed saved records'
    assert page.evaluate('window.__storageWrites') == [], 'Anatomy consultation wrote to storage'


def assert_svg_names(viewer, view):
    svg = viewer.locator('.ex-anatomy-canvas svg[role="img"]')
    assert svg.count() == 1
    assert svg.get_attribute('data-anatomy-body') == 'lower'
    assert svg.get_attribute('data-anatomy-figure-view') == view
    assert ('Vista anterior' if view == 'front' else 'Vista posterior') in svg.locator('title').text_content()
    assert svg.locator('desc').text_content().strip()
    assert svg.evaluate("""node => node.getAttribute('aria-labelledby').split(/\\s+/).every(
      id => node.querySelector('[id="' + id + '"]'))""")
    return svg


def switch_view(viewer, view, keyboard=False):
    button = viewer.get_by_role('button', name='Frente' if view == 'front' else 'Costas', exact=True)
    if keyboard:
        button.focus()
        button.press('Space')
    else:
        button.click()
    assert viewer.get_attribute('data-anatomy-view') == view
    assert button.get_attribute('aria-pressed') == 'true'
    assert viewer.locator('button[aria-pressed="true"]').count() == 1
    assert button.evaluate('(node) => document.activeElement === node')
    assert viewer.locator('[role="status"][aria-live="polite"]').count() == 1
    return assert_svg_names(viewer, view)


def assert_unique_svg_ids(page):
    assert page.evaluate("""() => {
      const ids = Array.from(document.querySelectorAll('.ex-anatomy-svg [id]'), node => node.id);
      return ids.length === new Set(ids).size;
    }"""), 'Repeated leg maps must have independent SVG names and paint references'


def assert_mobile_bounds(page, viewer):
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
    assert viewer.evaluate("""node => {
      const box = node.getBoundingClientRect();
      return box.width > 200 && box.left >= -1 && box.right <= innerWidth + 1 &&
        node.scrollWidth <= box.width + 1;
    }""")
    for button in viewer.get_by_role('button').all():
        box = button.bounding_box()
        assert box and box['height'] >= 44, box
        assert box['x'] >= -1 and box['x'] + box['width'] <= page.viewport_size['width'] + 1, box


def capture_widths(page, viewer, prefix, folder):
    for width in WIDTHS:
        page.set_viewport_size({'width': width, 'height': 844})
        assert_mobile_bounds(page, viewer)
        viewer.screenshot(path=str(folder / f'anatomy-legs-{prefix}-{width}.png'))


def check_catalog(context, errors, folder):
    page = open_app(context, {}, errors)
    page.get_by_role('button', name='Treinos', exact=True).click()
    page.locator('[data-action="training-destination"][data-to="catalog"]').click()
    before = readonly_baseline(page)
    # One visible example of each new region, plus variants whose block would
    # be misleading if the map were inferred from C or D instead of its ID.
    cases = [
        ('agachamento-hack', 'agachamento hack', 'front', 'quadriceps', True),
        ('flexora-c', 'mesa flexora', 'back', 'hamstrings', True),
        ('extensora-d', 'cadeira extensora', 'front', 'quadriceps', False),
        ('hip-thrust-maquina', 'elevação pélvica na máquina', 'back', 'glutes', True),
        ('abdutora', 'cadeira abdutora', 'back', 'hipAbductors', True),
        ('cadeira-adutora', 'cadeira adutora', 'front', 'adductors', True),
        ('panturrilha-leg', 'panturrilha no leg press', 'back', 'calves', True),
        ('sumo-maquina', 'sumô na máquina', 'back', 'glutes', False),
    ]
    for exercise_id, query, initial_view, region, capture in cases:
        page.locator('#catalog-search').fill(query)
        page.locator(f'[data-action="catalog-view"][data-ex="{exercise_id}"]').click()
        detail = page.locator('.catalog-detail')
        assert detail.locator('.catalog-detail-unmapped').count() == 0
        assert 'ainda não revisada' not in detail.locator('.catalog-detail-technique').inner_text()
        assert page.locator('#catalog-detail-heading').evaluate('(node) => document.activeElement === node')
        viewer = detail.locator('.ex-anatomy-viewer')
        assert viewer.get_attribute('data-anatomy-view') == initial_view, exercise_id
        svg = assert_svg_names(viewer, initial_view)
        assert svg.locator(f'.ex-anatomy-primary [data-muscle="{region}"]').count() > 0
        opposite = 'back' if initial_view == 'front' else 'front'
        opposite_svg = switch_view(viewer, opposite, keyboard=True)
        assert opposite_svg.locator(f'.ex-anatomy-primary [data-muscle="{region}"]').count() == 0
        switch_view(viewer, initial_view)
        if capture:
            capture_widths(page, viewer, f'catalog-{exercise_id}-{initial_view}', folder)
        assert_unique_svg_ids(page)
        assert_readonly(page, before)
        page.locator('[data-action="catalog-back"]').click()
        assert page.locator('#catalog-search').input_value() == query
        assert page.locator(f'[data-action="catalog-view"][data-ex="{exercise_id}"]').evaluate(
            '(node) => document.activeElement === node')
    assert page.evaluate('localStorage.getItem("' + DRAFT_KEY + '")') is None
    assert_readonly(page, before)
    page.close()


def fill_two_sets(exercise, values):
    for index, row in enumerate(values):
        for field, value in row.items():
            exercise.locator(f'.set-grid input[data-field="{field}"]').nth(index).fill(value)
    # Finish input/change autosave before checking that view controls are read-only.
    exercise.locator('.set-grid input[data-field="rir"]').nth(1).press('Tab')


def assert_two_sets(exercise, values):
    for index, row in enumerate(values):
        for field, value in row.items():
            assert exercise.locator(f'.set-grid input[data-field="{field}"]').nth(index).input_value() == value


def check_session(context, errors, folder, plan, exercise_id, values):
    page = open_app(context, {}, errors)
    page.get_by_role('button', name='Treinos', exact=True).click()
    page.locator(f'[data-action="select-plan"][data-plan="{plan}"]').click()
    page.locator(f'[data-action="start"][data-plan="{plan}"]').click()
    exercise = page.locator(f'[data-exercise="{exercise_id}"]')
    fill_two_sets(exercise, values)
    inputs = exercise.locator('.set-grid input')
    inputs.evaluate_all('(nodes) => { window.__legSetInputs = nodes; }')
    before = readonly_baseline(page)
    guide = exercise.locator('.ex-anatomy')
    assert guide.get_attribute('open') is None
    assert guide.locator('.ex-anatomy-thumb svg[data-anatomy-body="lower"][aria-hidden="true"]').count() == 1
    guide.locator('summary').click()
    viewer = guide.locator('.ex-anatomy-viewer')
    assert viewer.get_attribute('data-anatomy-view') == 'back', exercise_id
    assert assert_svg_names(viewer, 'back').locator('.ex-anatomy-primary [data-muscle="hamstrings"]').count() > 0
    front = switch_view(viewer, 'front', keyboard=True)
    assert front.locator('.ex-anatomy-primary [data-muscle="hamstrings"]').count() == 0
    assert 'Sem músculos destacados' in viewer.locator('.ex-anatomy-view-note').inner_text()
    switch_view(viewer, 'back')
    assert_two_sets(exercise, values)
    assert inputs.evaluate_all("""nodes => nodes.length === window.__legSetInputs.length &&
      nodes.every((node, index) => node === window.__legSetInputs[index])"""), 'Switching views remounted set inputs'
    assert_readonly(page, before)
    assert_unique_svg_ids(page)
    capture_widths(page, viewer, f'session-{plan.lower()}-{exercise_id}-back', folder)
    page.emulate_media(reduced_motion='reduce')
    switch_view(viewer, 'front', keyboard=True)
    assert viewer.locator('.ex-anatomy-canvas').evaluate('(node) => node.getAnimations({subtree:true}).length === 0')
    switch_view(viewer, 'back')
    assert_readonly(page, before)
    # Visiting the independent library also keeps the same two completed sets.
    page.locator('[data-action="training-destination"][data-to="catalog"]').click()
    page.locator('.training-draft-notice [data-to="plans"]').click()
    assert_two_sets(exercise, values)
    assert_readonly(page, before)
    assert json.loads(snapshot(page)[DRAFT_KEY])['draft']['entries'][exercise_id]['sets'][:2] == \
        json.loads(before[DRAFT_KEY])['draft']['entries'][exercise_id]['sets'][:2]
    page.close()


def main():
    folder = ROOT / 'screenshots'
    folder.mkdir(exist_ok=True)
    errors = []
    with sync_playwright() as playwright:
        executable = os.environ.get('CHROMIUM_PATH') or shutil.which('chromium') or shutil.which('google-chrome')
        options = {'headless': True, 'args': ['--no-sandbox']}
        if executable:
            options['executable_path'] = executable
        browser = playwright.chromium.launch(**options)
        context = browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=1, locale='pt-BR')
        assert 'exercise-anatomy.js' in SCRIPTS
        check_catalog(context, errors, folder)
        check_session(context, errors, folder, 'C', 'flexora-c', [
            {'load': '18', 'reps': '11', 'rir': '2'}, {'load': '20', 'reps': '9', 'rir': '1'}])
        check_session(context, errors, folder, 'D', 'stiff', [
            {'load': '24', 'reps': '10', 'rir': '3'}, {'load': '26', 'reps': '8', 'rir': '2'}])
        assert not errors, errors
        browser.close()
    print('PASS leg anatomy: catalog, C/D sessions, front/back regions, two sets and RIR, preserved inputs/focus/storage, 320/390/412px')


if __name__ == '__main__':
    main()
