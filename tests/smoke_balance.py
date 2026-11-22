"""FORJA muscle balance: cold/warm audit, safe ephemeral swap and single weighing source."""
import json,os,shutil
from pathlib import Path
from playwright.sync_api import sync_playwright
from smoke_muscle_history import ROOT,KEY,DRAFT_KEY,open_app,snapshot
from smoke_abdomen import make_seed,state_of,start_plan

def workout(day,i):
    return {'id':'balance-'+str(i),'day':day,'timestamp':day+'T12:00:00Z','planId':'B',
      'entries':[{'id':id,'sets':[{'load':45,'reps':10,'rir':2,'warmup':False} for _ in range(3)]}
        for id in ['supino-halteres','voador']]}

def run(context,seed,errors):
    data=json.loads(seed[KEY])
    data['sessions']=[workout('2026-11-02',1),workout('2026-11-10',2),workout('2026-11-18',3)]
    seed={**seed,KEY:json.dumps(data,ensure_ascii=False)}
    for width in [320,390,412]:
        page=open_app(context,seed,errors)
        page.set_viewport_size({'width':width,'height':844})
        page.locator('#nav [data-tab="progress"]').click()
        page.locator('[data-action="evo-view"][data-view="training"]').click()
        alerts=page.locator('.balance-progress')
        assert alerts.count()==1
        assert 'Reto do abdômen' in alerts.inner_text()
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth+1'),width
        page.locator('#nav [data-tab="plans"]').click()
        page.locator('[data-action="select-plan"][data-plan="B"]').click()
        page.locator('[data-action="start"][data-plan="B"]').click()
        assert page.locator('.balance-session').count()==1
        assert page.locator('.balance-candidate [data-action="balance-select"]').count()==1
        baseline=state_of(page)
        original_exercises=json.dumps(baseline['exercises'],sort_keys=True)
        original_sessions=json.dumps(baseline['sessions'],sort_keys=True)
        page.locator('[data-action="balance-select"]').click()
        assert page.locator('.balance-confirm').count()==1
        assert state_of(page)['sessions']==baseline['sessions']
        page.locator('[data-action="balance-cancel"]').click()
        page.locator('[data-action="balance-select"]').click()
        page.locator('[data-action="balance-apply"]').click()
        current=snapshot(page)
        assert DRAFT_KEY in current
        draft=json.loads(current[DRAFT_KEY])['draft']
        assert len(draft['entries'])>=2
        assert any(x['id'] in ['supino-halteres','voador'] for x in draft['skipped'])
        assert state_of(page)['sessions']==baseline['sessions']
        # Catalog entries added for a draft are inactive in the persistent template.
        saved=state_of(page)
        assert all(ex['active']==before['active'] for before in baseline['exercises']
                   for ex in saved['exercises'] if ex['id']==before['id'])
        assert len(saved['exercises'])>=len(baseline['exercises'])
        assert 'somente nesta sessão' in page.locator('#toast').inner_text()
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth+1'),width
        page.close()

def weighing(context,seed,errors):
    page=open_app(context,seed,errors)
    page.locator('#nav [data-tab="progress"]').click()
    page.locator('[data-action="evo-add-weight"]').click()
    base=state_of(page)
    targets=json.dumps(base['nutrition']['settings']['targets'],sort_keys=True)
    start=base['settings']['startWeight']
    goal=base['settings']['targetWeight']
    page.locator('#new-weight').fill('84.6')
    page.locator('#weight-date').fill('2026-11-22')
    page.locator('#weight-form button[type="submit"]').click()
    updated=state_of(page)
    assert updated['settings']['startWeight']==start
    assert updated['settings']['targetWeight']==goal
    assert json.dumps(updated['nutrition']['settings']['targets'],sort_keys=True)==targets
    assert any(x['date']=='2026-11-22' and x['weight']==84.6 for x in updated['weights'])
    assert '84,6' in page.locator('.evo-weight-kpis').inner_text()
    page.locator('.top-settings').click()
    assert '84,6 kg' in page.locator('#goal-form').inner_text()
    assert str(start) in page.locator('#initial-weight').input_value()
    page.close()

def main():
    errors=[]
    with sync_playwright() as pw:
        binary=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium') or shutil.which('google-chrome')
        opts={'headless':True,'args':['--no-sandbox']}
        if binary:opts['executable_path']=binary
        browser=pw.chromium.launch(**opts)
        ctx=browser.new_context(viewport={'width':390,'height':844},locale='pt-BR',timezone_id='America/Sao_Paulo')
        seed=make_seed(ctx,errors)
        run(ctx,seed,errors)
        weighing(ctx,seed,errors)
        assert not errors,errors
        browser.close()
    print('PASS balance: session-only replacement, 3 viewport widths, inactive library additions, no history loss, weight source updated')

if __name__=='__main__':main()
