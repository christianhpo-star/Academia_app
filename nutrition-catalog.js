/* FORJA offline quick catalogue. Branded product facts originate from user-supplied screenshots.
 * Non-branded foods use generic approximate reference values, not exact FDC-ID matches.
 * Households measures are rough estimates; no food is recorded automatically.
 */
(function installNutritionCatalog(root) {
  'use strict';
  const N = root.ForjaNutrition;
  const source = () => ({
    name:'Referência nutricional genérica',
    reference:'Estimativas aproximadas de alimentos padrão; valores ainda não vinculados a FDC ID verificado',
    license:'Referência informativa',
  });
  const p = (id,label,grams,factor=1) => ({id,label,grams,factor});
  const foods = [
    {
      id:'local:doce-cascao-acai-trufado-branco-500ml',
      name:'Doce Cascão — Açaí trufado Branco 500 ml',category:'Sobremesas',
      aliases:['açaí','acai','trufado','branco','ninho','doce cascao','doce cascão','sorveteria'],preparation:'other',
      note:'Estimativa não oficial. Açaí com creme Ninho em camadas e raspas de chocolate branco. O copo tem 500 ml; peso e receita não foram informados.',
      nutrientsPer100g:{energyKcal:null,proteinG:null,carbsG:null,fatG:null},
      source:{name:'Estimativa nutricional independente',reference:'Vitafrut, Nestlé Professional e referência de chocolate branco; ver docs/acai-estimates.md',license:'Estimativa, não é rótulo da loja'},
      estimate:{
        confidence:'low',servingLabel:'1 copo inteiro de 500 ml',
        assumptions:'Base: 300 g açaí com guaraná + 90 g creme Ninho + 15 g raspas brancas. Variação: 250–350 g açaí, 60–120 g creme, 10–25 g chocolate.',
        central:{energyKcal:814.4,proteinG:9.9,carbsG:132.8,fatG:26.8},
        low:{energyKcal:615.4,proteinG:7,carbsG:100.8,fatG:20.3},
        high:{energyKcal:1040.8,proteinG:13.1,carbsG:167.8,fatG:34.9},
      },
      portions:[p('whole','1 copo inteiro (500 ml)',null,1),p('half','½ copo (≈250 ml, divisão proporcional)',null,0.5)],
    },
    {
      id:'local:doce-cascao-acai-trufado-preto-500ml',
      name:'Doce Cascão — Açaí trufado Preto 500 ml',category:'Sobremesas',
      aliases:['açaí','acai','trufado','preto','avelã','avela','doce cascao','doce cascão','sorveteria'],preparation:'other',
      note:'Estimativa não oficial. Açaí com creme de avelã em camadas e raspas de chocolate. O copo tem 500 ml; peso e receita não foram informados.',
      nutrientsPer100g:{energyKcal:null,proteinG:null,carbsG:null,fatG:null},
      source:{name:'Estimativa nutricional independente',reference:'Vitafrut, Nutella (referência), Nestlé chocolate; ver docs/acai-estimates.md',license:'Estimativa, não é rótulo da loja'},
      estimate:{
        confidence:'low',servingLabel:'1 copo inteiro de 500 ml',
        assumptions:'Base: 300 g açaí com guaraná + 90 g creme de avelã + 15 g raspas de chocolate ao leite. Variação: 250–350 g açaí, 60–120 g creme, 10–25 g chocolate.',
        central:{energyKcal:1003.4,proteinG:8.9,carbsG:134.3,fatG:46.9},
        low:{energyKcal:741.4,proteinG:6.4,carbsG:101.8,fatG:33.7},
        high:{energyKcal:1292.2,proteinG:11.8,carbsG:169.6,fatG:61.8},
      },
      portions:[p('whole','1 copo inteiro (500 ml)',null,1),p('half','½ copo (≈250 ml, divisão proporcional)',null,0.5)],
    },
    {
      id:'local:doce-cascao-adicional-ninho',
      name:'Adicional de creme Ninho (≈20 g, estimativa)',category:'Adicionais',
      aliases:['adicional','ninho','creme ninho','recheio ninho'],preparation:'other',
      note:'Registrar à parte somente se você adicionou creme extra. 20 g são uma hipótese, não a porção medida pela loja.',
      nutrientsPer100g:{energyKcal:null,proteinG:null,carbsG:null,fatG:null},
      source:{name:'Estimativa por ingrediente',reference:'Recheio Ninho Nestlé Professional; consultar docs/acai-estimates.md',license:'Estimativa, não é rótulo da loja'},
      estimate:{
        confidence:'low',servingLabel:'1 colher estimada de 20 g',
        assumptions:'Referência de recheio Ninho (330 kcal/100 g); quantidade aproximada 20 g, intervalo 15–25 g.',
        central:{energyKcal:66,proteinG:1.5,carbsG:11.2,fatG:1.7},
        low:{energyKcal:49.5,proteinG:1.1,carbsG:8.4,fatG:1.3},
        high:{energyKcal:82.5,proteinG:1.9,carbsG:14,fatG:2.1},
      },
      portions:[p('extra','1 adicional estimado (≈20 g)',null,1)],
    },
    {
      id:'local:doce-cascao-adicional-avela',
      name:'Adicional de creme de avelã (≈20 g, estimativa)',category:'Adicionais',
      aliases:['adicional','avelã','avela','creme avelã','creme avela'],preparation:'other',
      note:'Registrar à parte somente se adicionou creme extra. Referência de creme de avelã tipo Nutella; produto da loja pode variar.',
      nutrientsPer100g:{energyKcal:null,proteinG:null,carbsG:null,fatG:null},
      source:{name:'Estimativa por ingrediente',reference:'Informação nutricional Nutella Brasil; consultar docs/acai-estimates.md',license:'Estimativa, não é rótulo da loja'},
      estimate:{
        confidence:'low',servingLabel:'1 colher estimada de 20 g',
        assumptions:'Referência de creme de avelã (542 kcal/100 g); quantidade aproximada 20 g, intervalo 15–25 g.',
        central:{energyKcal:108.4,proteinG:1.3,carbsG:11.6,fatG:6.2},
        low:{energyKcal:81.3,proteinG:0.9,carbsG:8.7,fatG:4.7},
        high:{energyKcal:135.5,proteinG:1.6,carbsG:14.5,fatG:7.8},
      },
      portions:[p('extra','1 adicional estimado (≈20 g)',null,1)],
    },

    {
      id:'photo:itambe-zero-morango-200g',name:'Itambé zero lactose morango, pote 200 g',category:'Laticínios',
      aliases:['itambe','itambé','iogurte','morango','zero lactose'],preparation:'other',
      note:'Informações mostradas na captura enviada: 200 g = 52 kcal, 6 g de proteína, 7 g de carboidratos, 0 g de gorduras. Confira a embalagem ao recomprar.',
      nutrientsPer100g:{energyKcal:null,proteinG:null,carbsG:null,fatG:null},
      nutrientsPerServing:{energyKcal:52,proteinG:6,carbsG:7,fatG:0},
      source:{name:'Captura enviada pelo usuário',reference:'Iogurte Itambé zero lactose morango, porção 200 g',license:'Valores transcritos de imagem pessoal'},
      portions:[p('pack','1 pote (200 g)',200)],
    },
    {
      id:'photo:piracanjuba-proforce-banoffee-250ml',name:'Piracanjuba PRO FORCE Banoffee, 250 ml',category:'Bebidas proteicas',
      aliases:['pro force','proforce','piracanjuba','banoffee','bebida proteica'],preparation:'other',
      note:'Informações mostradas na captura enviada: 250 ml = 170 kcal, 23 g de proteína, 17 g de carboidratos e 1 g de gorduras. Volume não foi convertido em gramas.',
      nutrientsPer100g:{energyKcal:null,proteinG:null,carbsG:null,fatG:null},
      nutrientsPerServing:{energyKcal:170,proteinG:23,carbsG:17,fatG:1},
      source:{name:'Captura enviada pelo usuário',reference:'PRO FORCE Banoffee Piracanjuba, porção 250 ml',license:'Valores transcritos de imagem pessoal'},
      portions:[p('pack','1 unidade (250 ml)',null)],
    },
    {
      id:'growth:whey-unknown',name:'Whey Growth — confirmar linha e sabor',category:'Suplementos',
      aliases:['whey','growth','proteina','suplemento'],preparation:'other',
      note:'Atalho sem macronutrientes. A composição e a dose dependem da versão e do sabor; confira o rótulo.',
      nutrientsPer100g:{energyKcal:null,proteinG:null,carbsG:null,fatG:null},
      source:{name:'Produto informado pelo usuário',reference:'Whey Growth, versão e sabor pendentes',license:'Registro pessoal'},
      portions:[p('dose','1 dose, peso a confirmar',null)],
    },
    {
      id:'ref:generic-169757',name:'Arroz branco cozido (sem óleo)',category:'Refeição',
      aliases:['arroz','arroz branco','rice'],preparation:'cooked',fdc:169757,
      note:'Arroz cozido em água, sem sal e sem óleo. Preparações caseiras podem variar.',
      nutrientsPer100g:{energyKcal:130,proteinG:2.69,carbsG:28.2,fatG:0.28},
      portions:[p('spoon','1 colher de sopa cheia (≈25 g)',25),p('serve','1 colher de servir (≈45 g)',45),p('100g','100 g',100)],
    },
    {
      id:'ref:generic-173735',name:'Feijão-preto cozido (grãos, sem caldo)',category:'Refeição',
      aliases:['feijao','feijão','feijao preto','black beans'],preparation:'cooked',fdc:173735,
      note:'Grãos cozidos sem sal; não representa concha de feijão com caldo, óleo ou temperos.',
      nutrientsPer100g:{energyKcal:132,proteinG:8.86,carbsG:23.71,fatG:0.54},
      portions:[p('spoon','1 colher de sopa de grãos (≈20 g)',20),p('ladle','1 concha de grãos (≈90 g)',90),p('100g','100 g',100)],
    },
    {
      id:'ref:generic-171477',name:'Peito de frango assado, sem pele',category:'Proteínas',
      aliases:['frango','peito de frango','chicken'],preparation:'cooked',fdc:171477,
      note:'Carne assada sem pele. Não contempla óleo adicionado, molho ou empanamento.',
      nutrientsPer100g:{energyKcal:165,proteinG:31,carbsG:0,fatG:3.57},
      portions:[p('small','1 porção menor (≈80 g)',80),p('medium','1 filé médio (≈120 g)',120),p('100g','100 g',100)],
    },
    {
      id:'ref:generic-173424',name:'Ovo cozido',category:'Proteínas',
      aliases:['ovo','ovos','ovo de galinha','egg'],preparation:'cooked',fdc:173424,
      note:'Ovo inteiro cozido, sem gordura acrescentada. Não equivale a ovo frito.',
      nutrientsPer100g:{energyKcal:155,proteinG:12.6,carbsG:1.12,fatG:10.6},
      portions:[p('one','1 ovo grande sem casca (≈50 g)',50),p('100g','100 g',100)],
    },
    {
      id:'ref:generic-173944',name:'Banana crua (polpa)',category:'Frutas',
      aliases:['banana','banana nanica','banana prata','fruit'],preparation:'raw',fdc:173944,
      note:'Referência genérica; espécies e tamanhos vendidos no Brasil podem ter composição diferente.',
      nutrientsPer100g:{energyKcal:89,proteinG:1.09,carbsG:22.8,fatG:0.33},
      portions:[p('small','1 unidade pequena, sem casca (≈80 g)',80),p('medium','1 unidade média, sem casca (≈118 g)',118),p('100g','100 g',100)],
    },
    {
      id:'ref:generic-169705',name:'Aveia em flocos seca',category:'Cereais',
      aliases:['aveia','oats','flocos'],preparation:'raw',fdc:169705,
      note:'Flocos secos; se misturar leite, água ou outros ingredientes, registre separadamente.',
      nutrientsPer100g:{energyKcal:389,proteinG:16.9,carbsG:66.3,fatG:6.9},
      portions:[p('spoon','1 colher de sopa (≈10 g)',10),p('two','2 colheres de sopa (≈20 g)',20),p('100g','100 g',100)],
    },
    {
      id:'ref:generic-171265',name:'Leite integral (referência USDA)',category:'Laticínios',
      aliases:['leite','leite integral','milk'],preparation:'other',fdc:171265,
      note:'Composição de referência de 3,25% de gordura. Prefira o rótulo da marca brasileira quando disponível.',
      nutrientsPer100g:{energyKcal:61,proteinG:3.15,carbsG:4.8,fatG:3.25},
      portions:[p('cup','1 copo (≈200 g, volume não aferido)',200),p('small','1 xícara menor (≈100 g)',100),p('100g','100 g',100)],
    },
  ].map(row=>({...row,source:row.source||source(row.fdc)}));
  if (!N || foods.some(food=>!N.validFood(food))) throw new Error('Catálogo alimentar incompatível.');
  const normalize = value => String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const find = id => foods.find(food=>food.id===id)||null;
  const search = query => {
    const term=normalize(query);
    return foods.filter(food=>normalize([food.name,...food.aliases].join(' ')).includes(term));
  };

  // Copy estimates into each entry so catalogue updates cannot rewrite past records.
  function copyEstimate(estimate, factor=1) {
    return {
      confidence:estimate.confidence,servingLabel:estimate.servingLabel,
      assumptions:estimate.assumptions,
      ...Object.fromEntries(['low','central','high'].map(group=>[group,
        Object.fromEntries(N.NUTRIENTS.map(key=>[key,
          Math.round(estimate[group][key]*factor*10)/10]))])),
    };
  }
  function makeItem(foodId,portionId,count,makeId) {
    const food=find(foodId),qty=Number(count);
    if(!food || !Number.isFinite(qty) || qty<=0 || qty>10000 || typeof makeId!=='function')return null;
    const portion=food.portions.find(row=>row.id===portionId);
    if(portionId==='custom' && (food.nutrientsPerServing||food.estimate))return null;
    if(portionId!=='custom'&&!portion)return null;
    const grams=portionId==='custom'?qty:(portion.grams==null?null:Math.round(qty*portion.grams*100)/100);
    if(grams!==null && (grams<=0||grams>10000))return null;
    const item={
      id:makeId('item'),foodId:food.id,label:food.name,
      quantity:portionId==='custom'?grams:qty,
      unit:portionId==='custom'?'g':'portion',grams,
      nutrientsPer100g:{...food.nutrientsPer100g},
      ...(food.nutrientsPerServing?{nutrientsPerServing:{...food.nutrientsPerServing}}:{}),
      ...(food.estimate?{estimate:copyEstimate(food.estimate,portion?.factor??1)}:{}),
      source:{...food.source},
    };
    return N.validEntry({id:'validation',date:'2026-11-14',mealType:'other',items:[item]})?item:null;
  }
  function makeFavorite(entry,archive,name,makeId) {
    if(!N.validEntry(entry)||!N.validArchive(archive)||typeof makeId!=='function')return null;
    const built=[],foodsToAdd=[];
    for(const item of entry.items) {
      let food=find(item.foodId)||archive.foods.find(f=>f.id===item.foodId);
      if(!food) {
        food={
          id:makeId('personal-food'),name:item.label,preparation:'other',
          nutrientsPer100g:{...item.nutrientsPer100g},
          ...(item.estimate?{estimate:copyEstimate(item.estimate)}:{}),
          source:item.source?{...item.source}:{name:'Registro pessoal',reference:'Sem composição nutricional verificada',license:'Uso pessoal'},
        };
        if(!N.validFood(food))return null;
        foodsToAdd.push(food);
      }
      built.push({id:makeId('preset'),foodId:food.id,
        quantity:item.quantity,unit:item.unit,grams:item.grams,
        ...(item.nutrientsPerServing?{nutrientsPerServing:{...item.nutrientsPerServing}}:{}),
        ...(item.estimate?{estimate:copyEstimate(item.estimate)}:{}),
      });
    }
    const title=(String(name??'').trim()||entry.items.map(item=>item.label).join(' + ')).slice(0,120);
    const favorite={id:makeId('favorite'),name:title,mealType:entry.mealType,items:built};
    return N.validTemplate(favorite)?{favorite,foodsToAdd}:null;
  }
  function fromFavorite(favorite,date,archive,makeId) {
    if(!N.validTemplate(favorite)||!N.validArchive(archive)||!N.dateOk(date)||typeof makeId!=='function')return null;
    const items=favorite.items.map(item=>{
      const food=find(item.foodId)||archive.foods.find(f=>f.id===item.foodId);
      return food?{
        id:makeId('item'),foodId:food.id,label:food.name,
        quantity:item.quantity,unit:item.unit,grams:item.grams,
        nutrientsPer100g:{...food.nutrientsPer100g},
        ...(item.nutrientsPerServing?{nutrientsPerServing:{...item.nutrientsPerServing}}:(food.nutrientsPerServing?{nutrientsPerServing:{...food.nutrientsPerServing}}:{})),
        ...(item.estimate?{estimate:copyEstimate(item.estimate)}:{}),
        source:{...food.source},
      }:null;
    });
    if(items.some(item=>!item))return null;
    const entry={id:makeId('meal'),date,
      mealType:N.MEALS.includes(favorite.mealType)?favorite.mealType:'other',
      time:null,notes:'',items};
    return N.validEntry(entry)?entry:null;
  }
  const api={VERSION:1,foods,find,search,makeItem,makeFavorite,fromFavorite};
  root.ForjaNutritionCatalog=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
