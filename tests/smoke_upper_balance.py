"""Evidence-aware A coverage: non-destructive mobile migration and short posterior-delt dose.

Only synthetic local storage is used. No personal backup or health data enters CI.
"""
import copy
import json
import os
import shutil
from playwright.sync_api import sync_playwright
from smoke_muscle_history import KEY,DRAFT_KEY,NOW,open_app,snapshot
from smoke_abdomen import make_seed

REAR='voador-inverso'
TRAP='encolhimento-halteres'


def verify(context,errors):
    seed=make_seed(context,errors)
    old=json.loads(seed[KEY])
    old.pop('upperBalanceDefaultsVersion',None)
    old['exercises']=[ex for ex in old['exercises'] if ex['id'] not in (REAR,TRAP)]
    old['exercises'][0].update(name='Pulley personalizado sintético',sets=4)
    old['sessions']=[{
        'id':'old-preserve','planId':'A','day':'2026-11-10','timestamp':'2026-11-10T14:00:00Z',
        'entries':[{'id':'pulley-aberto','sets':[{'load':45,'reps':10,'rir':2,'warmup':False}]}],
        'plannedIds':['pulley-aberto'],'skipped':[],'kneeNextDay':None,'energy':'normal','notes':'Histórico sintético'
    }]
    draft={'version':1,'savedAt':NOW.isoformat(),'draft':{
        'planId':'A','energy':'normal','notes':'Rascunho a preservar','plannedIds':['pulley-aberto'],
        'addedIds':[],'skipped':[],
        'entries':{'pulley-aberto':{'id':'pulley-aberto','sets':[{'load':45,'reps':9,'rir':2,'warmup':False}], 'pain':''}}
    }}
    stored={**seed,KEY:json.dumps(old,ensure_ascii=False),DRAFT_KEY:json.dumps(draft,ensure_ascii=False)}
    stored.pop('forja.academia.safety-backup.v1',None)
    page=open_app(context,stored,errors)
    updated=json.loads(snapshot(page)[KEY])
    assert updated['upperBalanceDefaultsVersion']==1
    assert len(updated['exercises'])==len(old['exercises'])+2
    assert updated['sessions']==old['sessions']
    assert updated['exercises'][:len(old['exercises'])]==old['exercises']
    assert snapshot(page)[DRAFT_KEY]==stored[DRAFT_KEY]
    assert json.loads(snapshot(page)['forja.academia.safety-backup.v1'])==old
    rear=next(ex for ex in updated['exercises'] if ex['id']==REAR)
    trap=next(ex for ex in updated['exercises'] if ex['id']==TRAP)
    assert rear['active'] and rear['group']=='A' and rear['sets']==2
    assert rear['low']==12 and rear['high']==20
    assert not trap['active'] and trap['group']=='A' and trap['sets']==2
    assert page.locator('[data-exercise="'+REAR+'"]').count()==0, 'migration may not edit in-progress draft'

    rebuilt=snapshot(page)
    page.close()
    page=open_app(context,rebuilt,errors)
    assert snapshot(page)==rebuilt, 'migration must be idempotent on reopening'
    page.once('dialog',lambda dialog:dialog.accept())
    page.get_by_role('button',name='Cancelar',exact=True).click()
    page.locator('#nav [data-tab="plans"]').click()
    page.locator('[data-action="select-plan"][data-plan="A"]').click()
    page.locator('#plan-editor > summary').click()
    assert page.locator('#plan-editor [data-ex-active="'+REAR+'"]').is_checked()
    assert not page.locator('#plan-editor [data-ex-active="'+TRAP+'"]').is_checked()
    assert 'Voador inverso' in page.locator('#plan-editor').inner_text()
    assert 'Encolhimento' in page.locator('#plan-editor').inner_text()
    for width in (320,390,412):
        page.set_viewport_size({'width':width,'height':844})
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),width
    page.set_viewport_size({'width':390,'height':844})
    page.locator('[data-action="start"][data-plan="A"]').click()
    ongoing=snapshot(page)
    assert json.loads(ongoing[KEY])['sessions']==old['sessions']
    saved_draft=json.loads(ongoing[DRAFT_KEY])['draft']
    assert REAR in saved_draft['entries']
    assert TRAP not in saved_draft['entries']
    assert len(saved_draft['entries'][REAR]['sets'])==2
    assert all(setrow['reps']=='' for setrow in saved_draft['entries'][REAR]['sets'])
    assert page.locator('[data-exercise="'+REAR+'"]').count()==1
    assert page.locator('[data-exercise="'+TRAP+'"]').count()==0
    page.close()

    # The optional shrug stays elective even when an alternative is already
    # active. Do not silently override an existing posterior-delt exercise.
    other=copy.deepcopy(old)
    other['exercises'].append({'id':'face-pull','name':'Face pull pessoal','group':'A',
        'sets':3,'low':12,'high':15,'step':2.5,'unit':'kg','mode':'double','knee':False,'active':True})
    alt=open_app(context,{KEY:json.dumps(other,ensure_ascii=False)},errors)
    after=json.loads(snapshot(alt)[KEY])
    assert not next(ex for ex in after['exercises'] if ex['id']==REAR)['active']
    assert not next(ex for ex in after['exercises'] if ex['id']==TRAP)['active']
    assert next(ex for ex in after['exercises'] if ex['id']=='face-pull')['active']
    alt.close()


if __name__=='__main__':
    with sync_playwright() as p:
        path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium') or shutil.which('google-chrome')
        params={'headless':True,'args':['--no-sandbox']}
        if path:params['executable_path']=path
        browser=p.chromium.launch(**params)
        context=browser.new_context(viewport={'width':390,'height':844},
            timezone_id='America/Sao_Paulo',locale='pt-BR')
        errors=[]
        verify(context,errors)
        assert not errors,errors
        browser.close()
    print('PASS upper coverage: migration, history/draft, active posterior, elective shrug, 320/390/412px')
