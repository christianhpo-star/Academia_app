"""Synthetic private Samsung Health imports never overwrite existing local records."""
import json,os,re,shutil
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
HTML=re.sub(r'<script defer src="./[^"]+"></script>','',(ROOT/'index.html').read_text(encoding='utf-8'))
HTML=re.sub(r'<link rel="stylesheet" href="./styles.css\?v=[^"]+" />','',HTML)
SCRIPTS=['data.js','training-sets.js','engine.js','muay.js','calendar.js','flex.js','free-workout.js','dose.js','focus.js',
 'catalog-advice.js','body-measures.js','activity.js','health-import.js','nutrition-goals.js','goal-planner.js','reminders.js','daily-routine.js',
 'nutrition.js','nutrition-catalog.js','nutrition-balance.js','nutrition-ui.js','evolution-dashboard.js','cardio.js','app.js']
def start(ctx,seed,errors):
    page=ctx.new_page()
    page.on('pageerror',lambda exc:errors.append(str(exc)))
    page.set_content(HTML)
    page.evaluate("""seed=>{
      window.__storage={...seed};
      Object.defineProperty(window,'localStorage',{configurable:true,value:{
        getItem(k){return window.__storage[k]??null},
        setItem(k,v){window.__storage[k]=String(v)},
        removeItem(k){delete window.__storage[k]}
      }});
    }""",seed)
    page.add_style_tag(path=str(ROOT/'styles.css'))
    for script in SCRIPTS:page.add_script_tag(path=str(ROOT/script))
    page.wait_for_selector('#screen h1')
    page.on('dialog',lambda d:d.accept())
    return page

payload={
 'format':'FORJA_SAMSUNG_HEALTH_IMPORT_V1',
 'monthlySummaries':[
  {'id':'health-month-2026-09','month':'2026-09','periodStart':'2026-09-01','periodEnd':'2026-09-30','complete':True,'daysCovered':30,'steps':165000,'activeMinutes':2100,'activityKcal':11200,'goalDays':22,'source':'samsung-health-screenshot'},
  {'id':'health-month-2026-11','month':'2026-11','periodStart':'2026-11-01','periodEnd':'2026-11-15','complete':False,'daysCovered':15,'steps':82500,'activeMinutes':890,'activityKcal':5100,'goalDays':8,'source':'samsung-health-screenshot'}],
 'dailySteps':[{'id':'steps-2026-09-01','date':'2026-09-01','steps':5000,'activeMinutes':60,'activityKcal':220,'source':'samsung-health-manual'}],
 'weightReports':[{'id':'health-weight-2026-11-10','date':'2026-11-10','weightKg':79.4,'reportedBmi':25.2,'weightChangeKg':0.7,'bmiChange':0.2,'source':'samsung-health-screenshot'}]
}

with sync_playwright() as p:
    path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium') or shutil.which('google-chrome')
    opts={'headless':True,'args':['--no-sandbox']}
    if path:opts['executable_path']=path
    browser=p.chromium.launch(**opts)
    context=browser.new_context(viewport={'width':390,'height':844},locale='pt-BR',accept_downloads=True)
    errors=[]
    page=start(context,{},errors)
    page.locator('.top-settings').click()
    assert page.locator('[data-action="import-health"]').count()==1
    page.locator('#import-health-file').set_input_files({'name':'synthetic-health.json','mimeType':'application/json','buffer':json.dumps(payload).encode('utf-8')})
    page.wait_for_function("document.getElementById('import-health-file').value === ''",timeout=12000)
    state=lambda:json.loads(page.evaluate('localStorage.getItem("forja.academia.v1")'))
    after=state()
    assert len(after['healthMonthly'])==2
    assert len(after['activitySteps'])==1
    assert len(after['healthWeightReports'])==1
    assert after['weights'][-1]['date']=='2026-11-10'
    assert len(after['sessions'])==0 and len(after['muay']['sessions'])==0
    assert 'mês parcial' in page.locator('.health-month-row').last.inner_text()
    # Re-import should be idempotent.
    page.locator('#import-health-file').set_input_files({'name':'synthetic-health.json','mimeType':'application/json','buffer':json.dumps(payload).encode('utf-8')})
    page.wait_for_function("document.getElementById('import-health-file').value === ''",timeout=12000)
    assert state()==after
    # Local same-date weight and steps have priority over snapshots.
    same=json.loads(page.evaluate('localStorage.getItem("forja.academia.v1")'))
    same['weights'][-1]['weight']=79.1
    same['activitySteps'][0]['steps']=5050
    page.evaluate("(value)=>localStorage.setItem('forja.academia.v1',JSON.stringify(value))",same)
    page.close()
    page=start(context,{'forja.academia.v1':json.dumps(same)},errors)
    page.locator('.top-settings').click()
    page.locator('#import-health-file').set_input_files({'name':'synthetic-health.json','mimeType':'application/json','buffer':json.dumps(payload).encode('utf-8')})
    page.wait_for_function("document.getElementById('import-health-file').value === ''",timeout=12000)
    assert state()['weights'][-1]['weight']==79.1
    assert state()['activitySteps'][0]['steps']==5050
    # Legacy state without new fields must remain loadable.
    legacy=state()
    legacy.pop('healthMonthly');legacy.pop('healthWeightReports')
    other=start(context,{'forja.academia.v1':json.dumps(legacy)},errors)
    assert other.locator('#screen h1').count()==1
    other.close()
    page.locator('.top-settings').click()
    with page.expect_download() as dl:
        page.locator('[data-action="export-ai"]').click()
    ai=json.loads(Path(dl.value.path()).read_text(encoding='utf-8'))
    assert len(ai['state']['healthMonthly'])==2
    assert len(ai['state']['healthWeightReports'])==1
    assert errors==[],errors
    print('PASS synthetic Samsung Health: private import, local priority, legacy backups and AI export')
    browser.close()
