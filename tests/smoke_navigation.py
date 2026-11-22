"""Navigation regression: clear screen roles and unchanged local histories/drafts.

All records are synthetic. Uses the shipped script order and an isolated storage
shim so filtering, consulting, and returning to a workout can be checked without
reading a user's browser profile.
"""
import copy
import json
import os
import re
import shutil
from datetime import date, timedelta
from pathlib import Path

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
RAW = (ROOT / 'index.html').read_text(encoding='utf-8')
SCRIPTS = re.findall(r'<script defer src="\./([^?"#]+)(?:\?[^"]*)?"></script>', RAW)
HTML = re.sub(r'<script defer src="\./[^"]+"></script>', '', RAW)
HTML = re.sub(r'<link rel="stylesheet" href="\./styles\.css\?v=[^"]+" />', '', HTML)
KEY = 'forja.academia.v1'
DRAFT_KEY = 'forja.academia.draft.v1'


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
    page.locator('#screen h1').wait_for()
    return page


def snapshot(page):
    return page.evaluate('structuredClone(window.__testStorage)')


def readonly_baseline(page):
    page.evaluate('window.__storageWrites = []')
    return snapshot(page)


def assert_readonly(page, before):
    assert snapshot(page) == before, 'Navigation changed the saved records or draft'
    assert page.evaluate('window.__storageWrites') == [], 'Read-only navigation wrote to storage'


def navigate(page, tab):
    page.locator(f'#nav [data-tab="{tab}"]').click()


def assert_evolution_selected(page, view, focused=False):
    selected = page.locator('.evo-tabs [aria-selected="true"]')
    assert selected.count() == 1
    assert selected.get_attribute('data-view') == view
    assert page.locator('.evo-tabs [tabindex="0"]').count() == 1
    assert selected.get_attribute('tabindex') == '0'
    assert page.locator('.evo-tabs [aria-selected="false"][tabindex="-1"]').count() == 2
    panel_id = selected.get_attribute('aria-controls')
    panel = page.locator(f'#{panel_id}')
    assert panel.is_visible()
    assert panel.get_attribute('role') == 'tabpanel'
    assert panel.get_attribute('aria-labelledby') == selected.get_attribute('id')
    if focused:
        assert selected.evaluate('node => document.activeElement === node')


def evolution_view(page, view):
    page.locator(f'.evo-tabs [data-view="{view}"]').click()
    assert_evolution_selected(page, view, focused=True)


def assert_fits(page, width):
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), f'overflow at {width}px'
    for selector in ['.evo-tabs button', '[data-action="history-filter"]', '.training-destinations button']:
        for button in page.locator(selector).all():
            if not button.is_visible():
                continue
            box = button.bounding_box()
            assert box and box['x'] >= -1 and box['x'] + box['width'] <= width + 1, (width, selector, box)
            assert box['height'] >= 44, (width, selector, box)


def populated_storage(seed, current_day):
    stored = copy.deepcopy(seed)
    state = json.loads(stored[KEY])
    state['settings'].update(startWeight=80, targetWeight=76, goalDate=(current_day + timedelta(days=90)).isoformat())
    state['weights'] = [
        {'id': 'synthetic-weight-1', 'date': (current_day - timedelta(days=14)).isoformat(), 'weight': 80},
        {'id': 'synthetic-weight-2', 'date': current_day.isoformat(), 'weight': 79.5},
    ]
    state['sessions'] = []
    for index in range(9):
        day = (current_day - timedelta(days=index + 1)).isoformat()
        state['sessions'].append({
            'id': f'synthetic-strength-{index}', 'planId': 'B', 'day': day,
            'timestamp': day + 'T14:00:00Z', 'energy': 'normal', 'notes': '', 'kneeNextDay': None,
            'entries': [{'id': 'supino-halteres', 'pain': None, 'sets': [
                {'load': 22, 'reps': 12 - index % 3, 'rir': 2, 'warmup': False}
            ]}],
        })
    state['muay']['sessions'] = []
    for index in range(7):
        day = (current_day - timedelta(days=index + 1)).isoformat()
        state['muay']['sessions'].append({
            'id': f'synthetic-muay-{index}', 'day': day, 'timestamp': day + 'T15:00:00Z',
            'place': 'academia', 'kind': 'aula', 'duration': 50, 'intensity': 7,
            'fatigue': 'moderada', 'kneePain': None, 'notes': '',
            'activities': [{'id': f'synthetic-activity-{index}', 'name': 'Combinação de teste',
                            'unit': 'min', 'quantity': 3, 'sets': 3, 'category': 'combination', 'side': 'total'}],
        })
    state['dailyRoutine'] = {
        'version': 1, 'enabled': True, 'records': [],
        'slots': [
            {'id': 'medication', 'label': '', 'time': '', 'active': False},
            {'id': 'supplement', 'label': 'Lembrete de teste', 'time': '', 'active': True},
        ],
    }
    stored[KEY] = json.dumps(state, ensure_ascii=False)
    return stored


