/* FORJA nutrition UI: a no-cost, offline, manual-first meal diary. */
(function installNutritionUI(root) {
  'use strict';
  const N = root.ForjaNutrition;
  const CAT = root.ForjaNutritionCatalog;
  const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const labels = {breakfast:'Café da manhã',lunch:'Almoço',snack:'Lanche',dinner:'Jantar',other:'Outra refeição'};
  const units = {g:'g',ml:'ml',unit:'unidade(s)',spoon:'colher(es)',ladle:'concha(s)',portion:'porção(ões)'};
  const nutrients = [['energyKcal','Energia (kcal)'],['proteinG','Proteínas (g)'],['carbsG','Carboidratos (g)'],['fatG','Gorduras (g)']];
  const fmt = n => new Intl.NumberFormat('pt-BR',{maximumFractionDigits:1}).format(n);
  const option = (values,current) => Object.entries(values).map(pair =>
    '<option value="'+escapeHTML(pair[0])+'"'+(pair[0]===current?' selected':'')+'>'+escapeHTML(pair[1])+'</option>').join('');
  const dateBR = value => /^\d{4}-\d{2}-\d{2}$/.test(value) ?
    value.slice(8,10)+'/'+value.slice(5,7)+'/'+value.slice(0,4) : 'Sem data';
  function render({archive,date,editId=null,limit=3,selectedFoodId=null}) {
    const rows=(archive?.entries||[]).slice().sort((a,b)=>b.date.localeCompare(a.date)||b.id.localeCompare(a.id));
    const edit=rows.find(row=>row.id===editId && row.items.length===1)||null;
    const first=edit?.items[0], summary=N.observedTotals(archive.entries,date);
    const estimateSummary=N.estimatedTotals(archive.entries,date);
    const selected=CAT.find(selectedFoodId);
    const foodRows=CAT.foods.map(food=>
      '<button type="button" class="nutrition-food" data-action="nutrition-pick" data-food="'+escapeHTML(food.id)+
      '" data-nutrition-name="'+escapeHTML([food.name,...(food.aliases||[])].join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase())+'">'+
      '<strong>'+escapeHTML(food.name)+'</strong><small>'+escapeHTML(food.category)+
      (food.estimate?' · Estimativa (baixa confiança)':food.nutrientsPerServing?' · Dados por embalagem':' · Porção aproximada')+'</small></button>').join('');
    const favoriteRows=(archive.mealTemplates||[]).slice().reverse().slice(0,8).map(favorite=>
      '<button type="button" class="nutrition-food" data-action="nutrition-use-favorite" data-id="'+escapeHTML(favorite.id)+'">'+
      '<strong>'+escapeHTML(favorite.name)+'</strong><small>Repetir refeição favorita</small></button>').join('');
    const selectPortions=selected?selected.portions.map(portion=>
      '<option value="'+escapeHTML(portion.id)+'">'+escapeHTML(portion.label)+'</option>').join(''):'';
    const catalogForm=selected?'<form id="nutrition-catalog-form" class="mt-12">'+
      '<strong>'+escapeHTML(selected.name)+'</strong><p class="small muted">'+escapeHTML(selected.note)+'</p>'+
      (selected.estimate?'<div class="nutrition-estimate"><strong>≈ '+fmt(selected.estimate.central.energyKcal)+' kcal / '+escapeHTML(selected.estimate.servingLabel)+'</strong>'+
        '<span>Faixa aproximada: '+fmt(selected.estimate.low.energyKcal)+'–'+fmt(selected.estimate.high.energyKcal)+' kcal · confiança baixa</span>'+
        '<small>Proteínas ≈ '+fmt(selected.estimate.central.proteinG)+' g · Carboidratos ≈ '+fmt(selected.estimate.central.carbsG)+' g · Gorduras ≈ '+fmt(selected.estimate.central.fatG)+' g</small>'+ '<small>Valores do copo inteiro; meia porção e quantidades múltiplas são ajustadas ao salvar.</small>'+
        '<details><summary>Como foi estimado?</summary><p>'+escapeHTML(selected.estimate.assumptions)+'</p></details></div>':'')+
      '<div class="field"><label for="nutrition-portion">Porção</label><select name="portionId" id="nutrition-portion">'+selectPortions+'</select></div>'+
      '<div class="field-row mt-12"><div class="field"><label for="nutrition-count">Quantidade de porções</label>'+
      '<input id="nutrition-count" name="quantity" type="number" min="0.001" max="10000" step="any" value="1" required /></div>'+
      '<div class="field"><label for="nutrition-meal-type">Refeição</label><select id="nutrition-meal-type" name="mealType">'+option(labels,'snack')+'</select></div></div>'+
      '<button type="submit" class="primary mt-12">Registrar alimento</button></form>':
      '<p class="small muted mt-12">Escolha um alimento para selecionar uma porção. Nenhum registro será criado automaticamente.</p>';
    const total=summary.totals;
    const metrics=nutrients.map(([key,label]) =>
      '<div class="kpi"><strong>'+ (total[key]===null?'—':fmt(total[key]))+
      '</strong><span>'+escapeHTML(label)+'</span></div>').join('');
    const entryFields=nutrients.map(([key,label]) =>
      '<div class="field"><label for="meal-'+key+'">'+escapeHTML(label)+' / 100 g (opcional)</label>'+
      '<input id="meal-'+key+'" type="number" min="0" max="1200" step="any" inputmode="decimal" name="'+key+
      '" value="'+escapeHTML(first?.nutrientsPer100g?.[key]??'')+'" /></div>').join('');
    const visible=rows.slice(0,limit).map(entry=>{
      const items=entry.items.map(item=>'<li><span>'+escapeHTML(item.label)+
        '</span><small>'+escapeHTML(fmt(item.quantity))+' '+escapeHTML(units[item.unit])+
        (item.grams != null?' · '+escapeHTML(fmt(item.grams))+' g':'')+
        (item.estimate?' · ≈ '+fmt(item.estimate.central.energyKcal*item.quantity)+' kcal (faixa '+fmt(item.estimate.low.energyKcal*item.quantity)+'–'+fmt(item.estimate.high.energyKcal*item.quantity)+', confiança baixa)':'')+'</small></li>').join('');
      return '<details class="card nutrition-entry"><summary><strong>'+escapeHTML(labels[entry.mealType])+
        ' · '+dateBR(entry.date)+'</strong><small>'+escapeHTML(entry.items.map(x=>x.label).join(', '))+
        '</small></summary><div class="mt-12"><ul class="mini-list">'+items+
        '</ul><div class="btnrow mt-12"><button type="button" class="secondary" data-action="nutrition-repeat" data-id="'+escapeHTML(entry.id)+'">Repetir hoje</button>'+
        (entry.items.length===1&&!entry.items[0].nutrientsPerServing&&!entry.items[0].estimate?'<button type="button" class="secondary" data-action="nutrition-edit" data-id="'+escapeHTML(entry.id)+'">Editar</button>':'')+
        '<button type="button" class="secondary" data-action="nutrition-save-favorite" data-id="'+escapeHTML(entry.id)+'">Salvar como favorito</button>'+ 
        '<button type="button" class="ghost" data-action="nutrition-delete" data-id="'+escapeHTML(entry.id)+'">Excluir</button></div></div></details>';
    }).join('');
    return '<div class="nutrition-screen">'+
      '<button type="button" class="button-inline" data-action="nutrition-back">‹ Voltar à evolução</button>'+
      '<p class="eyebrow">Treino + alimentação</p><h1 class="page-title">Alimentação.</h1>'+
      '<p class="lead">Registre o que você realmente consumiu. Nenhuma refeição é presumida e o registro não exige contar calorias.</p>'+
      '<section class="card"><div class="row-between"><h2 class="section-title">Registros de '+dateBR(date)+'</h2><span class="pill">'+summary.mealsRecorded+' refeição(ões)</span></div>'+
      '<div class="kpi-row nutrition-summary">'+metrics+'</div>'+
      (estimateSummary.estimatedItems?'<div class="nutrition-estimate nutrition-estimate-daily">'+
        '<strong>Alimentos estimados registrados: ≈ '+fmt(estimateSummary.totals.central.energyKcal)+' kcal</strong>'+
        '<span>Faixa aproximada: '+fmt(estimateSummary.totals.low.energyKcal)+'–'+fmt(estimateSummary.totals.high.energyKcal)+' kcal · baixa confiança</span>'+
        '<small>Separado dos valores do rótulo; inclui somente os itens estimados. Não representa todas as refeições do dia.</small></div>':'')+
      '<p class="small muted">Valores apenas de alimentos registrados com rótulo ou composição informada e porção suficiente. Estimativas de sobremesas aparecem separadas abaixo. Um traço indica informação insuficiente, não zero. Não representa o consumo total do dia.</p></section>'+
      '<section class="card"><h2 class="section-title">Catálogo rápido</h2>'+ 
      '<div class="field mt-12"><label for="nutrition-search">Buscar alimentos e produtos</label>'+ 
      '<input type="search" id="nutrition-search" placeholder="Ex.: iogurte, PRO FORCE, arroz, whey" autocomplete="off" /></div>'+ 
      '<div class="nutrition-food-list">'+foodRows+'</div>'+catalogForm+'</section>'+ 
      '<section class="card"><h2 class="section-title">Refeições favoritas</h2>'+ 
      (favoriteRows?'<div class="nutrition-food-list">'+favoriteRows+'</div>':'<p class="small muted">Abra uma refeição do histórico e toque em Salvar como favorito.</p>')+'</section>'+ 
      '<form id="nutrition-form" class="card">'+
      '<div class="row-between"><h2 class="section-title">'+(edit?'Editar refeição':'Registrar refeição')+
      '</h2><span class="pill green">Offline</span></div>'+
      '<div class="field-row mt-12"><div class="field"><label for="meal-date">Data</label>'+
      '<input id="meal-date" type="date" name="date" value="'+escapeHTML(edit?.date||date)+'" required /></div>'+
      '<div class="field"><label for="meal-type">Refeição</label><select id="meal-type" name="mealType">'+
      option(labels,edit?.mealType||'lunch')+'</select></div></div>'+
      '<div class="field mt-12"><label for="meal-name">Alimento ou preparação consumida</label>'+
      '<input id="meal-name" name="label" maxlength="120" required value="'+escapeHTML(first?.label||'')+
      '" placeholder="Ex.: arroz, feijão e frango" /></div>'+
      '<div class="field-row mt-12"><div class="field"><label for="meal-quantity">Quantidade aproximada</label>'+
      '<input id="meal-quantity" type="number" name="quantity" inputmode="decimal" min="0.001" max="10000" step="any" required value="'+
      escapeHTML(first?.quantity??1)+'" /></div>'+
      '<div class="field"><label for="meal-unit">Unidade</label><select id="meal-unit" name="unit">'+
      option(units,first?.unit||'portion')+'</select></div></div>'+
      '<div class="field mt-12"><label for="meal-grams">Peso equivalente em gramas (opcional)</label>'+
      '<input id="meal-grams" type="number" name="grams" inputmode="decimal" min="0.001" max="10000" step="any" value="'+
      escapeHTML(first?.grams??'')+'" placeholder="Se souber o peso da porção" /></div>'+
      '<details class="nutrition-details"><summary>Informações nutricionais do rótulo (opcional)</summary>'+
      '<p class="small muted">Digite apenas valores conferidos por 100 g. Sem valores informados, a FORJA não calcula calorias nem proteínas.</p>'+
      '<div class="field-row">'+entryFields+'</div></details>'+
      '<div class="btnrow mt-12"><button type="submit" class="primary">'+(edit?'Salvar alteração':'Salvar refeição')+'</button>'+
      (edit?'<button type="button" class="secondary" data-action="nutrition-cancel-edit">Cancelar edição</button>':'')+
      '</div></form>'+
      '<div class="section-row"><h2 class="section-title">Histórico alimentar</h2><small>'+rows.length+' registros</small></div>'+
      (visible||'<div class="empty">Ainda não há refeições registradas. Você pode começar pelo alimento ou preparação que consumiu hoje.</div>')+
      (rows.length>limit?'<button type="button" class="secondary full mt-12" data-action="nutrition-more">Ver mais refeições</button>':'')+
      '<p class="small muted mt-12">O histórico fica neste aparelho e participa do backup JSON. Não é sincronizado com outros dispositivos.</p></div>';
  }

  function fromForm(form,existing=null) {
    const fd=new FormData(form);
    const val=key=>String(fd.get(key)??'').trim();
    const num=key=>val(key)===''?null:Number(val(key).replace(',','.'));
    const quantity=num('quantity'),unit=val('unit');
    const grams=unit==='g'?quantity:num('grams');
    const nutrientValues=Object.fromEntries(nutrients.map(([key])=>[key,num(key)]));
    const anyNutrient=nutrients.some(([key])=>nutrientValues[key]!==null);
    const item={
      id:existing?.items?.[0]?.id||newId('item'),
      foodId:existing?.items?.[0]?.foodId||null,label:val('label'),quantity,
      unit,grams,
      nutrientsPer100g:nutrientValues,
      source:anyNutrient?{name:'Rótulo informado manualmente',reference:'Dados conferidos pelo usuário'}:null,
    };
    const entry={
      id:existing?.id||newId('meal'),date:val('date'),mealType:val('mealType'),
      time:existing?.time||null,notes:existing?.notes||'',items:[item],
    };
    if(!N.validEntry(entry))return {error:'Revise a quantidade, a data e os valores preenchidos.'};
    return {entry};
  }
  function newId(prefix) {
    if(typeof root.crypto?.randomUUID==='function')return prefix+'-'+root.crypto.randomUUID();
    return prefix+'-'+Date.now()+'-'+Math.random().toString(36).slice(2,12);
  }
  const api={render,fromForm,newId};
  root.ForjaNutritionUI=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
