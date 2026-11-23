"""Shoulder/trapezius catalog and evidence-aware badges: synthetic mobile QA."""
import json,os,shutil
from playwright.sync_api import sync_playwright
from smoke_muscle_history import open_app,KEY
from smoke_abdomen import make_seed
from smoke_balance import workout

def verify(context,seed,errors,history):
    if history:
        state=json.loads(seed[KEY]);state['sessions']=[
            workout('2026-11-02',1),workout('2026-11-10',2),workout('2026-11-18',3)]
        seed={**seed,KEY:json.dumps(state,ensure_ascii=False)}
    page=open_app(context,seed,errors)
    original=page.evaluate('JSON.stringify(window.__testStorage)')
    page.locator('#nav [data-tab="plans"]').click()
    page.locator('[data-action="training-destination"][data-to="catalog"]').click()
    page.locator('[data-action="catalog-filter"][data-group="S"]').click()
    assert page.locator('.catalog-group-chip.selected').inner_text()=='Ombro e trapézio'
    cards=page.locator('.catalog-browser-item')
    assert cards.count()>=12
    assert any('Encolhimento de ombros com halteres' in card.inner_text() for card in cards.all())
    assert any('Desenvolvimento de ombros' in card.inner_text() for card in cards.all())
    overview=page.locator('.catalog-overview')
    assert overview.count()==1
    assert 'Hoje:' in overview.inner_text() and 'Últimos 7 dias:' in overview.inner_text()
    page.locator('[data-action="catalog-style"][data-style="easy"]').click()
    assert page.locator('.catalog-browser-item:visible').count()>=3
    page.locator('[data-action="catalog-style"][data-style="home"]').click()
    visible=' '.join(x.inner_text() for x in page.locator('.catalog-browser-item:visible').all())
    assert 'elástico' in visible.lower(),visible
    page.locator('[data-action="catalog-style"][data-style="machine"]').click()
    assert page.locator('.catalog-browser-item:visible').count()>0
    page.locator('[data-action="catalog-style"][data-style="all"]').click()
    badges=page.locator('.catalog-recommended-tag')
    assert (badges.count()>0)==history
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth+1')
    if history:
        first=page.locator('.catalog-browser-item').filter(has=page.locator('.catalog-recommended-tag')).first
        name=first.locator('h3').inner_text()
        first.locator('[data-action="catalog-view"]').click()
        assert page.locator('.catalog-detail-advice').count()==1
        assert page.locator('.catalog-volume-context').count()==1
        assert 'RIR' in page.locator('.catalog-volume-context').inner_text()
        page.locator('[data-action="catalog-back"]').click()
        assert page.locator('.catalog-browser-item h3').filter(has_text=name).count()>0
    # Reading catalog must not write any stored state.
    assert page.evaluate('JSON.stringify(window.__testStorage)')==original
    for width in [320,390,412]:
        page.set_viewport_size({'width':width,'height':844})
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth+1'),width
        for item in page.locator('.catalog-group-chip').all():
            assert item.bounding_box()['height']>=44
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
        verify(ctx,seed,errors,False)
        verify(ctx,seed,errors,True)
        assert not errors,errors
        browser.close()
    print('PASS shoulder catalog: category, badges guarded by data, guidance, nonmutation, mobile 320/390/412')

if __name__=='__main__':main()