with sync_playwright() as playwright:
    executable = os.environ.get('CHROMIUM_PATH') or shutil.which('chromium') or shutil.which('google-chrome')
    options = {'headless': True, 'args': ['--no-sandbox']}
    if executable:
        options['executable_path'] = executable
    browser = playwright.chromium.launch(**options)
    context = browser.new_context(viewport={'width': 390, 'height': 844}, locale='pt-BR')
    errors = []

    # Today's steps remain a direct, usable action on an otherwise empty home.
    page = open_app(context, {}, errors)
    assert page.locator('#home-steps-form').is_visible()
    current_day = date.fromisoformat(page.locator('#home-step-date').input_value())
    page.locator('#home-step-count').fill('6900')
    page.locator('#home-steps-form button[type="submit"]').click()
    saved = snapshot(page)
    assert json.loads(saved[KEY])['activitySteps'][0]['steps'] == 6900
    page.close()
    page = open_app(context, populated_storage(saved, current_day), errors)
    before = readonly_baseline(page)

    assert page.locator('.home-primary').count() == 1
    assert page.locator('.home-recovery').count() == 1
    assert page.locator('.daily-routine').is_visible()
    assert page.locator('.home-last-session, .home-steps-history, .history-card').count() == 0
    assert page.locator('#home-step-count').input_value() == '6900'

    # The step shortcut leads to the training overview, not to a second editor.
    page.locator('[data-action="progress-open-training"]').click()
    assert page.locator('#nav [data-tab="progress"]').get_attribute('aria-current') == 'page'
    assert page.locator('.evo-tabs [data-view="training"]').get_attribute('aria-selected') == 'true'
    assert page.locator('.progress-steps-card').count() == 1
    assert page.locator('.evo-volume-card').count() == 1
    assert page.locator('.progress-strength-card').count() == 1
    assert page.locator('.evo-performance').get_attribute('open') is None
    assert page.locator('.history-card, .muay-record, .history-calendar-fold, #home-steps-form').count() == 0
    assert page.locator('.evo-tabs [role="tab"]').count() == 3

    evolution_view(page, 'weight')
    # Roving tab focus follows keyboard selection, including wrap and boundaries.
    for key, expected in [
        ('ArrowRight', 'training'), ('ArrowRight', 'nutrition'), ('ArrowRight', 'weight'),
        ('ArrowLeft', 'nutrition'), ('Home', 'weight'), ('End', 'nutrition'),
        ('ArrowLeft', 'training'), ('Home', 'weight'),
    ]:
        page.locator('.evo-tabs [aria-selected="true"]').press(key)
        assert_evolution_selected(page, expected, focused=True)
    assert page.locator('.evo-body-chart').count() == 1
    assert page.locator('.progress-steps-card, .evo-volume-card, .progress-strength-card').count() == 0
    page.locator('[data-action="evo-chart-mode"][data-mode="measures"]').click()
    assert page.locator('#evo-measure-field').is_visible()
    page.locator('[data-action="evo-chart-mode"][data-mode="weight"]').click()
    evolution_view(page, 'nutrition')
    assert page.locator('#evo-panel-nutrition').is_visible()
    assert page.locator('.progress-steps-card, .evo-volume-card, .evo-body-chart').count() == 0
    assert_readonly(page, before)

    # History owns sessions/calendar and pagination remains explicit per modality.
    navigate(page, 'history')
    assert page.locator('[data-action="history-filter"]').count() == 3
    assert page.locator('[data-action="history-filter"][data-kind="all"]').get_attribute('aria-pressed') == 'true'
    assert page.locator('.history-card').count() == 3
    assert page.locator('.muay-record').count() == 3
    assert page.locator('.history-card[open], .muay-record[open]').count() == 0
    assert page.locator('.history-calendar-fold').count() == 1
    assert page.locator('.evo-body-chart, .evo-volume-card').count() == 0
    page.locator('[data-action="history-filter"][data-kind="strength"]').click()
    assert page.locator('.history-card').count() == 3
    assert page.locator('.muay-record').count() == 0
    page.locator('[data-action="history-more"][data-kind="strength"]').click()
    assert page.locator('.history-card').count() == 8
    page.locator('.history-card > summary').first.click()
    assert page.locator('.history-card[open]').count() == 1
    page.locator('[data-action="history-filter"][data-kind="muay"]').click()
    assert page.locator('[data-action="history-filter"][data-kind="muay"]').get_attribute('aria-pressed') == 'true'
    assert page.locator('.history-card').count() == 0
    assert page.locator('.muay-record').count() == 3
    page.locator('[data-action="history-more"][data-kind="muay"]').click()
    assert page.locator('.muay-record').count() == 7
    assert page.locator('[data-action="history-more"][data-kind="muay"]').count() == 0
    page.locator('.history-calendar-fold > summary').click()
    assert page.locator('.history-calendar-fold').get_attribute('open') is not None
    assert_readonly(page, before)

    # Backup operations have one destination in Settings.
    assert page.locator('[data-action="export-json"]').count() == 0
    page.locator('[data-action="history-data"]').click()
    assert page.locator('[data-action="export-json"]').is_visible()
    assert page.locator('[data-action="export-csv"]').is_visible()
    assert page.locator('[data-action="import-json"]').is_visible()
    assert_readonly(page, before)

    # All sections, including the three evolution tabs, fit narrow phone widths.
    screenshots = ROOT / 'screenshots'
    screenshots.mkdir(exist_ok=True)
    for width in [320, 390, 768]:
        page.set_viewport_size({'width': width, 'height': 844})
        navigate(page, 'home')
        assert_fits(page, width)
        if width in [320, 390]:
            page.screenshot(path=str(screenshots / f'navigation-home-{width}.png'), full_page=True)
        navigate(page, 'progress')
        for view in ['weight', 'training', 'nutrition']:
            evolution_view(page, view)
            assert_fits(page, width)
            if width in [320, 390] and view != 'nutrition':
                page.screenshot(path=str(screenshots / f'navigation-{view}-{width}.png'), full_page=True)
        navigate(page, 'history')
        assert_fits(page, width)
        if width in [320, 390]:
            page.screenshot(path=str(screenshots / f'navigation-history-{width}.png'), full_page=True)
    assert_readonly(page, before)

    # Consult the shared catalog and both anatomy views without starting a session.
    navigate(page, 'plans')
    page.locator('[data-action="training-destination"][data-to="catalog"]').click()
    page.locator('#catalog-search').fill('supino reto com barra')
    page.locator('[data-action="catalog-view"][data-ex="supino-barra"]').click()
    viewer = page.locator('.catalog-detail .ex-anatomy-viewer')
    viewer.get_by_role('button', name='Costas', exact=True).click()
    assert viewer.get_attribute('data-anatomy-view') == 'back'
    viewer.get_by_role('button', name='Frente', exact=True).click()
    assert viewer.get_attribute('data-anatomy-view') == 'front'
    assert snapshot(page).get(DRAFT_KEY) is None
    assert_readonly(page, before)

    # A populated session survives the reorganized screens, catalog and reload.
    navigate(page, 'plans')
    page.locator('[data-action="select-plan"][data-plan="B"]').click()
    page.locator('[data-action="start"][data-plan="B"]').click()
    exercise = page.locator('[data-exercise="supino-halteres"]')
    exercise.locator('[data-field="load"]').first.fill('24')
    exercise.locator('[data-field="reps"]').first.fill('11')
    exercise.locator('[data-field="rir"]').first.fill('2')
    exercise.locator('[data-field="rir"]').first.press('Tab')
    draft_before = readonly_baseline(page)
    navigate(page, 'home')
    page.locator('[data-action="progress-open-training"]').click()
    evolution_view(page, 'weight')
    navigate(page, 'history')
    page.locator('[data-action="history-filter"][data-kind="strength"]').click()
    navigate(page, 'plans')
    page.locator('[data-action="training-destination"][data-to="catalog"]').click()
    page.locator('.training-draft-notice [data-to="plans"]').click()
    assert_readonly(page, draft_before)
    for field, value in [('load', '24'), ('reps', '11'), ('rir', '2')]:
        assert exercise.locator(f'[data-field="{field}"]').first.input_value() == value
    saved = snapshot(page)
    page.close()
    page = open_app(context, saved, errors)
    exercise = page.locator('[data-exercise="supino-halteres"]')
    for field, value in [('load', '24'), ('reps', '11'), ('rir', '2')]:
        assert exercise.locator(f'[data-field="{field}"]').first.input_value() == value
    assert json.loads(snapshot(page)[KEY])['sessions'] == json.loads(before[KEY])['sessions']
    assert json.loads(snapshot(page)[KEY])['activitySteps'] == json.loads(before[KEY])['activitySteps']

    # A weight reminder must open Corpo and its editor after visiting Nutrição.
    # This fixture creates only a synthetic two-day variation; no profile is needed.
    reminder_storage = copy.deepcopy(before)
    reminder_state = json.loads(reminder_storage[KEY])
    reminder_state['weights'] = [
        {'id': 'synthetic-reminder-1', 'date': (current_day - timedelta(days=1)).isoformat(), 'weight': 80},
        {'id': 'synthetic-reminder-2', 'date': current_day.isoformat(), 'weight': 84},
    ]
    reminder_state['reminderPrefs'] = {'enabled': True, 'items': {}}
    reminder_storage[KEY] = json.dumps(reminder_state, ensure_ascii=False)
    reminder_page = open_app(context, reminder_storage, errors)
    reminder_before = readonly_baseline(reminder_page)
    navigate(reminder_page, 'progress')
    evolution_view(reminder_page, 'nutrition')
    navigate(reminder_page, 'home')
    reminder_page.locator('[data-action="reminder-open"][data-reminder="weight-check"]').click()
    assert_evolution_selected(reminder_page, 'weight')
    assert reminder_page.locator('#evo-weight-editor').get_attribute('open') is not None
    assert reminder_page.locator('#new-weight').is_visible()
    assert reminder_page.locator('#new-weight').evaluate('node => document.activeElement === node')
    assert_readonly(reminder_page, reminder_before)
    reminder_page.close()
    assert not errors, errors
    browser.close()

print('PASS navigation: screen roles, 3 evolution sections, history filters/paging, read-only paths, draft recovery and 320/390/768px')
