/* FORJA nutrition UI: a no-cost, offline, manual-first meal diary. */
(function installNutritionUI(root) {
  'use strict';
  const N = root.ForjaNutrition;
  const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const labels = {breakfast:'Café da manhã',lunch:'Almoço',snack:'Lanche',dinner:'Jantar',other:'Outra refeição'};
  const units = {g:'g',ml:'ml',unit:'unidade(s)',spoon:'colher(es)',ladle:'concha(s)',portion:'porção(ões)'};
  const nutrients = [['energyKcal','Energia (kcal)'],['proteinG','Proteínas (g)'],['carbsG','Carboidratos (g)'],['fatG','Gorduras (g)']];
  const fmt = n => new Intl.NumberFormat('pt-BR',{maximumFractionDigits:1}).format(n);
  const option = (values,current) => Object.entries(values).map(pair =>
    '<option value="'+escapeHTML(pair[0])+'"'+(pair[0]===current?' selected':'')+'>'+escapeHTML(pair[1])+'</option>').join('');
  const dateBR = value => /^\\d{4}-\\d{2}-\\d{2}$/.test(value) ?
    value.slice(8,10)+'/'+value.slice(5,7)+'/'+value.slice(0,4) : 'Sem data';
  function render({archive,date,editId=null,limit=3}) {
    const rows=(archive?.entries||[]).slice().sort((a,b)=>b.date.localeCompare(a.date)||b.id.localeCompare(a.id));
    const edit=rows.find(row=>row.id===editId && row.items.length===1)||null;
    const first=edit?.items[0], summary=N.observedTotals(archive.entries,date);
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
        (item.grams != null?' · '+escapeHTML(fmt(item.grams))+' g':'')+'</small></li>').join('');
      return '<details class="card nutrition-entry"><summary><strong>'+escapeHTML(labels[entry.mealType])+
        ' · '+dateBR(entry.date)+'</strong><small>'+escapeHTML(entry.items.map(x=>x.label).join(', '))+
        '</small></summary><div class="mt-12"><ul class="mini-list">'+items+
        '</ul><div class="btnrow mt-12"><button type="button" class="secondary" data-action="nutrition-repeat" data-id="'+escapeHTML(entry.id)+'">Repetir hoje</button>'+
        (entry.items.length===1?'<button type="button" class="secondary" data-action="nutrition-edit" data-id="'+escapeHTML(entry.id)+'">Editar</button>':'')+
        '<button type="button" class="ghost" data-action="nutrition-delete" data-id="'+escapeHTML(entry.id)+'">Excluir</button></div></div></details>';
    }).join('');
    return '<div class="nutrition-screen">'+
      '<button type="button" class="button-inline" data-action="nutrition-back">‹ Voltar à evolução</button>'+
      '<p class="eyebrow">Treino + alimentação</p><h1 class="page-title">Alimentação.</h1>'+
      '<p class="lead">Registre o que você realmente consumiu. Nenhuma refeição é presumida e o registro não exige contar calorias.</p>'+
      '<section class="card"><div class="row-between"><h2 class="section-title">Registros de '+dateBR(date)+'</h2><span class="pill">'+summary.mealsRecorded+' refeição(ões)</span></div>'+
      '<div class="kpi-row nutrition-summary">'+metrics+'</div>'+
      '<p class="small muted">Valores apenas dos alimentos informados com quantidade em gramas e composição conhecida. Um traço indica informação insuficiente. Não representa o consumo total do dia.</p></section>'+
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
