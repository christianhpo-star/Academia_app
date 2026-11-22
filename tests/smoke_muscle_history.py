"""Whole-body muscle history: real UI, isolated synthetic records and fixed dates.

Exercises straddle the exact 7/30/90-day boundaries. The map must react to the
selected period and view without changing saved workouts or an active draft.
This is responsive Chromium QA, not a physical-phone or screen-reader audit.
"""
import copy
import json
import os
import re
import shutil
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
RAW = (ROOT / 'index.html').read_text(encoding='utf-8')
SCRIPTS = re.findall(r'<script defer src="\./([^?"#]+)(?:\?[^"]*)?"></script>', RAW)
HTML = re.sub(r'<script defer src="\./[^"]+"></script>', '', RAW)
HTML = re.sub(r'<link rel="stylesheet" href="\./styles\.css\?v=[^"]+" />', '', HTML)
KEY = 'forja.academia.v1'
DRAFT_KEY = 'forja.academia.draft.v1'
TODAY = date(2026, 11, 22)
NOW = datetime(2026, 11, 22, 15, 0, tzinfo=timezone.utc)


def open_app(context, stored, errors):
    page = context.new_page()
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.clock.set_fixed_time(NOW)
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
    assert snapshot(page) == before, 'The muscle map changed stored records or the draft'
    assert page.evaluate('window.__storageWrites') == [], 'Read-only map controls wrote to storage'


def open_map(page):
    page.locator('#nav [data-tab="progress"]').click()
    page.locator('[data-action="evo-view"][data-view="training"]').click()
    card = page.locator('.muscle-map-card')
    assert card.count() == 1
    assert page.locator('.evo-volume-card').count() == 1
    assert card.get_by_role('heading', name='Mapa muscular', exact=True).count() == 1
    assert page.locator('.evo-volume-bars').count() == 0
    return card


def assert_svg(card, view):
    svg = card.locator(f'svg[data-muscle-body-view="{view}"]')
    assert svg.count() == 1
    assert svg.get_attribute('role') == 'group'
    assert svg.locator(':scope > title').text_content().strip()
    assert svg.locator(':scope > desc').text_content().strip()
    assert svg.evaluate("""node => {
      const refs = (node.getAttribute('aria-labelledby') || '').split(/\\s+/);
      const ids = Array.from(node.querySelectorAll('[id]'), item => item.id);
      return refs.length > 0 && refs.every(id => ids.includes(id)) &&
        ids.length === new Set(ids).size;
    }""")
    groups = svg.locator('g[data-muscle-region]')
    assert groups.count() > 5
    assert groups.evaluate_all("""nodes =>
      nodes.length === new Set(nodes.map(node => node.dataset.muscle)).size &&
      nodes.every(node => node.getAttribute('role') === 'button' &&
        node.getAttribute('tabindex') === '0' &&
        node.getAttribute('aria-label') && node.querySelector('title'))
    """), 'Each bilateral muscle must have one named, keyboard-accessible target'
    # Non-estimated regions must remain distinct from mapped regions with zero.
    unmapped = svg.locator('[data-muscle-unmapped]')
    assert unmapped.count() >= 1
    assert unmapped.evaluate_all("""nodes => nodes.every(node =>
      !node.hasAttribute('data-level') && !node.hasAttribute('data-total'))""")
    return svg


def region(card, muscle):
    return card.locator(f'svg g[data-muscle-region="{muscle}"]')


def assert_total(card, muscle, total):
    target = region(card, muscle)
    assert target.count() == 1, muscle
    assert float(target.get_attribute('data-total')) == total, (muscle, total, target.get_attribute('data-total'))
    level = int(target.get_attribute('data-level'))
    assert 0 <= level <= 3
    assert (level == 0) == (total == 0), (muscle, level, total)
    return target


def choose_period(card, days, keyboard=False):
    button = card.locator(f'[data-action="evo-volume-days"][data-days="{days}"]')
    if keyboard:
        button.focus()
        button.press('Space')
    else:
        button.tap()
    assert card.get_attribute('data-muscle-days') == str(days)
    assert button.get_attribute('aria-pressed') == 'true'
    assert card.locator('[data-action="evo-volume-days"][aria-pressed="true"]').count() == 1
    assert button.evaluate('node => document.activeElement === node')
    return button


