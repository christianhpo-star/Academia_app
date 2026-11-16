/* Local meal diary. No personal profile or meals shipped in this file. */
(function(root){
  'use strict';
  const N=root.ForjaNutrition,CAT=root.ForjaNutritionCatalog;
  const G=root.ForjaNutritionGoals||(typeof require==='function'?require('./nutrition-goals.js'):null);
  const B=root.ForjaEnergyBalance||(typeof require==='function'?require('./nutrition-balance.js'):null);
  const PRESETS=root.ForjaMealPresets||(typeof require==='function'?require('./nutrition-presets.js'):null);
  const BODY=root.ForjaBodyMeasures||(typeof require==='function'?require('./body-measures.js'):null);
  const ACT=root.ForjaActivity||(typeof require==='function'?require('./activity.js'):null);
  const HEALTH=root.ForjaHealthImport||(typeof require==='function'?require('./health-import.js'):null);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=v=>v==null?'—':new Intl.NumberFormat('pt-BR',{maximumFractionDigits:1}).format(v);
  const labels={breakfast:'Café da manhã',lunch:'Almoço',snack:'Lanche',dinner:'Jantar',supper:'Ceia',other:'Outros registros'};
  const nutrients={energyKcal:'Energia',proteinG:'Proteínas',carbsG:'Carboidratos',fatG:'Gorduras',fiberG:'Fibras'};
  const units={g:'g',ml:'ml',unit:'unidade(s)',spoon:'colher(es)',ladle:'concha(s)',portion:'porção(ões)'};
  const clone=v=>JSON.parse(JSON.stringify(v));
  const id=p=>p+'-'+(root.crypto?.randomUUID?.()||Date.now()+'-'+Math.random().toString(36).slice(2));
  const button=(action,text,attrs='',cls='secondary')=>`<button type="button" class="${cls}" data-nd="${action}" ${attrs}>${text}</button>`;
  const options=(obj,current)=>Object.entries(obj).map(([v,l])=>`<option value="${esc(v)}" ${v===String(current)?'selected':''}>${esc(l)}</option>`).join('');
  const field=(name,label,value='',extra='')=>`<div class="field"><label for="nd-${name}">${label}</label><input id="nd-${name}" name="${name}" value="${esc(value??'')}" ${extra}></div>`;
  const select=(name,label,obj,value)=>`<div class="field"><label for="nd-${name}">${label}</label><select id="nd-${name}" name="${name}">${options(obj,value)}</select></div>`;
  const dateBR=d=>d.split('-').reverse().join('/');
  // Explicitly scoped to locally verified product art. No unverified branded picture is rendered.
  // SVG category illustrations are offline, deterministic and available for saved legacy items.
  const FOOD_ICONS={
    yogurt:'<path d="M5 8h14l-1.5 12h-11L5 8Z"/><path d="M7 5h10l2 3H5l2-3Z"/><circle cx="12" cy="13" r="3"/><path d="m12 11 1 2-2 2"/>',
    drink:'<path d="M7 6h10l1 14H6L7 6Z"/><path d="M7 6 10 3h6l1 3M8 10h8M12 2v4"/><circle cx="12" cy="14" r="2"/>',
    whey:'<path d="M7 3h10l2 16-2 2H7l-2-2L7 3Z"/><path d="M7 7h10M10 12l2-2 2 2-2 4-2-4Z"/>',
    rice:'<path d="M3 13h18l-2 6H5l-2-6Z"/><path d="M5 11c0-4 14-4 14 0M7 8l1-2M12 8V5M17 8l-1-2"/>',
    beans:'<path d="M3 13h18l-2 6H5l-2-6Z"/><path d="M6 12c0-6 12-6 12 0"/><path d="M8 9c2-2 4 0 2 2M14 9c2-2 4 0 2 2"/>',
    chicken:'<path d="M7 16c-4-3-3-9 2-11s9 2 8 7c-1 4-7 7-10 4Z"/><path d="m6 17-3 3M3 17l4 4"/>',
    egg:'<path d="M12 3c-4 0-7 6-7 11a7 7 0 0 0 14 0c0-5-3-11-7-11Z"/><circle cx="12" cy="14" r="3"/>',
    banana:'<path d="M5 3C3 9 7 19 14 21c4 1 7-2 7-5-3 2-7 1-10-3C8 9 8 5 9 2L5 3Z"/><path d="m5 3 3 1"/>',
    oats:'<path d="M4 12h16l-2 8H6l-2-8Z"/><path d="M5 10c2-4 12-4 14 0M10 8l-1-4M14 8l1-4M8 13l1 2M15 13l-1 2"/>',
    milk:'<path d="M7 3h9l2 5v13H6V8l1-5Z"/><path d="M6 8h12M9 3v5M9 12h6v5H9z"/>',
    dessert:'<path d="M5 12c0-5 14-5 14 0l-2 8H7l-2-8Z"/><path d="M7 12c-4-4 1-8 5-6 4-4 9 2 5 6"/><circle cx="12" cy="9" r="1"/>',
    topping:'<path d="M11 14 6 21M13 12c5 2 9-8 3-9-5 0-7 7-3 9Z"/>',
    fruit:'<path d="M12 8c-2-4-7-4-8 1-2 5 2 12 6 12l2-1 2 1c5 0 8-7 6-12-1-5-6-5-8-1Z"/><path d="M12 8c0-3 1-5 4-6M12 7c-3-2-5-1-6-4"/>',
    food:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><path d="M3 2v8M6 2v8M3 6h3M20 2v19"/>'
  };
  const FOOD_KINDS={
    'photo:itambe-zero-morango-200g':'yogurt',
    'photo:piracanjuba-proforce-banoffee-250ml':'drink',
    'growth:whey-unknown':'whey',
    'ref:generic-169757':'rice',
    'ref:generic-173735':'beans',
    'ref:generic-171477':'chicken',
    'ref:generic-173424':'egg',
    'ref:generic-173944':'banana',
    'ref:generic-169705':'oats',
    'ref:generic-171265':'milk'
  };
  const normalizedLabel=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  function foodKind(item){
    const food=CAT.find(item.foodId||item.id)||item;
    const id=food.id||item.foodId;
    if(FOOD_KINDS[id])return FOOD_KINDS[id];
    if(String(id||'').includes('doce-cascao-adicional'))return 'topping';
    if(String(id||'').includes('doce-cascao'))return 'dessert';
    const label=normalizedLabel(food.name||item.label||'');
    if(/iogurte|yogurt/.test(label))return 'yogurt';
    if(/proforce|pro force|bebida proteica|shake/.test(label))return 'drink';
    if(/whey|suplemento/.test(label))return 'whey';
    if(/monster|energetico|energético|cafe|café/.test(label))return 'drink';
    if(/arroz/.test(label))return 'rice';
    if(/feijao/.test(label))return 'beans';
    if(/frango/.test(label))return 'chicken';
    if(/ovo/.test(label))return 'egg';
    if(/banana/.test(label))return 'banana';
    if(food.category==='Frutas')return 'fruit';
    if(/aveia/.test(label))return 'oats';
    if(/leite/.test(label))return 'milk';
    if(/acai|sobremesa|sorvete/.test(label))return 'dessert';
    if(/creme|adicional/.test(label))return 'topping';
    return 'food';
  }
  function foodVisual(item){
    const kind=foodKind(item),food=CAT.find(item.foodId||item.id)||item;
    // Future packaging thumbnails must be bundled and manually verified, never guessed from names.
    const image=typeof food.image==='string'&&/^\.\/assets\/foods\/[a-z0-9-]+\.(png|webp|jpe?g|svg)$/.test(food.image)?food.image:null;
    if(image)return '<span class="nd-food-thumb nd-food-thumb-image"><img src="'+esc(image)+'" alt="" loading="lazy" decoding="async"></span>';
    return '<span class="nd-food-thumb" data-food-icon="'+kind+'" aria-hidden="true"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">'+FOOD_ICONS[kind]+'</svg></span>';
  }
  function itemNutrient(item,key){
    if(item.estimate)return null;
    const perMl=item.nutrientsPerMl;
    if(perMl)return item.unit==='ml'&&perMl[key]!=null?Math.round(perMl[key]*item.quantity*10)/10:null;
    const perServing=item.nutrientsPerServing;
    if(perServing){
      const amount=perServing[key];
      return item.unit==='portion'&&amount!=null?Math.round(amount*item.quantity*10)/10:null;
    }
    const grams=item.unit==='g'?item.quantity:item.grams;
    const amount=item.nutrientsPer100g?.[key];
    return grams!=null&&amount!=null?Math.round(grams*amount/10)/10:null;
  }
  function itemMacros(item){
    const fields=[['P','proteinG','Proteínas'],['C','carbsG','Carboidratos'],['Fib','fiberG','Fibras']];
    const spoken=fields.map(([,key,label])=>label+': '+fmt(itemNutrient(item,key))+' g').join('; ');
    return '<span class="nd-food-macros" aria-label="'+esc(spoken)+'">'+fields.map(([symbol,key])=>
      '<span aria-hidden="true"><b>'+symbol+'</b>'+fmt(itemNutrient(item,key))+'</span>').join('')+'</span>';
  }
  const portionLabel=i=>fmt(i.quantity)+' '+(units[i.unit]||i.unit)+(i.grams!=null&&i.unit!=='g'?' · '+fmt(i.grams)+' g':'');

  function ring(key,value,target,count={confirmed:0,estimated:0,unknown:0}){
    const isEnergy=key==='energyKcal',hasTarget=target!=null&&target>0;
    const pct=value!=null&&hasTarget?Math.min(100,Math.max(0,value/target*100)):0;
    const approximated=count.estimated>0||count.unknown>0;
    const display=value==null?'—':(approximated?'≈':'')+(!isEnergy&&value>=1000?fmt(Math.round(value/100)/10)+'k':fmt(value));
    const description=isEnergy?
      '<span class="nd-ring-goal">'+(hasTarget?'Meta: '+fmt(target)+' kcal':'Meta não informada')+'</span>'+
      (hasTarget&&value!=null?'<span class="nd-ring-percent">'+fmt(Math.round(value/target*100))+'% da meta</span>':''):
      '<small class="nd-ring-readable-total" aria-hidden="true">'+fmt(value)+' / '+fmt(target)+' g</small>';
    const content='<span class="nd-ring" style="--progress:'+pct+'%;--ring-color:var(--'+
      {energyKcal:'lime',proteinG:'red',carbsG:'blue',fatG:'orange',fiberG:'lime'}[key]+
      ')"><span class="nd-ring-inner"><strong>'+display+'</strong>'+
      (isEnergy?'<small class="nd-ring-unit">kcal</small>':'')+'</span></span>'+
      '<span class="nd-ring-description"><span class="nd-ring-title">'+nutrients[key]+'</span>'+description+'</span>';
    return button('goals',content,'aria-label="'+nutrients[key]+': '+(approximated?'Subtotal aproximado ':'')+fmt(value)+' de '+fmt(target)+
      (isEnergy?' kcal':' gramas')+'. Ver metas"','nd-ring-button');
  }
  // Meal rings reference the daily target; there is no invented per-meal quota.
  function mealMacroRing(key,value,dailyTarget,count={confirmed:0,estimated:0,unknown:0}){
    const pct=value!=null&&dailyTarget>0?Math.max(0,Math.min(100,value/dailyTarget*100)):0;
    const color={proteinG:'red',carbsG:'blue',fatG:'orange'}[key];
    const label={proteinG:'Proteínas',carbsG:'Carboidratos',fatG:'Gorduras'}[key];
    const short={proteinG:'Proteína',carbsG:'Carbo',fatG:'Gordura'}[key];
    const approximate=count.estimated>0||count.unknown>0;
    const shown=value==null?'—':(approximate?'≈':'')+fmt(value);
    const aria=value==null?'Informação incompleta':(approximate?'Subtotal aproximado: ':'')+fmt(value)+' gramas registradas'+(dailyTarget>0?' de '+fmt(dailyTarget)+' gramas da meta diária':' (sem meta diária)');
    return '<div class="nd-meal-macro" aria-label="'+esc(label)+': '+esc(aria)+'">'+
      '<span class="nd-meal-macro-ring" style="--progress:'+pct+'%;--ring-color:var(--'+color+')">'+
      '<span>'+shown+'</span></span><span class="nd-meal-macro-name">'+short+'</span><small>g</small></div>';
  }
  function shortFoodLabel(label){
    const name=String(label||'');
    if(/^Itamb[eé]/i.test(name)&&/morango/i.test(name))return 'Itambé morango';
    if(/^Piracanjuba/i.test(name)&&/banoffee/i.test(name))return 'PRO FORCE Banoffee';
    if(/^Doce Casc[aã]o/i.test(name))return name.replace(/^Doce Casc[aã]o\s*[—-]\s*/i,'');
    return name.split(/[,()]/)[0].trim();
  }
  function foodRow(item,entryDate){
    const detail=N.recordedBreakdown([{id:'render-entry',date:entryDate,mealType:'other',items:[item]}],entryDate);
    const row=detail.totals;
    const label=String(item.label);
    const portion=fmt(item.quantity)+' '+String(units[item.unit]||item.unit)+(item.grams!=null&&item.unit!=='g'?' · '+fmt(item.grams)+' g':'');
    return '<tr><th scope="row"><span class="nd-food-id">'+
      foodVisual(item)+
      '<span class="nd-food-copy"><span class="nd-food-short" title="'+esc(label)+'">'+esc(shortFoodLabel(label))+
      '</span><small>'+esc(portion)+'</small></span></span></th>'+
      ['proteinG','carbsG','fiberG'].map(key=>'<td aria-label="'+esc(nutrients[key])+': '+
        (row[key]===null?'não informado':(item.estimate?'estimado: ':'')+fmt(row[key])+' gramas')+'">'+
        (row[key]===null?'—':(item.estimate?'≈':'')+fmt(row[key]))+'</td>').join('')+'</tr>';
  }
  function entryHTML(e,index=0){
    const breakdown=N.recordedBreakdown([e],e.date);
    const total=breakdown.totals.energyKcal;
    const energyMeta=breakdown.counts.energyKcal;
    const approximate=energyMeta.estimated>0||energyMeta.unknown>0;
    const estimate=N.estimatedTotals([e],e.date);
    return '<section class="nd-entry" aria-label="Registro '+(index+1)+'">'+
      '<div class="nd-entry-caption"><strong>Registro '+(index+1)+'</strong><span>'+(approximate&&total!=null?'≈':'')+fmt(total)+' kcal'+(total!=null&&energyMeta.unknown?' (parcial)':'')+' · '+e.items.length+' alimento(s)</span></div>'+
      '<div class="nd-food-table-wrap"><table class="nd-food-table">'+
      '<colgroup><col class="nd-food-col-name"><col span="3" class="nd-food-col-number"></colgroup>'+
      '<thead><tr><th scope="col">Alimento</th><th scope="col"><abbr title="Proteínas em gramas">P (g)</abbr></th>'+
      '<th scope="col"><abbr title="Carboidratos em gramas">C (g)</abbr></th>'+
      '<th scope="col"><abbr title="Fibras em gramas">Fib (g)</abbr></th></tr></thead>'+
      '<tbody>'+e.items.map(item=>foodRow(item,e.date)).join('')+'</tbody></table></div>'+
      '<p class="nd-food-legend">— = valor não informado. Nome completo disponível ao consultar cada alimento.</p>'+
      (estimate.estimatedItems?'<div class="callout warn">Estimativa de confiança baixa: '+fmt(estimate.totals.central.energyKcal)+
        ' kcal (faixa '+fmt(estimate.totals.low.energyKcal)+'–'+fmt(estimate.totals.high.energyKcal)+
        '). Incluída com ressalva no subtotal indicativo; não é valor de rótulo.<details><summary>Como foi estimado</summary>'+
        e.items.filter(i=>i.estimate).map(i=>'<p class="small">'+esc(i.estimate.assumptions)+'</p>').join('')+'</details></div>':'')+
      '<div class="btnrow mt-12">'+button('edit','Editar','data-id="'+esc(e.id)+'"')+
      button('repeat','Repetir nesta data','data-id="'+esc(e.id)+'"')+
      button('favorite','Salvar favorito','data-id="'+esc(e.id)+'"')+
      button('delete','Excluir','data-id="'+esc(e.id)+'"','ghost')+'</div></section>';
  }

  const MEAL_SYMBOLS={
    breakfast:'<path d="M4 10h13v8a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-8Zm13 2h2a3 3 0 0 1 0 6h-2M8 3c-2 2 2 3 0 5m5-5c-2 2 2 3 0 5"/>',
    lunch:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><path d="M2 3v7M4 3v7M6 3v7M4 10v11M22 3v18"/>',
    snack:'<path d="M12 7c-2-4-7-4-8 1-2 5 2 12 6 12l2-1 2 1c4 0 8-7 6-12-1-5-6-5-8-1Z"/><path d="M12 7c0-3 2-5 5-5m-5 5c-2-2-5-1-7-3"/>',
    dinner:'<path d="M3 12h18l-2 8H5l-2-8Zm3-2c1-4 11-4 12 0M8 7V4m4 3V2m4 5V4"/>',
    supper:'<path d="M20 15A8 8 0 0 1 9 4a8 8 0 1 0 11 11ZM17 3v4m-2-2h4"/>',
    other:'<circle cx="12" cy="12" r="9"/><path d="M12 7v6m0 4h.01"/>'
  };
  function mealSymbol(type){
    return '<span class="nd-meal-symbol" data-meal-kind="'+esc(type)+'" aria-hidden="true">'+
      '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">'+
      (MEAL_SYMBOLS[type]||MEAL_SYMBOLS.other)+'</svg></span>';
  }
  function mealCardHTML(type,label,rows,total,target,date){
    const detail=rows.length?N.recordedBreakdown(rows,date):null;
    const macros=detail?.totals,energyCount=detail?.counts.energyKcal;
    const approximate=energyCount&&(energyCount.estimated>0||energyCount.unknown>0);
    const foodCount=rows.reduce((n,row)=>n+row.items.length,0);
    const dailyTarget=target?.values||{};
    const kcal=rows.length?(total==null?'— kcal':(approximate?'≈':'')+fmt(total)+' kcal'):'Sem registros';
    const preview=rows.length?rows.flatMap(e=>e.items.map(i=>shortFoodLabel(i.label))).slice(0,2).join(' · '):'';
    const main='<div class="nd-meal-top">'+mealSymbol(type)+
      '<div class="nd-meal-info"><h2 class="section-title">'+esc(label)+'</h2>'+
      '<span class="nd-meal-calories">'+kcal+(foodCount?' · '+foodCount+' itens':'')+'</span>'+
      (preview?'<small class="nd-meal-preview">'+esc(preview)+'</small>':'')+'</div>'+
      button('add','+','data-meal="'+esc(type)+'" aria-label="Adicionar ao '+esc(label)+'"','nd-add')+'</div>';
    const macro=rows.length?
      '<div class="nd-meal-macro-row">'+['proteinG','carbsG','fatG'].map(k=>mealMacroRing(k,macros[k],dailyTarget[k],detail.counts[k])).join('')+'</div>'+
      '<p class="nd-meal-macro-hint">Anéis = parcela da meta diária, não meta por refeição.</p>':'';
    const details=rows.length?
      '<details class="nd-meal-details"><summary>Ver '+foodCount+' alimento(s)<span class="nd-meal-chevron" aria-hidden="true">⌄</span></summary>'+
      macro+rows.map((e,index)=>entryHTML(e,index)).join('')+'</details>':'';
    return '<section class="card nd-meal">'+main+recipeSuggestionsHTML(type,rows)+details+'</section>';
  }

  function recipeSuggestionsHTML(type,rows){
    if(!PRESETS || rows.length || !['breakfast','lunch','snack','dinner'].includes(type))return '';
    const ideas=PRESETS.forMeal(type);
    if(!ideas.length)return '';
    const card=(idea,featured=false)=>{
      const missing=PRESETS.hasMissing(idea);
      const ingredients=idea.ingredients.map(item=>'<span class="nd-plan-ingredient"><strong>'+esc(item.label)+'</strong> · '+esc(item.amount)+'</span>').join('');
      return '<div class="nd-plan-option'+(featured?' is-featured':'')+'"><div class="nd-plan-option-head"><strong>'+esc(idea.title)+'</strong>'+(missing?'<span class="nd-plan-unknown">Dados incompletos</span>':'')+'</div>'+
        '<div class="nd-plan-ingredients">'+ingredients+'</div>'+
        '<div class="nd-plan-actions">'+button('plan-confirm','Comi isso','data-recipe="'+esc(idea.id)+'"','primary nd-plan-confirm')+
        button('plan-adjust','Ajustar','data-recipe="'+esc(idea.id)+'"','secondary nd-plan-adjust')+'</div></div>';
    };
    return '<div class="nd-plan-section"><div class="nd-plan-head"><span>Do seu plano · opções editáveis</span></div>'+
      card(ideas[0],true)+(ideas.length>1?'<details class="nd-plan-alternatives"><summary>Ver outras '+(ideas.length-1)+' opções</summary>'+
      ideas.slice(1).map(idea=>card(idea)).join('')+'</details>':'')+
      '<div class="nd-plan-other">'+button('add','Comi outra coisa','data-meal="'+esc(type)+'"','button-inline')+'</div></div>';
  }

  function balanceHTML(archive,state,currentDay){
    const report=B.assessment(archive,state,currentDay);
    const active=report.activePlan;
    const status={
      blocked:'Aguardando dados suficientes',
      ready:'Sugestão opcional disponível',
      steady:'Sem ajuste sugerido',
      paused:'Metas normais mantidas',
      plan:active?'Ajuste temporário aprovado':'Ajuste suspenso'
    }[report.status]||'Em análise';
    const approved=report.status==='plan'&&!!active;
    const days=report.days.map(d=>
      '<div class="nd-balance-day"><div><strong>'+esc(dateBR(d.date))+'</strong><span>'+
      (d.checked?'Revisado · '+fmt(d.energyKcal)+' kcal'+
        (d.deltaKcal===null?' · sem meta compatível':(d.deltaKcal>=0?' · +':' · −')+fmt(Math.abs(d.deltaKcal))+' kcal frente à meta'):
       d.quality?'Registrado, ainda não confirmado como completo':
       'Dados insuficientes para conferir')+'</span></div>'+
      (d.checked?button('balance-unreview','Reabrir', 'data-date="'+esc(d.date)+'"','ghost'):
       d.quality?button('balance-review','Conferir', 'data-date="'+esc(d.date)+'"','secondary'):
       button('balance-day','Abrir dia', 'data-date="'+esc(d.date)+'"','ghost'))+
      '</div>').join('');
    const actions= report.status==='ready'?button('balance-plan','Ver sugestão de ajuste','','secondary full'):
      report.status==='plan'?button('balance-cancel',active?'Cancelar ajuste':'Descartar plano suspenso','','ghost full'):
      report.status==='paused'?button('balance-unpause','Voltar a avaliar sugestões','','ghost full'):'';
    return '<details class="card nd-balance" id="nd-balance"><summary>'+
      '<span class="nd-balance-head"><strong>Equilíbrio calórico · 7 dias</strong><small>'+esc(status)+'</small></span>'+
      '<span class="nd-balance-chevron" aria-hidden="true">⌄</span></summary>'+
      '<div class="nd-balance-body"><p class="small">'+esc(report.reason||'Conferir o histórico e as metas.')+'</p>'+
      '<div class="nd-balance-kpis"><div><small>Dias conferidos / 7</small><strong>'+report.reviewedCount+' / 7</strong></div>'+
      '<div><small>Saldo parcial de '+report.usableCount+' dia(s)</small><strong>'+
      (report.usableCount?(report.balanceKcal>0?'+':'')+fmt(report.balanceKcal)+' kcal':'—')+'</strong></div></div>'+
      '<p class="small muted">O saldo soma somente dias conferidos e não equivale ao balanço energético real. Uma meta ultrapassada não significa necessariamente superávit. Nenhum alimento ausente vira zero.</p>'+
      (approved?'<p class="nd-balance-note">Plano aceito em '+dateBR(active.acceptedAt)+
        '. Ajustes apenas nas datas escolhidas e sem treino registrado. Proteínas, gorduras e fibras mantidas.</p>':'')+
      actions+
      (report.status==='ready'?button('balance-keep','Continuar metas normais por 7 dias','','ghost full'):'')+
      '<details class="nd-balance-history"><summary>Conferir os últimos sete dias</summary>'+
      '<p class="small muted">Marque um dia somente depois de registrar todas as refeições, bebidas e quantidades. Os registros incertos precisam ser corrigidos antes.</p>'+
      days+'</details></div></details>';
  }

  function metabolismCardHTML(state,archive,date,target){
    const rest=G.restingFromState({...state,nutrition:archive},date);
    const professional=target?.source==='professional';
    const difference=target?G.difference(target.values):null;
    const present=rest.valueKcal!=null;
    return '<section class="nd-metabolism" aria-label="Referência profissional e metabolismo de repouso">'+
      '<div class="nd-metabolism-kpis"><div><span>Meta '+(professional?'da nutricionista':'vigente')+'</span><strong>'+fmt(target?.values.energyKcal)+' <small>kcal/dia</small></strong></div>'+
      '<div><span>Repouso estimado</span><strong>'+(present?fmt(rest.valueKcal):'—')+' <small>'+(present?'kcal/dia':'a calcular')+'</small></strong></div></div>'+
      (present&&target?.values.energyKcal?'<div class="nd-metabolism-track" role="img" aria-label="Repouso estimado '+fmt(rest.valueKcal)+' kcal e meta diária '+fmt(target.values.energyKcal)+' kcal"><span style="width:'+Math.min(100,Math.max(0,rest.valueKcal/target.values.energyKcal*100)).toFixed(1)+'%"></span></div>':'')+
      '<p class="nd-metabolism-caption">'+(present?'Estimativa Mifflin–St Jeor, não medida nem gasto diário total. Peso usado: '+fmt(rest.weightKg)+' kg'+(rest.weightDate?' ('+esc(dateBR(rest.weightDate))+')':'')+'.':'Para calcular, informe '+esc(rest.missing.join(', '))+' em Minhas metas.')+'</p>'+
      (difference!=null&&Math.abs(difference)>20?'<p class="nd-prescription-diff">Meta energética e macros informados não coincidem pelo cálculo 4/4/9 (diferença: '+fmt(difference)+' kcal). Valores mantidos sem correção.</p>':'')+
      '<div class="nd-metabolism-actions">'+button('goals',present?'Ver cálculo':'Completar perfil','','button-inline')+'</div></section>';
  }
  function render({archive,date,limit=3,state={},balanceDate=date}){
    const totals=N.recordedBreakdown(archive.entries,date);
    const baseTarget=G.active(archive.settings,date);
    const dailyAdjustment=B.planForDay(archive,state,date);
    const target=dailyAdjustment&&baseTarget?{...baseTarget,values:dailyAdjustment.values}:baseTarget;
    const energyMeta=totals.counts.energyKcal;
    const hasEstimated=Object.values(totals.counts).some(v=>v.estimated>0);
    const hasUnknown=Object.values(totals.counts).some(v=>v.unknown>0);
    const daily=archive.entries.filter(e=>e.date===date);
    const days=[...new Set(archive.entries.filter(e=>e.date!==date).map(e=>e.date))].sort().reverse();
    const context=G.context(state,date);
    const kcal=totals.totals.energyKcal;
    const goal=target?.values.energyKcal;
    const remainder=kcal!=null&&Number.isFinite(goal)?goal-kcal:null;
    const todayDate=balanceDate;
    const dayName=date===todayDate?'Hoje':new Date(date+'T12:00:00Z').toLocaleDateString('pt-BR',{day:'numeric',month:'short',timeZone:'UTC'});
    const compactBalance=remainder==null?'Saldo indisponível':remainder>=0?fmt(remainder)+' kcal restantes da meta':fmt(Math.abs(remainder))+' kcal acima da meta';
    return `<div class="nutrition-screen">
      <div class="nd-collapse" id="nd-collapse">
      <div class="nd-page-heading"><h1 class="eyebrow">ALIMENTAÇÃO</h1>${button('goals',target?'Metas':'Configurar metas','','ghost nd-head-goals')}</div>
      <div class="nd-overview" id="nd-overview">
        <section class="nd-energy-overview" aria-label="Energia registrada e saldo">
          <div class="nd-kcal-main"><strong>${remainder==null?'—':remainder>=0?fmt(remainder):'−'+fmt(Math.abs(remainder))}</strong><span>kcal ${remainder!=null&&remainder<0?'acima da meta':'restantes da meta'}</span></div>
          <div class="nd-energy-compare"><div><strong>${daily.length?(hasEstimated?'≈':'')+fmt(kcal):'—'}</strong><small>registradas</small></div><div><strong>${fmt(goal)}</strong><small>meta diária</small></div></div>
          ${daily.length?'':'<p class="nd-brief-note">Nenhuma refeição registrada neste dia.</p>'}
          <details class="nd-energy-detail"><summary>Detalhes da energia</summary>${ring('energyKcal',kcal,goal,totals.counts.energyKcal)}</details>
        </section>
        <section class="nd-macros-overview"><div class="nd-macro-heading"><strong>Macronutrientes</strong>${button('goals','Ajustar metas','','button-inline')}</div>
          <div class="nd-macros">${G.KEYS.slice(1).map(k=>ring(k,totals.totals[k],target?.values[k],totals.counts[k])).join('')}</div>
        </section>
        ${dailyAdjustment?'<p class="nd-balance-active">Meta temporária aceita: '+fmt(dailyAdjustment.values.energyKcal)+' kcal. Proteína e fibras preservadas.</p>':''}
        ${(hasEstimated||hasUnknown)?'<details class="nd-data-quality"><summary>Detalhes e incerteza · valores aproximados ou incompletos</summary><p>Energia com composição informada: '+fmt(totals.confirmedTotals.energyKcal)+' kcal. '+(energyMeta.unknown?energyMeta.unknown+' alimento(s) sem calorias disponíveis. ':'')+'≈ indica estimativa. — indica ausência de dados, não zero. Refeições não registradas não entram no saldo.</p></details>':''}
        <p class="nd-summary-note">Não representa o consumo total do dia. O saldo depende do que foi registrado.</p>
      </div>
      </div>
      <div class="nd-date-stick" id="nd-date-stick"><div class="nd-date">
        ${button('previous','‹','aria-label="Dia anterior"')}
        <div class="nd-date-center"><label for="nd-date"><strong>${esc(dayName)}</strong><span>${esc(dateBR(date))}</span></label>
        <input id="nd-date" type="date" value="${date}" max="${todayDate}" aria-label="Escolher dia do diário"></div>
        ${button('next','›','aria-label="Próximo dia" '+(date>=todayDate?'disabled':''))}
      </div>${date!==todayDate?button('today','Hoje','aria-label="Voltar para hoje"','nd-go-today'):''}<span class="nd-date-mini" aria-live="polite">${esc(compactBalance)}</span></div>
      ${archive.draft?`<div class="callout">Há um rascunho de refeição salvo. ${button('resume','Continuar rascunho','','button-inline')}</div>`:''}
      <div class="nd-food-quick-actions">${button('shared','Dividir uma porção','data-meal="dinner"','secondary')}${button('add','+ Refeição','data-meal="lunch"','secondary')}</div>
      <div class="nd-meals mt-16">${Object.entries(labels).filter(([type])=>type!=='other'||daily.some(e=>e.mealType==='other')).map(([type,label])=>{
        const rows=daily.filter(e=>e.mealType===type),total=N.recordedBreakdown(rows,date).totals.energyKcal;
        return mealCardHTML(type,label,rows,total,target,date);
      }).join('')}</div>
      ${metabolismCardHTML(state,archive,date,target)}
      ${balanceHTML(archive,state,balanceDate)}

      <details class="card"><summary>Treino, objetivo e acompanhamento</summary><p class="small">${context.strength} sessão(ões) de força e ${context.muay} de Muay registradas nesta data. Últimos 7 dias: ${context.weeklyStrength} de força e ${context.weeklyMuay} de Muay.</p>
      <p class="small">${context.strength&&context.muay?'Dia com duas modalidades: organize fontes de carboidratos nas refeições próximas aos treinos, conforme tolerância.':context.strength||context.muay?'Distribua fontes de proteína nas refeições e considere carboidratos para sustentar o treino.':'Sem treino registrado nesta data; isso não significa descanso ou menor necessidade de alimento.'} As metas não mudam automaticamente.</p>
      <p class="small muted">${context.recentWeights} pesagens em 28 dias; ${context.measures} aferições corporais disponíveis.${context.weightChange!=null?' Variação entre primeira e última pesagem: '+fmt(context.weightChange)+' kg.':''} ${context.abdomenChange!=null?' Variação de abdômen no umbigo: '+fmt(context.abdomenChange)+' cm.':''} Medidas e força não comprovam mudança de gordura ou músculo. Revise tendências de 2–4 semanas, recuperação e qualidade dos registros antes de ajustar metas.</p>${context.abdomenChange!=null&&context.abdomenChange<0&&context.weightChange!=null&&Math.abs(context.weightChange)<1?'<p class="small">Peso pouco alterado e medida abdominal menor: confira técnica de aferição, desempenho e tendência antes de reduzir energia apenas pela balança. Isso não prova recomposição.</p>':''}${button('goals','Rever sugestão','','button-inline')}<p class="small"><a href="https://pubmed.ncbi.nlm.nih.gov/26920240/" target="_blank" rel="noopener">Base: nutrição e desempenho (AND/DC/ACSM)</a></p></details>
      <details class="card" id="nd-history"><summary>Histórico alimentar · ${days.length} outros dias</summary>${days.slice(0,limit).map(d=>`<details class="nd-entry"><summary>${dateBR(d)}</summary>${button('day','Abrir dia',`data-date="${d}"`)}${archive.entries.filter(e=>e.date===d).map((e,index)=>entryHTML(e,index)).join('')}</details>`).join('')}${days.length>limit?button('more','Ver mais dias'):''}</details>
      </div>`;
  }
  function controller({get,commit,commitSteps,notify,today,refresh}){
    let day=today(),limit=3,dialog=null,returnFocus=null,draft=null,picked=null,sharedPicked=null,search='',mode='search',all=false,profileDraft=null,suggestion=null;
    const archive=()=>get().nutrition;
    const transact=change=>{const next=clone(archive());change(next);return commit(next);};
    function saveDraft(){if(!N.validDraft(draft))return false;const ok=transact(a=>{a.draft=clone(draft);});if(!ok)error('Rascunho não salvo. Mantenha esta janela aberta e tente novamente.');return ok;}
    function error(message){const el=dialog?.querySelector('[role="alert"]');if(el)el.textContent=message;else notify(message);}
    function openModal(title){
      returnFocus=document.activeElement;
      dialog=document.createElement('dialog');dialog.className='nd-dialog';dialog.setAttribute('aria-labelledby','nd-dialog-title');
      dialog.innerHTML=`<div class="row-between"><h2 id="nd-dialog-title" tabindex="-1">${title}</h2>${button('close','Fechar','','ghost')}</div><p role="alert" class="nd-error"></p><div id="nd-dialog-body"></div>`;
      document.body.append(dialog);dialog.addEventListener('cancel',e=>{e.preventDefault();close();});dialog.addEventListener('click',modalClick);dialog.addEventListener('submit',submit);dialog.addEventListener('input',input);dialog.addEventListener('change',change);dialog.showModal();dialog.querySelector('h2').focus();
    }
    function close(force=false){
      if(!force&&draft&&!confirm('Fechar e manter o rascunho salvo? Use Descartar rascunho para apagá-lo.'))return;
      if(!force&&draft&&!saveDraft())return;
      if(!force&&!draft&&dialog?.querySelector('#nd-profile')&&!confirm('Fechar? Alterações ainda não salvas serão descartadas.'))return;
      dialog?.close();dialog?.remove();dialog=null;draft=null;suggestion=null;
      if(returnFocus?.isConnected)returnFocus.focus();else document.querySelector('[data-nd="goals"]')?.focus();
    }
    function blank(meal){return {editId:null,entry:{id:id('meal'),date:day,mealType:meal,time:null,notes:'',items:[]}};}
    function start(meal,entry=null,repeat=false){
      if(archive().draft&&!confirm('Substituir o rascunho anterior por esta refeição?'))return;
      draft=entry?{editId:repeat?null:entry.id,entry:clone(entry)}:blank(meal);
      if(repeat){draft.entry.id=id('meal');draft.entry.date=day;draft.entry.items.forEach(i=>i.id=id('item'));}
      picked=null;sharedPicked=null;search='';all=false;mode='search';openModal(entry&&!repeat?'Editar refeição':'Registrar refeição');mealBody();saveDraft();
    }
    function mealBody(){
      const e=draft.entry;
      dialog.querySelector('#nd-dialog-body').innerHTML=`<form id="nd-meal"><div class="field-row">${field('mealDate','Data',e.date,`type="date" max="${today()}" required`)}${select('mealType','Refeição',labels,e.mealType)}</div><div id="nd-items">${e.items.map((i,index)=>`<div class="nd-item"><div class="nd-item-head">${foodVisual(i)}<strong>${esc(i.label)}</strong></div><div class="field-row">${field('qty-'+index,'Quantidade ('+esc(units[i.unit])+')',i.quantity,`type="number" inputmode="decimal" min="0.001" max="10000" step="any" data-index="${index}" required`)}${button('remove','Retirar',`data-index="${index}"`,'ghost')}</div><small class="muted">${i.grams!=null&&i.unit!=='g'?fmt(i.grams)+' g · ':''}${esc(i.source?.name||'Sem composição conhecida')}${i.estimate?' · confiança baixa':''}</small><details><summary>Composição e fonte</summary><p class="small">${esc(i.source?.reference||'Valores não informados')}${i.estimate?' · '+esc(i.estimate.assumptions):''}</p><div class="field-row">${!i.estimate?G.KEYS.map(k=>field('item-'+index+'-'+k,nutrients[k]+' / '+(i.nutrientsPerServing?'porção':i.nutrientsPerMl?'ml':'100 g'),(i.nutrientsPerServing||i.nutrientsPerMl||i.nutrientsPer100g)[k],`type="number" min="0" max="${k==='energyKcal'?1200:100}" step="any" data-nutrient="${k}" data-index="${index}"`)).join(''):'Estimativa preservada. Ajuste a quantidade ou substitua o alimento.'}</div></details></div>`).join('')||'<p class="small muted">Escolha alimentos abaixo para montar sua refeição.</p>'}</div>
      <p id="nd-preview" class="small" aria-live="polite"></p><details><summary>Horário e observações</summary>${field('time','Horário',e.time,'type="time"')}${field('notes','Observações',e.notes,'maxlength="500"')}</details></form>
      <section class="nd-search-section"><h3>Adicionar alimentos</h3><p class="small muted">Pesquise, ajuste a quantidade e adicione aqui mesmo, sem abrir outra janela.</p><div class="btnrow">${button('mode','Recentes','data-mode="recent"')}${button('mode','Favoritos','data-mode="favorites"')}${button('mode','Frutas','data-mode="fruits"')}${button('mode','Porções','data-mode="portions"')}${button('mode','Buscar','data-mode="search"')}</div><div class="field mt-12"><label for="nd-search">Buscar alimentos e produtos</label><input id="nd-search" type="search" value="${esc(search)}" placeholder="Nome, produto ou ingrediente"></div><div id="nd-portion-panel"></div><div id="nd-results"></div></section>
      <details class="mt-16"><summary>Adicionar manualmente / rótulo</summary><form id="nd-manual">${field('label','Alimento ou preparação','','maxlength="120" required')}<div class="field-row">${field('quantity','Quantidade',1,'type="number" min="0.001" max="10000" step="any" required')}${select('unit','Unidade',units,'portion')}</div>${field('grams','Peso total equivalente em g (opcional)','','type="number" min="0.001" max="10000" step="any"')}<details><summary>Informações nutricionais do rótulo</summary>${select('basis','Valores informados por',{'100g':'100 g',serving:'uma porção'},'100g')}<p class="small muted">Por porção: use unidade porção; não converta ml em g. Campos vazios ficam desconhecidos.</p><div class="field-row">${G.KEYS.map(k=>field(k,nutrients[k]+(k==='energyKcal'?' (kcal)':' (g)'),' ',`type="number" min="0" max="${k==='energyKcal'?1200:100}" step="any"`)).join('')}</div></details><button type="submit" class="secondary full mt-12">Adicionar à refeição</button></form></details>${button('discard','Descartar rascunho','','ghost full mt-16')}<div class="nd-save nd-save-sticky"><button type="submit" form="nd-meal" class="primary full" ${e.items.length?'':'disabled'}>Salvar refeição${e.items.length?' · '+e.items.length+' alimento(s)':''}</button></div>`;
      results();portion();preview();
      for(const [name,value] of Object.entries(draft.pending||{})){const input=dialog.querySelector('#nd-manual')?.elements.namedItem(name);if(input)input.value=value;}
    }
    function preview(){if(!draft)return;const e=draft.entry,el=dialog.querySelector('#nd-preview');if(el){const total=N.validEntry(e)?N.recordedBreakdown([e],e.date):null;el.textContent=total?'Subtotal: '+fmt(total.totals.energyKcal)+' kcal · '+e.items.length+' alimento(s)'+(total.counts.energyKcal.estimated?' · contém estimativas':''): 'Escolha os alimentos abaixo para montar sua refeição.';}const b=dialog.querySelector('.nd-save-sticky button');if(b){b.disabled=!e.items.length;b.textContent='Salvar refeição'+(e.items.length?' · '+e.items.length+' alimento(s)':'');}}
    function results(){
      let rows=[];
      if(mode==='favorites'&&!search)rows=archive().mealTemplates.map(f=>button('use-favorite',foodVisual({label:f.name})+'<span class="nd-result-copy"><strong>'+esc(f.name)+'</strong></span>',`data-id="${esc(f.id)}"`,'nd-result nd-food-result'));
      else if(mode==='portions'&&!search){
        rows=CAT.SHARED_PRESETS.map(preset=>button('pick-shared',foodVisual({label:preset.name})+'<span class="nd-result-copy"><strong>'+esc(preset.name)+'</strong><small>Montar e dividir · composição aproximada, pesos editáveis</small></span>',`data-id="${esc(preset.id)}"`,'nd-result nd-food-result'));
      }else if(mode==='recent'&&!search){
        const seen=new Set();rows=archive().entries.slice().reverse().flatMap(e=>e.items.map(i=>({i,e}))).filter(({i})=>{const key=i.foodId||i.label;if(seen.has(key))return false;seen.add(key);return true;}).map(({i,e})=>button('recent',foodVisual(i)+'<span class="nd-result-copy"><strong>'+esc(i.label)+'</strong></span>',`data-entry="${esc(e.id)}" data-id="${esc(i.id)}"`,'nd-result nd-food-result'));
      }else {
        const found=search?CAT.search(search):mode==='fruits'?CAT.foods.filter(food=>food.category==='Frutas'):CAT.orderedForMeal(draft.entry.mealType);
        rows=found.map(f=>button('pick',foodVisual(f)+'<span class="nd-result-copy"><strong>'+esc(f.name)+'</strong><small>'+esc(f.category)+(f.estimate?' · estimativa':'')+(f.nutrientsPerServing?' · rótulo por porção':'')+(f.source?.name==='Growth Supplements — tabela nutricional oficial'?' · tabela oficial Growth':'')+'</small></span>',`data-id="${esc(f.id)}"`,'nd-result nd-food-result'));
      }
      const empty=mode==='recent'&&!search?'Você ainda não registrou alimentos. Abra Buscar para ver todo o catálogo.':
        mode==='favorites'&&!search?'Sem favoritos ainda. Abra Buscar e escolha um alimento para começar.':
        'Nenhum item encontrado. Confira o nome ou adicione manualmente.';
      dialog.querySelector('#nd-results').innerHTML=(picked||sharedPicked)?'':(all?rows:rows.slice(0,6)).join('')||'<p class="small muted">'+empty+'</p>';
      if(!picked&&!sharedPicked&&!all&&rows.length>6)dialog.querySelector('#nd-results').innerHTML+=button('all','Ver mais alimentos');
    }
    function portion(){
      const food=CAT.find(picked),el=dialog.querySelector('#nd-portion-panel');
      if(sharedPicked){el.innerHTML=sharedPortionHTML();updateSharedPreview();results();return;}
      el.innerHTML=food?`<form id="nd-catalog" class="nd-inline-food"><div class="nd-item-head">${foodVisual(food)}<strong>${esc(food.name)}</strong>${button('cancel-pick','Alterar','','ghost nd-cancel-pick')}</div><p class="small">${esc(food.note)}</p>${food.estimate?`<p class="small">Faixa aproximada: ${fmt(food.estimate.low.energyKcal)}–${fmt(food.estimate.high.energyKcal)} kcal; confiança baixa.</p>`:''}${select('portion','Porção',Object.fromEntries([...(food.nutrientsPerMl?[['customMl','Volume exato em ml (recomendado)']]:[]),...(!food.nutrientsPerServing&&!food.nutrientsPerMl&&(!food.estimate||food.estimateGramsBase)?[['custom','Peso exato em gramas (recomendado)']]:[]),...food.portions.map(p=>[p.id,p.label])]),food.nutrientsPerMl?'customMl':!food.nutrientsPerServing&&(!food.estimate||food.estimateGramsBase)?'custom':food.portions[0].id)}${field('count','Peso em gramas ou quantidade de porções',food.nutrientsPerMl?200:!food.nutrientsPerServing&&(!food.estimate||food.estimateGramsBase)?100:1,'type="number" inputmode="decimal" min="0.001" max="10000" step="any" required')}${food.id.startsWith('growth:')?`<div class="nd-milk-picker">${select('milk','Misturar com',{none:'Água / sem leite',skim:'Leite desnatado Itambé',whole:'Leite integral Itambé'},'none')}<div id="nd-milk-fields" hidden>${field('milkMl','Quantidade de leite em ml',200,'type="number" inputmode="decimal" min="0.001" max="10000" step="any" required')}</div></div>`:''}<p id="nd-food-preview" class="small" role="status" aria-live="polite"></p><p class="small muted">Digite o peso realmente consumido (ex.: 121 ou 121,5 g). As porções são opcionais.</p><button class="primary full mt-12" type="submit">Adicionar à refeição</button></form>`:'';
      updatePortionPreview();results();
    }

    // A shared purchase is not a serving size. Only the person's actual share enters this diary.
    function sharedPortionHTML(){
      const preset=CAT.SHARED_PRESETS.find(p=>p.id===sharedPicked);
      if(!preset)return '';
      const rows=preset.components.map((part,i)=>
        '<div class="nd-share-ingredient"><strong>'+esc(part.label)+'</strong><div class="field-row">'+
        field('total-'+i,'Na bandeja (g)',part.wholeGrams,'type="number" inputmode="decimal" min="0" max="10000" step="any" required')+
        field('share-'+i,'Minha parte (%)',50,'type="number" inputmode="decimal" min="0" max="100" step="any" required')+
        '</div><p class="small muted" id="nd-share-my-'+i+'">Minha parte: '+fmt(part.wholeGrams/2)+' g (exemplo)</p></div>'
      ).join('');
      return '<form id="nd-shared" class="nd-inline-food"><div class="nd-item-head"><strong>'+esc(preset.name)+
        '</strong>'+button('cancel-shared','Alterar','','ghost nd-cancel-pick')+'</div>'+
        '<p class="small">'+esc(preset.note)+'</p>'+
        '<p class="small">Compartilhada por <strong>2 pessoas</strong> (você e outra pessoa). O registro será somente da sua parte; o número anunciado de porções não entra no cálculo.</p>'+
        '<div class="field-row">'+field('share-global','Aplicar minha participação (%)',50,'type="number" inputmode="decimal" min="0" max="100" step="any"')+
        '<div class="field nd-share-apply">'+button('apply-share','Aplicar aos ingredientes','','secondary full')+'</div></div>'+
        '<p class="small muted">Exemplo: metade = 50%; se você comeu mais nuggets que sua esposa, altere somente o percentual dos nuggets. Os pesos iniciais são hipóteses, não valores medidos.</p>'+
        rows+'<div id="nd-shared-preview" class="nd-share-preview" role="status" aria-live="polite"></div>'+
        '<button class="primary full mt-12" type="submit">Adicionar minha parte à refeição</button></form>';
    }
    function proposedShared(form,makeId){
      const preset=CAT.SHARED_PRESETS.find(p=>p.id===sharedPicked);
      if(!preset)return null;
      const rows=preset.components.map((part,i)=>{
        const total=num(form.elements.namedItem('total-'+i)?.value);
        const pct=num(form.elements.namedItem('share-'+i)?.value);
        if(total===null||pct===null||pct<0||pct>100||total<0)return null;
        return {foodId:part.foodId,totalGrams:total,myGrams:Math.round(total*pct*1000)/100000};
      });
      if(rows.some(row=>row===null))return null;
      return CAT.makeSharedPortion(sharedPicked,rows,makeId);
    }
    function updateSharedPreview(){
      const form=dialog?.querySelector('#nd-shared');if(!form)return;
      const preset=CAT.SHARED_PRESETS.find(p=>p.id===sharedPicked);
      if(!preset)return;
      preset.components.forEach((part,i)=>{
        const total=num(form.elements.namedItem('total-'+i)?.value);
        const share=num(form.elements.namedItem('share-'+i)?.value);
        const el=dialog.querySelector('#nd-share-my-'+i);
        if(el)el.textContent=(total!==null&&share!==null&&share>=0&&share<=100&&total>=0)?
          'Minha parte: '+fmt(total*share/100)+' g':'Confira o peso e a porcentagem.';
      });
      const out=proposedShared(form,()=> 'preview-item-'+Math.random().toString(36).slice(2));
      const el=dialog.querySelector('#nd-shared-preview'),submit=form.querySelector('button[type="submit"]');
      if(submit)submit.disabled=!out||draft.entry.items.length+out.items.length>30;
      if(!out){el.textContent='Revise os pesos e percentuais. Não é possível registrar uma porção vazia.';return;}
      const detail=N.recordedBreakdown([{id:'preview-shared',date:day,mealType:'other',items:out.items}],day);
      const t=detail.totals,range=detail.ranges.energyKcal;
      el.textContent='Você: '+fmt(out.consumedGrams)+' g do total estimado de '+fmt(out.wholeGrams)+
        ' g · ≈'+fmt(t.energyKcal)+' kcal'+(range?' (faixa ilustrativa '+fmt(range.low)+'–'+fmt(range.high)+')':'')+
        ' · Proteínas ≈'+fmt(t.proteinG)+' g · Carboidratos ≈'+fmt(t.carbsG)+
        ' g · Gorduras ≈'+fmt(t.fatG)+' g. Estimativa de baixa confiança.';
    }

    function proposedItems(form,makeId){
      const item=CAT.makeItem(picked,form.elements.namedItem('portion').value,num(form.elements.namedItem('count').value),makeId);
      if(!item)return null;
      const milk=form.elements.namedItem('milk')?.value||'none';
      const milkId=milk==='skim'?'drink:itambe-uht-desnatado':milk==='whole'?'drink:itambe-uht-integral':null;
      if(!milkId)return [item];
      const ml=num(form.elements.namedItem('milkMl')?.value);
      const drink=CAT.makeItem(milkId,'customMl',ml,makeId);
      return drink?[item,drink]:null;
    }
    function updatePortionPreview(){
      const form=dialog?.querySelector('#nd-catalog');if(!form)return;
      const chosen=form.elements.namedItem('portion').value;
      const countLabel=form.querySelector('label[for="nd-count"]');
      if(countLabel)countLabel.textContent=chosen==='customMl'?'Volume exato (ml)':chosen==='custom'?'Peso exato (g)':'Quantidade de porções';
      const milkFields=form.querySelector('#nd-milk-fields');
      if(milkFields)milkFields.hidden=form.elements.namedItem('milk').value==='none';
      const items=proposedItems(form,p=>'preview-'+p+'-'+Math.random().toString(36).slice(2));
      const node=form.querySelector('#nd-food-preview'),submit=form.querySelector('button[type="submit"]');
      if(submit)submit.disabled=!items;
      if(!items){node.textContent='Revise o peso, o volume ou a dose.';return;}
      const totals=N.recordedBreakdown([{id:'preview-meal',date:day,mealType:'snack',items}],day);
      const t=totals.totals;
      node.textContent=(totals.counts.energyKcal.estimated?'≈':'')+fmt(t.energyKcal)+' kcal · Proteínas '+fmt(t.proteinG)+' g · Carboidratos '+fmt(t.carbsG)+' g · Gorduras '+fmt(t.fatG)+' g'+
        (items.length===2?' · Whey + '+fmt(items[1].quantity)+' ml leite':'')+
        (totals.counts.energyKcal.unknown?' · calorias parciais':'');
      if(submit)submit.textContent='Adicionar '+items.length+(items.length===1?' alimento':' alimentos')+' à refeição';
    }
    function addItems(items){if(draft.entry.items.length+items.length>30)return error('Limite de 30 alimentos por refeição.');draft.entry.items.push(...items);saveDraft();picked=null;mealBody();}

    function activityAdvice(){
      const a=ACT.assess(get(),today());
      const w=a.windows.last28;
      const monthly=HEALTH?.averages(get().healthMonthly||[])||[];
      const latestMonthly=monthly.slice(-3);
      const label=a.suggestedFactor==null?'Ainda sem sugestão numérica':'Fator sugerido: '+String(a.suggestedFactor).replace('.',',')+' (provisório)';
      return '<section class="nd-activity-advice" aria-label="Atividade observada">'+
        '<strong>'+esc(label)+'</strong>'+
        '<p class="small muted">Últimos 28 dias: '+w.stepDays+' dia(s) com passos; '+w.strength+' sessão(ões) de musculação; '+
        w.muay+' sessão(ões) de Muay Thai. '+(w.avgSteps==null?'Média de passos indisponível.':'Média nos dias registrados: '+fmt(w.avgSteps)+' passos.')+'</p>'+
        (a.suggestedFactor==null?
        '<p class="small muted">Precisamos de passos distribuídos por pelo menos 7 dias, incluindo dias sem treino, para propor uma faixa inicial.</p>':
        '<p class="small muted">Cobertura '+esc(a.coverage)+'. Faixa heurística '+a.range.map(v=>String(v).replace('.',',')).join('–')+'. Não é gasto medido.</p>'+
        button('apply-activity','Usar fator sugerido no perfil','data-factor="'+a.suggestedFactor+'"','button-inline'))+
        button('show-steps','Registrar passos / consultar histórico','','button-inline')+
        (latestMonthly.length?'<details class="nd-health-context"><summary>Histórico mensal do Samsung Health ('+latestMonthly.length+')</summary>'+latestMonthly.map(m=>
          '<p class="small muted">'+esc(m.month)+' · '+fmt(m.stepsPerCalendarDay)+' passos/dia no período ('+(m.complete?'mês completo':'mês parcial')+').</p>').join('')+
          '<p class="small muted">Médias de totais mensais não viram registros diários e não determinam o fator automaticamente.</p></details>':'')+
        '<p class="small muted">O fator escolhido e as metas só mudam depois de sua confirmação.</p></section>';
    }
    function activityPanel(open=false){
      const rows=(get().activitySteps||[]).slice().sort((a,b)=>b.date.localeCompare(a.date));
      const a=ACT.assess(get(),today());
      const w=a.windows;
      const describe=x=>x.avgSteps==null?'—':fmt(x.avgSteps);
      const entries=rows.slice(0,10).map(row=>
        '<div class="nd-step-history-row"><span>'+dateBR(row.date)+' · '+fmt(row.steps)+' passos</span>'+
        '<button type="button" class="button-inline" data-nd="edit-steps" data-date="'+esc(row.date)+'">Editar</button>'+
        '<button type="button" class="button-inline" data-nd="remove-steps" data-date="'+esc(row.date)+'">Excluir</button></div>').join('');
      return '<details id="nd-steps-panel" class="nd-steps-panel" '+(open?'open':'')+'><summary>Registrar passos do Samsung Health ('+rows.length+')</summary>'+
        '<p class="small muted">Copie a contagem diária do Samsung Health. O FORJA não se conecta automaticamente ao relógio. Registre dias com e sem treino; não é necessário informar calorias.</p>'+
        '<div class="nd-step-overview"><div><strong>7 dias</strong><span>'+describe(w.last7)+' passos/dia registrado</span></div>'+
        '<div><strong>14 dias</strong><span>'+describe(w.last14)+' passos/dia registrado</span></div>'+
        '<div><strong>28 dias</strong><span>'+describe(w.last28)+' passos/dia registrado</span></div></div>'+
        '<form id="nd-steps-form"><div class="field-row">'+
        '<div class="field"><label for="nd-step-date">Dia da contagem</label><input id="nd-step-date" name="date" type="date" max="'+today()+'" value="'+today()+'" required></div>'+
        '<div class="field"><label for="nd-step-count">Passos nesse dia</label><input id="nd-step-count" name="steps" inputmode="numeric" type="number" step="1" min="0" max="100000" placeholder="Ex.: 8200" required></div></div>'+
        '<button type="submit" class="secondary full mt-12">Salvar passos neste aparelho</button></form>'+
        (entries?'<div class="nd-step-history mt-12"><strong>Últimos registros</strong>'+entries+'</div>':'')+
        '<p class="small muted">Amostras incompletas não são tratadas como zero. A sugestão é uma heurística editável; não duplicamos gasto calórico do exercício.</p></details>';
    }
    function goals(){
      draft=null;profileDraft=clone(archive().settings.profile||{heightCm:null,age:null,weightKg:null,activity:null,sex:'',goal:'recomposition',adultScope:false,confirmedAt:today()});
      openModal('Minhas metas');goalsBody();
    }
    function goalsBody(){
      const p=profileDraft,current=G.active(archive().settings,day);
      const latest=(get().weights||[]).filter(w=>!w.initial).sort((a,b)=>b.date.localeCompare(a.date))[0];
      const circumference=BODY?.recent(get().bodyMeasurements||[])[0];
      const wearable=BODY?.recentBio(get().bioimpedance||[])[0];
      dialog.querySelector('#nd-dialog-body').innerHTML=`<p class="small muted">Altura, idade, peso e atividade ajudam a estimar suas necessidades. Você pode editar as metas.</p><form id="nd-profile"><div class="field-row">${field('heightCm','Altura (cm)',p.heightCm,'inputmode="decimal" placeholder="Ex.: 175,5"')}${field('age','Idade (anos completos)',p.age,'type="number" min="18" max="100" step="1"')}${field('weightKg','Peso atual (kg)',p.weightKg,'inputmode="decimal"')}${select('sex','Parâmetro da fórmula',{'':'Não informado',male:'Masculino (+5)',female:'Feminino (−161)'},p.sex)}</div>
      ${latest?`<p class="small">Última pesagem: ${fmt(latest.weight)} kg em ${dateBR(latest.date)}. ${button('use-weight','Usar este peso','','button-inline')}</p>`:''}
      <div class="nd-professional-recipe"><strong>Prescrição nutricional · 13/11/2026</strong><p>1.710 kcal · 159 g proteínas · 146 g carboidratos · 28 g gorduras. Meta de fibra não informada.</p>
      <p class="small muted">A energia e os macronutrientes diferem em cerca de 238 kcal pelo cálculo 4/4/9. Mantemos as quantidades originais; confirme a divergência na próxima consulta.</p>
      ${button('apply-professional',current?.source==='professional'?'Prescrição vigente — reaplicar':'Usar metas da nutricionista','','secondary full')}</div>
      ${select('goal','Objetivo',{recomposition:'Recomposição corporal',loss:'Redução de gordura',maintain:'Manutenção',gain:'Ganho gradual'},p.goal)}
      ${select('activity','Atividade habitual, incluindo treinos',{'':'Selecione','1.2':'Pouca atividade (1,2)','1.375':'Atividade leve (1,375)','1.55':'Atividade moderada (1,55)','1.725':'Atividade alta (1,725)','1.9':'Atividade muito alta (1,9)'},p.activity??'')}
      <p class="small muted">Considere trabalho, deslocamentos e frequência/duração dos treinos. Fatores são aproximações; não escolha apenas pela modalidade. Não somamos calorias de exercícios novamente.</p>
      <div id="nd-activity-advice">${activityAdvice()}</div>
      <label class="nd-check"><input type="checkbox" name="adultScope" ${p.adultScope?'checked':''}> Sou adulto e não tenho necessidade clínica específica que exija um plano alimentar individual. Caso contrário, usarei metas profissionais.</label>
      <p class="small muted">Última confirmação: ${dateBR(p.confirmedAt)}. Idade não avança automaticamente; confira ao revisar.</p>
      <p class="small muted">${circumference?'Circunferências registradas em '+dateBR(circumference.date)+'. ':''}${wearable?'Galaxy Watch: última leitura em '+dateBR(wearable.date)+'. ':''}Medidas corporais e bioimpedância auxiliam a avaliar tendências, mas não substituem o cálculo de gasto nem determinam calorias automaticamente.</p>
      <div class="btnrow"><button type="submit" class="primary">Salvar perfil e calcular</button>${button('suggest','Recalcular prévia','','secondary')}</div></form>
      <section id="nd-suggestion" aria-live="polite" class="nd-suggestion-slot"></section>
      ${activityPanel()}
      <details class="nd-goals-manual mt-12" ${current?.source==='manual'||current?.source==='professional'?'open':''}><summary>Editar metas manualmente</summary><p class="small muted">Opção para substituir a estimativa. Metas manuais ou profissionais não são alteradas sem sua confirmação.</p><form id="nd-target"><div class="field-row">${G.KEYS.map(k=>field('target-'+k,nutrients[k]+(k==='energyKcal'?' (kcal/dia)':' (g/dia)'),current?.values[k],`type="number" min="1" max="${k==='energyKcal'?10000:1000}" step="any"`)).join('')}</div><p class="small muted">Campos vazios deixam o nutriente sem meta. Fibra: referência mínima, não teto. Valores manuais ficam protegidos.</p>
      ${select('source','Origem',{manual:'Ajustada por você',professional:'Informada por profissional'},current?.source==='professional'?'professional':'manual')}${field('from','Válida a partir de',today(),`type="date" min="${today()}" required`)}<p id="nd-macro-diff" class="small" aria-live="polite"></p>${button('balance','Recalcular carboidratos pelo saldo','','button-inline')}<button class="primary full mt-12" type="submit">Salvar metas manuais</button></form></details>
      <details class="mt-16"><summary>Como calculamos · fontes e limites</summary><p class="small">Mifflin–St Jeor: 10 × peso + 6,25 × altura − 5 × idade + constante. Repouso × atividade estima manutenção. Recomposição/manutenção começam na manutenção; redução de gordura em −10%; ganho em +5%. São pontos de partida, não garantia de resultado.</p><p class="small">Proteína: referência 1,6–2,2 g/kg com treino resistido, sugestão inicial 1,8. Gordura: referência 20–35% da energia, início em 25%. Carboidratos: saldo energético após proteína e gordura. Fibras: referência mínima 25 g/dia. Constantes de início são escolhas do produto, ajustáveis.</p><p class="small">Circunferências não viram gordura corporal estimada. Sem dados completos não inferimos baixa ingestão. Metas não mudam por uma pesagem ou sessão. Revisão de tendências em 2–4 semanas é uma janela operacional.</p><ul class="small"><li><a href="https://pubmed.ncbi.nlm.nih.gov/2305711/" target="_blank" rel="noopener">Mifflin et al., 1990</a></li><li><a href="https://pubmed.ncbi.nlm.nih.gov/42867412/" target="_blank" rel="noopener">ISSN, 2026</a></li><li><a href="https://pubmed.ncbi.nlm.nih.gov/28698222/" target="_blank" rel="noopener">Morton et al., 2018</a></li><li><a href="https://pubmed.ncbi.nlm.nih.gov/26920240/" target="_blank" rel="noopener">AND/DC/ACSM, 2016</a></li><li><a href="https://www.who.int/publications/b/69157" target="_blank" rel="noopener">OMS: carboidratos e fibras</a></li></ul></details>
      <details class="mt-16"><summary>Histórico de metas (${(archive().settings.targets||[]).length})</summary>${(archive().settings.targets||[]).slice().sort((a,b)=>b.from.localeCompare(a.from)).map(t=>`<p class="small">${dateBR(t.from)} · ${esc(t.source)} · ${fmt(t.values.energyKcal)} kcal · ${esc(t.formula)}</p>`).join('')||'Nenhuma meta salva.'}</details>`;
      macroDiff();
      previewSuggestion(false);
    }
    function previewSuggestion(scroll=false){
      const node=dialog?.querySelector('#nd-suggestion');
      if(!node)return;
      const profile=readProfile();
      suggestion=G.estimate(profile);
      if(suggestion.error){
        node.innerHTML='<p class="small muted">Preencha e confirme os dados acima para visualizar uma recomendação. Você também pode configurar metas manuais.</p>';
        if(scroll)error(suggestion.error);
        return;
      }
      profileDraft=profile;
      const current=G.active(archive().settings,day);
      const wearable=BODY?.recentBio(get().bioimpedance||[])[0];
      const caution=profile.activity>=1.725?'O fator de atividade selecionado é alto; pode superestimar as necessidades se a rotina fora do treino for pouco ativa. Valide por tendências ao longo de 2–4 semanas.':'';
      node.innerHTML='<section class="nd-goal-recommendation" aria-label="Sugestão nutricional calculada">'+
        '<p class="eyebrow">SUGESTÃO INICIAL · NÃO APLICADA</p><h3>Metas estimadas para seu objetivo</h3>'+
        '<div class="nd-goal-energy"><strong>'+fmt(suggestion.values.energyKcal)+' kcal/dia</strong>'+
        '<span>Energia de partida · manutenção estimada '+fmt(suggestion.maintenance)+' kcal</span></div>'+
        '<div class="nd-goal-macro-grid">'+G.KEYS.slice(1).map(k=>
          '<div><span>'+nutrients[k]+'</span><strong>'+fmt(suggestion.values[k])+' g</strong></div>').join('')+'</div>'+
        '<p class="small muted">Repouso estimado: '+fmt(suggestion.resting)+' kcal. Os valores usam peso, altura, idade, parâmetro da fórmula e atividade informada.</p>'+
        (current?'<p class="small muted">Meta vigente: '+fmt(current.values.energyKcal)+' kcal ('+esc(current.source)+'). Ela permanece igual até você aceitar outra.</p>':'')+
        (caution?'<p class="small nd-goal-caution">'+esc(caution)+'</p>':'')+
        (wearable?'<p class="small muted">Bioimpedância de '+dateBR(wearable.date)+' disponível como tendência, sem ajustar esta estimativa por um resultado isolado.</p>':'')+
        '<button type="button" class="primary full" data-nd="accept">Aceitar estas metas a partir de hoje</button>'+
        '<p class="small muted">Ajustes manuais seguem disponíveis abaixo. Nenhuma alteração ocorre sem aceitar.</p></section>';
      if(scroll)node.scrollIntoView({block:'nearest'});
    }
    const num=v=>String(v??'').trim()===''?null:Number(String(v).replace(',','.'));
    function readProfile(){const f=new FormData(dialog.querySelector('#nd-profile'));return {heightCm:num(f.get('heightCm')),age:num(f.get('age')),weightKg:num(f.get('weightKg')),activity:num(f.get('activity')),sex:f.get('sex'),goal:f.get('goal'),adultScope:f.get('adultScope')==='on',confirmedAt:today()};}
    function values(){const f=new FormData(dialog.querySelector('#nd-target'));return Object.fromEntries(G.KEYS.map(k=>[k,num(f.get('target-'+k))]));}
    function macroDiff(){const v=values(),delta=G.difference(v);dialog.querySelector('#nd-macro-diff').textContent=delta==null?'Preencha energia e macros para conferir o saldo.':`Diferença aproximada entre energia e macros (4/4/9): ${delta} kcal. Você pode manter ou recalcular carboidratos.`;}
    function saveTarget(t){
      if(!G.validTarget(t)||!G.KEYS.some(k=>t.values[k]!=null))return error('Informe ao menos uma meta positiva e revise os campos.');
      if(t.from<today())return error('Escolha hoje ou uma data futura; metas passadas são preservadas.');
      if((archive().settings.targets||[]).some(x=>x.from===t.from)&&!confirm('Substituir a meta com esta mesma data de início?'))return;
      if(transact(a=>{if(t.source==='suggested')a.settings.profile=clone(t.profile);a.settings.targets=[...(a.settings.targets||[]).filter(x=>x.from!==t.from),t];})){close(true);refresh();notify('Metas salvas. Suas escolhas serão preservadas.');}else error('Não foi possível salvar as metas. Tente novamente.');
    }

    function reviewBalanceDay(date){
      const quality=B.quality(archive(),date);
      if(!quality.complete)return notify(quality.reason);
      openModal('Conferir dia alimentar');
      dialog.querySelector('#nd-dialog-body').innerHTML=
        '<form id="nd-balance-review" class="nd-balance-form">'+
        '<p>Dia '+dateBR(date)+' · '+fmt(quality.energyKcal)+' kcal registradas · '+fmt(quality.proteinG)+' g de proteína.</p>'+
        '<p class="small muted">A conferência não comprova que toda alimentação foi anotada. Faça esta confirmação somente depois de registrar todas as refeições, lanches e bebidas consumidos nesse dia. Alterar qualquer registro invalida a confirmação.</p>'+
        '<input type="hidden" name="date" value="'+esc(date)+'">'+
        '<label class="nd-balance-check"><input name="complete" type="checkbox" value="yes" required>'+
        '<span>Conferi todas as refeições, bebidas e quantidades que consumi neste dia.</span></label>'+
        '<button type="submit" class="primary full">Confirmar dia completo</button></form>';
    }
    function openBalancePlan(){
      const report=B.assessment(archive(),get(),today());
      if(report.status!=='ready')return notify(report.reason);
      openModal('Equilíbrio calórico opcional');
      const dates=report.candidates.map(date=>
        '<label class="nd-balance-check"><input type="checkbox" name="dates" value="'+esc(date)+'">'+
        '<span>'+dateBR(date)+' · Declaro que será dia leve / descanso (sem treino planejado)</span></label>').join('');
      dialog.querySelector('#nd-dialog-body').innerHTML=
        '<form id="nd-balance-plan" class="nd-balance-form">'+
        '<p><strong>Saldo parcial: +'+fmt(report.balanceKcal)+' kcal</strong> em '+report.usableCount+' dias conferidos. Não é o balanço energético total.</p>'+
        '<p class="small muted">Escolha até cinco dias nos próximos sete. Ausência de treino no aplicativo não prova descanso. Marque apenas dias de menor demanda. Não é necessário recuperar todo o excesso.</p>'+
        '<div class="nd-balance-kpis"><div><small>Limite ilustrativo por dia</small><strong>'+fmt(report.maxDailyReductionKcal)+' kcal</strong></div>'+
        '<div><small>Proteína original</small><strong>'+fmt(report.base.values.proteinG)+' g</strong></div></div>'+
        '<fieldset class="nd-balance-choices"><legend>Dias em que você prefere um ajuste leve</legend>'+
        dates+'</fieldset>'+
        '<p class="nd-balance-preview" id="nd-balance-preview" role="status" aria-live="polite">Selecione os dias para visualizar a proposta.</p>'+
        '<label class="nd-balance-check"><input name="accept" type="checkbox" value="yes" required>'+
        '<span>Quero aceitar a sugestão temporária; sei que é opcional e que as metas originais ficarão preservadas.</span></label>'+
        '<button type="submit" class="primary full">Aplicar ajuste nos dias selecionados</button></form>';
    }
    function updateBalancePreview(){
      const form=dialog?.querySelector('#nd-balance-plan');if(!form)return;
      const days=[...new FormData(form).getAll('dates')];
      const note=form.querySelector('#nd-balance-preview');
      if(!days.length){note.textContent='Selecione até cinco dias para visualizar a proposta.';return;}
      const suggestion=B.makePlan(archive(),get(),today(),days,id);
      if(suggestion.error){note.textContent=suggestion.error;return;}
      const day=suggestion.plan.days[0],base=G.active(archive().settings,today());
      note.textContent='Proposta: '+fmt(base.values.energyKcal-day.reductionKcal)+
        ' kcal nos dias escolhidos (−'+fmt(day.reductionKcal)+' kcal/dia). Proteína '+fmt(base.values.proteinG)+
        ' g, gordura '+fmt(base.values.fatG)+' g e fibras '+fmt(base.values.fiberG)+
        ' g mantidas; carboidrato −'+fmt(day.reductionKcal/4)+' g/dia. Distribuição total: '+
        fmt(suggestion.totalReductionKcal)+' kcal. Saldo não compensado: ≈'+
        fmt(suggestion.outstandingKcal)+' kcal, sem obrigação de recuperação.';
    }

    function submit(event){event.preventDefault();const form=event.target,f=new FormData(form);
      if(form.id==='nd-balance-review'){
        if(f.get('complete')!=='yes')return error('Confirme a conferência de todas as refeições e bebidas.');
        const review=B.markReviewed(archive(),String(f.get('date')),today());
        if(review.error)return error(review.error);
        if(transact(a=>{a.balance=review.balance;})){close(true);refresh();notify('Dia conferido. Suas metas não foram alteradas.');}
        else error('Não foi possível salvar a conferência.');
      }else if(form.id==='nd-balance-plan'){
        if(f.get('accept')!=='yes')return error('Confirme que deseja aceitar o ajuste temporário.');
        const suggestion=B.makePlan(archive(),get(),today(),f.getAll('dates'),id);
        if(suggestion.error)return error(suggestion.error);
        if(transact(a=>{a.balance={...(a.balance||{reviewedDays:[]}),plan:suggestion.plan,ignoredUntil:null};})){
          close(true);refresh();notify('Ajuste temporário aceito. Proteína e metas originais preservadas.');
        }else error('Não foi possível salvar o ajuste.');
      }else if(form.id==='nd-meal'){
        if(draft.pending&&Object.values(draft.pending).some(v=>String(v).trim()))return error('Há um alimento manual em preenchimento. Adicione-o à refeição antes de salvar ou limpe os campos preenchidos.');
        draft.entry.date=f.get('mealDate');draft.entry.mealType=f.get('mealType');draft.entry.time=f.get('time')||null;draft.entry.notes=f.get('notes')||'';
        if(!N.validEntry(draft.entry)||draft.entry.date>today())return error('Revise a data, as quantidades e adicione pelo menos um alimento.');
        if(draft.editId&&!archive().entries.some(e=>e.id===draft.editId))return error('Registro original não encontrado.');
        if(transact(a=>{a.entries=draft.editId?a.entries.map(e=>e.id===draft.editId?clone(draft.entry):e):[...a.entries,clone(draft.entry)];delete a.draft;})){day=draft.entry.date;close(true);refresh();notify('Refeição salva neste aparelho.');}else error('Não foi possível salvar. O formulário foi preservado.');
      }else if(form.id==='nd-catalog'){const items=proposedItems(form,id);if(!items)return error('Revise o peso e a quantidade de leite.');addItems(items);
      }else if(form.id==='nd-shared'){
        const out=proposedShared(form,id);
        if(!out)return error('Revise as quantidades consumidas antes de registrar.');
        if(draft.entry.items.length+out.items.length>30)return error('Limite de 30 alimentos por refeição.');
        sharedPicked=null;addItems(out.items);

      }else if(form.id==='nd-manual'){
        const n=Object.fromEntries(G.KEYS.map(k=>[k,num(f.get(k))]));const serving=f.get('basis')==='serving';
        if(serving&&f.get('unit')!=='portion')return error('Para valores por porção, selecione a unidade porção.');
        const item={id:id('item'),foodId:null,label:String(f.get('label')).trim(),quantity:num(f.get('quantity')),unit:f.get('unit'),grams:num(f.get('grams')),nutrientsPer100g:serving?Object.fromEntries(G.KEYS.map(k=>[k,null])):n,source:G.KEYS.some(k=>n[k]!=null)?{name:'Rótulo informado manualmente',reference:'Valores conferidos pelo usuário'}:null,...(serving?{nutrientsPerServing:n}:{})};
        if(!N.validEntry({...draft.entry,items:[item]}))return error('Revise quantidade e composição.');delete draft.pending;addItems([item]);
      }else if(form.id==='nd-steps-form'){
        const date=String(f.get('date')||''),count=String(f.get('steps')||'');
        if(date>today())return error('Não é possível registrar passos de um dia futuro.');
        const result=ACT.upsertSteps(get().activitySteps||[],date,count);
        if(result.error)return error(result.error);
        if(!commitSteps(result.items))return error('Não foi possível salvar os passos. Registros anteriores preservados.');
        const panel=dialog.querySelector('#nd-steps-panel');
        if(panel)panel.outerHTML=activityPanel(true);
        const advice=dialog.querySelector('#nd-activity-advice');
        if(advice)advice.innerHTML=activityAdvice();
        previewSuggestion(false);
        notify('Passos salvos. O fator manual não foi alterado.');
      }else if(form.id==='nd-profile'){
        const p=readProfile();if(!G.validProfile(p))return error('Revise altura (100–250 cm), idade adulta inteira (18–100), peso (30–350 kg) e atividade. Campos podem ficar vazios para metas manuais.');
        if(transact(a=>{a.settings.profile=p;})){profileDraft=p;previewSuggestion(true);notify('Perfil salvo. Confira a sugestão e aceite se desejar.');}else error('Perfil não salvo. Tente novamente.');
      }else if(form.id==='nd-target'){saveTarget({id:id('target'),from:f.get('from'),source:f.get('source'),values:values(),profile:archive().settings.profile||null,formula:'manual-v1'});}
    }
    function input(event){const el=event.target;
      if(draft&&el.closest('#nd-manual')){draft.pending=draft.pending||{};draft.pending[el.name]=el.value;if(Object.values(draft.pending).every(v=>!String(v).trim()))delete draft.pending;saveDraft();}
      if(el.id==='nd-search'){search=el.value;all=false;picked=null;portion();results();return;}
      if(el.closest('#nd-catalog')){updatePortionPreview();return;}
      if(el.closest('#nd-shared')){updateSharedPreview();return;}
      if(el.closest('#nd-balance-plan')){updateBalancePreview();return;}
      if(el.closest('#nd-profile'))previewSuggestion(false);
      if(el.closest('#nd-target'))macroDiff();
      if(!draft)return;
      if(el.dataset.index!==undefined){const i=draft.entry.items[Number(el.dataset.index)];if(!i)return;
        if(el.dataset.nutrient){const n=i.nutrientsPerServing||i.nutrientsPerMl||i.nutrientsPer100g;n[el.dataset.nutrient]=num(el.value);i.source={name:'Rótulo informado manualmente',reference:'Composição revisada pelo usuário'};}
        else {const q=num(el.value);if(q>0&&Number.isFinite(q)){if(i.grams!=null&&i.unit!=='g')i.grams=i.grams*q/i.quantity;if(i.unit==='g'&&i.grams!=null)i.grams=q;i.quantity=q;}}
      }
      if(el.name==='mealDate')draft.entry.date=el.value;
      if(el.name==='mealType')draft.entry.mealType=el.value;
      if(el.name==='time')draft.entry.time=el.value||null;
      if(el.name==='notes')draft.entry.notes=el.value;
      if(el.closest('#nd-meal')){preview();if(N.validDraft(draft))saveDraft();}
    }
    function change(e){
      if(e.target.id==='nd-step-date'){
        const row=(get().activitySteps||[]).find(x=>x.date===e.target.value);
        const count=dialog.querySelector('#nd-step-count');
        if(count)count.value=row?String(row.steps):'';
        return;
      }
      if(e.target.closest('#nd-balance-plan')){updateBalancePreview();return;}
      if(e.target.closest('#nd-catalog')){if(e.target.name==='portion')e.target.form.elements.namedItem('count').value=e.target.value==='custom'?'100':e.target.value==='customMl'?'200':'1';updatePortionPreview();return;}
      if(e.target.tagName==='SELECT'||e.target.type==='date')input(e);
    }
    function modalClick(event){const b=event.target.closest('[data-nd]');if(!b)return;const a=b.dataset.nd;
      if(a==='close')return close();
      if(a==='mode'){mode=b.dataset.mode;search='';all=false;picked=null;sharedPicked=null;dialog.querySelector('#nd-search').value='';portion();results();}
      if(a==='all'){all=true;results();}
      if(a==='pick'){sharedPicked=null;picked=b.dataset.id;portion();dialog.querySelector('#nd-portion-panel').scrollIntoView({block:'nearest'});dialog.querySelector('#nd-count')?.focus({preventScroll:true});}
      if(a==='cancel-pick'){picked=null;portion();dialog.querySelector('#nd-search')?.focus({preventScroll:true});}
      if(a==='pick-shared'){picked=null;sharedPicked=b.dataset.id;mode='portions';portion();dialog.querySelector('#nd-total-0')?.focus({preventScroll:true});}
      if(a==='cancel-shared'){sharedPicked=null;portion();results();}
      if(a==='apply-share'){
        const form=dialog.querySelector('#nd-shared'),pct=num(form?.elements.namedItem('share-global')?.value);
        if(!form||pct===null||pct<0||pct>100)return error('Informe uma porcentagem entre 0 e 100.');
        CAT.SHARED_PRESETS.find(p=>p.id===sharedPicked)?.components.forEach((part,i)=>{form.elements.namedItem('share-'+i).value=String(pct);});
        updateSharedPreview();
      }
      if(a==='remove'){draft.entry.items.splice(Number(b.dataset.index),1);saveDraft();mealBody();}
      if(a==='recent'){const item=archive().entries.find(e=>e.id===b.dataset.entry)?.items.find(i=>i.id===b.dataset.id);if(item)addItems([{...clone(item),id:id('item')}]);}
      if(a==='use-favorite'){const f=archive().mealTemplates.find(f=>f.id===b.dataset.id),e=f&&CAT.fromFavorite(f,draft.entry.date,archive(),id);if(e)addItems(e.items);else error('Favorito incompatível.');}
      if(a==='discard'&&confirm('Descartar este rascunho? O registro original não será alterado.')){if(transact(a=>{delete a.draft;})){close(true);refresh();}else error('Não foi possível descartar.');}
      if(a==='show-steps'){
        const panel=dialog.querySelector('#nd-steps-panel');
        if(panel){panel.open=true;panel.scrollIntoView({block:'start'});panel.querySelector('#nd-step-count')?.focus({preventScroll:true});}
        return;
      }
      if(a==='apply-activity'){
        const factor=Number(b.dataset.factor);
        const current=ACT.assess(get(),today()).suggestedFactor;
        if(!current||current!==factor)return error('Histórico insuficiente para essa sugestão. Revise os passos.');
        const el=dialog.querySelector('#nd-activity');
        if(!el)return;
        el.value=String(factor);
        profileDraft=readProfile();previewSuggestion(false);
        error('Fator selecionado como prévia. Salve o perfil e aceite as metas para confirmar.');
        return;
      }
      if(a==='edit-steps'){
        const row=(get().activitySteps||[]).find(x=>x.date===b.dataset.date);
        if(!row)return;
        dialog.querySelector('#nd-step-date').value=row.date;
        dialog.querySelector('#nd-step-count').value=row.steps;
        dialog.querySelector('#nd-steps-panel').open=true;
        dialog.querySelector('#nd-step-count').focus();return;
      }
      if(a==='remove-steps'){
        const date=b.dataset.date,rows=get().activitySteps||[];
        if(!rows.some(x=>x.date===date)||!confirm('Excluir a contagem de passos de '+dateBR(date)+'?'))return;
        if(!commitSteps(rows.filter(x=>x.date!==date)))return error('Não foi possível excluir. Dados anteriores preservados.');
        const panel=dialog.querySelector('#nd-steps-panel');
        if(panel)panel.outerHTML=activityPanel(true);
        const advice=dialog.querySelector('#nd-activity-advice');
        if(advice)advice.innerHTML=activityAdvice();
        previewSuggestion(false);notify('Registro de passos excluído.');return;
      }
      if(a==='use-weight'){const w=(get().weights||[]).filter(w=>!w.initial).sort((a,b)=>b.date.localeCompare(a.date))[0];if(w){dialog.querySelector('#nd-weightKg').value=w.weight;previewSuggestion(false);}}
      if(a==='suggest'){profileDraft=readProfile();previewSuggestion(true);}
      if(a==='accept'&&suggestion?.values){saveTarget({id:id('target'),from:today(),source:'suggested',values:suggestion.values,profile:profileDraft,formula:suggestion.formula});}
      if(a==='balance'){const v=values();if([v.energyKcal,v.proteinG,v.fatG].some(x=>x==null||!Number.isFinite(x)))return error('Preencha energia, proteína e gordura.');const carbs=Math.round((v.energyKcal-4*v.proteinG-9*v.fatG)/4);if(carbs<=0)return error('Energia insuficiente para esses macros. Revise as metas.');dialog.querySelector('#nd-target-carbsG').value=carbs;macroDiff();}
    }
    function action(b){const a=b.dataset.nd;
      if(a==='goals')return goals();
      if(a==='apply-professional'){
        const target=G.professionalTarget(today());
        if(!target)return notify('Data da prescrição inválida.');
        const current=G.active(archive().settings,today());
        if(current?.source==='professional'&&G.difference(current.values)===G.difference(target.values)&&
            JSON.stringify(current.values)===JSON.stringify(target.values))return notify('A prescrição já está vigente.');
        if(!confirm('Tornar a prescrição da nutricionista a meta vigente a partir de hoje? O histórico anterior será preservado.'))return;
        if((archive().settings.targets||[]).some(x=>x.from===today()))
          target.id=id('target');
        return saveTarget(target);
      }

      if(a==='balance-review')return reviewBalanceDay(b.dataset.date);
      if(a==='balance-plan')return openBalancePlan();
      if(a==='balance-day'){day=b.dataset.date;refresh();window.scrollTo(0,0);return;}
      if(a==='balance-unreview'){
        const next=B.unmarkReviewed(archive(),b.dataset.date);
        if(transact(a=>{a.balance=next.balance;})){refresh();notify('Conferência reaberta. Sugestões baseadas nesse dia ficam suspensas.');}
        return;
      }
      if(a==='balance-keep'){
        if(!confirm('Manter as metas normais e pausar as sugestões por sete dias?'))return;
        if(transact(a=>{a.balance={...(a.balance||{reviewedDays:[]}),ignoredUntil:B.shift(today(),7)};})){
          refresh();notify('Metas normais mantidas. Sugestões pausadas por sete dias.');
        }
        return;
      }
      if(a==='balance-cancel'){
        if(!confirm('Cancelar o ajuste temporário? Nenhum alimento ou meta original será alterado.'))return;
        if(transact(a=>{a.balance={...(a.balance||{reviewedDays:[]}),plan:null,ignoredUntil:B.shift(today(),7)};})){
          refresh();notify('Ajuste cancelado. Metas normais retomadas.');
        }
        return;
      }
      if(a==='balance-unpause'){
        if(transact(a=>{a.balance={...(a.balance||{reviewedDays:[]}),plan:null,ignoredUntil:null};})){
          refresh();notify('Sugestões opcionais habilitadas novamente.');
        }
        return;
      }
      if(a==='plan-confirm'||a==='plan-adjust'){
        const recipe=PRESETS?.find(b.dataset.recipe);
        if(!recipe)return notify('Opção de refeição não encontrada.');
        if(archive().entries.some(e=>e.date===day&&e.mealType===recipe.mealType))
          return notify('Essa refeição já tem um registro. Use Adicionar para registrar outra.');
        const entry=PRESETS.makeEntry(recipe.id,day,id);
        if(!entry)return notify('Não foi possível montar a refeição. Confira o catálogo.');
        if(a==='plan-adjust')return start(recipe.mealType,entry,true);
        if(archive().draft)return notify('Há um rascunho pendente. Continue ou descarte antes de confirmar.');
        const ok=transact(a=>{a.entries.push(entry);});
        if(!ok)return notify('Não foi possível salvar a refeição.');
        notify('Refeição confirmada e nutrientes atualizados.');
        const scroll=root.scrollY;refresh();root.scrollTo(0,scroll);return;
      }
      if(a==='add')return start(b.dataset.meal||'lunch');
      if(a==='shared'){start(b.dataset.meal||'dinner');if(!draft)return;mode='portions';sharedPicked='trono-dos-reis';mealBody();return;}
      if(a==='resume'){draft=clone(archive().draft);if(!draft)return;openModal('Continuar refeição');mealBody();return;}
      if(a==='previous'||a==='next'){const d=new Date(day+'T12:00:00');d.setDate(d.getDate()+(a==='next'?1:-1));const next=[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');day=next>today()?today():next;}
      if(a==='today')day=today();if(a==='day')day=b.dataset.date;
      if(a==='more')limit+=5;
      const e=archive().entries.find(e=>e.id===b.dataset.id);
      if(a==='edit'&&e)return start(e.mealType,e);
      if(a==='repeat'&&e)return start(e.mealType,e,true);
      if(a==='delete'&&e&&confirm('Excluir '+labels[e.mealType]+' de '+dateBR(e.date)+'?')){if(!transact(x=>{x.entries=x.entries.filter(v=>v.id!==e.id);}))return;}
      if(a==='favorite'&&e){const f=CAT.makeFavorite(e,archive(),'',id);if(!f)return notify('Não foi possível criar favorito.');if(!transact(x=>{x.foods.push(...f.foodsToAdd);x.mealTemplates.push(f.favorite);} ))return;notify('Favorito salvo.');}
      const scroll=window.scrollY;refresh();window.scrollTo(0,scroll);if(a==='more')document.querySelector('#nd-history').open=true;
    }
    let scrollQueued=false,scrollBound=false;
    function syncScroll(){
      const view=document.querySelector('.nutrition-screen');
      if(!view)return;
      const collapse=view.querySelector('.nd-collapse');
      if(!collapse)return;
      // Capture the expanded content height only after mount. Subsequent scrolling
      // changes its clipped viewport, not its natural (scrollHeight) content.
      const expanded=collapse.scrollHeight;
      if(!Number.isFinite(expanded)||expanded<=0)return;
      const startY=view.getBoundingClientRect().top+root.scrollY;
      const distance=Math.max(180,Math.min(400,expanded*.75));
      const progress=Math.min(1,Math.max(0,(root.scrollY-startY)/distance));
      const reduced=root.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      view.style.setProperty('--nd-scroll-progress',String(progress));
      // Visual scaling avoids scroll-anchoring feedback: layout space scrolls
      // offscreen naturally while the date remains independently sticky.
      collapse.style.transform=reduced?'none':'scale('+(1-progress)+')';
      collapse.classList.toggle('nd-collapsed',progress>=.999);
      collapse.style.setProperty('--nd-content-scale',String(reduced?1:1-.18*progress));
      const nav=view.querySelector('.nd-date-stick');
      if(nav)nav.classList.toggle('nd-is-stuck',nav.getBoundingClientRect().top<=3&&progress>.7);
    }
    function onScroll(){
      if(scrollQueued)return;
      scrollQueued=true;
      root.requestAnimationFrame(()=>{scrollQueued=false;syncScroll();});
    }
    return {render:()=>render({archive:archive(),date:day,limit,state:get(),balanceDate:today()}),goals,
      mount(){const screen=document.querySelector('.nutrition-screen');if(!screen)return;
        screen.addEventListener('click',e=>{const b=e.target.closest('[data-nd]');if(b){e.stopPropagation();action(b);}});
        screen.querySelector('#nd-date').addEventListener('change',e=>{
          if(N.dateOk(e.target.value)&&e.target.value<=today()){day=e.target.value;refresh();}
        });
        if(!scrollBound){
          root.addEventListener('scroll',onScroll,{passive:true});
          root.addEventListener('resize',onScroll,{passive:true});
          scrollBound=true;
        }
        syncScroll();
      }};
  }
  const api={render,controller,newId:id};root.ForjaNutritionUI=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
