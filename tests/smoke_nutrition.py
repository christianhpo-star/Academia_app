"""Synthetic mobile browser smoke for FORJA nutrition."""
import json,os,re,shutil
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
HTML=re.sub(r'<script defer src="./[^"]+"></script>','',(ROOT/'index.html').read_text(encoding='utf-8'))
HTML=re.sub(r'<link rel="stylesheet" href="./styles.css\?v=[^"]+" />','',HTML)
SCRIPTS=['data.js','engine.js','muay.js','calendar.js','flex.js','dose.js','focus.js','catalog-advice.js','body-measures.js','activity.js','health-import.js','nutrition-goals.js','goal-planner.js','reminders.js','daily-routine.js','nutrition.js','nutrition-catalog.js','nutrition-prescription-data.js','nutrition-presets.js','nutrition-balance.js','nutrition-ui.js','evolution-dashboard.js','performance-trends.js','app.js']

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
    # Separate synthetic browser verifies dinner alternatives are mutually exclusive.
    probe=start(context,{},errors)
    probe.on('dialog',lambda d:d.accept())
    probe.locator('#nav [data-tab="nutrition"]').click()
    dinner=probe.locator('.nd-meal').filter(has=probe.get_by_role('heading',name='Jantar'))
    dinner.locator('.nd-plan-alternatives > summary').click()
    wrap=dinner.locator('[data-recipe-card="dinner-wrap"]')
    wrap.locator('[data-plan-choice][data-group="0"]').select_option('1')  # pão de hambúrguer
    wrap.locator('[data-plan-choice][data-group="1"]').select_option('1')  # atum, não frango
    wrap.locator('[data-plan-choice][data-group="2"]').select_option('1')  # sem queijo
    wrap.locator('[data-nd="plan-confirm"]').click()
    after=json.loads(probe.evaluate("localStorage.getItem('forja.academia.v1')"))
    dinners=[e for e in after['nutrition']['entries'] if e['mealType']=='dinner']
    assert len(dinners)==1
    labels=[i['label'] for i in dinners[0]['items']]
    assert labels==['Pão de hambúrguer','Atum'],labels
    assert after['nutrition']['settings']['targets'][0]['values']['energyKcal']==2170
    probe.close()
    # All fruit equivalents from the PDF are available in the single selection.
    fruitprobe=start(context,{},errors)
    fruitprobe.locator('#nav [data-tab="nutrition"]').click()
    fruits=fruitprobe.locator('[data-recipe-card="breakfast-shake"] [data-plan-choice][data-group="3"]')
    assert fruits.locator('option').count()==52
    fruitprobe.close()
    # First launch installs the professional reference without inventing personal measurements.
    first=json.loads(page.evaluate("localStorage.getItem('forja.academia.v1')") or 'null')
    # The in-memory initial state is persisted after a first normal interaction.
    page.locator('#nav [data-tab="nutrition"]').click()
    assert page.locator('.nd-metabolism').count()==1
    assert '1.710' in page.locator('.nd-metabolism').inner_text()
    assert 'altura' in page.locator('.nd-metabolism').inner_text()
    assert page.locator('[data-nd="plan-confirm"]').count()>=1
    page.locator('#nav [data-tab="home"]').click()
    # Passos: atalho diário na Home; só o usuário define 0, ausências permanecem ausentes.
    assert page.locator('#home-steps-form').count()==1
    assert page.locator('#home-step-count').input_value()==''
    page.locator('#home-step-count').fill('8750')
    page.locator('#home-steps-form button[type="submit"]').click()
    log=json.loads(page.evaluate("localStorage.getItem('forja.academia.v1')"))
    assert len(log['activitySteps'])==1 and log['activitySteps'][0]['steps']==8750
    page.locator('#home-step-count').fill('9152')
    page.locator('#home-steps-form button[type="submit"]').click()
    log=json.loads(page.evaluate("localStorage.getItem('forja.academia.v1')"))
    assert len(log['activitySteps'])==1 and log['activitySteps'][0]['steps']==9152
    page.locator('#nav [data-tab="progress"]').click()
    assert page.locator('.progress-steps-day').count()==14
    assert page.locator('.progress-steps-day.known').count()==1
    assert page.locator('.progress-advanced-radar').count()==0
    assert page.locator('.evo-volume-row').count()==4
    page.locator('[data-action="progress-steps-days"][data-days="28"]').click()
    assert page.locator('.progress-steps-day').count()==28
    page.locator('#nav [data-tab="nutrition"]').click()
    assert page.locator('.nd-meal').count()==5
    assert page.locator('.nd-meal').last.locator('h2').inner_text()=='Ceia'
    page.locator('[data-nd="previous"]').click()
    day=page.locator('#nd-date').input_value()
    page.locator('.nd-meal-top [data-nd="add"][data-meal="lunch"]').click()
    assert page.locator('[data-nd="pick"]').count()>=6, 'Catalogue must open with suggestions, not empty Recentes'
    assert 'Arroz branco' in page.locator('#nd-results').inner_text()
    page.locator('[data-nd="mode"][data-mode="fruits"]').click()
    assert 'Abacaxi' in page.locator('#nd-results').inner_text()
    page.locator('[data-nd="all"]').click()
    assert 'Morango' in page.locator('#nd-results').inner_text()
    assert 'Manga Tommy Atkins' in page.locator('#nd-results').inner_text()
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
    assert '≈' in page.locator('#nd-food-preview').inner_text()
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
    assert page.locator('.nd-energy-detail .nd-ring-goal').count()==1
    assert page.locator('.nd-kcal-main strong').count()==1

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
    page.locator('.nd-meal-top [data-nd="add"][data-meal="breakfast"]').click()
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
    page.evaluate('window.scrollTo(0,0)')
    page.locator('.nd-head-goals').click()
    page.locator('#nd-heightCm').fill('175,5');page.locator('#nd-age').fill('30');page.locator('#nd-weightKg').fill('80')
    page.locator('#nd-sex').select_option('male');page.locator('#nd-activity').select_option('1.55')
    page.locator('[name="adultScope"]').check()
    page.locator('#nd-profile button[type="submit"]').click()
    page.locator('[data-nd="suggest"]').click()
    page.locator('[data-nd="accept"]').click()
    assert state()['nutrition']['settings']['profile']['heightCm']==175.5
    page.locator('[data-nd="today"]').click()
    page.evaluate('window.scrollTo(0,0)')
    page.locator('.nd-head-goals').click()
    page.locator('.nd-goals-manual > summary').click()
    page.locator('#nd-target-proteinG').fill('150')
    page.locator('#nd-target button[type="submit"]').click()
    target=state()['nutrition']['settings']['targets'][-1]
    assert target['source']=='manual' and target['values']['proteinG']==150
    page.evaluate('window.scrollTo(0,0)')
    page.locator('.nd-head-goals').click()
    page.locator('#nd-age').fill('31');page.locator('#nd-profile button[type="submit"]').click()
    assert state()['nutrition']['settings']['targets'][-1]==target
    page.locator('[data-nd="close"]').click()
    for width in [320,390,768]:
        page.set_viewport_size({'width':width,'height':844})
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),width
        assert page.evaluate("""() => {
          const card=document.querySelector('.nd-energy-overview');
          const value=card?.querySelector('.nd-kcal-main strong');
          if(!card||!value)return false;
          const r=card.getBoundingClientRect(),v=value.getBoundingClientRect();
          return v.left>=r.left&&v.right<=r.right&&v.top>=r.top&&v.bottom<=r.bottom;
        }"""),f'Energy ring text overflow at {width}px'

        if width in (320,390):
            assert page.evaluate("document.querySelector('.nd-meal').getBoundingClientRect().top < document.querySelector('.bottom-nav').getBoundingClientRect().top"),f'first meal below visible viewport at {width}px'
            assert page.evaluate("[...document.querySelectorAll('#nav .nav-link span')].every(el => el.scrollWidth <= el.clientWidth)"),f'bottom nav label clipped at {width}px'
    page.set_viewport_size({'width':390,'height':844})
    # UX41: progressive scroll, compact sticky day, distinct meal icons.
    assert page.locator('.nd-meal-symbol').count()==5
    assert page.locator('.nd-date-stick').count()==1
    assert page.locator('.nd-macros-overview .nd-ring').count()==4
    assert page.locator('.nd-meal[data-meal-kind]').count()==0
    assert page.locator('.nd-meal-symbol[data-meal-kind="breakfast"]').count()==1
    before_scroll=page.evaluate("""() => document.querySelector('.nd-overview').getBoundingClientRect().top""")
    page.evaluate("window.scrollTo(0,document.querySelector('.nd-meals').getBoundingClientRect().top+window.scrollY)")
    page.wait_for_timeout(100)
    collapsed_height=page.locator('.nd-collapse').evaluate('(e)=>e.getBoundingClientRect().height')
    assert collapsed_height<5, f'Nutrition summary failed to collapse: {collapsed_height}'
    assert page.locator('.nd-date-stick').evaluate('(e)=>e.classList.contains("nd-is-stuck")')
    assert page.evaluate("parseFloat(document.querySelector('.nutrition-screen').style.getPropertyValue('--nd-scroll-progress'))>.7")
    assert page.evaluate("""() => {
      const r=document.querySelector('.nd-date-stick').getBoundingClientRect();
      return r.top>=-1 && r.top<55;
    }""")
    assert page.evaluate("document.querySelector('.nd-overview').getBoundingClientRect().top < "+str(0)) 
    page.evaluate('window.scrollTo(0,0)')
    page.wait_for_timeout(100)
    restored_height=page.locator('.nd-collapse').evaluate('(e)=>e.getBoundingClientRect().height')
    assert restored_height>300, f'Nutrition summary failed to expand on upward scroll: {restored_height}'
    assert page.locator('.nd-overview').is_visible()
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
    assert '≈486,7' in mixed.locator('.nd-energy-detail .nd-ring-inner').text_content()
    assert '≈252 kcal' in mixed.locator('.nd-meal').filter(has=mixed.get_by_role('heading',name='Lanche')).inner_text()
    assert 'valores aproximados ou incompletos' in mixed.locator('.nd-data-quality').text_content().lower()
    assert '≈' in mixed.locator('.nd-overview').inner_text()
    for width in (320,390):
        mixed.set_viewport_size({'width':width,'height':844})
        assert mixed.evaluate('document.documentElement.scrollWidth <= innerWidth')
    mixed.close()
    # Porcao compartilhada: dois participantes; somente consumo individual e estimativas.
    shared=start(context,{},errors)
    shared.locator('#nav [data-tab="nutrition"]').click()
    shared.locator('[data-nd="shared"]').click()
    assert shared.locator('#nd-shared').is_visible()
    assert '2 pessoas' in shared.locator('#nd-shared').inner_text()
    assert 'Trono dos Reis' in shared.locator('#nd-shared').inner_text()
    assert '415 g' in shared.locator('#nd-shared-preview').inner_text()
    assert '≈' in shared.locator('#nd-shared-preview').inner_text()
    assert not json.loads(shared.evaluate("localStorage.getItem('forja.academia.v1')"))['nutrition']['entries']
    shared.locator('#nd-total-0').fill('300')
    shared.locator('#nd-share-0').fill('60')
    assert '180 g' in shared.locator('#nd-share-my-0').inner_text()
    shared.locator('#nd-share-global').fill('25')
    shared.locator('[data-nd="apply-share"]').click()
    assert shared.locator('#nd-share-0').input_value()=='25'
    assert shared.locator('#nd-share-4').input_value()=='25'
    shared.locator('#nd-share-1').fill('75')
    assert '150 g' in shared.locator('#nd-share-my-1').inner_text()
    for width in (320,390):
        shared.set_viewport_size({'width':width,'height':844})
        assert shared.evaluate('document.documentElement.scrollWidth <= innerWidth'),width
    shared.set_viewport_size({'width':390,'height':844})
    shared.locator('#nd-shared button[type="submit"]').click()
    assert shared.locator('#nd-items .nd-item').count()==5
    shared.locator('.nd-save-sticky button[type="submit"]').click()
    shared_state=json.loads(shared.evaluate("localStorage.getItem('forja.academia.v1')"))
    assert len(shared_state['nutrition']['entries'])==1
    meal=shared_state['nutrition']['entries'][0]
    assert meal['mealType']=='dinner'
    assert all(item['estimate']['confidence']=='low' for item in meal['items'])
    assert shared.evaluate("""() => {
      const n=window.ForjaNutrition,archive=JSON.parse(localStorage.getItem('forja.academia.v1')).nutrition;
      return n.observedTotals(archive.entries,archive.entries[0].date).totals.energyKcal===null;
    }""")
    assert '≈' in shared.locator('.nd-overview').inner_text()
    shared.screenshot(path=str(ROOT/'screenshots/nutrition-shared-390.png'),full_page=True)
    shared.close()
    # Weekly balance: only explicitly reviewed, complete days can create a temporary offer.
    balance_seed=page.evaluate("""() => {
      const state=JSON.parse(localStorage.getItem('forja.academia.v1'));
      const N=window.ForjaNutrition,B=window.ForjaEnergyBalance;
      const localNow=new Date();
      const today=[localNow.getFullYear(),String(localNow.getMonth()+1).padStart(2,'0'),String(localNow.getDate()).padStart(2,'0')].join('-');
      state.nutrition=N.archive();
      const profile={heightCm:175,age:30,weightKg:80,activity:1.55,sex:'male',
        goal:'loss',adultScope:true,confirmedAt:today};
      state.nutrition.settings.profile=profile;
      state.nutrition.settings.targets=[{id:'smoke-balance-goal',from:B.shift(today,-30),
        source:'manual',profile,formula:'manual-v1',
        values:{energyKcal:2400,proteinG:144,carbsG:307,fatG:66,fiberG:25}}];
      [3300,2300,2300].forEach((kcal,i)=>{
        const day=B.shift(today,i-3);
        state.nutrition.entries.push({
          id:'smoke-balance-meal-'+i,date:day,mealType:'dinner',
          items:Array.from({length:3},(_,j)=>({
            id:'smoke-balance-item-'+i+'-'+j,label:'Alimento aferido sintético',
            quantity:1,unit:'portion',grams:null,source:{name:'Teste sintético'},
            nutrientsPer100g:{energyKcal:null,proteinG:null,carbsG:null,fatG:null},
            nutrientsPerServing:{energyKcal:kcal/3,proteinG:50,carbsG:90,fatG:20,fiberG:8}
          }))
        });
      });
      if(!N.validArchive(state.nutrition))throw Error('Synthetic archive invalid');
      return JSON.stringify(state);
    }""")
    balance=start(context,{'forja.academia.v1':balance_seed},errors)
    balance.on('dialog',lambda d:d.accept())
    balance.locator('#nav [data-tab="nutrition"]').click()
    assert balance.locator('.nd-balance').count()==1
    for i in (3,2,1):
        stamp=balance.evaluate('(offset)=>{const d=new Date(),day=[d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");return window.ForjaEnergyBalance.shift(day,-offset)}',i)
        balance.locator('.nd-balance > summary').click()
        balance.locator('.nd-balance-history > summary').click()
        balance.locator('[data-nd="balance-review"][data-date="'+stamp+'"]').click()
        assert balance.locator('#nd-balance-review').is_visible()
        balance.locator('#nd-balance-review input[name="complete"]').check()
        balance.locator('#nd-balance-review button[type="submit"]').click()
    assert 'Sugestão opcional disponível' in balance.locator('.nd-balance > summary').inner_text()
    balance.locator('.nd-balance > summary').click()
    balance.locator('[data-nd="balance-plan"]').click()
    assert balance.locator('#nd-balance-plan').is_visible()
    candidates=balance.locator('#nd-balance-plan input[name="dates"]')
    assert candidates.count()>=3
    for i in range(3):candidates.nth(i).check()
    assert 'Proteína' in balance.locator('#nd-balance-preview').inner_text()
    balance.locator('#nd-balance-plan input[name="accept"]').check()
    balance.locator('#nd-balance-plan button[type="submit"]').click()
    accepted=json.loads(balance.evaluate("localStorage.getItem('forja.academia.v1')"))
    assert accepted['nutrition']['balance']['plan']['days']
    assert accepted['nutrition']['settings']['targets'][0]['values']['energyKcal']==2400
    assert accepted['nutrition']['settings']['targets'][0]['values']['proteinG']==144
    assert balance.evaluate("""() => {
      const n=JSON.parse(localStorage.getItem('forja.academia.v1')).nutrition;
      const p=n.balance.plan,day=p.days[0].date;
      const x=window.ForjaEnergyBalance.planForDay(n,{sessions:[],muay:{sessions:[]}},day);
      return !!x&&x.values.energyKcal<2400&&x.values.proteinG===144&&x.values.fatG===66;
    }""")
    for width in (320,390):
        balance.set_viewport_size({'width':width,'height':844})
        assert balance.evaluate('document.documentElement.scrollWidth<=innerWidth'),width
    balance.locator('.nd-balance > summary').click()
    balance.screenshot(path=str(ROOT/'screenshots/nutrition-balance-390.png'),full_page=True)
    balance.close()
    # Evolução: exact Peso/Nutrição hierarchy, mobile range controls, no invented data.
    evo=start(context,{},errors)
    evo.locator('#nav [data-tab="progress"]').click()
    assert evo.locator('.evo-tabs [data-action="evo-view"]').count()==2
    assert evo.locator('#evo-panel-weight').is_visible()
    assert 'Peso inicial' in evo.locator('.evo-weight-kpis').inner_text()
    assert evo.locator('.evo-cta').is_visible()
    assert evo.locator('.evo-history-fold').count()==1
    assert evo.locator('.evo-more-tools').count()==1
    assert not evo.locator('.evo-more-tools').evaluate('(x)=>x.open')
    assert evo.locator('.evo-volume-row').count()==4
    assert evo.locator('.progress-steps-card').count()==1
    assert evo.locator('.evo-hero').count()==0
    assert evo.locator('.evo-chart-selector').count()==1
    evo.locator('[data-action="evo-chart-mode"][data-mode="measures"]').click()
    assert evo.locator('#evo-measure-field').is_visible()
    evo.locator('#evo-measure-field').select_option('chest')
    assert 'Peitoral' in evo.locator('#evo-weight-heading').locator('..').inner_text() or 'Peitoral' in evo.locator('.evo-body-chart').inner_text()
    evo.locator('[data-action="evo-chart-mode"][data-mode="weight"]').click()
    evo.locator('[data-action="evo-volume-days"][data-days="90"]').click()
    assert evo.locator('[data-action="evo-volume-days"][data-days="90"]').get_attribute('aria-pressed')=='true'
    evo.locator('[data-action="evo-view"][data-view="nutrition"]').click()
    assert evo.locator('#evo-panel-nutrition').is_visible()
    assert evo.get_by_role('heading',name='Objetivo (kcal)').count()==1
    assert evo.get_by_role('heading',name='Distribuição de macros (%)').count()==1
    assert evo.get_by_role('heading',name='Média de macronutrientes (g)').count()==1
    assert evo.locator('[data-action="evo-period"]').count()==9
    assert 'Nenhuma caloria registrada' in evo.locator('#evo-panel-nutrition').inner_text()
    for kind in ('energy','macros','average'):
        evo.locator('[data-action="evo-period"][data-kind="'+kind+'"][data-days="30"]').click()
        assert evo.locator('[data-action="evo-period"][data-kind="'+kind+'"][data-days="30"]').get_attribute('aria-pressed')=='true'
    for width in (320,390):
        evo.set_viewport_size({'width':width,'height':844})
        assert evo.evaluate('document.documentElement.scrollWidth<=innerWidth'),width
    evo.locator('[data-action="evo-view"][data-view="weight"]').click()
    evo.locator('.evo-cta').click()
    assert evo.locator('#evo-weight-editor').evaluate('(e)=>e.open')
    assert evo.locator('#weight-form').is_visible()
    evo.screenshot(path=str(ROOT/'screenshots/evolution-weight-390.png'),full_page=True)
    evo.locator('[data-action="evo-view"][data-view="nutrition"]').click()
    evo.screenshot(path=str(ROOT/'screenshots/evolution-nutrition-390.png'),full_page=True)
    evo.close()
    # Quota errors preserve original history and form.
    page.locator('.nd-meal-top [data-nd="add"][data-meal="snack"]').click()
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