def choose_view(card, view, keyboard=False):
    button = card.locator(f'[data-action="muscle-map-view"][data-view="{view}"]')
    if keyboard:
        button.focus()
        button.press('Enter')
    else:
        button.tap()
    assert card.get_attribute('data-muscle-view') == view
    assert button.get_attribute('aria-pressed') == 'true'
    assert card.locator('[data-action="muscle-map-view"][aria-pressed="true"]').count() == 1
    assert button.evaluate('node => document.activeElement === node')
    return assert_svg(card, view)


def assert_bounds(page, card):
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
    assert card.evaluate("""node => {
      const box = node.getBoundingClientRect();
      return box.width > 200 && box.left >= -1 && box.right <= innerWidth + 1 &&
        node.scrollWidth <= box.width + 1;
    }""")
    for button in card.locator('[data-action="evo-volume-days"], [data-action="muscle-map-view"]').all():
        box = button.bounding_box()
        assert box and box['height'] >= 44, box
        assert box['x'] >= -1 and box['x'] + box['width'] <= page.viewport_size['width'] + 1, box


def work_sets(count):
    return [{'load': 20, 'reps': 10, 'rir': 2, 'warmup': False} for _ in range(count)]


def entry(exercise, count):
    return {'id': exercise, 'pain': None, 'sets': work_sets(count)}


def session(age, entries, suffix=''):
    day = (TODAY - timedelta(days=age)).isoformat()
    return {
        'id': f'synthetic-muscle-{age}{suffix}', 'planId': 'B', 'day': day,
        'timestamp': day + 'T14:00:00Z', 'energy': 'normal', 'notes': '', 'kneeNextDay': None,
        'entries': entries,
        'skipped': [{'id': 'remada-baixa', 'reason': 'sem-registro', 'automatic': True}],
    }


def populated_storage(seed, unknown_only=False):
    stored = copy.deepcopy(seed)
    state = json.loads(stored[KEY])
    state['settings'].update(startWeight=80, targetWeight=76, goalDate='2027-03-01')
    state['weights'] = [{'id': 'synthetic-map-weight', 'date': TODAY.isoformat(), 'weight': 80}]
    unknown = 'custom-synthetic-muscle-map'
    state['exercises'].append({**state['exercises'][0], 'id': unknown,
                               'name': 'Movimento sintético sem classificação', 'active': False})
    state['sessions'] = [session(0, [entry(unknown, 2)])]
    if not unknown_only:
        bench = entry('supino-halteres', 3)
        bench['sets'].extend([
            {'load': 10, 'reps': 12, 'rir': 4, 'warmup': True},
            {'load': 0, 'reps': 10, 'rir': 2, 'warmup': False},
            {'load': 20, 'reps': '', 'rir': 2, 'warmup': False},
        ])
        invalid_day = session(0, [entry('elevacao-lateral', 2)], '-invalid-day')
        invalid_day['day'] = '2026-02-30'
        state['sessions'] += [
            session(0, [bench, entry('flexora-c', 2)], '-known'),
            session(6, [entry('panturrilha-leg', 1)]),
            session(7, [entry('extensora', 4)]),
            session(29, [entry('voador-inverso', 5)]),
            session(30, [entry('abdutora', 6)]),
            session(89, [entry('cadeira-adutora', 7)]),
            session(90, [entry('remada-baixa', 2)]),
            session(-1, [entry('gluteo-cabo', 2)]),
            invalid_day,
        ]
        # A filled, recoverable draft must never inflate the saved-history map.
        stored[DRAFT_KEY] = json.dumps({
            'version': 1, 'savedAt': NOW.isoformat(),
            'draft': {'planId': 'B', 'energy': 'normal', 'notes': '',
                      'plannedIds': ['supino-inclinado'], 'addedIds': [], 'skipped': [],
                      'entries': {'supino-inclinado': entry('supino-inclinado', 12)}}
        }, ensure_ascii=False)
    state['muay']['sessions'] = []
    stored[KEY] = json.dumps(state, ensure_ascii=False)
    return stored


