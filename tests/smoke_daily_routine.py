"""FORJA UX20: real browser regression using entirely synthetic routine records."""
import json,os,re,shutil
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
HTML=re.sub(r'<script defer src="./[^"]+"></script>','',(ROOT/'index.html').read_text(encoding='utf-8'))
HTML=re.sub(r'<link rel="stylesheet" href="./styles.css\?v=[^"]+" />','',HTML)
SCRIPTS=['data.js','training-sets.js','engine.js','muay.js','calendar.js','flex.js','free-workout.js','dose.js','focus.js',
 'catalog-advice.js','body-measures.js','activity.js','health-import.js','nutrition-goals.js',
 'goal-planner.js','reminders.js','daily-routine.js','nutrition.js','nutrition-catalog.js',
 'nutrition-balance.js','nutrition-ui.js','evolution-dashboard.js','cardio.js','app.js']
KEY='forja.academia.v1'

def create_page(ctx,seed,errors):
 page=ctx.new_page()
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(HTML)
 page.evaluate("""seed=>{
   window.__stored={...seed};
   Object.defineProperty(window,'localStorage',{configurable:true,value:{
     getItem(key){return window.__stored[key]??null},
     setItem(key,value){window.__stored[key]=String(value)},
     removeItem(key){delete window.__stored[key]}
   }});
 }""",seed)
 page.add_style_tag(path=str(ROOT/'styles.css'))
 for script in SCRIPTS:page.add_script_tag(path=str(ROOT/script))
 page.wait_for_selector('#screen h1')
 return page

with sync_playwright() as p:
 binary=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium') or shutil.which('google-chrome')
 opts={'headless':True,'args':['--no-sandbox']}
 if binary:opts['executable_path']=binary
 browser=p.chromium.launch(**opts)
 ctx=browser.new_context(viewport={'width':390,'height':844},locale='pt-BR',accept_downloads=True)
 errors=[]
 page=create_page(ctx,{},errors)
 state=lambda:json.loads(page.evaluate("localStorage.getItem('forja.academia.v1')"))
 assert page.locator('.home-primary').count()==1
 assert page.locator('.daily-routine').count()==0, 'Default is off: no nagging card'
 assert page.locator('[data-action="routine-manage"]').count()==1
 page.locator('[data-action="routine-manage"]').click()
 assert page.locator('#daily-routine-form').count()==1
 page.locator('#routine-medication-label').fill('Medicamento simulado')
 page.locator('#routine-medication-time').fill('08:00')
 page.locator('#routine-supplement-label').fill('Suplemento simulado')
 page.locator('#routine-supplement-time').fill('09:30')
 page.locator('#daily-routine-form button[type="submit"]').click()
 saved=state()
 assert saved['dailyRoutine']['enabled'] is True
 assert saved['dailyRoutine']['records']==[]
 assert saved['dailyRoutine']['slots'][0]['time']=='08:00'
 assert saved['dailyRoutine']['slots'][1]['time']=='09:30'
 assert not any('mg' in x or 'dose' in x for x in saved['dailyRoutine'].keys())

 page.locator('#nav [data-tab="home"]').click()
 assert page.locator('.home-primary').count()==1
 assert page.locator('.daily-routine').count()==1
 assert page.locator('.routine-row').count()==2
 assert page.locator('.routine-status').first.inner_text()=='A confirmar'
 page.locator('[data-action="routine-confirm"][data-slot="medication"]').click()
 assert state()['dailyRoutine']['records'][0]['slotId']=='medication'
 assert len(state()['dailyRoutine']['records'])==1
 assert page.locator('[data-action="routine-confirm"][data-slot="medication"]').inner_text()=='Desfazer'
 assert page.locator('[data-action="routine-confirm"][data-slot="supplement"]').inner_text()=='Registrei'
 page.locator('[data-action="routine-confirm"][data-slot="medication"]').click()
 assert state()['dailyRoutine']['records']==[]
 page.locator('[data-action="routine-confirm"][data-slot="supplement"]').click()
 assert len(state()['dailyRoutine']['records'])==1
 assert state()['sessions']==saved['sessions']
 assert state()['nutrition']==saved['nutrition']
 # Hide only in the current app opening; it does not infer missed usage.
 page.locator('[data-action="routine-hide"]').click()
 assert page.locator('.daily-routine').count()==0
 stored=state()
 page.close()
 page=create_page(ctx,{KEY:json.dumps(stored)},errors)
 assert page.locator('.daily-routine').count()==1
 assert page.locator('[data-action="routine-confirm"][data-slot="supplement"]').inner_text()=='Desfazer'
 # Disable and re-enable in Settings: both operations are reversible.
 page.locator('.top-settings').click()
 assert page.locator('[data-action="routine-enable"]').inner_text()=='Desativar cartão de rotina'
 page.locator('[data-action="routine-enable"]').click()
 assert state()['dailyRoutine']['enabled'] is False
 assert page.locator('[data-action="routine-enable"]').inner_text()=='Ativar cartão de rotina'
 page.locator('#nav [data-tab="home"]').click()
 assert page.locator('.daily-routine').count()==0
 page.locator('.top-settings').click()
 page.locator('[data-action="routine-enable"]').click()
 assert state()['dailyRoutine']['enabled'] is True
 assert len(state()['dailyRoutine']['records'])==1
 # Routine is included in on-device backup, no network requests.
 with page.expect_download() as download:
  page.locator('[data-action="export-json"]').click()
 backup=json.loads(Path(download.value.path()).read_text(encoding='utf-8'))
 assert backup['dailyRoutine']['records']==state()['dailyRoutine']['records']
 # Previous backups lacking UX20 fields still load.
 legacy=state()
 legacy.pop('dailyRoutine')
 other=create_page(ctx,{KEY:json.dumps(legacy)},errors)
 assert other.locator('#screen h1').count()==1
 assert other.locator('.daily-routine').count()==0
 other.close()
 # Mobile viewport: neither training card nor routine may overflow.
 page.locator('#nav [data-tab="home"]').click()
 for width in [320,390,768]:
  page.set_viewport_size({'width':width,'height':800})
  assert page.evaluate("document.documentElement.scrollWidth<=window.innerWidth"),f'horizontal scroll at {width}px'
 assert errors==[],errors
 print('PASS UX20: optional routine, manual records, undo, hide, disable/re-enable, backup and Android 320/390/768')
 browser.close()
