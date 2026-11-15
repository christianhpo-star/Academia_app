"""Fail CI early if source files were replaced by an upload/transfer error."""
import json
import struct
from pathlib import Path

root = Path(__file__).resolve().parents[1]
text_assets = [
    'index.html', 'styles.css', 'app.js', 'data.js', 'engine.js',
    'muay.js', 'calendar.js', 'flex.js', 'dose.js', 'focus.js', 'catalog-advice.js', 'body-measures.js', 'activity.js', 'health-import.js', 'nutrition-goals.js', 'goal-planner.js','nutrition.js', 'nutrition-catalog.js', 'nutrition-ui.js', 'exercise-motion.js', 'sw.js', 'manifest.webmanifest', 'README.md',
    'tests/engine.test.cjs', 'tests/smoke_browser.py'
]
for path in text_assets:
    content = (root / path).read_text(encoding='utf-8')
    assert len(content) >= 200, f'{path} is unexpectedly short'
    assert not content.startswith('The requested file reference'), f'{path} contains a transfer error'
    assert '\x00' not in content, f'{path} contains binary or null data'

index = (root / 'index.html').read_text(encoding='utf-8')
for path in ['./data.js', './engine.js', './muay.js', './calendar.js', './flex.js', './dose.js', './focus.js', './catalog-advice.js', './body-measures.js', './activity.js', './health-import.js', './nutrition-goals.js', './goal-planner.js','./nutrition.js', './nutrition-catalog.js', './nutrition-ui.js', './exercise-motion.js', './app.js', './styles.css', './manifest.webmanifest']:
    assert path in index, f'index.html must reference {path}'

manifest = json.loads((root / 'manifest.webmanifest').read_text(encoding='utf-8'))
assert manifest['start_url'] == './'
assert manifest['scope'] == './'
assert manifest['display'] == 'standalone'
assert len(manifest['icons']) >= 2
for icon in manifest['icons']:
    file = root / icon['src']
    data = file.read_bytes()
    assert data.startswith(b'\x89PNG\r\n\x1a\n'), f'{file} is not a PNG'
    assert data[12:16] == b'IHDR', f'{file} has no PNG header'
    width, height = struct.unpack('>II', data[16:24])
    assert width == height and width in {192, 512}, f'{file} has invalid dimensions'


# Prevent stale UI versions being silently reused by the offline shell.
release = '20261115-ux15'
worker = (root / 'sw.js').read_text(encoding='utf-8')
app = (root / 'app.js').read_text(encoding='utf-8')
assets = ['data.js', 'engine.js', 'muay.js', 'calendar.js',
          'flex.js', 'dose.js', 'focus.js', 'catalog-advice.js', 'body-measures.js', 'activity.js', 'health-import.js', 'nutrition-goals.js', 'goal-planner.js','nutrition.js', 'nutrition-catalog.js', 'nutrition-ui.js']
for asset in assets:
    expected = f'./{asset}?v={release}'
    assert expected in index, f'missing asset version in HTML: {asset}'
    assert expected in worker, f'missing asset version in offline worker: {asset}'
motion_release = '20261115-motion3'
for asset in ['styles.css', 'app.js', 'exercise-motion.js']:
    expected = f'./{asset}?v={motion_release}'
    assert expected in index, f'missing updated asset version in HTML: {asset}'
    assert expected in worker, f'missing updated asset version in offline worker: {asset}'
assert f'forja-shell-v33-{motion_release}' in worker, 'offline cache not version-bumped'
assert f"./sw.js?v={motion_release}" in app, 'worker registration not versioned'
assert "updateViaCache:'none'" in app, 'worker updates may use stale HTTP cache'
assert 'plan-block-selector' in app, 'published JavaScript has legacy workout picker'

print('All deployment assets are valid.')
