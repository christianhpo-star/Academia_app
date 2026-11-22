/* FORJA: read-only presentation of recorded muscular work. */
(function installMuscleMap(root){
  'use strict';
  const H=typeof module!=='undefined'&&module.exports?require('./muscle-history.js'):root.ForjaMuscleHistory;
  const B=typeof module!=='undefined'&&module.exports?require('./muscle-body.js'):root.ForjaMuscleBody;
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=value=>Number(value||0).toLocaleString('pt-BR',{maximumFractionDigits:1});
  const date=day=>typeof day==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(day)?day.slice(8)+'/'+day.slice(5,7):'—';
  const LEVELS=['Sem registro','Menor volume','Intermediário','Maior volume'];
  const validDays=days=>[7,30,90].includes(Number(days))?Number(days):30;
  function model(state,day,days=30){
    return H.analyze({strengthSessions:state?.sessions||[],today:day,days:validDays(days)});
  }
  function optionsFor(options={}){
    return {days:validDays(options.days),view:options.view==='back'?'back':'front',
      selected:options.selected||null,listOpen:!!options.listOpen,methodOpen:!!options.methodOpen};
  }
  function regionButton(row,selected,kind='chip'){
    return '<button type="button" class="muscle-map-'+kind+'" data-action="muscle-region" data-muscle="'+escape(row.id)+
      '" aria-pressed="'+(row.id===selected)+'"><i class="muscle-map-swatch muscle-level-'+row.level+'" aria-hidden="true"></i><span>'+escape(row.label)+
      '</span>'+(kind==='row'?'<small>'+LEVELS[row.level]+'</small>':'')+'</button>';
  }
  function detail(data,selected,state){
    const row=Object.hasOwn(data.byId,selected)?data.byId[selected]:null;
    if(!row)return '<div id="muscle-map-detail" class="muscle-map-detail muscle-map-prompt" role="status" aria-live="polite" aria-atomic="true">'+
      '<strong>Explore seu treino no corpo</strong><p>Toque em uma região ou escolha um músculo para ver os exercícios que contribuíram.</p></div>';
    const names=new Map((state?.exercises||[]).map(ex=>[ex.id,ex.name]));
    const catalog=[...(root.AcademiaData?.exercises||[]),...(root.ForjaFlex?.catalog||[])];
    catalog.forEach(ex=>{if(!names.has(ex.id))names.set(ex.id,ex.name);});
    return '<section id="muscle-map-detail" class="muscle-map-detail" aria-label="Detalhe do músculo selecionado" role="status" aria-live="polite" aria-atomic="true" data-selected-muscle="'+escape(row.id)+'">'+
      '<div class="muscle-map-detail-heading"><strong>'+escape(row.label)+'</strong><span class="muscle-map-status muscle-level-'+row.level+'">'+LEVELS[row.level]+'</span></div>'+
      (row.total>0?'<p><b>'+fmt(row.total)+'</b> séries equivalentes · '+fmt(row.directSets)+' principais + '+fmt(row.indirectSets)+' auxiliares × 0,5.</p>'+
        '<p class="muscle-map-last">Último registro: '+date(row.lastDay)+' · '+row.days+' dia'+(row.days===1?'':'s')+' com participação.</p>'+
        '<ul class="muscle-map-exercises">'+row.exercises.slice(0,5).map(ex=>'<li><span>'+escape(names.get(ex.id)||ex.id)+'</span><span>'+fmt(ex.total)+'</span></li>').join('')+'</ul>'+
        (row.exercises.length>5?'<p class="muscle-map-last">E mais '+(row.exercises.length-5)+' exercícios neste período.</p>':''):
        '<p>Nenhuma série classificada para esta região nos '+data.days+' dias selecionados.</p><p class="muscle-map-last">Confira o histórico e a distribuição da sua ficha antes de ajustar o treino.</p>')+'</section>';
  }
  function insight(data,ids,title,selected){
    if(!ids.length)return '';
    return '<div class="muscle-map-insight"><h3>'+title+'</h3><div class="muscle-map-chips">'+
      ids.slice(0,3).map(id=>regionButton(data.byId[id],selected)).join('')+'</div>'+
      (ids.length>3?'<p class="muscle-map-last">Mais '+(ids.length-3)+' regiões na lista abaixo.</p>':'')+'</div>';
  }
  function content(state,day,options={}){
    const opts=optionsFor(options),data=model(state,day,opts.days);
    const selected=Object.hasOwn(data.byId,opts.selected)?opts.selected:null;
    const noKnown=!data.hasEvidence||!data.regions.some(r=>r.total>0);
    const empty=noKnown?'<div class="muscle-map-empty"><strong>Mapa sem registros neste período</strong><p>'+
      (data.unknownEntries?'Os exercícios registrados ainda não têm classificação muscular. As regiões permanecem neutras.':
        'As regiões ganham cor quando você salva séries de musculação com carga e repetições válidas.')+'</p></div>':'';
    const coverage=data.unknownEntries?'<p class="muscle-map-coverage">'+data.unknownEntries+' registro'+(data.unknownEntries===1?'':'s')+' de exercício sem classificação ('+data.unknownSets+' série'+(data.unknownSets===1?'':'s')+') fora do mapa. A distribuição é parcial.</p>':'';
    const figures=B.figure({view:opts.view,rows:data.regions,selected});
    return '<p class="muscle-map-period-label">'+date(data.startDay)+' a '+date(data.endDay)+' · '+data.completedSessions+' treino'+(data.completedSessions===1?'':'s')+' registrado'+(data.completedSessions===1?'':'s')+'</p>'+
      empty+'<div class="muscle-map-layout"><div class="muscle-map-visual"><div class="muscle-map-canvas">'+figures+'</div>'+
      '<div class="muscle-map-legend" aria-label="Escala relativa de volume">'+LEVELS.map((label,i)=>'<span><i class="muscle-map-swatch muscle-level-'+i+'" aria-hidden="true"></i>'+label+'</span>').join('')+'</div>'+
      '<p class="muscle-map-untracked"><i class="muscle-map-swatch is-untracked" aria-hidden="true"></i>Hachurado: região não estimada pelo catálogo.</p>'+
      '<p class="muscle-map-scale-note">Cores comparadas entre músculos dentro deste período.</p></div>'+
      '<div class="muscle-map-reading"><div class="muscle-map-picker"><label for="muscle-map-select">Explorar músculo</label><select id="muscle-map-select"><option value="">Escolha uma região</option>'+
      data.regions.map(row=>'<option value="'+escape(row.id)+'"'+(row.id===selected?' selected':'')+'>'+escape(row.label)+' · '+LEVELS[row.level]+'</option>').join('')+'</select></div>'+
      detail(data,selected,state)+(!noKnown?'<div class="muscle-map-insights">'+insight(data,data.most,'Mais presentes',selected)+
        insight(data,data.least,'Menor volume registrado',selected)+insight(data,data.zero,'Sem registro no período',selected)+'</div>':'')+'</div></div>'+coverage+
      '<p class="muscle-map-footnote">Menos registros ajudam a revisar a distribuição do treino; não indicam, por si só, falta de estímulo ou necessidade de aumentar séries.</p>'+
      '<details class="muscle-map-breakdown"'+(opts.listOpen?' open':'')+'><summary>Ver distribuição por região <span aria-hidden="true">⌄</span></summary><div class="muscle-map-region-list">'+
      data.regions.slice().sort((a,b)=>b.total-a.total||a.label.localeCompare(b.label,'pt-BR')).map(row=>regionButton(row,selected,'row')).join('')+'</div></details>'+
      '<details class="muscle-map-method"'+(opts.methodOpen?' open':'')+'><summary>Como ler o mapa <span aria-hidden="true">⌄</span></summary><div>'+ 
      '<p>O mapa usa as séries válidas dos treinos salvos: cada participação principal soma 1 e cada auxiliar soma 0,5. É a mesma convenção do quadro de volume, aplicada às regiões das ilustrações dos exercícios.</p>'+
      '<p>Menor volume: até um terço do maior valor da janela; intermediário: até dois terços; maior volume: acima disso. A escala é recalculada ao mudar o período. Um músculo pode aparecer em mais de uma vista; seu volume é o mesmo.</p>'+
      '<p>Aquecimentos, séries em branco, exercícios pulados e o treino ainda em andamento ficam fora. Séries sem carga positiva e repetições válidas também não entram, seguindo o registro de volume atual. Muay Thai e atividades livres não são convertidos em séries musculares.</p>'+
      '<p>Abdômen, oblíquos e lombar ficam hachurados porque o catálogo atual não estima sua participação. Isso não significa ausência de trabalho. Direita e esquerda compartilham o mesmo registro.</p>'+
      '<p>As cores mostram participação estimada no treino registrado. Não medem ativação, recuperação, força ou crescimento de cada músculo. Compare também os exercícios, a técnica e seu planejamento.</p>'+
      '<p><a href="https://pubmed.ncbi.nlm.nih.gov/41343037/" target="_blank" rel="noopener noreferrer">Referência da contagem fracionada de séries</a></p></div></details>';
  }
  function render(state,day,options={}){
    const opts=optionsFor(options);
    return '<section class="evo-section evo-volume-card muscle-map-card" aria-labelledby="muscle-map-title" data-muscle-days="'+opts.days+'" data-muscle-view="'+opts.view+'">'+
      '<div class="evo-card-heading"><div><h2 id="muscle-map-title">Mapa muscular</h2><p>Veja como seus treinos se distribuem pelo corpo.</p></div></div>'+
      '<div class="evo-periods evo-volume-periods" role="group" aria-label="Período do treino">'+[7,30,90].map(days=>'<button type="button" data-action="evo-volume-days" data-days="'+days+'" aria-pressed="'+(days===opts.days)+'" class="'+(days===opts.days?'is-selected':'')+'">'+days+' dias</button>').join('')+'</div>'+
      '<div class="muscle-map-view" role="group" aria-label="Vista do corpo">'+['front','back'].map(view=>'<button type="button" data-action="muscle-map-view" data-view="'+view+'" aria-pressed="'+(view===opts.view)+'">'+(view==='front'?'Frente':'Costas')+'</button>').join('')+'</div>'+
      '<div class="muscle-map-content">'+content(state,day,opts)+'</div></section>';
  }
  const api={LEVELS,validDays,model,content,render};
  root.ForjaMuscleMap=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
