"""Isolated Android-sized smoke: activity history, profile preview, bioimpedance and complete private export."""
import json, copy, re, os, shutil
from datetime import datetime, timedelta
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
HTML = re.sub(r'<script defer src="./[^"]+"></script>', '', (ROOT/'index.html').read_text(encoding='utf-8'))
HTML = re.sub(r'<link rel="stylesheet" href="./styles.css\?v=[^"]+" />', '', HTML)
SCRIPTS = ['data.js','engine.js','muay.js','calendar.js','flex.js','dose.js','focus.js','catalog-advice.js',
           'body-measures.js','activity.js','health-import.js','nutrition-goals.js','nutrition.js','nutrition-catalog.js','nutrition-ui.js','app.js']
KEY = 'forja.academia.v1'

def launch(ctx, seed, errors):
    page = ctx.new_page()
    page.on('pageerror', lambda exc: errors.append(str(exc)))
    page.set_content(HTML)
    page.evaluate("""seed => {
      window.__testStorage = {...seed};
      Object.defineProperty(window,'localStorage',{configurable:true,value:{
        getItem(k){return window.__testStorage[k]??null;},
        setItem(k,v){window.__testStorage[k]=String(v);},
        removeItem(k){delete window.__testStorage[k];}
      }});
    }""", seed)
    page.add_style_tag(path=str(ROOT/'styles.css'))
    for script in SCRIPTS: page.add_script_tag(path=str(ROOT/script))
    page.wait_for_selector('#screen h1',timeout=10000)
    page.on('dialog',lambda d:d.accept())
    return page

with sync_playwright() as p:
    browser_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium') or shutil.which('google-chrome')
    opts={'headless':True,'args':['--no-sandbox']}
    if browser_path:opts['executable_path']=browser_path
    browser=p.chromium.launch(**opts)
    ctx=browser.new_context(viewport={'width':390,'height':844},locale='pt-BR',accept_downloads=True)
    errors=[]
    page=launch(ctx,{},errors)
    page.locator('#nav [data-tab="nutrition"]').click()
    page.locator('[data-nd="goals"]').first.click()
    assert 'Registrar passos' in page.locator('#nd-dialog-body').inner_text()
    page.locator('#nd-heightCm').fill('170')
    page.locator('#nd-age').fill('31')
    page.locator('#nd-weightKg').fill('80')
    page.locator('#nd-sex').select_option('male')
    page.locator('#nd-goal').select_option('recomposition')
    page.locator('#nd-activity').select_option('1.725')
    page.locator('#nd-profile [name="adultScope"]').check()
    page.locator('#nd-profile button[type="submit"]').click()
    assert page.locator('.nd-goal-recommendation').count()==1
    state=lambda: json.loads(page.evaluate('localStorage.getItem("forja.academia.v1")'))
    assert state()['nutrition']['settings'].get('targets',[])==[]
    assert state()['nutrition']['settings']['profile']['activity']==1.725
    page.locator('[data-nd="show-steps"]').click()
    assert page.locator('#nd-steps-panel').get_attribute('open') is not None
    today=datetime.strptime(page.locator('#nd-step-date').get_attribute('max'),'%Y-%m-%d').date()
    for offset in range(6,-1,-1):
        date=(today-timedelta(days=offset)).isoformat()
        page.locator('#nd-step-date').fill(date)
        page.locator('#nd-step-count').fill('8000')
        page.locator('#nd-steps-form button[type="submit"]').click()
    assert len(state()['activitySteps'])==7
    assert '1,55' in page.locator('#nd-activity-advice').inner_text()
    assert state()['nutrition']['settings']['profile']['activity']==1.725
    page.locator('[data-nd="apply-activity"]').click()
    assert page.locator('#nd-activity').input_value()=='1.55'
    assert state()['nutrition']['settings']['profile']['activity']==1.725
    page.locator('#nd-profile button[type="submit"]').click()
    assert state()['nutrition']['settings']['profile']['activity']==1.55
    assert state()['nutrition']['settings'].get('targets',[])==[]
    page.locator('[data-nd="accept"]').click()
    assert len(state()['nutrition']['settings']['targets'])==1
    assert state()['nutrition']['settings']['targets'][0]['profile']['activity']==1.55

    page.locator('#nav [data-tab="progress"]').click()
    page.locator('[data-action="body-open"]').click()
    page.locator('.bio-panel > summary').click()
    page.locator('#bio-date').fill(today.isoformat())
    page.locator('#bio-bodyFatPercent').fill('21.5')
    page.locator('#bio-skeletalMuscleKg').fill('35.2')
    page.locator('#bio-form button[type="submit"]').click()
    assert len(state()['bioimpedance'])==1
    assert state()['bioimpedance'][0]['values']['bodyFatPercent']==21.5

    page.locator('.top-settings').click()
    with page.expect_download() as downloaded:
        page.locator('[data-action="export-ai"]').click()
    path=downloaded.value.path()
    obj=json.loads(Path(path).read_text(encoding='utf-8'))
    assert obj['format']=='FORJA_AI_EXPORT_V1'
    assert obj['counts']['stepDays']==7
    assert len(obj['state']['activitySteps'])==7
    assert len(obj['state']['bioimpedance'])==1
    assert 'nutrition' in obj['state'] and 'sessions' in obj['state'] and 'muay' in obj['state']
    assert 'interpretation' in obj
    assert errors==[],errors

    # Compatibility with older backups lacking both new data groups.
    legacy=copy.deepcopy(state())
    legacy.pop('activitySteps')
    legacy.pop('bioimpedance')
    old=launch(ctx,{KEY:json.dumps(legacy)},errors)
    assert old.locator('#screen h1').count()==1
    old.locator('.top-settings').click()
    assert old.locator('[data-action="export-ai"]').count()==1
    assert errors==[],errors
    old.close()

    # Merge an older backup without overwriting current records with the same date.
    incoming=copy.deepcopy(state())
    incoming['activitySteps'][0]['steps']=18000
    new_date=(today-timedelta(days=10)).isoformat()
    incoming['activitySteps'].append({'id':'steps-'+new_date,'date':new_date,'steps':5000,'source':'samsung-health-manual'})
    page.locator('#import-file').set_input_files({
        'name':'synthetic-import-activity.json',
        'mimeType':'application/json',
        'buffer':json.dumps(incoming,ensure_ascii=False).encode('utf-8')})
    page.wait_for_function("document.getElementById('import-file').value === ''",timeout=12000)
    merged=state()
    assert len(merged['activitySteps'])==8
    assert merged['activitySteps'][0]['steps']==8000
    assert errors==[],errors
    page.set_viewport_size({'width':320,'height':780})
    page.locator('#nav [data-tab="nutrition"]').click()
    page.locator('[data-nd="goals"]').first.click()
    assert page.evaluate('document.documentElement.scrollWidth<=window.innerWidth')
    print('PASS activity UX13: editable step suggestion, targets, BIA, export, legacy, merge and narrow screen')
    browser.close()
