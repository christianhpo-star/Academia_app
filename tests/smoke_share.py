"""Share a workout as a local transparent PNG, with only synthetic sessions."""
import json
import os
import shutil
import struct
from pathlib import Path
from playwright.sync_api import sync_playwright
from smoke_muscle_history import open_app, snapshot, KEY, DRAFT_KEY, ROOT
from smoke_abdomen import make_seed, start_plan, state_of

def saved_share(context, seed, errors, folder):
    page=open_app(context,seed,errors)
    start_plan(page,'A')
    exercise=page.locator('[data-exercise="pulley-aberto"]')
    exercise.locator('[data-field="load"]').first.fill('43')
    exercise.locator('[data-field="reps"]').first.fill('10')
    exercise.locator('[data-field="rir"]').first.fill('2')
    page.get_by_role('button',name='Salvar treino',exact=True).click()
    state=state_of(page)
    assert len(state['sessions']) == 1
    assert len(state['sessions'][0]['entries']) == 1
    assert DRAFT_KEY not in snapshot(page)
    assert page.locator('.history-share-quick [data-action="share-open"]').count()==1
    baseline=snapshot(page)
    page.evaluate('window.__storageWrites=[]')
    page.locator('.history-share-quick [data-action="share-open"]').click()
    assert page.locator('.share-screen').count()==1
    assert page.locator('#share-canvas').count()==1
    page.get_by_text('Figurinha pronta: PNG transparente',exact=False).wait_for(timeout=15000)
    assert page.evaluate("""() => {
      const c=document.getElementById('share-canvas'),ctx=c.getContext('2d');
      if(c.width!==1080||c.height!==880)return false;
      const corner=ctx.getImageData(0,0,1,1).data[3];
      const top=ctx.getImageData(50,75,1,1).data[3];
      const body=ctx.getImageData(60,240,1,1).data[3];
      return corner===0&&top>0&&body>0;
    }"""),'Canvas must have a truly transparent border'
    assert page.locator('[data-action="share-download"]').is_enabled()
    assert page.locator('input[type="file"]').count()>=2
    # Editing colors and emphasis never writes real session storage.
    page.locator('[data-action="share-style"][data-value="muscles"]').click()
    page.get_by_text('Figurinha pronta: PNG transparente',exact=False).wait_for(timeout=15000)
    page.locator('[data-action="share-style"][data-value="highlight"]').click()
    page.get_by_text('Figurinha pronta: PNG transparente',exact=False).wait_for(timeout=15000)
    page.locator('[data-action="share-tone"][data-value="light"]').click()
    page.get_by_text('Figurinha pronta: PNG transparente',exact=False).wait_for(timeout=15000)
    page.locator('[data-share-field="phrase"]').fill('Ninguém treina por mim.')
    page.get_by_text('Figurinha pronta: PNG transparente',exact=False).wait_for(timeout=15000)
    page.locator('[data-share-field="showWeek"]').uncheck()
    page.get_by_text('Figurinha pronta: PNG transparente',exact=False).wait_for(timeout=15000)
    assert page.evaluate('window.__storageWrites.length')==0
    assert snapshot(page)==baseline
    for width in (320,390,412,768):
        page.set_viewport_size({'width':width,'height':880})
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth+1'),f'overflow {width}'
        preview=page.locator('#share-canvas').bounding_box()
        assert preview and preview['x']>=-1 and preview['x']+preview['width']<=width+1,preview
        if width in (320,390,412):
            page.locator('.share-preview').screenshot(path=str(folder/f'share-preview-{width}.png'))
    with page.expect_download() as download_info:
        page.locator('[data-action="share-download"]').click()
    transfer=download_info.value
    assert transfer.suggested_filename.startswith('forja-conquista-')
    data=Path(transfer.path()).read_bytes()
    assert data[:8]==b'\x89PNG\r\n\x1a\n'
    width,height,depth,color=struct.unpack('>IIBB',data[16:26])
    assert (width,height,depth,color)==(1080,880,8,6), (width,height,depth,color)
    assert snapshot(page)==baseline
    page.locator('[data-action="share-back"]').click()
    assert page.locator('.history-card').count()==1
    assert snapshot(page)==baseline
    # Historical route uses exactly same editor.
    page.locator('.history-card > summary').first.click()
    page.locator('.history-card [data-action="share-open"]').first.click()
    assert page.locator('.share-screen').count()==1
    page.get_by_text('Figurinha pronta: PNG transparente',exact=False).wait_for(timeout=15000)
    page.locator('[data-action="share-back"]').click()
    assert state_of(page)==state
    assert not errors, errors
    page.close()

def no_leak_or_fake_stats(context, seed, errors):
    state=json.loads(seed[KEY])
    state['sessions']=[{
      'id':'empty-stats','day':'2026-11-22','timestamp':'2026-11-22T15:00:00Z',
      'planId':'A','entries':[],'notes':'SEGREDO NÃO PUBLICAR',
      'cardio':[{'type':'escada','minutes':8,'avgSpeed':7,'speedUnit':'machine_level'}],
    }]
    seed={**seed,KEY:json.dumps(state,ensure_ascii=False)}
    page=open_app(context,seed,errors)
    baseline=snapshot(page)
    page.locator('#nav [data-tab="history"]').click()
    page.locator('[data-action="share-open"]').first.click()
    page.get_by_text('Figurinha pronta: PNG transparente',exact=False).wait_for(timeout=15000)
    assert page.locator('#share-mode option[value="load"]').count()==0
    assert page.locator('#share-mode option[value="cardio"]').count()==1
    assert page.evaluate('ForjaShareSummary.build(JSON.parse(window.__testStorage["forja.academia.v1"]),"empty-stats").largest === null')
    assert 'SEGREDO NÃO PUBLICAR' not in page.locator('.share-screen').inner_text()
    page.locator('#share-mode').select_option('cardio')
    page.get_by_text('Figurinha pronta: PNG transparente',exact=False).wait_for(timeout=15000)
    assert snapshot(page)==baseline
    page.close()

def main():
    folder=ROOT/'screenshots'
    folder.mkdir(exist_ok=True)
    errors=[]
    with sync_playwright() as playwright:
        executable=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium') or shutil.which('google-chrome')
        options={'headless':True,'args':['--no-sandbox']}
        if executable:options['executable_path']=executable
        browser=playwright.chromium.launch(**options)
        context=browser.new_context(viewport={'width':390,'height':844},locale='pt-BR',timezone_id='America/Sao_Paulo',accept_downloads=True)
        seed=make_seed(context,errors)
        saved_share(context,seed,errors,folder)
        no_leak_or_fake_stats(context,seed,errors)
        browser.close()
    print('PASS share: saved session and history, real alpha PNG, privacy, local read-only editor, formats, 320/390/412/768px')

if __name__=='__main__':main()
