"""Testa indicadores de treino, gráfico corporal e estados vazios nas guias de Evolução."""
import json
import os
import re
import shutil
from datetime import datetime, timedelta, timezone
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
RAW = (ROOT / 'index.html').read_text(encoding='utf-8')
SCRIPTS = re.findall(r'<script defer src="\./([^?"#]+)(?:\?[^"]*)?"></script>', RAW)
INDEX = re.sub(r'<script defer src="\./[^"]+"></script>', '', RAW)
INDEX = re.sub(r'<link rel="stylesheet" href="\./styles\.css\?v=[^"]+" />', '', INDEX)


def open_app(context, storage, errors):
    page = context.new_page()
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.set_content(INDEX)
    page.evaluate("""seed => {
      window.__testStorage = {...seed};
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        value: {
          getItem(k) { return Object.hasOwn(window.__testStorage, k) ? window.__testStorage[k] : null; },
          setItem(k, v) { window.__testStorage[k] = String(v); },
          removeItem(k) { delete window.__testStorage[k]; },
        }
      });
    }""", storage)
    page.add_style_tag(path=str(ROOT / 'styles.css'))
    for name in SCRIPTS:
        page.add_script_tag(path=str(ROOT / name))
    page.wait_for_selector('#screen h1')
    return page


def make_session(group, ex, idx, load, reps):
    stamp = datetime.now(timezone.utc) - timedelta(days=8-idx)
    return {
        'id': f'detail-{group}-{idx}', 'planId': group,
        'timestamp': stamp.isoformat().replace('+00:00','Z'),
        'day': stamp.date().isoformat(),
        'kneeNextDay': 0,
        'energy': 'normal',
        'notes': '',
        'entries': [{'id':ex, 'pain':0 if group=='C' else None,
          'sets':[{'load':load, 'reps':reps, 'rir':2, 'warmup':False}]}]
    }


with sync_playwright() as p:
    chrome=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium') or shutil.which('google-chrome')
    kwargs={'headless':True,'args':['--no-sandbox']}
    if chrome: kwargs['executable_path']=chrome
    browser=p.chromium.launch(**kwargs)
    context=browser.new_context(viewport={'width':390,'height':844},device_scale_factor=1,locale='pt-BR')
    errors=[]
    empty=open_app(context,{},errors)
    empty.get_by_role('button',name='Evolução',exact=True).click()
    empty.locator('[data-action="evo-view"][data-view="training"]').click()
    assert empty.locator('.muscle-map-card').count()==1
    assert 'Mapa sem registros neste período' in empty.locator('.muscle-map-card').inner_text()
    assert empty.locator('.progress-advanced-radar').count()==0
    assert empty.locator('.strength-radar-plot').count()==0
    assert empty.locator('.evo-hero').count()==0
    empty.close()

    starter=open_app(context,{},errors)
    exercises=starter.evaluate('window.AcademiaData.exercises')
    starter.close()
    scenarios=[('A','pulley-aberto',45,50),('B','supino-halteres',25,27.5),('C','leg-press',220,240),('D','stiff',80,90)]
    sessions=[]
    for group,exercise,first,second in scenarios:
        sessions.extend([make_session(group,exercise,1,first,10),make_session(group,exercise,2,second,12)])
    state={
        'version':1,
        'settings':{'startWeight':88.3,'targetWeight':82,'goalDate':'2027-01-14','fatigue':'normal','kneePain':''},
        'weights':[{'id':'start','date':'2026-10-30','weight':88.3}],
        'sessions':sessions,'exercises':exercises,
    }
    page=open_app(context,{'forja.academia.v1':json.dumps(state,ensure_ascii=False)},errors)
    page.get_by_role('button',name='Evolução',exact=True).click()
    page.locator('[data-action="evo-view"][data-view="training"]').click()
    assert page.get_by_role('heading',name='Mapa muscular',exact=True).count()==1
    assert page.locator('.muscle-map-card svg[data-muscle-body-view="front"]').count()==1
    assert page.locator('.muscle-map-card [data-muscle-region="chest"]').get_attribute('data-level')!='0'
    assert page.locator('.muscle-map-card [data-muscle-region="quadriceps"]').get_attribute('data-level')!='0'
    assert page.evaluate("""() => {
      const x=window.ForjaEvolutionDashboard.groupVolume(
        JSON.parse(window.__testStorage['forja.academia.v1']),
        [new Date().getFullYear(),String(new Date().getMonth()+1).padStart(2,'0'),String(new Date().getDate()).padStart(2,'0')].join('-'),30);
      return x.length===4&&x.every(group=>group.sets===2);
    }""")
    page.locator('[data-action="evo-volume-days"][data-days="7"]').click()
    assert page.locator('[data-action="evo-volume-days"][data-days="7"]').get_attribute('aria-pressed')=='true'
    page.locator('[data-action="evo-volume-days"][data-days="90"]').click()
    assert page.locator('[data-action="evo-volume-days"][data-days="90"]').get_attribute('aria-pressed')=='true'
    page.locator('[data-action="evo-view"][data-view="weight"]').click()
    page.locator('[data-action="evo-chart-mode"][data-mode="measures"]').click()
    assert page.locator('#evo-measure-field').is_visible()
    assert 'Sem medidas' in page.locator('.evo-body-chart').inner_text()
    page.locator('#evo-measure-field').select_option('chest')
    assert 'Peitoral' in page.locator('.evo-body-chart').inner_text()
    page.locator('[data-action="evo-chart-mode"][data-mode="weight"]').click()
    assert page.locator('.evo-body-chart svg[role="img"]').count()==1
    page.locator('[data-action="evo-view"][data-view="training"]').click()
    assert page.locator('.progress-steps-card').count()==1
    path=ROOT/'screenshots';path.mkdir(exist_ok=True)
    page.screenshot(path=str(path/'evolution-groups-390.png'),full_page=True)
    for width in (320,390):
        page.set_viewport_size({'width':width,'height':740})
        assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'),f'overflow at {width}px'
    assert not errors,errors
    browser.close()
    print('PASS evolução: mapa muscular por séries efetivas, seletor de medidas, sem radar, 320px e 390px')
