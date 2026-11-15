"""FORJA UX16: optional reminders are non-blocking, persistent, reversible and mobile accessible."""
import json,os,re,shutil
from datetime import date,timedelta
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
HTML=re.sub(r'<script defer src="./[^"]+"></script>','',(ROOT/'index.html').read_text(encoding='utf-8'))
HTML=re.sub(r'<link rel="stylesheet" href="./styles.css\?v=[^"]+" />','',HTML)
SCRIPTS=['data.js','engine.js','muay.js','calendar.js','flex.js','dose.js','focus.js','catalog-advice.js',
 'body-measures.js','activity.js','health-import.js','nutrition-goals.js','goal-planner.js','reminders.js',
 'nutrition.js','nutrition-catalog.js','nutrition-ui.js','app.js']
KEY='forja.academia.v1'
def launch(context,seed,errors):
 page=context.new_page()
 page.on('pageerror',lambda err:errors.append(str(err)))
 page.set_content(HTML)
 page.evaluate("""seed=>{
  window.__store={...seed};
  Object.defineProperty(window,'localStorage',{configurable:true,value:{
   getItem(k){return window.__store[k]??null},
   setItem(k,v){window.__store[k]=String(v)},
   removeItem(k){delete window.__store[k]}
  }});
 }""",seed)
 page.add_style_tag(path=str(ROOT/'styles.css'))
 for script in SCRIPTS: page.add_script_tag(path=str(ROOT/script))
 page.wait_for_selector('#screen h1')
 return page
with sync_playwright() as p:
 browser_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium') or shutil.which('google-chrome')
 opts={'headless':True,'args':['--no-sandbox']}
 if browser_path:opts['executable_path']=browser_path
 browser=p.chromium.launch(**opts)
 context=browser.new_context(viewport={'width':390,'height':844},locale='pt-BR',accept_downloads=True)
 errors=[]
 page=launch(context,{},errors)
 page.locator('.top-settings').click()
 page.locator('#goal-form button[type="submit"]').click()
 baseline=json.loads(page.evaluate("localStorage.getItem('forja.academia.v1')"))
 today=date.fromisoformat(page.evaluate("""() => {
  const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')
 }"""))
 earlier=(today-timedelta(days=40)).isoformat()
 recent=(today-timedelta(days=1)).isoformat()
 baseline['weights']=[{'id':'synthetic-w1','date':earlier,'weight':79},
                      {'id':'synthetic-w2','date':recent,'weight':85}]
 baseline['nutrition']['settings']['profile']={
 'heightCm':175,'age':30,'weightKg':79,'sex':'male','activity':1.55,
 'goal':'loss','adultScope':True,'confirmedAt':earlier}
 baseline['reminderPrefs']={'enabled':True,'items':{}}
 page.close()
 page=launch(context,{KEY:json.dumps(baseline)},errors)
 assert page.locator('.home-primary').count()==1, 'Training card should remain first priority'
 assert page.locator('.reminder-panel').count()==1, 'A contextual reminder should be visible'
 assert page.locator('.reminder-subtle-badge').count()==1
 assert 'Revisar o peso' in page.locator('.reminder-panel').inner_text()
 assert page.evaluate("document.documentElement.scrollWidth<=window.innerWidth")
 page.locator('[data-action="reminder-snooze"]').first.click()
 stored=lambda:json.loads(page.evaluate("localStorage.getItem('forja.academia.v1')"))
 assert stored()['reminderPrefs']['items']['profile-weight']['dismissed'] is False
 assert stored()['weights']==baseline['weights']
 assert page.locator('.reminder-panel').count()==0
 page.close()
 page=launch(context,{KEY:json.dumps(stored())},errors)
 assert page.locator('.reminder-panel').count()==0, 'Snooze should persist across page reload'
 page.locator('.top-settings').click()
 assert page.locator('.reminder-settings').count()==1
 page.locator('[data-action="reminder-toggle"]').click()
 assert stored()['reminderPrefs']['enabled'] is False
 assert page.locator('.reminder-settings').count()==1
 page.locator('#nav [data-tab="home"]').click()
 assert page.locator('.reminder-panel').count()==0
 page.locator('.top-settings').click()
 with page.expect_download() as download:
  page.locator('[data-action="export-json"]').click()
 backup=json.loads(Path(download.value.path()).read_text(encoding='utf-8'))
 assert backup['reminderPrefs']['enabled'] is False
 assert backup['reminderPrefs']['items']['profile-weight']['until'] is not None
 page.set_viewport_size({'width':320,'height':780})
 page.locator('#nav [data-tab="home"]').click()
 assert page.evaluate("document.documentElement.scrollWidth<=window.innerWidth"),'No horizontal overflow on narrow mobile'
 assert errors==[],errors
 print('PASS UX16 synthetic: optional reminder, snooze, reload, global disable, backup, Android 320px')
 browser.close()
