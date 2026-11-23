"""Android/PWA Back/Forward regression on a real HTTP origin.

Uses a fresh, isolated browser context and synthetic workout entries only.
Navigation must never touch the saved workout history or draft.
"""
import json
import os
import shutil
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
KEY = 'forja.academia.v1'
DRAFT_KEY = 'forja.academia.draft.v1'


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(ROOT)))
thread = threading.Thread(target=server.serve_forever, daemon=True)
thread.start()
try:
    with sync_playwright() as p:
        executable = os.environ.get('CHROMIUM_PATH') or shutil.which('chromium') or shutil.which('google-chrome')
        options = {'headless': True, 'args': ['--no-sandbox']}
        if executable:
            options['executable_path'] = executable
        browser = p.chromium.launch(**options)
        context = browser.new_context(viewport={'width': 390, 'height': 844}, locale='pt-BR',
                                      service_workers='block', is_mobile=True, has_touch=True)
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(f'http://127.0.0.1:{server.server_port}/', wait_until='load')
        page.locator('#screen h1').wait_for()
        assert page.evaluate('history.state?.forjaRoute?.tab') == 'home'
        assert page.evaluate('history.length') >= 2

        # Opening Treinos and a detail must create distinct Back destinations.
        page.locator('#nav [data-tab="plans"]').click()
        assert page.evaluate('history.state?.forjaRoute?.tab') == 'plans'
        page.locator('[data-action="training-destination"][data-to="catalog"]').click()
        assert page.evaluate('history.state?.forjaRoute?.tab') == 'catalog'
        page.locator('#catalog-search').fill('supino reto com barra')
        page.locator('[data-action="catalog-view"][data-ex="supino-barra"]').click()
        assert page.locator('#catalog-detail-heading').is_visible()
        assert page.evaluate('history.state?.forjaRoute?.detail') == 'supino-barra'
        page.go_back(wait_until='domcontentloaded')
        assert page.locator('#catalog-search').is_visible()
        assert page.locator('#catalog-search').input_value() == 'supino reto com barra'
        assert page.locator('[data-action="catalog-view"][data-ex="supino-barra"]').is_visible()
        page.go_forward(wait_until='domcontentloaded')
        assert page.locator('#catalog-detail-heading').is_visible()
        page.go_back(wait_until='domcontentloaded')
        page.go_back(wait_until='domcontentloaded')
        assert page.locator('.training-destinations [data-to="plans"]').get_attribute('aria-pressed') == 'true'

        # A draft survives navigation, Back and Forward without a single write.
        page.locator('[data-action="select-plan"][data-plan="B"]').click()
        page.locator('[data-action="start"][data-plan="B"]').click()
        ex = page.locator('[data-exercise="supino-halteres"]')
        ex.locator('[data-field="load"]').first.fill('24')
        ex.locator('[data-field="reps"]').first.fill('11')
        ex.locator('[data-field="rir"]').first.fill('2')
        ex.locator('[data-field="rir"]').first.press('Tab')
        before = page.evaluate('''() => ({
          archive: localStorage.getItem('forja.academia.v1'),
          draft: localStorage.getItem('forja.academia.draft.v1')
        })''')
        assert before['draft'], 'No workout draft was saved'
        page.locator('[data-action="training-destination"][data-to="catalog"]').click()
        assert page.evaluate('history.state?.forjaRoute?.tab') == 'catalog'
        page.go_back(wait_until='domcontentloaded')
        assert page.locator('[data-exercise="supino-halteres"]').is_visible()
        for field, value in [('load', '24'), ('reps', '11'), ('rir', '2')]:
            assert page.locator('[data-exercise="supino-halteres"] [data-field="'+field+'"]').first.input_value() == value
        page.go_forward(wait_until='domcontentloaded')
        assert page.locator('#catalog-search').is_visible()
        after = page.evaluate('''() => ({
          archive: localStorage.getItem('forja.academia.v1'),
          draft: localStorage.getItem('forja.academia.draft.v1')
        })''')
        assert after == before, 'History navigation mutated saved data or the draft'

        # Evolution subtab navigation is reversible, with no duplicated records.
        page.locator('#nav [data-tab="progress"]').click()
        page.locator('.evo-tabs [data-view="training"]').click()
        assert page.evaluate('history.state?.forjaRoute?.view') == 'training'
        page.go_back(wait_until='domcontentloaded')
        assert page.locator('.evo-tabs [data-view="weight"]').get_attribute('aria-selected') == 'true'
        page.go_forward(wait_until='domcontentloaded')
        assert page.locator('.evo-tabs [data-view="training"]').get_attribute('aria-selected') == 'true'
        final = page.evaluate('''() => ({
          archive: localStorage.getItem('forja.academia.v1'),
          draft: localStorage.getItem('forja.academia.draft.v1')
        })''')
        assert final == before
        assert not errors, errors
        browser.close()
finally:
    server.shutdown()
    server.server_close()

print('PASS browser Back/Forward: tabs, catalog detail, evolution, preserved workout draft')