def check_populated(context, seed, errors, folder):
    page = open_app(context, populated_storage(seed), errors)
    assert 'forja.academia.unreadable-copy.v1' not in snapshot(page), 'Synthetic archive failed app validation'
    before = readonly_baseline(page)
    card = open_map(page)
    assert card.get_attribute('data-muscle-days') == '30'
    assert card.get_attribute('data-muscle-view') == 'front'
    assert_svg(card, 'front')
    assert card.locator('.muscle-map-coverage').is_visible()
    assert card.locator('.muscle-map-legend').is_visible()
    assert_total(card, 'chest', 3)
    assert_total(card, 'frontDelts', 1.5)
    assert_total(card, 'quadriceps', 4)
    assert_total(card, 'adductors', 0)

    # The controls are stable DOM nodes, so keyboard and touch keep their focus.
    card.locator('[data-action="evo-volume-days"], [data-action="muscle-map-view"]').evaluate_all(
        'nodes => { window.__muscleControls = nodes; }')
    choose_period(card, 7, keyboard=True)
    assert_total(card, 'chest', 3)
    assert_total(card, 'quadriceps', 0)
    choose_view(card, 'back', keyboard=True)
    assert_total(card, 'hamstrings', 2)
    assert_total(card, 'calves', 1)
    assert_total(card, 'triceps', 1.5)
    assert_total(card, 'rearDelts', 0)
    assert_total(card, 'glutes', 0)  # The future record must stay excluded.
    assert_total(card, 'lats', 0)  # Neither a skip nor an out-of-window row is work.
    choose_period(card, 30)
    assert_total(card, 'rearDelts', 5)
    assert_total(card, 'midTraps', 2.5)
    assert_total(card, 'rhomboids', 2.5)
    assert_total(card, 'hipAbductors', 0)
    choose_period(card, 90, keyboard=True)
    assert_total(card, 'hipAbductors', 6)
    assert_total(card, 'lats', 0)
    choose_view(card, 'front')
    assert_total(card, 'adductors', 7)
    assert_total(card, 'sideDelts', 0)  # Invalid calendar dates must not leak in.
    assert card.locator('[data-action="evo-volume-days"], [data-action="muscle-map-view"]').evaluate_all(
        'nodes => nodes.length === window.__muscleControls.length && nodes.every((n, i) => n === window.__muscleControls[i])')

    # Selecting a colored SVG target also works with Enter and Space.
    target = region(card, 'chest')
    target.locator('path').first.tap()
    assert region(card, 'chest').get_attribute('aria-pressed') == 'true'
    assert card.locator('#muscle-map-detail').get_attribute('data-selected-muscle') == 'chest'
    target = region(card, 'chest')
    target.focus()
    target.press('Enter')
    target = region(card, 'chest')
    assert target.get_attribute('aria-pressed') == 'true'
    assert target.evaluate('node => document.activeElement === node')
    assert card.locator('#muscle-map-detail').is_visible()
    assert card.locator('#muscle-map-detail').inner_text().strip()
    quad = region(card, 'quadriceps')
    quad.focus()
    quad.press('Space')
    assert region(card, 'quadriceps').get_attribute('aria-pressed') == 'true'
    assert region(card, 'quadriceps').evaluate('node => document.activeElement === node')
    select = card.get_by_label('Explorar músculo', exact=True)
    select.focus()
    select.select_option('calves')
    assert select.input_value() == 'calves'
    assert select.evaluate('node => document.activeElement === node')
    assert 'Panturrilha' in card.locator('#muscle-map-detail').inner_text()
    assert card.get_attribute('data-muscle-view') == 'back'
    assert region(card, 'calves').get_attribute('aria-pressed') == 'true'

    # Adductors are both the leading insight chip and a row in the complete
    # list. Selecting the row must not move focus to the other copy.
    assert card.locator('.muscle-map-chip[data-muscle="adductors"]').count() == 1
    card.locator('.muscle-map-breakdown > summary').click()
    row = card.locator('.muscle-map-row[data-muscle="adductors"]')
    row.focus()
    row.press('Enter')
    row = card.locator('.muscle-map-row[data-muscle="adductors"]')
    assert row.get_attribute('aria-pressed') == 'true'
    assert row.evaluate('node => document.activeElement === node')
    assert card.locator('.muscle-map-breakdown').evaluate('node => node.open')
    assert card.get_attribute('data-muscle-view') == 'front'
    card.locator('.muscle-map-breakdown > summary').click()

    for width in (320, 390, 412, 768, 1440):
        page.set_viewport_size({'width': width, 'height': 960})
        choose_view(card, 'front')
        assert_bounds(page, card)
        card.screenshot(path=str(folder / f'muscle-history-front-{width}.png'))
        if width in (320, 390, 412):
            choose_view(card, 'back')
            assert_bounds(page, card)
            card.screenshot(path=str(folder / f'muscle-history-back-{width}.png'))
    page.emulate_media(reduced_motion='reduce')
    choose_period(card, 7)
    assert card.locator('svg').evaluate('node => node.getAnimations({subtree:true}).length === 0')
    assert_readonly(page, before)
    page.locator('[data-action="evo-view"][data-view="weight"]').click()
    page.locator('[data-action="evo-view"][data-view="training"]').click()
    assert card.get_attribute('data-muscle-days') == '7'
    assert_readonly(page, before)
    choose_view(card, 'back')
    assert_total(card, 'calves', 1)
    assert_total(card, 'glutes', 0)
    # An installed PWA may remain alive across midnight. pageshow must refresh
    # the open map without requiring a period button click or writing history.
    page.clock.set_fixed_time(NOW + timedelta(days=1))
    page.evaluate("window.dispatchEvent(new Event('pageshow'))")
    assert card.get_attribute('data-muscle-days') == '7'
    assert '23/11' in card.locator('.muscle-map-period-label').inner_text()
    assert_total(card, 'calves', 0)
    assert_total(card, 'glutes', 2)
    assert_total(card, 'hamstrings', 2)
    assert_readonly(page, before)
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
        context = browser.new_context(viewport={'width': 390, 'height': 844},
                                      device_scale_factor=1, locale='pt-BR',
                                      timezone_id='America/Sao_Paulo', has_touch=True)
        for required in ('exercise-anatomy.js', 'muscle-history.js', 'muscle-body.js', 'muscle-map.js'):
            assert required in SCRIPTS, required
        page = open_app(context, {}, errors)
        assert page.locator('#home-step-date').input_value() == TODAY.isoformat()
        # Persist a canonical, fully migrated template using an ordinary action.
        page.locator('#home-step-count').fill('3200')
        page.locator('#home-steps-form button[type="submit"]').click()
        seed = snapshot(page)
        before = readonly_baseline(page)
        card = open_map(page)
        assert 'Mapa sem registros neste período' in card.inner_text()
        assert_svg(card, 'front')
        assert card.locator('svg [data-muscle-region]').evaluate_all(
            "nodes => nodes.every(node => node.dataset.total === '0' && node.dataset.level === '0')")
        choose_period(card, 7, keyboard=True)
        choose_view(card, 'back', keyboard=True)
        assert_readonly(page, before)
        card.screenshot(path=str(folder / 'muscle-history-empty-390.png'))
        page.close()

        unknown = open_app(context, populated_storage(seed, unknown_only=True), errors)
        before = readonly_baseline(unknown)
        card = open_map(unknown)
        assert card.locator('.muscle-map-coverage').is_visible()
        assert card.locator('svg [data-muscle-region]').evaluate_all(
            "nodes => nodes.every(node => node.dataset.total === '0' && node.dataset.level === '0')")
        assert_readonly(unknown, before)
        unknown.close()
        check_populated(context, seed, errors, folder)
        assert not errors, errors
        browser.close()
    print('PASS muscle history: saved-only 7/30/90 boundaries, front/back regions, unknown/empty, keyboard/touch/list focus, midnight refresh, unchanged storage/draft, 320/390/412/768/1440px')


if __name__ == '__main__':
    main()
