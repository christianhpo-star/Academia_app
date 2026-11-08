"""Browser acceptance: calendar shows saved sessions, month navigation and mobile layout."""
import os,re,shutil
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
HTML=re.sub(r'<script defer src="./[^"]+"></script>','',(ROOT/'index.html').read_text())
HTML=HTML.replace('<link rel="stylesheet" href="./styles.css?v=20261108-ux4-refresh1" />','')
with sync_playwright() as p:
    executable=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium') or shutil.which('google-chrome')
    options={'headless':True,'args':['--no-sandbox']}
    if executable:options['executable_path']=executable
    browser=p.chromium.launch(**options)
    context=browser.new_context(viewport={'width':390,'height':844},locale='pt-BR')
    page=context.new_page()
    errors=[]
    page.on('pageerror',lambda error:errors.append(str(error)))
    page.set_content(HTML)
    page.evaluate("""() => {
      window.__testStorage={};
      Object.defineProperty(window,'localStorage',{configurable:true,value:{
        getItem(k){return window.__testStorage[k]??null},
        setItem(k,v){window.__testStorage[k]=String(v)},
        removeItem(k){delete window.__testStorage[k]}
      }});
    }""")
    page.add_style_tag(path=str(ROOT/'styles.css'))
    for script in ['data.js','engine.js','muay.js','calendar.js','flex.js','dose.js','app.js']:
        page.add_script_tag(path=str(ROOT/script))
    page.locator('#screen h1').wait_for()
    # Seed only synthetic completed records, preserving valid app defaults.
    page.evaluate("""() => {
      const key='forja.academia.v1';
      const state=JSON.parse(localStorage.getItem(key)||'null')||{
        version:1,settings:{startWeight:88.3,targetWeight:82,goalDate:'2027-01-14'},
        weights:[],sessions:[],exercises:window.AcademiaData.exercises,
        muay:{sessions:[],draft:null}
      };
      state.sessions=[{id:'test-gym',planId:'B',day:'2026-10-15',timestamp:'2026-10-15T19:00:00Z',
        energy:'normal',notes:'',kneeNextDay:null,entries:[{id:'supino-halteres',pain:null,sets:[{load:20,reps:12,rir:2,warmup:false}]}]}];
      state.muay={sessions:[
        {id:'test-home',day:'2026-10-15',timestamp:'2026-10-15T22:00:00Z',place:'casa',kind:'individual',
         duration:30,intensity:7,fatigue:'normal',kneePain:0,notes:'',activities:[
           {id:'p1',name:'Polichinelos',sets:3,quantity:20,unit:'reps'}]},
        {id:'test-other',day:'2026-10-21',timestamp:'2026-10-21T21:00:00Z',place:'academia',kind:'aula',
         duration:50,intensity:6,fatigue:'',kneePain:null,notes:'',activities:[
           {id:'p2',name:'Manoplas',sets:null,quantity:3,unit:'rounds'}]}
      ],draft:null};
      localStorage.setItem(key,JSON.stringify(state));
    }""")
    # Reload scripts in a fresh document so state reads the seeded data.
    snapshot=page.evaluate('structuredClone(window.__testStorage)')
    page.close()
    page=context.new_page()
    page.on('pageerror',lambda error:errors.append(str(error)))
    page.set_content(HTML)
    page.evaluate("""seed=>{
      window.__testStorage={...seed};
      Object.defineProperty(window,'localStorage',{configurable:true,value:{
        getItem(k){return window.__testStorage[k]??null},
        setItem(k,v){window.__testStorage[k]=String(v)},
        removeItem(k){delete window.__testStorage[k]}
      }});
    }""",snapshot)
    page.add_style_tag(path=str(ROOT/'styles.css'))
    for script in ['data.js','engine.js','muay.js','calendar.js','flex.js','app.js']:
        page.add_script_tag(path=str(ROOT/script))
    page.get_by_role('button',name='Histórico',exact=True).click()
    assert page.get_by_role('heading',name='Calendário de treinos').count()==1
    assert 'Nenhum treino salvo neste mês' in page.locator('#training-calendar').inner_text()
    page.locator('[data-action="calendar-shift"][data-delta="-1"]').click()
    # From November 2026 to October 2026.
    assert 'outubro de 2026' in page.locator('.calendar-month').inner_text().lower()
    assert page.locator('.calendar-stats strong').all_inner_texts()==['2','1','2']
    page.locator('[data-action="calendar-select"][data-day="2026-10-15"]').click()
    panel=page.locator('.calendar-selected')
    assert 'Bloco B' in panel.inner_text() and 'Muay Thai individual' in panel.inner_text()
    assert 'Em casa' in panel.inner_text()
    shots=ROOT/'screenshots';shots.mkdir(exist_ok=True)
    page.screenshot(path=str(shots/'calendar-390.png'),full_page=True)
    page.set_viewport_size({'width':320,'height':720})
    assert page.evaluate('document.documentElement.scrollWidth<=window.innerWidth'),'calendar overflow at 320'
    page.screenshot(path=str(shots/'calendar-320.png'),full_page=True)
    page.locator('[data-action="calendar-today"]').click()
    assert 'novembro de 2026' in page.locator('.calendar-month').inner_text().lower()
    assert not errors,errors
    print('PASS calendar: mixed day, distinct active days, month navigation, empty month, 320px')
    browser.close()
