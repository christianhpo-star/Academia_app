"""Regression: nonempty recovery history must not reset saved workout, nutrition or weights.
An unreadable state must remain intact and refuse all writes until raw backup.
"""
import json, re, shutil
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
HTML=(ROOT/'index.html').read_text(encoding='utf-8')
SCRIPTS=re.findall(r'<script defer src="\\./([^?"#]+)(?:\\?[^"]*)?"></script>',HTML)
INDEX=re.sub(r'<script defer src="\\./[^"]+"></script>','',HTML)
INDEX=re.sub(r'<link rel="stylesheet" href="\\./styles\\.css\\?v=[^"]+" />','',INDEX)
KEY='forja.academia.v1'
def start(context,store,errors):
    page=context.new_page()
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_content(INDEX)
    page.evaluate("""seed=>{
      window.__testStorage={...seed};
      Object.defineProperty(window,'localStorage',{configurable:true,value:{
        getItem(k){return window.__testStorage[k]??null},
        setItem(k,v){window.__testStorage[k]=String(v)},
        removeItem(k){delete window.__testStorage[k]}
      }});
    }""",store)
    page.add_style_tag(path=str(ROOT/'styles.css'))
    for name in SCRIPTS:page.add_script_tag(path=str(ROOT/name))
    page.wait_for_selector('#screen h1',timeout=12000)
    return page
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path=shutil.which('chromium'),args=['--no-sandbox'])
    ctx=browser.new_context(viewport={'width':390,'height':844},locale='pt-BR',accept_downloads=True)
    errors=[]
    page=start(ctx,{},errors)
    page.locator('.home-recovery > summary').click()
    page.locator('[data-action="recovery-energy"][data-value="baixa"]').click()
    stored=page.evaluate('structuredClone(window.__testStorage)')
    assert KEY in stored
    sample=json.loads(stored[KEY])
    assert len(sample['recoveryHistory'])==1
    sample['sessions']=[{'id':'test-saved-strength','day':'2026-11-15','timestamp':'2026-11-15T13:00:00Z',
         'planId':'B','entries':[]}]
    sample['weights'].append({'id':'test-weight','date':'2026-11-15','weight':84,'initial':False})
    seeded={KEY:json.dumps(sample,ensure_ascii=False)}
    page.close()
    restored=start(ctx,seeded,errors)
    assert 'Seus dados precisam ser recuperados' not in restored.locator('#screen').inner_text()
    assert '84' in restored.locator('#screen').inner_text()
    assert json.loads(restored.evaluate('localStorage.getItem("'+KEY+'")'))['sessions'][0]['id']=='test-saved-strength'
    restored.locator('#nav [data-tab="history"]').click()
    assert '1 musculação' in restored.locator('.history-overview').inner_text()
    assert '1 Muay Thai' not in restored.locator('.history-overview').inner_text()
    restored.close()
    corrupt={**sample,'recoveryHistory':[{'day':'dia-invalido','energy':'baixa','fatigue':'alta'}]}
    original=json.dumps(corrupt,ensure_ascii=False)
    fail=start(ctx,{KEY:original},errors)
    assert 'Seus dados precisam ser recuperados' in fail.locator('#screen').inner_text()
    fail.locator('#nav [data-tab="history"]').click()
    assert 'Seus dados precisam ser recuperados' in fail.locator('#screen').inner_text()
    assert fail.evaluate('localStorage.getItem("'+KEY+'")')==original
    assert fail.evaluate('localStorage.getItem("forja.academia.unreadable-copy.v1")')==original
    with fail.expect_download() as download_info:
       fail.locator('[data-action="recovery-export-raw"]').click()
    download=download_info.value
    assert download.suggested_filename.startswith('forja-recuperacao-bruta-')
    assert fail.evaluate('localStorage.getItem("'+KEY+'")')==original
    assert not errors,errors
    browser.close()
print('PASS recovery regression: recorded history loads, unreadable original protected, export works')
