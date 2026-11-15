/* Local meal diary. No personal profile or meals shipped in this file. */
(function(root){
  'use strict';
  const N=root.ForjaNutrition,CAT=root.ForjaNutritionCatalog;
  const G=root.ForjaNutritionGoals||(typeof require==='function'?require('./nutrition-goals.js'):null);
  const BODY=root.ForjaBodyMeasures||(typeof require==='function'?require('./body-measures.js'):null);
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
  function ring(key,value,target){
    const pct=value!=null&&target>0?Math.min(100,value/target*100):0;
    return button('goals',`<span class="nd-ring" style="--progress:${pct}%;--ring-color:var(--${{energyKcal:'lime',proteinG:'red',carbsG:'blue',fatG:'orange',fiberG:'lime'}[key]})"><span><strong>${fmt(value)}</strong><small>/ ${fmt(target)} ${key==='energyKcal'?'kcal':'g'}</small></span></span><span class="nd-ring-description">${nutrients[key]}${key==='energyKcal'?'':`<small class="nd-ring-readable-total" aria-hidden="true">${fmt(value)} / ${fmt(target)} g</small>`}</span>`, `aria-label="${nutrients[key]}: ${fmt(value)} de ${fmt(target)} ${key==='energyKcal'?'kcal':'gramas'}. Ver metas"`,'nd-ring-button');
  }
  function entryHTML(e){
    const total=N.observedTotals([e],e.date).totals.energyKcal;
    const estimate=N.estimatedTotals([e],e.date);
    return `<details class="nd-entry"><summary><span>${esc(e.items.slice(0,3).map(i=>i.label).join(' · '))}${e.items.length>3?' · +'+(e.items.length-3):''}</span><small>${fmt(total)} kcal · ${e.items.length} alimento(s)</small></summary><ul class="mini-list">${e.items.map(i=>`<li><span>${esc(i.label)}<br>${fmt(i.quantity)} ${esc(units[i.unit])}${i.grams!=null?' · '+fmt(i.grams)+' g':''}<br><small>${esc(i.source?.name||'Composição não informada')}</small></span></li>`).join('')}</ul>
    ${estimate.estimatedItems?`<p class="callout warn">Estimativa de confiança baixa: ${fmt(estimate.totals.central.energyKcal)} kcal (faixa ${fmt(estimate.totals.low.energyKcal)}–${fmt(estimate.totals.high.energyKcal)}). Separada dos gráficos; não representa todas as refeições do dia.</p><details><summary>Como foi estimado</summary>${e.items.filter(i=>i.estimate).map(i=>`<p class="small">${esc(i.estimate.assumptions)}</p>`).join('')}</details>`:''}
    <div class="btnrow mt-12">${button('edit','Editar',`data-id="${esc(e.id)}"`)}${button('repeat','Repetir nesta data',`data-id="${esc(e.id)}"`)}${button('favorite','Salvar favorito',`data-id="${esc(e.id)}"`)}${button('delete','Excluir',`data-id="${esc(e.id)}"`,'ghost')}</div></details>`;
  }
  function render({archive,date,limit=3,state={}}){
    const totals=N.observedTotals(archive.entries,date),target=G.active(archive.settings,date);
    const daily=archive.entries.filter(e=>e.date===date);
    const days=[...new Set(archive.entries.filter(e=>e.date!==date).map(e=>e.date))].sort().reverse();
    const context=G.context(state,date);
    return `<div class="nutrition-screen"><div class="row-between"><div><p class="eyebrow">SEU DIÁRIO</p><h1 class="page-title">Alimentação.</h1></div>${button('goals','Minhas metas','','ghost')}</div>
      <div class="nd-date">${button('previous','‹','aria-label="Dia anterior"')}<div class="field"><label for="nd-date">${new Date(date+'T12:00:00').toLocaleDateString('pt-BR',{weekday:'long'})}</label><input id="nd-date" type="date" value="${date}" aria-label="Data do diário"></div>${button('next','›','aria-label="Próximo dia"')}</div><div class="nd-date-footer">${button('today','Hoje','','button-inline')}<span>${daily.length} registro(s)</span></div>
      <section class="card nd-summary" aria-label="Consumo registrado e metas"><div class="nd-energy">${ring('energyKcal',totals.totals.energyKcal,target?.values.energyKcal)}<div><strong>Energia registrada</strong><p class="small muted">${target?'Meta '+({manual:'ajustada por você',suggested:'sugerida e aceita',professional:'informada por profissional'}[target.source]):'Configure seu perfil ou informe suas metas.'}</p>${button('goals',target?'Rever metas':'Configurar metas','','button-inline')}</div></div><div class="nd-macros">${G.KEYS.slice(1).map(k=>ring(k,totals.totals[k],target?.values[k])).join('')}</div>
      <p class="small muted">Somente alimentos registrados. Traço = dados insuficientes. Não representa o consumo total do dia.</p></section>
      ${archive.draft?`<div class="callout">Há um rascunho de refeição salvo. ${button('resume','Continuar rascunho','','button-inline')}</div>`:''}
      ${button('add','+ Registrar refeição','data-meal="lunch"','primary full')}
      <div class="nd-meals mt-16">${Object.entries(labels).filter(([type])=>type!=='other'||daily.some(e=>e.mealType==='other')).map(([type,label])=>{
        const rows=daily.filter(e=>e.mealType===type),total=N.observedTotals(rows,date).totals.energyKcal;
        return `<section class="card nd-meal"><div class="row-between"><div><h2 class="section-title">${label}</h2><p class="small muted mb-0">${rows.length?fmt(total)+' kcal registradas':'Sem registros'}</p></div>${button('add','+',`data-meal="${type}" aria-label="Adicionar ao ${label}"`,'nd-add')}</div>${rows.slice(0,3).map(entryHTML).join('')}${rows.length>3?`<details><summary>Ver todos (${rows.length})</summary>${rows.slice(3).map(entryHTML).join('')}</details>`:''}</section>`;
      }).join('')}</div>
      ${!archive.entries.length?'<p class="small muted">Ainda não há refeições registradas. Comece pelo que consumiu hoje.</p>':''}
      <details class="card"><summary>Treino, objetivo e acompanhamento</summary><p class="small">${context.strength} sessão(ões) de força e ${context.muay} de Muay registradas nesta data. Últimos 7 dias: ${context.weeklyStrength} de força e ${context.weeklyMuay} de Muay.</p>
      <p class="small">${context.strength&&context.muay?'Dia com duas modalidades: organize fontes de carboidratos nas refeições próximas aos treinos, conforme tolerância.':context.strength||context.muay?'Distribua fontes de proteína nas refeições e considere carboidratos para sustentar o treino.':'Sem treino registrado nesta data; isso não significa descanso ou menor necessidade de alimento.'} As metas não mudam automaticamente.</p>
      <p class="small muted">${context.recentWeights} pesagens em 28 dias; ${context.measures} aferições corporais disponíveis.${context.weightChange!=null?' Variação entre primeira e última pesagem: '+fmt(context.weightChange)+' kg.':''} ${context.abdomenChange!=null?' Variação de abdômen no umbigo: '+fmt(context.abdomenChange)+' cm.':''} Medidas e força não comprovam mudança de gordura ou músculo. Revise tendências de 2–4 semanas, recuperação e qualidade dos registros antes de ajustar metas.</p>${context.abdomenChange!=null&&context.abdomenChange<0&&context.weightChange!=null&&Math.abs(context.weightChange)<1?'<p class="small">Peso pouco alterado e medida abdominal menor: confira técnica de aferição, desempenho e tendência antes de reduzir energia apenas pela balança. Isso não prova recomposição.</p>':''}${button('goals','Rever sugestão','','button-inline')}<p class="small"><a href="https://pubmed.ncbi.nlm.nih.gov/26920240/" target="_blank" rel="noopener">Base: nutrição e desempenho (AND/DC/ACSM)</a></p></details>
      <details class="card" id="nd-history"><summary>Histórico alimentar · ${days.length} outros dias</summary>${days.slice(0,limit).map(d=>`<details class="nd-entry"><summary>${dateBR(d)}</summary>${button('day','Abrir dia',`data-date="${d}"`)}${archive.entries.filter(e=>e.date===d).map(entryHTML).join('')}</details>`).join('')}${days.length>limit?button('more','Ver mais dias'):''}</details>
      <p class="small muted">Dados neste aparelho, incluídos no backup JSON.</p></div>`;
  }
  function controller({get,commit,notify,today,refresh}){
    let day=today(),limit=3,dialog=null,returnFocus=null,draft=null,picked=null,search='',mode='recent',all=false,profileDraft=null,suggestion=null;
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
      picked=null;search='';all=false;mode='recent';openModal(entry&&!repeat?'Editar refeição':'Registrar refeição');mealBody();saveDraft();
    }
    function mealBody(){
      const e=draft.entry;
      dialog.querySelector('#nd-dialog-body').innerHTML=`<form id="nd-meal"><div class="field-row">${field('mealDate','Data',e.date,`type="date" max="${today()}" required`)}${select('mealType','Refeição',labels,e.mealType)}</div><div id="nd-items">${e.items.map((i,index)=>`<div class="nd-item"><strong>${esc(i.label)}</strong><div class="field-row">${field('qty-'+index,'Quantidade ('+esc(units[i.unit])+')',i.quantity,`type="number" inputmode="decimal" min="0.001" max="10000" step="any" data-index="${index}" required`)}${button('remove','Retirar',`data-index="${index}"`,'ghost')}</div><small class="muted">${i.grams!=null?fmt(i.grams)+' g · ':''}${esc(i.source?.name||'Sem composição conhecida')}${i.estimate?' · confiança baixa':''}</small><details><summary>Composição e fonte</summary><p class="small">${esc(i.source?.reference||'Valores não informados')}${i.estimate?' · '+esc(i.estimate.assumptions):''}</p><div class="field-row">${!i.estimate?G.KEYS.map(k=>field('item-'+index+'-'+k,nutrients[k]+' / '+(i.nutrientsPerServing?'porção':'100 g'),(i.nutrientsPerServing||i.nutrientsPer100g)[k],`type="number" min="0" max="${k==='energyKcal'?1200:100}" step="any" data-nutrient="${k}" data-index="${index}"`)).join(''):'Estimativa preservada. Ajuste a quantidade ou substitua o alimento.'}</div></details></div>`).join('')||'<p class="small muted">Escolha alimentos abaixo para montar sua refeição.</p>'}</div>
      <p id="nd-preview" class="small" aria-live="polite"></p><details><summary>Horário e observações</summary>${field('time','Horário',e.time,'type="time"')}${field('notes','Observações',e.notes,'maxlength="500"')}</details><div class="nd-save"><button class="primary full" type="submit">Salvar refeição</button></div></form>
      <section class="mt-16"><h3>Adicionar alimentos</h3><div class="btnrow">${button('mode','Recentes','data-mode="recent"')}${button('mode','Favoritos','data-mode="favorites"')}${button('mode','Buscar','data-mode="search"')}</div><div class="field mt-12"><label for="nd-search">Buscar alimentos e produtos</label><input id="nd-search" type="search" value="${esc(search)}" placeholder="Nome, produto ou ingrediente"></div><div id="nd-results"></div><div id="nd-portion"></div></section>
      <details class="mt-16"><summary>Adicionar manualmente / rótulo</summary><form id="nd-manual">${field('label','Alimento ou preparação','','maxlength="120" required')}<div class="field-row">${field('quantity','Quantidade',1,'type="number" min="0.001" max="10000" step="any" required')}${select('unit','Unidade',units,'portion')}</div>${field('grams','Peso total equivalente em g (opcional)','','type="number" min="0.001" max="10000" step="any"')}<details><summary>Informações nutricionais do rótulo</summary>${select('basis','Valores informados por',{'100g':'100 g',serving:'uma porção'},'100g')}<p class="small muted">Por porção: use unidade porção; não converta ml em g. Campos vazios ficam desconhecidos.</p><div class="field-row">${G.KEYS.map(k=>field(k,nutrients[k]+(k==='energyKcal'?' (kcal)':' (g)'),' ',`type="number" min="0" max="${k==='energyKcal'?1200:100}" step="any"`)).join('')}</div></details><button type="submit" class="secondary full mt-12">Adicionar à refeição</button></form></details>${button('discard','Descartar rascunho','','ghost full mt-16')}`;
      results();portion();preview();
      for(const [name,value] of Object.entries(draft.pending||{})){const input=dialog.querySelector('#nd-manual')?.elements.namedItem(name);if(input)input.value=value;}
    }
    function preview(){if(!draft)return;const e=draft.entry;const el=dialog.querySelector('#nd-preview');if(el)el.textContent=N.validEntry(e)?'Prévia: '+fmt(N.observedTotals([e],e.date).totals.energyKcal)+' kcal · traço indica dados incompletos.':'Adicione ao menos um alimento com quantidade válida.';}
    function results(){
      let rows=[];
      if(mode==='favorites'&&!search)rows=archive().mealTemplates.map(f=>button('use-favorite',esc(f.name),`data-id="${esc(f.id)}"`,'nd-result'));
      else if(mode==='recent'&&!search){
        const seen=new Set();rows=archive().entries.slice().reverse().flatMap(e=>e.items.map(i=>({i,e}))).filter(({i})=>{const key=i.foodId||i.label;if(seen.has(key))return false;seen.add(key);return true;}).map(({i,e})=>button('recent',esc(i.label),`data-entry="${esc(e.id)}" data-id="${esc(i.id)}"`,'nd-result'));
      }else rows=CAT.search(search).map(f=>button('pick',`${esc(f.name)}<small>${esc(f.category)}${f.estimate?' · estimativa':''}</small>`,`data-id="${esc(f.id)}"`,'nd-result'));
      dialog.querySelector('#nd-results').innerHTML=(all?rows:rows.slice(0,6)).join('')||'<p class="small muted">Nenhum item aqui. Use Buscar ou adicione manualmente.</p>';
      if(!all&&rows.length>6)dialog.querySelector('#nd-results').innerHTML+=button('all','Ver mais alimentos');
    }
    function portion(){
      const food=CAT.find(picked),el=dialog.querySelector('#nd-portion');
      el.innerHTML=food?`<form id="nd-catalog" class="panel-soft mt-12"><strong>${esc(food.name)}</strong><p class="small">${esc(food.note)}</p>${food.estimate?`<p class="small">Faixa aproximada: ${fmt(food.estimate.low.energyKcal)}–${fmt(food.estimate.high.energyKcal)} kcal; confiança baixa.</p>`:''}${select('portion','Porção',Object.fromEntries(food.portions.map(p=>[p.id,p.label]).concat(!food.nutrientsPerServing&&!food.estimate?[['custom','Peso em gramas']]:[])),food.portions[0].id)}${field('count','Quantidade de porções (ou gramas)',1,'type="number" min="0.001" max="10000" step="any" required')}<button class="secondary full mt-12" type="submit">Adicionar à refeição</button></form>`:'';
    }
    function addItems(items){if(draft.entry.items.length+items.length>30)return error('Limite de 30 alimentos por refeição.');draft.entry.items.push(...items);saveDraft();picked=null;mealBody();}
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
      ${select('goal','Objetivo',{recomposition:'Recomposição corporal',loss:'Redução de gordura',maintain:'Manutenção',gain:'Ganho gradual'},p.goal)}
      ${select('activity','Atividade habitual, incluindo treinos',{'':'Selecione','1.2':'Pouca atividade (1,2)','1.375':'Atividade leve (1,375)','1.55':'Atividade moderada (1,55)','1.725':'Atividade alta (1,725)','1.9':'Atividade muito alta (1,9)'},p.activity??'')}
      <p class="small muted">Considere trabalho, deslocamentos e frequência/duração dos treinos. Fatores são aproximações; não escolha apenas pela modalidade. Não somamos calorias de exercícios novamente.</p>
      <label class="nd-check"><input type="checkbox" name="adultScope" ${p.adultScope?'checked':''}> Sou adulto e não tenho necessidade clínica específica que exija um plano alimentar individual. Caso contrário, usarei metas profissionais.</label>
      <p class="small muted">Última confirmação: ${dateBR(p.confirmedAt)}. Idade não avança automaticamente; confira ao revisar.</p>
      <p class="small muted">${circumference?'Circunferências registradas em '+dateBR(circumference.date)+'. ':''}${wearable?'Galaxy Watch: última leitura em '+dateBR(wearable.date)+'. ':''}Medidas corporais e bioimpedância auxiliam a avaliar tendências, mas não substituem o cálculo de gasto nem determinam calorias automaticamente.</p>
      <div class="btnrow"><button type="submit" class="primary">Salvar perfil e calcular</button>${button('suggest','Recalcular prévia','','secondary')}</div></form>
      <section id="nd-suggestion" aria-live="polite" class="nd-suggestion-slot"></section>
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
    function submit(event){event.preventDefault();const form=event.target,f=new FormData(form);
      if(form.id==='nd-meal'){
        if(draft.pending&&Object.values(draft.pending).some(v=>String(v).trim()))return error('Há um alimento manual em preenchimento. Adicione-o à refeição antes de salvar ou limpe os campos preenchidos.');
        draft.entry.date=f.get('mealDate');draft.entry.mealType=f.get('mealType');draft.entry.time=f.get('time')||null;draft.entry.notes=f.get('notes')||'';
        if(!N.validEntry(draft.entry)||draft.entry.date>today())return error('Revise a data, as quantidades e adicione pelo menos um alimento.');
        if(draft.editId&&!archive().entries.some(e=>e.id===draft.editId))return error('Registro original não encontrado.');
        if(transact(a=>{a.entries=draft.editId?a.entries.map(e=>e.id===draft.editId?clone(draft.entry):e):[...a.entries,clone(draft.entry)];delete a.draft;})){day=draft.entry.date;close(true);refresh();notify('Refeição salva neste aparelho.');}else error('Não foi possível salvar. O formulário foi preservado.');
      }else if(form.id==='nd-catalog'){const item=CAT.makeItem(picked,f.get('portion'),num(f.get('count')),id);if(!item)return error('Revise a porção.');addItems([item]);
      }else if(form.id==='nd-manual'){
        const n=Object.fromEntries(G.KEYS.map(k=>[k,num(f.get(k))]));const serving=f.get('basis')==='serving';
        if(serving&&f.get('unit')!=='portion')return error('Para valores por porção, selecione a unidade porção.');
        const item={id:id('item'),foodId:null,label:String(f.get('label')).trim(),quantity:num(f.get('quantity')),unit:f.get('unit'),grams:num(f.get('grams')),nutrientsPer100g:serving?Object.fromEntries(G.KEYS.map(k=>[k,null])):n,source:G.KEYS.some(k=>n[k]!=null)?{name:'Rótulo informado manualmente',reference:'Valores conferidos pelo usuário'}:null,...(serving?{nutrientsPerServing:n}:{})};
        if(!N.validEntry({...draft.entry,items:[item]}))return error('Revise quantidade e composição.');delete draft.pending;addItems([item]);
      }else if(form.id==='nd-profile'){
        const p=readProfile();if(!G.validProfile(p))return error('Revise altura (100–250 cm), idade adulta inteira (18–100), peso (30–350 kg) e atividade. Campos podem ficar vazios para metas manuais.');
        if(transact(a=>{a.settings.profile=p;})){profileDraft=p;previewSuggestion(true);notify('Perfil salvo. Confira a sugestão e aceite se desejar.');}else error('Perfil não salvo. Tente novamente.');
      }else if(form.id==='nd-target'){saveTarget({id:id('target'),from:f.get('from'),source:f.get('source'),values:values(),profile:archive().settings.profile||null,formula:'manual-v1'});}
    }
    function input(event){const el=event.target;
      if(draft&&el.closest('#nd-manual')){draft.pending=draft.pending||{};draft.pending[el.name]=el.value;if(Object.values(draft.pending).every(v=>!String(v).trim()))delete draft.pending;saveDraft();}
      if(el.id==='nd-search'){search=el.value;all=false;results();return;}
      if(el.closest('#nd-profile'))previewSuggestion(false);
      if(el.closest('#nd-target'))macroDiff();
      if(!draft)return;
      if(el.dataset.index!==undefined){const i=draft.entry.items[Number(el.dataset.index)];if(!i)return;
        if(el.dataset.nutrient){const n=i.nutrientsPerServing||i.nutrientsPer100g;n[el.dataset.nutrient]=num(el.value);i.source={name:'Rótulo informado manualmente',reference:'Composição revisada pelo usuário'};}
        else {const q=num(el.value);if(q>0&&Number.isFinite(q)){if(i.grams!=null&&i.unit!=='g')i.grams=i.grams*q/i.quantity;if(i.unit==='g'&&i.grams!=null)i.grams=q;i.quantity=q;}}
      }
      if(el.name==='mealDate')draft.entry.date=el.value;
      if(el.name==='mealType')draft.entry.mealType=el.value;
      if(el.name==='time')draft.entry.time=el.value||null;
      if(el.name==='notes')draft.entry.notes=el.value;
      if(el.closest('#nd-meal')){preview();if(N.validDraft(draft))saveDraft();}
    }
    function change(e){if(e.target.tagName==='SELECT'||e.target.type==='date')input(e);}
    function modalClick(event){const b=event.target.closest('[data-nd]');if(!b)return;const a=b.dataset.nd;
      if(a==='close')return close();
      if(a==='mode'){mode=b.dataset.mode;search='';all=false;dialog.querySelector('#nd-search').value='';results();}
      if(a==='all'){all=true;results();}
      if(a==='pick'){picked=b.dataset.id;portion();dialog.querySelector('#nd-portion').scrollIntoView({block:'nearest'});}
      if(a==='remove'){draft.entry.items.splice(Number(b.dataset.index),1);saveDraft();mealBody();}
      if(a==='recent'){const item=archive().entries.find(e=>e.id===b.dataset.entry)?.items.find(i=>i.id===b.dataset.id);if(item)addItems([{...clone(item),id:id('item')}]);}
      if(a==='use-favorite'){const f=archive().mealTemplates.find(f=>f.id===b.dataset.id),e=f&&CAT.fromFavorite(f,draft.entry.date,archive(),id);if(e)addItems(e.items);else error('Favorito incompatível.');}
      if(a==='discard'&&confirm('Descartar este rascunho? O registro original não será alterado.')){if(transact(a=>{delete a.draft;})){close(true);refresh();}else error('Não foi possível descartar.');}
      if(a==='use-weight'){const w=(get().weights||[]).filter(w=>!w.initial).sort((a,b)=>b.date.localeCompare(a.date))[0];if(w){dialog.querySelector('#nd-weightKg').value=w.weight;previewSuggestion(false);}}
      if(a==='suggest'){profileDraft=readProfile();previewSuggestion(true);}
      if(a==='accept'&&suggestion?.values){saveTarget({id:id('target'),from:today(),source:'suggested',values:suggestion.values,profile:profileDraft,formula:suggestion.formula});}
      if(a==='balance'){const v=values();if([v.energyKcal,v.proteinG,v.fatG].some(x=>x==null||!Number.isFinite(x)))return error('Preencha energia, proteína e gordura.');const carbs=Math.round((v.energyKcal-4*v.proteinG-9*v.fatG)/4);if(carbs<=0)return error('Energia insuficiente para esses macros. Revise as metas.');dialog.querySelector('#nd-target-carbsG').value=carbs;macroDiff();}
    }
    function action(b){const a=b.dataset.nd;
      if(a==='goals')return goals();
      if(a==='add')return start(b.dataset.meal||'lunch');
      if(a==='resume'){draft=clone(archive().draft);if(!draft)return;openModal('Continuar refeição');mealBody();return;}
      if(a==='previous'||a==='next'){const d=new Date(day+'T12:00:00');d.setDate(d.getDate()+(a==='next'?1:-1));day=[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');}
      if(a==='today')day=today();if(a==='day')day=b.dataset.date;
      if(a==='more')limit+=5;
      const e=archive().entries.find(e=>e.id===b.dataset.id);
      if(a==='edit'&&e)return start(e.mealType,e);
      if(a==='repeat'&&e)return start(e.mealType,e,true);
      if(a==='delete'&&e&&confirm('Excluir '+labels[e.mealType]+' de '+dateBR(e.date)+'?')){if(!transact(x=>{x.entries=x.entries.filter(v=>v.id!==e.id);}))return;}
      if(a==='favorite'&&e){const f=CAT.makeFavorite(e,archive(),'',id);if(!f)return notify('Não foi possível criar favorito.');if(!transact(x=>{x.foods.push(...f.foodsToAdd);x.mealTemplates.push(f.favorite);} ))return;notify('Favorito salvo.');}
      const scroll=window.scrollY;refresh();window.scrollTo(0,scroll);if(a==='more')document.querySelector('#nd-history').open=true;
    }
    return {render:()=>render({archive:archive(),date:day,limit,state:get()}),goals,
      mount(){const screen=document.querySelector('.nutrition-screen');if(!screen)return;
        screen.addEventListener('click',e=>{const b=e.target.closest('[data-nd]');if(b){e.stopPropagation();action(b);}});
        screen.querySelector('#nd-date').addEventListener('change',e=>{if(N.dateOk(e.target.value)){day=e.target.value;refresh();}});
      }};
  }
  const api={render,controller,newId:id};root.ForjaNutritionUI=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
