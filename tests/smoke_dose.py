"""End-to-end optional +1 set: qualified history, consent, one-time guard, recovery."""
import os, re, shutil
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
HTML=re.sub(r'<script defer src="./[^"]+"></script>', '', (ROOT/'index.html').read_text()).replace('<link rel="stylesheet" href="./styles.css?v=20261108-ux4-refresh1" />','')
FILES=['data.js','engine.js','muay.js','calendar.js','flex.js','dose.js','focus.js','app.js']
DRAFT='forja.academia.draft.v1'
MAIN='forja.academia.v1'

def open_app(context, storage, errors):
    page=context.new_page()
    page.on('pageerror',lambda error:errors.append(str(error)))
    page.set_content(HTML)
    page.evaluate("""value=>{
      window.__testStorage={...value};
      Object.defineProperty(window,'localStorage',{configurable:true,value:{
        getItem(k){return window.__testStorage[k]??null},
        setItem(k,v){window.__testStorage[k]=String(v)},
        removeItem(k){delete window.__testStorage[k]}
      }});
    }""",storage)
    page.add_style_tag(path=str(ROOT/'styles.css'))
    for script in FILES:page.add_script_tag(path=str(ROOT/script))
    page.locator('#screen h1').wait_for()
    return page

with sync_playwright() as p:
    chrome=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium') or shutil.which('google-chrome')
    options={'headless':True,'args':['--no-sandbox']}
    if chrome: options['executable_path']=chrome
    browser=p.chromium.launch(**options)
    context=browser.new_context(viewport={'width':390,'height':844},locale='pt-BR')
    errors=[]
    page=open_app(context,{},errors)
    page.evaluate("""() => {
      const localDate=(age)=>{
        const now=new Date(),d=new Date(now.getFullYear(),now.getMonth(),now.getDate()-age);
        return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
      };
      const sessions=[3,8,11,14,17,20,23,26].map((age,i)=>({
        id:'synthetic-'+i,day:localDate(age),timestamp:localDate(age)+'T12:00:00Z',
        planId:'B',energy:'normal',kneeNextDay:0,notes:'',
        entries:[{id:'supino-inclinado',pain:null,sets:
          Array.from({length:4},()=>({load:25,reps:10,rir:3,warmup:false}))}]
      }));
      const seed={version:1,referenceDefaultsVersion:1,
        settings:{startWeight:88.3,targetWeight:82,goalDate:'2027-01-14',
          fatigue:'normal',kneePain:''},weights:[],sessions,
        exercises:window.AcademiaData.exercises,muay:{sessions:[],draft:null}};
      localStorage.setItem('forja.academia.v1',JSON.stringify(seed));
    }""")
    storage=page.evaluate('structuredClone(window.__testStorage)')
    page.close()
    page=open_app(context,storage,errors)
    page.get_by_role('button',name='Treinos',exact=True).click()
    page.locator('[data-action="select-plan"][data-plan="B"]').click()
    page.locator('[data-action="start"][data-plan="B"]').click()
    assert page.locator('[data-action="dose-add-one"]').count()==0
    entry=page.locator('[data-exercise="supino-inclinado"]')
    for row in range(4):
        entry.locator('[data-field="load"]').nth(row).fill('25')
        entry.locator('[data-field="reps"]').nth(row).fill('10')
        entry.locator('[data-field="rir"]').nth(row).fill('3')
    assert page.locator('[data-action="dose-add-one"]').count()==0, 'energy gate'
    page.locator('#session-energy').select_option('leve')
    button=page.locator('[data-action="dose-add-one"][data-ex="supino-inclinado"]')
    assert button.count()==1, 'qualified recommendation'
    baseline=page.evaluate('JSON.parse(localStorage.getItem("forja.academia.draft.v1"))')
    assert len(baseline['draft']['entries']['supino-inclinado']['sets'])==4
    (ROOT/'screenshots').mkdir(exist_ok=True)
    page.screenshot(path=str(ROOT/'screenshots'/'dose-qualified-390.png'),full_page=True)
    # Exercise an actual pointer click; a duplicate blur/change rerender
    # used to detach this button between pointerdown and pointerup.
    button.click()
    entry=page.locator('[data-exercise="supino-inclinado"]')
    assert entry.locator('[data-field="reps"]').count()==5
    assert entry.locator('[data-field="reps"]').nth(4).input_value()==''
    assert page.locator('[data-action="dose-add-one"]').count()==0, 'no repeated extra recommendation'
    saved=page.evaluate('JSON.parse(localStorage.getItem("forja.academia.draft.v1"))')
    assert len(saved['draft']['entries']['supino-inclinado']['sets'])==5
    assert saved['draft']['entries']['supino-inclinado']['sets'][4]['reps']==''
    # Reopen to verify that the recommendation did not sneak into history.
    assert len(page.evaluate('JSON.parse(localStorage.getItem("forja.academia.v1")).sessions'))==8
    storage=page.evaluate('structuredClone(window.__testStorage)')
    page.close()
    page=open_app(context,storage,errors)
    entry=page.locator('[data-exercise="supino-inclinado"]')
    assert entry.locator('[data-field="reps"]').count()==5
    assert page.locator('[data-action="dose-add-one"]').count()==0
    page.set_viewport_size({'width':320,'height':740})
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    page.screenshot(path=str(ROOT/'screenshots'/'dose-after-add-320.png'),full_page=True)
    # Test fresh qualified draft with same-day Muay: do not offer +1.
    import json
    state=json.loads(storage[MAIN])
    age0=page.evaluate("new Date().getFullYear()+'-'+String(new Date().getMonth()+1).padStart(2,'0')+'-'+String(new Date().getDate()).padStart(2,'0')")
    state['muay']['sessions']=[{'id':'muay-synthetic','timestamp':age0+'T15:00:00Z','day':age0,
      'place':'casa','kind':'individual','duration':30,'intensity':7,'fatigue':'normal',
      'kneePain':0,'notes':'','activities':[{'id':'shadow','name':'Sombra',
      'unit':'rounds','quantity':3,'sets':1}]}]
    storage[MAIN]=json.dumps(state,ensure_ascii=False)
    from_copy=baseline
    from_copy['draft']['energy']='leve'
    storage[DRAFT]=json.dumps(from_copy,ensure_ascii=False)
    page.close()
    page=open_app(context,storage,errors)
    assert page.locator('[data-action="dose-add-one"]').count()==0, 'Muay same-day recovery gate'
    assert 'Priorize recuperação' in page.locator('.dose-card').inner_text()
    assert not errors,errors
    print('PASS dose: optional extra set gated by energy and history, one-time, draft restored, no synthetic history, Muay recovery, 320px')
    browser.close()
