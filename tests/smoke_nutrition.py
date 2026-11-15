"""Synthetic mobile browser smoke for FORJA nutrition."""
import json,os,re,shutil
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
HTML=re.sub(r'<script defer src="./[^"]+"></script>','',(ROOT/'index.html').read_text(encoding='utf-8'))
HTML=re.sub(r'<link rel="stylesheet" href="./styles.css\?v=[^"]+" />','',HTML)
SCRIPTS=['data.js','engine.js','muay.js','calendar.js','flex.js','dose.js','focus.js','catalog-advice.js','body-measures.js','activity.js','health-import.js','nutrition-goals.js','goal-planner.js','reminders.js','daily-routine.js','nutrition.js','nutrition-catalog.js','nutrition-ui.js','app.js']

def start(context,stored,errors):
    page=context.new_page()
    page.on('pageerror',lambda error:errors.append(str(error)))
    page.set_content(HTML)
    page.evaluate("""seed => {
      window.__testStorage={...seed};
      Object.defineProperty(window,'localStorage',{configurable:true,value:{
        getItem(k){return window.__testStorage[k]??null},
        setItem(k,v){window.__testStorage[k]=String(v)},
        removeItem(k){delete window.__testStorage[k]}
      }});
    }""",stored)
    page.add_style_tag(path=str(ROOT/'styles.css'))
    for script in SCRIPTS:page.add_script_tag(path=str(ROOT/script))
    page.wait_for_selector('#screen h1',timeout=10000)
    return page

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path=shutil.which('chromium'),args=['--no-sandbox'])
    context=browser.new_context(viewport={'width':390,'height':844},locale='pt-BR')
    errors=[]
    page=start(context,{},errors)
    page.on('dialog',lambda d:d.accept())
    page.locator('#nav [data-tab="nutrition"]').click()
    assert page.locator('.nd-meal').count()==5
    assert page.locator('.nd-meal').last.locator('h2').inner_text()=='Ceia'
    page.locator('[data-nd="previous"]').click()
    day=page.locator('#nd-date').input_value()
    page.locator('.nd-meal [data-nd="add"][data-meal="lunch"]').click()
    assert page.locator('[data-nd="pick"]').count()>=6, 'Catalogue must open with suggestions, not empty Recentes'
    assert 'Arroz branco' in page.locator('#nd-results').inner_text()
    page.locator('[data-nd="mode"][data-mode="search"]').click()
    # Brazilian everyday foods must be searchable by preparation, not grouped as generic meat.
    for search_term,food_name in [
        ('bife de boi','Bife bovino'),
        ('bife de porco','Bisteca suína'),
        ('frango empanado','Filé de frango empanado'),
        ('batata frita','Batata frita em palitos')
    ]:
        page.locator('#nd-search').fill(search_term)
        assert food_name in page.locator('#nd-results').inner_text(),search_term
    # Peso digitado sem arredondar: 121 g de contrafilé.
    page.locator('#nd-search').fill('bife de boi')
    page.locator('[data-nd="pick"][data-id="taco:2011:346"]').click()
    assert page.locator('#nd-catalog select[name="portion"]').input_value()=='custom'
    page.locator('#nd-catalog input[name="count"]').fill('121')
    assert '234,7 kcal' in page.locator('#nd-food-preview').inner_text()
    assert '43,4 g' in page.locator('#nd-food-preview').inner_text()
    page.locator('#nd-catalog button[type="submit"]').click()
    assert page.locator('#nd-items .nd-item').count()==1
    page.locator('#nd-items [data-nd="remove"]').first.click()
    assert page.locator('#nd-items .nd-item').count()==0
    # Doces caseiros por gramas entram como estimativa, não rótulo.
    page.locator('#nd-search').fill('brigadeiro com morango')
    page.locator('[data-nd="pick"][data-id="recipe:brigadeiro-morango"]').click()
    page.locator('#nd-catalog input[name="count"]').fill('121.5')
    assert 'baixa confiança' in page.locator('#nd-food-preview').inner_text()
    page.locator('#nd-catalog button[type="submit"]').click()
    assert page.locator('#nd-items .nd-item').count()==1
    page.locator('#nd-items [data-nd="remove"]').first.click()
    assert page.locator('#nd-items .nd-item').count()==0
    page.locator('#nd-search').fill('batata frita')
    page.locator('[data-nd="pick"][data-id="taco:2011:93"]').click()
    page.locator('#nd-catalog select[name="portion"]').select_option('100g')
    page.locator('#nd-catalog button[type="submit"]').click()
    assert page.locator('#nd-items .nd-item').count()==1
    page.locator('#nd-items [data-nd="remove"]').first.click()
    assert page.locator('#nd-items .nd-item').count()==0
    page.locator('#nd-search').fill('PRO FORCE')
    page.locator('[data-nd="pick"]').click()
    page.locator('#nd-catalog button[type="submit"]').click()
    page.locator('#nd-search').fill('ovo')
    page.locator('[data-nd="pick"][data-id="ref:generic-173424"]').click()
    page.locator('#nd-catalog button[type="submit"]').click()
    page.locator('.nd-save-sticky button[type="submit"]').click()
    def state():return json.loads(page.evaluate("localStorage.getItem('forja.academia.v1')"))
    saved=state();entry=saved['nutrition']['entries'][0]
    assert entry['date']==day and entry['mealType']=='lunch'
    assert len(entry['items'])==2 and entry['items'][0]['grams'] is None
    lunch=page.locator('.nd-meal').filter(has=page.get_by_role('heading',name='Almoço'))
    assert lunch.locator('.nd-meal-macro').count()==3
    assert lunch.locator('.nd-meal-details').count()==1
    assert not lunch.locator('.nd-food-table').is_visible(), 'Food rows must start collapsed'
    lunch.locator('.nd-meal-details > summary').click()
    assert lunch.locator('.nd-food-table').is_visible()
    assert lunch.locator('.nd-food-table tbody tr').count()==2
    assert lunch.locator('.nd-food-thumb').count()==2
    assert lunch.locator('[data-food-icon="drink"]').count()==1
    assert lunch.locator('[data-food-icon="egg"]').count()==1
    assert page.locator('.nd-energy .nd-ring-goal').count()==1
    assert page.locator('.nd-energy .nd-ring-inner').inner_text().count(' de ')==0

    assert 'P (g)' in lunch.locator('.nd-food-table thead').inner_text()
    assert 'Fib (g)' in lunch.locator('.nd-food-table thead').inner_text()
    assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
    lunch.locator('.nd-meal-details > summary').click()
    assert entry['items'][0]['nutrientsPerServing']['proteinG']==23
    # Compound editing keeps packaged units and IDs.
    page.locator('.nd-meal-details > summary').first.click()
    page.locator('[data-nd="edit"]').first.click()
    page.locator('#nd-qty-0').fill('2')
    page.locator('.nd-save-sticky button[type="submit"]').click()
    edited=state()['nutrition']['entries'][0]
    assert edited['id']==entry['id'] and edited['items'][0]['id']==entry['items'][0]['id']
    assert edited['items'][0]['quantity']==2 and edited['items'][0]['grams'] is None
    page.locator('.nd-meal-details > summary').first.click()
    page.locator('[data-nd="favorite"]').first.click()
    page.locator('[data-nd="add"][data-meal="supper"]').click()
    page.locator('[data-nd="mode"][data-mode="favorites"]').click()
    page.locator('[data-nd="use-favorite"]').first.click()
    assert len(state()['nutrition']['entries'])==1 # review does not log
    page.locator('.nd-save-sticky button[type="submit"]').click()
    assert state()['nutrition']['entries'][1]['mealType']=='supper'
    assert state()['nutrition']['entries'][1]['date']==day
    # Draft survives navigation/restart without a fictitious meal.
    page.locator('[data-nd="add"][data-meal="breakfast"]').click()
    assert 'Itambé' in page.locator('#nd-results').inner_text(), 'Itambé should be suggested for breakfast'
    assert 'Piracanjuba' in page.locator('#nd-results').inner_text(), 'Piracanjuba should be visible without search'
    assert 'Whey Growth' in page.locator('#nd-results').inner_text(), 'Whey shortcut should be visible without search'
    # Growth products: product-specific labels, fractional grams and daily totals.
    page.locator('#nd-search').fill('Growth 100% Whey Protein Concentrado Chocolate')
    assert 'Growth — 100% Whey Protein Concentrado (Chocolate)' in page.locator('#nd-results').inner_text()
    page.locator('[data-nd="pick"][data-id="growth:official:100-chocolate"]').click()
    assert page.locator('#nd-catalog select[name="portion"]').input_value()=='custom'
    page.locator('#nd-catalog input[name="count"]').fill('35.5')
    assert '143,2 kcal' in page.locator('#nd-food-preview').inner_text()
    assert '24,9 g' in page.locator('#nd-food-preview').inner_text()
    page.locator('#nd-catalog button[type="submit"]').click()
    assert page.locator('#nd-items .nd-item').count()==1
    page.locator('#nd-items [data-nd="remove"]').first.click()
    assert page.locator('#nd-items .nd-item').count()==0
    # Integrated whey mixer: one inline editor, separate milk item, correct subtotal.
    page.locator('#nd-search').fill('Growth 100% Whey Protein Concentrado Chocolate')
    page.locator('[data-nd="pick"][data-id="growth:official:100-chocolate"]').click()
    assert page.locator('#nd-portion-panel #nd-catalog').count()==1
    assert page.locator('#nd-results [data-nd="pick"]').count()==0
    page.locator('#nd-count').fill('35.5')
    page.locator('#nd-milk').select_option('skim')
    page.locator('#nd-milkMl').fill('200')
    assert '208,2 kcal' in page.locator('#nd-food-preview').inner_text()
    page.locator('#nd-catalog button[type="submit"]').click()
    assert page.locator('#nd-items .nd-item').count()==2
    assert page.locator('#nd-qty-1').input_value()=='200'
    page.locator('#nd-items [data-nd="remove"]').first.click()
    page.locator('#nd-items [data-nd="remove"]').first.click()
    assert page.locator('#nd-items .nd-item').count()==0
    # Coffee and Monster use precise millilitres, no misleading mL-to-gram conversion.
    page.locator('#nd-search').fill('monster 0')
    page.locator('[data-nd="pick"][data-id="drink:monster-zero-sugar-473ml"]').click()
    assert page.locator('#nd-portion').input_value()=='customMl'
    page.locator('#nd-count').fill('473')
    page.locator('#nd-catalog button[type="submit"]').click()
    assert page.locator('#nd-qty-0').input_value()=='473'
    page.locator('#nd-items [data-nd="remove"]').first.click()
    page.locator('#nd-search').fill('cafe sem acucar')
    page.locator('[data-nd="pick"][data-id="drink:cafe-coado-sem-acucar"]').click()
    page.locator('#nd-count').fill('80')
    assert '7,2 kcal' in page.locator('#nd-food-preview').inner_text()
    page.locator('#nd-catalog button[type="submit"]').click()
    page.locator('#nd-items [data-nd="remove"]').first.click()
    assert page.locator('.nd-save-sticky button').is_disabled()
    page.locator('#nd-search').fill('itambe')
    assert 'Itambé' in page.locator('#nd-results').inner_text()
    page.locator('#nd-search').fill('não existe alimento')
    assert 'Nenhum item encontrado' in page.locator('#nd-results').inner_text()
    page.locator('#nd-search').fill('')
    page.get_by_text('Adicionar manualmente / rótulo',exact=True).click()
    page.locator('#nd-label').fill('Rascunho sintético')
    page.locator('[data-nd="close"]').click()
    storage=page.evaluate('structuredClone(window.__testStorage)')
    page.close();page=start(context,storage,errors);page.on('dialog',lambda d:d.accept())
    page.locator('#nav [data-tab="nutrition"]').click()
    page.locator('[data-nd="resume"]').click()
    page.get_by_text('Adicionar manualmente / rótulo',exact=True).click()
    assert page.locator('#nd-label').input_value()=='Rascunho sintético'
    page.locator('#nd-manual button[type="submit"]').click()
    page.locator('.nd-save-sticky button[type="submit"]').click()
    assert len(state()['nutrition']['entries'])==3
    # Complete profile, accept estimate, override target; edits to profile never overwrite it.
    page.locator('[data-nd="goals"]').first.click()
    page.locator('#nd-heightCm').fill('175,5');page.locator('#nd-age').fill('30');page.locator('#nd-weightKg').fill('80')
    page.locator('#nd-sex').select_option('male');page.locator('#nd-activity').select_option('1.55')
    page.locator('[name="adultScope"]').check()
    page.locator('#nd-profile button[type="submit"]').click()
    page.locator('[data-nd="suggest"]').click()
    page.locator('[data-nd="accept"]').click()
    assert state()['nutrition']['settings']['profile']['heightCm']==175.5
    page.locator('[data-nd="today"]').click()
    page.locator('[data-nd="goals"]').first.click()
    page.locator('.nd-goals-manual > summary').click()
    page.locator('#nd-target-proteinG').fill('150')
    page.locator('#nd-target button[type="submit"]').click()
    target=state()['nutrition']['settings']['targets'][-1]
    assert target['source']=='manual' and target['values']['proteinG']==150
    page.locator('[data-nd="goals"]').first.click()
    page.locator('#nd-age').fill('31');page.locator('#nd-profile button[type="submit"]').click()
    assert state()['nutrition']['settings']['targets'][-1]==target
    page.locator('[data-nd="close"]').click()
    for width in [320,390,768]:
        page.set_viewport_size({'width':width,'height':844})
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),width
        assert page.evaluate("""() => {
          const ring=document.querySelector('.nd-energy .nd-ring');
          const value=ring?.querySelector('strong');
          if(!ring||!value)return false;
          const r=ring.getBoundingClientRect(),v=value.getBoundingClientRect();
          return v.left>=r.left&&v.right<=r.right&&v.top>=r.top&&v.bottom<=r.bottom;
        }"""),f'Energy ring text overflow at {width}px'

        if width in (320,390):
            assert page.evaluate("document.querySelector('.nd-meal').getBoundingClientRect().top < document.querySelector('.bottom-nav').getBoundingClientRect().top"),f'first meal below visible viewport at {width}px'
            assert page.evaluate("[...document.querySelectorAll('#nav .nav-link span')].every(el => el.scrollWidth <= el.clientWidth)"),f'bottom nav label clipped at {width}px'
    page.set_viewport_size({'width':390,'height':844})
    (ROOT/'screenshots').mkdir(exist_ok=True)
    page.screenshot(path=str(ROOT/'screenshots/nutrition-390.png'),full_page=True)
    # Regression: a mixed day must show recorded subtotals even with estimated sweets.
    synthetic=page.evaluate("""date => {
      const state=JSON.parse(localStorage.getItem('forja.academia.v1'));
      let i=0;const uid=prefix=>prefix+'-mix-'+(++i);
      const beef=window.ForjaNutritionCatalog.makeItem('taco:2011:346','custom',121,uid);
      const candy=window.ForjaNutritionCatalog.makeItem('recipe:brigadeiro-morango','custom',80,uid);
      const unknown=window.ForjaNutritionCatalog.makeItem('growth:whey-unknown','dose',1,uid);
      state.nutrition.entries=[
        {id:'mixed-lunch',date,mealType:'lunch',items:[beef]},
        {id:'mixed-snack',date,mealType:'snack',items:[candy,unknown]}
      ];
      delete state.nutrition.draft;
      return JSON.stringify(state);
    }""",day)
    mixed=start(context,{'forja.academia.v1':synthetic},errors)
    mixed.locator('#nav [data-tab="nutrition"]').click()
    mixed.locator('#nd-date').fill(day)
    mixed.locator('#nd-date').dispatch_event('change')
    assert '≈486,7' in mixed.locator('.nd-energy .nd-ring-inner').inner_text()
    assert '≈252 kcal registradas' in mixed.locator('.nd-meal').filter(has=mixed.get_by_role('heading',name='Lanche')).inner_text()
    assert 'alimento(s) sem calorias disponíveis' in mixed.locator('.nd-summary').inner_text()
    assert 'Detalhes e incerteza' in mixed.locator('.nd-summary').inner_text()
    for width in (320,390):
        mixed.set_viewport_size({'width':width,'height':844})
        assert mixed.evaluate('document.documentElement.scrollWidth <= innerWidth')
    mixed.close()
    # Quota errors preserve original history and form.
    page.locator('[data-nd="add"][data-meal="snack"]').click()
    page.get_by_text('Adicionar manualmente / rótulo',exact=True).click()
    page.locator('#nd-label').fill('Falha de armazenamento')
    page.locator('#nd-manual button[type="submit"]').click()
    original=state()['nutrition']['entries']
    page.evaluate("() => { localStorage.setItem = () => {throw new Error('quota')}; }")
    page.locator('.nd-save-sticky button[type="submit"]').click()
    assert page.locator('dialog').is_visible()
    assert state()['nutrition']['entries']==original
    assert 'Não foi possível salvar' in page.locator('dialog [role="alert"]').inner_text()
    assert errors==[],errors
    browser.close()
    print('PASS nutrition: dated compound meals, favorites, draft recovery, editable profile/goals, quota, responsive')
