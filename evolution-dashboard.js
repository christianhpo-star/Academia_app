/* FORJA evolution: a mobile-first weight and nutrition dashboard, based solely on
 * the local archive. Never import reference-image data into a user's diary.
 */
(function installForjaEvolution(root){
  'use strict';
  const N=root.ForjaNutrition||(typeof require==='function'?require('./nutrition.js'):null);
  const G=root.ForjaNutritionGoals||(typeof require==='function'?require('./nutrition-goals.js'):null);
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=(value,digits=1)=>value==null||!Number.isFinite(value)?'—':new Intl.NumberFormat('pt-BR',{maximumFractionDigits:digits}).format(value);
  const stamp=day=>day&&N.dateOk(day)?day.slice(8,10)+'/'+day.slice(5,7):'—';
  const toUTC=day=>Date.parse(day+'T12:00:00Z');
  function moveDate(day,delta){
    if(!N.dateOk(day))return null;
    const d=new Date(toUTC(day));d.setUTCDate(d.getUTCDate()+delta);
    return d.toISOString().slice(0,10);
  }
  function periodDays(days){return [7,30,90].includes(Number(days))?Number(days):7;}
  function periodButtons(kind,selected){
    return '<div class="evo-periods" role="group" aria-label="Período do gráfico">'+
      [7,30,90].map(days=>'<button type="button" data-action="evo-period" data-kind="'+kind+
      '" data-days="'+days+'" class="'+(selected===days?'is-selected':'')+
      '" aria-pressed="'+(selected===days?'true':'false')+'">'+days+' dias</button>').join('')+'</div>';
  }
  function cleanWeights(state,endDay){
    const weightEntries=(state?.weights||[]).filter(r=>r&&N.dateOk(r.date)&&r.date<=endDay&&
      Number.isFinite(Number(r.weight))&&Number(r.weight)>=30&&Number(r.weight)<=350);
    const map=new Map();
    for(const row of weightEntries.slice().sort((a,b)=>a.date.localeCompare(b.date))){
      if(!map.has(row.date)||(!row.initial))map.set(row.date,{date:row.date,weight:Number(row.weight),initial:!!row.initial});
    }
    return [...map.values()].sort((a,b)=>a.date.localeCompare(b.date));
  }
  function weightModel(state,endDay,limit=8){
    const all=cleanWeights(state,endDay);
    const known=all.filter(x=>!x.initial),latest=known.at(-1)||all.at(-1)||null;
    const initial=Number(state?.settings?.startWeight);
    const desired=Number(state?.settings?.targetWeight);
    return {all,latest,initial:Number.isFinite(initial)&&initial>=30?initial:null,
      desired:Number.isFinite(desired)&&desired>=30?desired:null,
      history:all.slice().reverse().slice(0,Math.min(100,Math.max(1,limit))),
      hasUserWeighing:known.length>0};
  }
  function weightSVG(model){
    const all=model.all,period=all.slice(-30),reference=model.desired;
    if(!period.length)return '<p class="evo-empty">Nenhuma pesagem disponível. Registre seu peso para iniciar a curva.</p>';
    const values=period.map(x=>x.weight).concat(reference!=null?[reference]:[]);
    const realMin=Math.min(...values),realMax=Math.max(...values);
    const middle=(realMin+realMax)/2;
    const spread=Math.max(7,realMax-realMin+2);
    const bottom=middle-spread/2,top=middle+spread/2;
    const y=v=>Number((187-(v-bottom)/spread*148).toFixed(2));
    const first=toUTC(period[0].date),span=Math.max(1,toUTC(period.at(-1).date)-first);
    const x=d=>period.length===1?184:Number((43+(toUTC(d)-first)/span*305).toFixed(2));
    const coords=period.map(r=>({x:x(r.date),y:y(r.weight),r}));
    const path=coords.length>1?'M '+coords.map((p,i)=>{
      if(i===0)return p.x+' '+p.y;
      const prev=coords[i-1],next=coords[i+1]||p,prior=coords[i-2]||prev;
      const startX=prev.x+(p.x-prior.x)/6,endX=p.x-(next.x-prev.x)/6;
      const startY=prev.y+(p.y-prior.y)/6,endY=p.y-(next.y-prev.y)/6;
      return 'C '+startX.toFixed(1)+' '+startY.toFixed(1)+' '+endX.toFixed(1)+' '+endY.toFixed(1)+' '+p.x+' '+p.y;
    }).join(' '):'';
    const ticks=[0,1,2,3,4].map(i=>{const value=bottom+spread*i/4;return '<g><line x1="39" x2="351" y1="'+y(value)+'" y2="'+y(value)+'" stroke="#344658" stroke-width="1"/>'+
      '<text x="34" y="'+(y(value)+4)+'" fill="#B0C0D0" font-size="10" text-anchor="end">'+esc(fmt(value,0))+'</text></g>';}).join('');
    const goal=reference!=null&&y(reference)>=20&&y(reference)<=188?'<line x1="43" x2="351" y1="'+y(reference)+'" y2="'+y(reference)+'" stroke="#9DAFC0" stroke-width="1.4" stroke-dasharray="5 4"/>'+
      '<text x="351" y="'+(y(reference)-7)+'" font-size="10" text-anchor="end" fill="#C0D1E0">'+esc(fmt(reference))+' kg</text>':'';
    const labels=[0,Math.floor((coords.length-1)/2),coords.length-1].filter((x,i,a)=>a.indexOf(x)===i).map(index=>'<text x="'+coords[index].x+
      '" y="216" font-size="10" fill="#B0C0D0" text-anchor="'+(index===0?'start':index===coords.length-1?'end':'middle')+'">'+stamp(coords[index].r.date)+'</text>').join('');
    const dots=coords.map(p=>'<circle cx="'+p.x+'" cy="'+p.y+'" r="4.6" stroke="#142334" stroke-width="1.6" fill="#C5F56B"><title>'+stamp(p.r.date)+' · '+fmt(p.r.weight)+' kg'+(p.r.initial?' · referência inicial':'')+'</title></circle>').join('');
    return '<div class="evo-chart"><svg class="evo-plot" viewBox="0 0 372 230" role="img" aria-label="Linha de '+period.length+' pesagens, peso atual '+fmt(model.latest?.weight)+' quilos, objetivo '+fmt(reference)+' quilos">'+
      ticks+goal+(path?'<path d="'+path+'" fill="none" stroke="#C5F56B" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>':'')+
      dots+labels+'</svg></div>';
  }
  const BODY=root.ForjaBodyMeasures||(typeof require==='function'?require('./body-measures.js'):null);
  const E=root.AcademiaEngine||(typeof require==='function'?require('./engine.js'):null);
  const measureDefault='abdomen';
  function measuresModel(state,endDay,measureKey=measureDefault){
    const field=BODY.FIELDS.find(x=>x.id===measureKey)||BODY.FIELDS.find(x=>x.id===measureDefault);
    const all=BODY.recent(state?.bodyMeasurements||[]).filter(r=>r.date<=endDay&&Number.isFinite(r.values?.[field.id]))
      .map(r=>({date:r.date, value:r.values[field.id]})).reverse();
    return {field,all,latest:all.at(-1)||null,previous:all.length>1?all[all.length-2]:null};
  }
  function measureSVG(model){
    const series=model.all.slice(-30);
    if(!series.length)return '<p class="evo-empty">Sem medidas de '+esc(model.field.label.toLowerCase())+'. Registre uma aferição para acompanhar sua evolução.</p>';
    const vals=series.map(x=>x.value),min=Math.min(...vals),max=Math.max(...vals);
    const spread=Math.max(4,max-min+2),bottom=(max+min-spread)/2;
    const y=v=>Number((187-(v-bottom)/spread*148).toFixed(2));
    const first=toUTC(series[0].date),range=Math.max(1,toUTC(series.at(-1).date)-first);
    const x=d=>series.length===1?184:Number((43+(toUTC(d)-first)/range*305).toFixed(2));
    const coordinates=series.map(r=>[x(r.date),y(r.value)]);
    const axes=[0,1,2,3,4].map(i=>{const v=bottom+spread*i/4;return '<g><line x1="39" y1="'+y(v)+'" x2="351" y2="'+y(v)+'" stroke="#344658"/><text x="34" y="'+(y(v)+4)+'" text-anchor="end" font-size="10" fill="#B0C0D0">'+fmt(v,1)+'</text></g>';}).join('');
    const path=series.length>1?'<polyline fill="none" stroke="#C5F56B" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" points="'+
      coordinates.map(p=>p.join(',')).join(' ')+'"/>':'';
    const dots=coordinates.map((p,i)=>'<circle cx="'+p[0]+'" cy="'+p[1]+'" r="4" fill="#C5F56B" stroke="#182636" stroke-width="2"><title>'+
      stamp(series[i].date)+' · '+fmt(series[i].value)+' cm</title></circle>').join('');
    return '<div class="evo-chart"><svg class="evo-plot" viewBox="0 0 372 230" role="img" aria-label="Evolução de '+esc(model.field.label)+
      '. '+series.length+' registros. Última medida: '+fmt(model.latest.value)+' centímetros.">'+axes+path+dots+
      '<text x="43" y="215" font-size="10" fill="#B0C0D0">'+stamp(series[0].date)+'</text>'+
      '<text x="348" y="215" font-size="10" text-anchor="end" fill="#B0C0D0">'+stamp(series.at(-1).date)+'</text></svg></div>';
  }
  function groupVolume(state,endDay,days=30){
    const limit=periodDays(days),from=moveDate(endDay,1-limit);
    const plans=(root.AcademiaData?.plans||[]);
    const titles={A:'Costas e bíceps',B:'Peito e tríceps',C:'Quadríceps',D:'Posteriores e glúteos'};
    const groups=['A','B','C','D'].map(id=>({id,title:plans.find(p=>p.id===id)?.title||titles[id],sets:0,sessions:new Set()}));
    const byId=new Map(groups.map(g=>[g.id,g]));
    const exMap=new Map((state?.exercises||[]).map(e=>[e.id,e.group]));
    for(const session of state?.sessions||[]){
      if(!session?.day||session.day<from||session.day>endDay)continue;
      for(const entry of session.entries||[]){
        const id=exMap.get(entry.id),group=byId.get(id);
        if(!group)continue;
        const count=E.workSets(entry).length;
        if(count){group.sets+=count;group.sessions.add(session.id);}
      }
    }
    return groups.map(g=>({id:g.id,title:g.title,sets:g.sets,sessionCount:g.sessions.size}));
  }
  function renderGroupVolume(state,endDay,days=30){
    const groups=groupVolume(state,endDay,days),max=Math.max(1,...groups.map(g=>g.sets));
    const totals=groups.reduce((sum,g)=>sum+g.sets,0);
    return '<section class="evo-section evo-volume-card" aria-labelledby="evo-volume-title">'+
      '<div class="evo-card-heading"><div><h2 id="evo-volume-title">Treino por grupo</h2><p>Séries efetivas registradas</p></div></div>'+
      '<div class="evo-periods evo-volume-periods" role="group" aria-label="Período do treino">'+
      [7,30,90].map(n=>'<button type="button" data-action="evo-volume-days" data-days="'+n+'" aria-pressed="'+(n===days)+
        '" class="'+(n===days?'is-selected':'')+'">'+n+' dias</button>').join('')+'</div>'+
      '<div class="evo-volume-bars">'+groups.map(g=>
        '<div class="evo-volume-row"><div class="evo-volume-label"><strong>'+esc(g.title)+'</strong><span>'+g.sets+' séries</span></div>'+
        '<div class="evo-volume-track" role="img" aria-label="'+esc(g.title)+': '+g.sets+' séries efetivas em '+days+' dias">'+
        (g.sets?'<span style="width:'+Math.max(2,100*g.sets/max).toFixed(1)+'%"></span>':'')+
        '</div></div>').join('')+'</div>'+
      (!totals?'<p class="evo-empty">Ainda não há séries efetivas registradas nesses '+days+' dias.</p>':'')+
      '<p class="evo-footnote">Agrupamento pela ficha A/B/C/D. Cada barra conta séries com carga e repetições efetivamente registradas; aquecimentos são excluídos. Não representa volume individual de cada músculo nem inclui Muay Thai.</p>'+
      '</section>';
  }
  function renderHeader(state,endDay,view){
    return '<header class="evo-header">'+
      '<p class="eyebrow">ACOMPANHAMENTO</p><h1 class="page-title">Sua evolução.</h1>'+
      '<p class="evo-subhead">Corpo, alimentação e treinos em perspectiva.</p>'+
      '<div class="evo-tabs" role="tablist" aria-label="Acompanhamento de evolução">'+
      ['weight','nutrition'].map(v=>'<button id="evo-tab-'+v+'" type="button" role="tab" aria-selected="'+(v===view?'true':'false')+
        '" aria-controls="evo-panel-'+v+'" data-action="evo-view" data-view="'+v+'" class="'+(v===view?'is-selected':'')+'">'+
        (v==='weight'?'Corpo':'Nutrição')+'</button>').join('')+'</div></header>';
  }
  function renderWeight(state,day,limit,opts={}){
    const model=weightModel(state,day,limit),chartMode=opts.chartMode==='measures'?'measures':'weight';
    const metric=measuresModel(state,day,opts.measureKey||measureDefault);
    const line=chartMode==='weight'?weightSVG(model):measureSVG(metric);
    const chartTitle=chartMode==='weight'?'Histórico de peso':metric.field.label;
    return '<section id="evo-panel-weight" class="evo-pane" role="tabpanel" aria-labelledby="evo-tab-weight">'+
      '<div class="evo-weight-kpis"><div><strong>'+fmt(model.initial)+'<small>kg</small></strong><span>Peso inicial</span></div>'+
      '<div><strong>'+fmt(model.latest?.weight)+'<small>kg</small></strong><span>Peso atual</span></div>'+
      '<div><strong>'+fmt(model.desired)+'<small>kg</small></strong><span>Peso desejado</span></div></div>'+
      '<button type="button" class="evo-cta" data-action="evo-add-weight">Adicionar uma pesagem</button>'+
      '<section class="evo-section evo-body-chart" aria-labelledby="evo-weight-heading">'+
      '<div class="evo-card-heading"><div><h2 id="evo-weight-heading">Evolução corporal</h2><p>'+esc(chartTitle)+'</p></div>'+
      '<div class="evo-chart-selector" role="group" aria-label="Tipo do gráfico">'+
      ['weight','measures'].map(v=>'<button type="button" data-action="evo-chart-mode" data-mode="'+v+
        '" aria-pressed="'+(v===chartMode)+'" class="'+(v===chartMode?'is-selected':'')+'">'+(v==='weight'?'Peso':'Medidas')+'</button>').join('')+
      '</div></div>'+
      (chartMode==='measures'?'<div class="evo-measure-picker"><label for="evo-measure-field">Região corporal</label>'+
        '<select id="evo-measure-field" aria-label="Selecionar medida corporal">'+BODY.FIELDS.map(f=>
        '<option value="'+esc(f.id)+'" '+(f.id===metric.field.id?'selected':'')+'>'+esc(f.label)+'</option>').join('')+
        '</select></div>':'')+
      line+
      (chartMode==='measures'?'<div class="evo-chart-bottom"><span>'+(
        metric.latest?'Última medida: '+fmt(metric.latest.value)+' cm · '+stamp(metric.latest.date):
        'Sem aferição nesta região')+'</span>'+
        '<button type="button" data-action="body-open">Ver mapa corporal ›</button></div>'+
        '<p class="evo-footnote">Aferições em condições diferentes não comprovam alteração de gordura.</p>':
        '<p class="evo-footnote">Linha pontilhada: meta desejada. Oscilações diárias são normais.</p>')+
      '</section>'+
      (opts.stepsHTML||'')+(opts.groupsHTML||'')+
      '<details class="evo-history-fold"><summary>Pesagens registradas <span>'+model.all.length+'</span></summary>'+
      '<div class="evo-history-list">'+(model.history.length?model.history.map(row=>
        '<div class="evo-history-row"><strong>'+fmt(row.weight)+' kg</strong><span>'+
        new Date(toUTC(row.date)).toLocaleDateString('pt-BR',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'})+
        (row.initial?' · referência':'')+'</span></div>').join(''):'<p class="evo-empty">Ainda não há pesagens.</p>')+'</div>'+
      (model.all.length>model.history.length?'<button class="evo-more-button" type="button" data-action="evo-weight-more">Ver mais pesagens ('+
        (model.all.length-model.history.length)+')</button>':'')+'</details></section>';
  }
  function indexedEntries(nutrition){
    const map=new Map();
    for(const e of nutrition?.entries||[]){
      if(!map.has(e.date))map.set(e.date,[]);
      map.get(e.date).push(e);
    }
    return map;
  }
  function nutritionWindow(nutrition,endDay,days){
    const byDate=indexedEntries(nutrition);
    const series=[];
    for(let i=days-1;i>=0;i--){
      const date=moveDate(endDay,-i),entries=byDate.get(date)||[];
      const info=entries.length?N.recordedBreakdown(entries,date):null;
      const tgt=G.active(nutrition?.settings||{},date);
      series.push({date,recorded:entries.length>0,totals:info?.totals||null,
        counts:info?.counts||null, target:tgt?.values||null});
    }
    return series;
  }
  function drawEnergy(series,nowTarget){
    const known=series.filter(r=>r.totals?.energyKcal!=null);
    const target=Number.isFinite(nowTarget)?nowTarget:null;
    const max=Math.max(1200,...known.map(r=>r.totals.energyKcal),target||0)*1.13;
    const scaleY=n=>177-n/max*152;
    const width=352,left=37,right=width-9;
    const scaleX=i=>left+(right-left)*i/Math.max(1,series.length-1);
    const tickCount=4;
    const grid=Array.from({length:tickCount+1},(_,i)=>{
      const n=max*i/tickCount;
      return '<g><line x1="'+left+'" x2="'+right+'" y1="'+scaleY(n)+'" y2="'+scaleY(n)+
        '" stroke="#344658"/><text x="32" y="'+(scaleY(n)+3)+'" fill="#B0C0D0" text-anchor="end" font-size="9">'+fmt(n,0)+'</text></g>';
    }).join('');
    const targetLine=target!=null?'<line x1="'+left+'" x2="'+right+'" y1="'+scaleY(target)+'" y2="'+scaleY(target)+'" stroke="#929AA5" stroke-dasharray="5 4" stroke-width="1.3"/>'+
      '<text x="'+right+'" y="'+Math.max(12,scaleY(target)-7)+'" fill="#B8C9D8" font-size="10" text-anchor="end">'+fmt(target,0)+' kcal</text>':'';
    // Only connect consecutive days with recorded values. Missing diary days are gaps, never zero.
    const paths=[];
    let current=[];
    for(let i=0;i<series.length;i++){
      if(series[i].totals?.energyKcal!=null)current.push([scaleX(i),scaleY(series[i].totals.energyKcal)]);
      else if(current.length){if(current.length>1)paths.push(current);current=[];}
    }
    if(current.length>1)paths.push(current);
    const lines=paths.map(points=>'<path d="M '+points.map(p=>p.map(n=>n.toFixed(1)).join(' ')).join(' L ')+
      '" fill="none" stroke="#C5F56B" stroke-width="2.9" stroke-linecap="round" stroke-linejoin="round"/>').join('');
    const points=series.map((r,i)=>r.totals?.energyKcal==null?'':'<circle cx="'+scaleX(i)+'" cy="'+scaleY(r.totals.energyKcal)+'" r="4.2"'+
      ' stroke="'+(r.counts?.energyKcal?.estimated||r.counts?.energyKcal?.unknown?'#E6A055':'#142334')+
      '" stroke-width="2" fill="#C5F56B"><title>'+stamp(r.date)+' · '+fmt(r.totals.energyKcal)+' kcal registradas'+
      (r.counts?.energyKcal?.estimated?' · estimadas':'')+'</title></circle>').join('');
    const labelDates=[series[0],series[Math.floor((series.length-1)/2)],series.at(-1)];
    const labels=labelDates.map((r,i)=>'<text x="'+scaleX(i===0?0:i===1?Math.floor((series.length-1)/2):series.length-1)+
      '" y="207" font-size="10" fill="#B0C0D0" text-anchor="'+(i===0?'start':i===2?'end':'middle')+'">'+stamp(r.date)+'</text>').join('');
    return '<div class="evo-chart"><svg class="evo-plot" viewBox="0 0 352 216" role="img" aria-label="Consumo calórico registrado em '+known.length+
      ' de '+series.length+' dias. Dias sem registro estão em branco">'+grid+targetLine+lines+points+labels+'</svg></div>';
  }
  function macroSummary(series){
    const keys=['fatG','proteinG','carbsG'];
    const complete=series.filter(row=>row.recorded&&keys.every(k=>row.totals?.[k]!=null));
    const average=Object.fromEntries(['fatG','proteinG','carbsG','fiberG'].map(k=>{
      const withValues=complete.filter(r=>Number.isFinite(r.totals?.[k]));
      return [k,withValues.length?withValues.reduce((sum,row)=>sum+row.totals[k],0)/withValues.length:null];
    }));
    const anyEstimate=complete.some(r=>keys.some(k=>(r.counts?.[k]?.estimated||0)>0));
    const anyUnknown=complete.some(r=>keys.some(k=>(r.counts?.[k]?.unknown||0)>0));
    return {average,used:complete.length,days:series.length,anyEstimate,anyUnknown};
  }
  const macroLabels=[['fatG','Lipídios','#FFE66C'],['proteinG','Proteínas','#FA989E'],
    ['carbsG','Carboidratos','#A7D9F0']];
  function donutSegments(values,r,width){
    const safe=values.map(v=>Math.max(0,Number(v)||0));
    const total=safe.reduce((sum,v)=>sum+v,0),circ=2*Math.PI*r;
    if(total<=0)return '<circle cx="175" cy="146" r="'+r+'" stroke="#33495B" stroke-width="'+width+'" fill="none"/>';
    let offset=0;
    return safe.map((value,i)=>{
      const len=circ*(value/total),markup='<circle cx="175" cy="146" r="'+r+'" fill="none" stroke="'+macroLabels[i][2]+
        '" stroke-width="'+width+'" stroke-dasharray="'+len+' '+(circ-len)+'" stroke-dashoffset="'+(-offset)+
        '" transform="rotate(-90 175 146)"/>';
      offset+=len;return markup;
    }).join('');
  }
  function renderMacroRing(summary,goal){
    const energyFactor={fatG:9,proteinG:4,carbsG:4};
    const values=macroLabels.map(([key])=>(summary.average[key]||0)*energyFactor[key]),total=values.reduce((a,b)=>a+b,0);
    const targets=macroLabels.map(([key])=>(goal?.[key]||0)*energyFactor[key]),targetTotal=targets.reduce((a,b)=>a+b,0);
    const names=macroLabels.map(([key,label,color],i)=>{
      const share=total>0?fmt(values[i]/total*100,0)+'%':'—';
      return '<span class="evo-macro-legend"><i style="background:'+color+'"></i><span>'+label+'</span><strong>'+share+'</strong></span>';
    }).join('');
    const innerText=targetTotal?'Meu objetivo':'Sem meta';
    return '<div class="evo-ring-wrap"><svg viewBox="0 0 350 292" role="img" aria-label="Anel externo: proporção energética aproximada dos macronutrientes registrados, com 9 kcal por grama de gordura e 4 kcal por grama de proteína e carboidrato. Anel interno: metas. Fibras à parte.">'+
      donutSegments(values,100,35)+donutSegments(targets,65,28)+
      '<circle cx="175" cy="146" r="46" fill="#142334"/>'+
      '<text x="175" y="147" text-anchor="middle" font-size="13" font-weight="700" fill="#C0D1E0">'+innerText+'</text>'+
      '<text x="175" y="166" text-anchor="middle" font-size="10" fill="#B0C0D0">'+(targetTotal?'Anel interno':'Configure metas')+'</text>'+
      '<text x="175" y="282" text-anchor="middle" font-size="12" font-weight="700" fill="#C2D0DB">Minha ingestão · anel externo</text>'+
      '</svg></div><div class="evo-legend">'+names+'</div>';
  }
  function renderAverages(summary,goal){
    const keys=[...macroLabels,['fiberG','Fibras','#B89169']];
    const all=keys.flatMap(([k])=>[summary.average[k],goal?.[k]]).filter(Number.isFinite);
    const maximum=Math.max(1,...all)*1.15,baseline=181,usable=133;
    const y=n=>baseline-(n/maximum)*usable;
    const bars=keys.map(([k,label,color],i)=>{
      const value=summary.average[k],target=goal?.[k];
      const center=56+i*77,h=value==null?0:baseline-y(value),isPresent=value!=null;
      return '<g><rect x="'+(center-19)+'" y="'+(isPresent?y(value):baseline)+'" width="38" height="'+h+
        '" rx="3" fill="'+color+'" opacity=".9"/>'+
        (Number.isFinite(target)?'<line x1="'+(center-25)+'" x2="'+(center+25)+'" y1="'+y(target)+'" y2="'+y(target)+
          '" stroke="'+color+'" stroke-width="2" stroke-dasharray="4 3"/>':'')+
        '<text x="'+center+'" y="'+Math.max(19,isPresent?y(value)-9:28)+'" text-anchor="middle" fill="#F3F6FB" font-size="12" font-weight="700">'+
        (isPresent?fmt(value,0)+' g':'—')+'</text>'+
        '<text x="'+center+'" y="200" text-anchor="middle" fill="#C5D4E3" font-size="11">'+label+'</text>'+
        '<text x="'+center+'" y="218" text-anchor="middle" fill="#B6C8D8" font-size="9">'+
        (Number.isFinite(target)?'Meta '+fmt(target,0)+'g':'Sem meta')+'</text></g>';
    }).join('');
    return '<div class="evo-chart"><svg viewBox="0 0 350 231" class="evo-plot" role="img" aria-label="Média dos macronutrientes registrados, em gramas, comparada com metas indicadas por linhas tracejadas">'+
      '<line x1="19" x2="335" y1="'+baseline+'" y2="'+baseline+'" stroke="#496071"/>'+bars+'</svg></div>';
  }
  function renderNutrition(nutrition,day,periods){
    const target=G.active(nutrition?.settings||{},day)?.values||null;
    const energyDays=periodDays(periods.energy),macroDays=periodDays(periods.macros),averageDays=periodDays(periods.average);
    const seriesEnergy=nutritionWindow(nutrition,day,energyDays),knownEnergy=seriesEnergy.filter(r=>r.totals?.energyKcal!=null);
    const summaries={macros:macroSummary(nutritionWindow(nutrition,day,macroDays)),
      average:macroSummary(nutritionWindow(nutrition,day,averageDays))};
    const macros=summaries.macros,avg=summaries.average;
    const energyNoData=knownEnergy.length===0;
    const fiber=macros.average.fiberG;
    return '<section id="evo-panel-nutrition" class="evo-pane" role="tabpanel" aria-labelledby="evo-tab-nutrition">'+
      '<section class="evo-section" aria-labelledby="evo-energy-title"><h2 id="evo-energy-title">Objetivo (kcal)</h2>'+
      periodButtons('energy',energyDays)+
      '<div class="evo-section-description">Consumo registrado × meta diária'+(knownEnergy.length?' · '+knownEnergy.length+'/'+energyDays+' dias com dados':'')+'</div>'+
      (energyNoData?'<p class="evo-empty">Nenhuma caloria registrada neste período. O gráfico não transforma dias vazios em consumo zero.</p>':drawEnergy(seriesEnergy,target?.energyKcal))+
      '<p class="evo-footnote">A linha mostra somente os alimentos lançados. ≈ estimativas e composições parciais não representam a ingestão total do dia.</p></section>'+
      '<section class="evo-section" aria-labelledby="evo-macro-title"><h2 id="evo-macro-title">Distribuição de macros (%)</h2>'+
      periodButtons('macros',macroDays)+
      '<div class="evo-section-description">Anel externo: ingestão registrada · interno: objetivo</div>'+
      (macros.used?renderMacroRing(macros,target):'<p class="evo-empty">Registre lipídios, proteínas e carboidratos para comparar a distribuição.</p>')+
      '<div class="evo-fiber"><i></i><span>Fibras (acompanhadas à parte)</span><strong>'+fmt(fiber,0)+' g'+
      (Number.isFinite(target?.fiberG)?' / '+fmt(target.fiberG,0)+' g':'')+'</strong></div>'+
      '<p class="evo-footnote">'+macros.used+' dia(s) com macros disponíveis; porcentagens energéticas aproximadas pelos fatores 9/4/4 kcal por grama de gordura/proteína/carboidrato. Não recalculamos a energia declarada nos rótulos. Fibras não entram no anel para evitar dupla contagem.'+
      (macros.anyEstimate||macros.anyUnknown?' Inclui subtotais estimados ou incompletos.':'')+'</p></section>'+
      '<section class="evo-section" aria-labelledby="evo-averages-title"><h2 id="evo-averages-title">Média de macronutrientes (g)</h2>'+
      periodButtons('average',averageDays)+
      (avg.used?renderAverages(avg,target):'<p class="evo-empty">Não há dados nutricionais suficientes para a média deste período.</p>')+
      '<div class="evo-bar-legend">Barras = médias registradas <span aria-hidden="true">·</span> Traços = metas atuais</div>'+
      '<p class="evo-footnote">Média calculada somente nos '+avg.used+' dia(s) com lipídios, proteínas e carboidratos informados, não sobre todos os dias do calendário.'+
      (avg.anyEstimate||avg.anyUnknown?' Há estimativas ou nutrientes faltantes, que reduzem a precisão.':'')+'</p></section>'+
      '<button type="button" class="evo-link" data-action="nutrition-open">Registrar ou revisar refeições <span aria-hidden="true">›</span></button>'+
      '</section>';
  }
  const api={moveDate,periodDays,weightModel,measuresModel,groupVolume,renderGroupVolume,nutritionWindow,macroSummary,renderHeader,renderWeight,renderNutrition};
  root.ForjaEvolutionDashboard=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
