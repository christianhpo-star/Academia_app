"""UX10: history short by default, progressive paging, accordion, Muay shortcuts."""
import json,os,re,shutil
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
html=re.sub(r'<script defer src="./[^"]+"></script>','',(ROOT/'index.html').read_text())
html=re.sub(r'<link rel="stylesheet" href="./styles.css\\?v=[^"]+" />','',html)
scripts=['data.js','engine.js','muay.js','calendar.js','flex.js','dose.js','focus.js','catalog-advice.js','body-measures.js','activity.js','nutrition-goals.js','nutrition.js','nutrition-catalog.js','nutrition-ui.js','app.js']
with sync_playwright() as p:
    path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium') or shutil.which('google-chrome')
    opts={'headless':True,'args':['--no-sandbox']}
    if path:opts['executable_path']=path
    browser=p.chromium.launch(**opts)
    context=browser.new_context(viewport={'width':390,'height':844},locale='pt-BR')
    page=context.new_page()
    errors=[]
    page.on('pageerror',lambda error:errors.append(str(error)))
    page.set_content(html)
    page.evaluate("""() => {
      window.__storage={};
      Object.defineProperty(window,'localStorage',{configurable:true,value:{
        getItem(k){return window.__storage[k]??null},setItem(k,v){window.__storage[k]=String(v)},
        removeItem(k){delete window.__storage[k]}
      }});
    }""")
    page.add_style_tag(path=str(ROOT/'styles.css'))
    for script in scripts:page.add_script_tag(path=str(ROOT/script))
    page.wait_for_selector('#screen h1')
    page.evaluate("""() => {
      const v=JSON.parse(window.__storage['forja.academia.v1']||'null')||{
        version:1,referenceDefaultsVersion:1,
        settings:{startWeight:88.3,targetWeight:82,goalDate:'2027-01-14'},
        weights:[{id:'w',date:'2026-10-30',weight:88.3}],
        exercises:window.AcademiaData.exercises, sessions:[],muay:{sessions:[],draft:null},
        bodyMeasurements:[]
      };
      for(let i=0;i<9;i++){
        const d='2026-11-'+String(14-i).padStart(2,'0');
        v.sessions.push({id:'synthetic-strength-'+i,planId:'B',day:d,timestamp:d+'T14:00:00Z',
          entries:[{id:'supino-halteres',pain:null,sets:[{load:20+i,reps:10,rir:2,warmup:false}]}],
          notes:'',energy:'normal',kneeNextDay:null});
      }
      for(let i=0;i<7;i++){
        const d='2026-11-'+String(14-i).padStart(2,'0');
        v.muay.sessions.push({id:'synthetic-muay-'+i,day:d,timestamp:d+'T15:00:00Z',
          place:'academia',kind:'aula',duration:50,intensity:7,fatigue:'moderada',kneePain:null,notes:'',
          activities:[{id:'synthetic-activity-'+i,name:'Jab + direto + chute',unit:'min',quantity:3,sets:3,category:'combination',side:'total'}]});
      }
      localStorage.setItem('forja.academia.v1',JSON.stringify(v));
    }""")
    snapshot=page.evaluate('structuredClone(window.__storage)')
    page.close()
    page=context.new_page()
    page.on('pageerror',lambda error:errors.append(str(error)))
    page.set_content(html)
    page.evaluate("""seed => {
      window.__storage={...seed};
      Object.defineProperty(window,'localStorage',{configurable:true,value:{
        getItem(k){return window.__storage[k]??null},setItem(k,v){window.__storage[k]=String(v)},
        removeItem(k){delete window.__storage[k]}
      }});
    }""",snapshot)
    page.add_style_tag(path=str(ROOT/'styles.css'))
    for script in scripts:page.add_script_tag(path=str(ROOT/script))
    page.get_by_role('button',name='Histórico',exact=True).click()
    assert page.locator('.history-card').count()==3
    assert page.locator('.muay-record').count()==3
    assert page.locator('.history-card[open]').count()==0
    assert page.locator('.muay-record[open]').count()==0
    assert page.locator('.history-calendar-fold').count()==1
    assert page.locator('.history-calendar-fold[open]').count()==0
    page.locator('.history-card > summary').first.click()
    assert page.locator('.history-card[open]').count()==1
    assert page.locator('.history-details summary').first.is_visible()
    page.locator('.muay-record > summary').first.click()
    assert page.locator('.muay-record[open]').count()==1
    page.locator('[data-action="history-more"][data-kind="strength"]').click()
    assert page.locator('.history-card').count()==8
    page.locator('[data-action="history-more"][data-kind="strength"]').click()
    assert page.locator('.history-card').count()==9
    assert page.locator('[data-action="history-more"][data-kind="strength"]').count()==0
    page.locator('[data-action="history-more"][data-kind="muay"]').click()
    assert page.locator('.muay-record').count()==7
    assert page.locator('[data-action="history-more"][data-kind="muay"]').count()==0
    page.locator('.history-calendar-fold > summary').click()
    assert page.locator('.history-calendar-fold[open]').count()==1
    page.set_viewport_size({'width':320,'height':700})
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    # Going to Muay page uses original populated recording controls.
    page.get_by_role('button',name='Início',exact=True).click()
    page.locator('[data-action="open-muay"]').click()
    page.get_by_role('button',name='Aula na academia').click()
    page.locator('[data-action="muay-effort"][data-value="7"]').click()
    page.locator('[data-action="muay-fatigue"][data-value="moderada"]').click()
    page.get_by_role('button',name='+ 50 chutes por perna').click()
    assert page.locator('.muay-compact-activity').count()==1
    assert page.locator('[data-muay-prop="quantity"]').first.input_value()=='50'
    assert page.locator('.muay-activity-more:not([open])').count()==1
    assert page.locator('.muay-advanced:not([open])').count()==1
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    draft=json.loads(page.evaluate('window.__storage["forja.academia.v1"]'))['muay']['draft']
    assert draft['intensity']=='7' and draft['fatigue']=='moderada'
    assert draft['activities'][0]['side']=='each'
    assert errors==[],errors
    browser.close()
    print('PASS UX10: history 3+5, accordions, filters and fast Muay controls at 320px')
