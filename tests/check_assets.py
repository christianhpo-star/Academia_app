"""Fail CI early if source files were replaced by an upload/transfer error."""
import json
import struct
from pathlib import Path

root = Path(__file__).resolve().parents[1]
text_assets = [
    'index.html', 'styles.css', 'app.js', 'data.js', 'engine.js',
    'muay.js', 'calendar.js', 'flex.js', 'dose.js', 'sw.js', 'manifest.webmanifest', 'README.md',
    'tests/engine.test.cjs', 'tests/smoke_browser.py'
]
for path in text_assets:
    content = (root / path).read_text(encoding='utf-8')
    assert len(content) >= 200, f'{path} is unexpectedly short'
    assert not content.startswith('The requested file reference'), f'{path} contains a transfer error'
    assert '\x00' not in content, f'{path} contains binary or null data'

index = (root / 'index.html').read_text(encoding='utf-8')
for path in ['./data.js', './engine.js', './muay.js', './calendar.js', './flex.js', './dose.js', './app.js', './styles.css', './manifest.webmanifest']:
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

# Cache busting is part of the release contract: every CSS/JS resource
# must share the same release URL marker, and the worker must install a new shell.
version='20261108-ui-cache-11'
for asset in ['styles.css','data.js','engine.js','muay.js','calendar.js','flex.js','dose.js','app.js']:
    assert f'./{asset}?v={version}' in index, f'{asset} is not versioned'
sw = (root / 'sw.js').read_text(encoding='utf-8')
app = (root / 'app.js').read_text(encoding='utf-8')
assert "const CACHE = 'forja-shell-v11-ui-cache';" in sw
assert f'./styles.css?v={version}' in sw
assert f'./app.js?v={version}' in sw
assert "fetch(event.request, {cache: 'no-cache'})" in sw
assert f"./sw.js?v={version}" in app
assert "updateViaCache:'none'" in app
assert 'FORJA · 11/2026' in index

print('All deployment assets are valid.')
