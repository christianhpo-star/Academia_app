(function installMuay(root) {
  'use strict';
  const places = { casa: 'Em casa', academia: 'Na academia', outro: 'Outro local' };
  const kinds = { individual: 'Treino individual', aula: 'Aula de Muay Thai' };
  const units = { reps: 'repetições', min: 'minutos', rounds: 'rounds' };
  const categories = { exhaustion:'Exaustão / volume de golpes', combination:'Combinação por tempo', conditioning:'Condicionamento', technique:'Técnica / outros',sparring:'Sparring técnico' };
  const sides = { total:'Total', each:'Por lado (cada perna / braço)' };
  const fatigueLabels = { '': 'Não informado', normal: 'Normal', moderada: 'Moderada', alta: 'Alta' };
  const QUICK_MODES = Object.freeze({exhaustion:'Exaustão',combination:'Sequência',sparring:'Sparring'});
  const QUICK_MOVEMENTS = Object.freeze({soco:'Socos',chute:'Chutes',agachamento:'Agachamentos',joelho:'Joelhadas'});
  const QUICK_LIMBS = Object.freeze({both:'Ambos os lados',left:'Esquerdo',right:'Direito',bilateral:'Bilateral'});
  const COMBO_STRIKES = Object.freeze({jab:'Jab',direto:'Direto',cruzado:'Cruzado',
    chute_d:'Chute direito',chute_e:'Chute esquerdo',joelho_d:'Joelho direito',joelho_e:'Joelho esquerdo'});
  const SPARRING_EXCHANGE = Object.freeze({one:'1 por 1',three:'3 golpes',free:'Livre'});
  const SPARRING_RULES = Object.freeze({boxing:'Somente boxe',kicks:'Boxe e chutes'});
  const SPARRING_CONTACT = Object.freeze({technical:'Técnico / sem contato',light:'Contato leve',controlled:'Controlado'});
  const quickDefaults = () => ({mode:'exhaustion',movement:'chute',limb:'both',preset:'50',quantity:'50',
    ladderTo:'10',combo:[],sequenceMinutes:'5',exchange:'one',rules:'boxing',rounds:'3',
    roundMinutes:'3',contact:'light'});
  const validQuick = q => !!q && typeof q==='object' && !Array.isArray(q) &&
    Object.hasOwn(QUICK_MODES,q.mode) && Object.hasOwn(QUICK_MOVEMENTS,q.movement) &&
    Object.hasOwn(QUICK_LIMBS,q.limb) && ['20','50','ladder','ladderCumulative','custom'].includes(q.preset) &&
    optional(q.quantity,1,3000,true) && optional(q.ladderTo,2,20,true) &&
    Array.isArray(q.combo) && q.combo.length<=12 && q.combo.every(v=>Object.hasOwn(COMBO_STRIKES,v)) &&
    optional(q.sequenceMinutes,1,90,true) && Object.hasOwn(SPARRING_EXCHANGE,q.exchange) &&
    Object.hasOwn(SPARRING_RULES,q.rules) && optional(q.rounds,1,30,true) &&
    optional(q.roundMinutes,1,30,true) && Object.hasOwn(SPARRING_CONTACT,q.contact);
  const PRESETS = [
    { name: 'Polichinelos', unit: 'reps' },
    { name: 'Agachamento com salto', unit: 'reps' },
    { name: 'Afundos', unit: 'reps' },
    { name: 'Pular corda', unit: 'min' },
    { name: 'Sombra', unit: 'rounds' },
    { name: 'Técnica de golpes', unit: 'min', category:'combination' },
    { name: '50 chutes por perna', unit: 'reps', category:'exhaustion', side:'each', quantity:50 },
    { name: 'Jab + direto + chute', unit: 'min', category:'combination', quantity:3 },
    { name: 'Exaustão de socos', unit: 'reps', category:'exhaustion' },
    { name: 'Saco de pancadas', unit: 'rounds' },
    { name: 'Manoplas', unit: 'rounds' },
    { name: 'Deslocamentos', unit: 'min' },
    { name: 'Mobilidade', unit: 'min' },
  ];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
  const uid = prefix => prefix + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9);
  const integer = (n, min, max) => Number.isInteger(Number(n)) && Number(n) >= min && Number(n) <= max;
  const decimal = (n, min, max) => n !== '' && n !== null && n !== undefined &&
    Number.isFinite(Number(n)) && Number(n) >= min && Number(n) <= max;
  const optional = (n, min, max, int = false) =>
    n === '' || n == null || (int ? integer(n, min, max) : decimal(n, min, max));
  const numeric = n => n === '' || n == null ? null : Number(n);
  const dateOk = day => {
    if (typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
    const time = Date.parse(day + 'T12:00:00Z');
    return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === day;
  };
  const textOk = (v, max) => typeof v === 'string' && v.length <= max;
  const archive = () => ({ sessions: [], draft: null });
  const activity = (name = '', unit = 'reps', opts={}) =>
    ({ id: uid('exercise'), name, quantity: opts.quantity ?? '', unit, sets: '', 
       category: opts.category || (unit==='min'?'combination':'technique'),side:opts.side||'total' });
  const draft = (day, place = 'casa') => ({
    day, place, kind: place === 'academia' ? 'aula' : 'individual',
    duration: '', intensity: '', fatigue: '', kneePain: '', notes: '',
    activities: [], editingId: null,
    ...(place==='academia'?{quick:quickDefaults()}:{}),
  });
  const validActivity = (value, complete = false) => !!value && typeof value === 'object' &&
    textOk(value.id, 100) && textOk(value.name, 100) &&
    (!complete || value.name.trim().length > 0) &&
    Object.hasOwn(units, value.unit) && optional(value.quantity, 0.1, 3000, value.unit !== 'min') &&
    optional(value.sets, 1, 30, true) &&
    (value.category===undefined || Object.hasOwn(categories,value.category)) &&
    (value.side===undefined || Object.hasOwn(sides,value.side)) &&
    (value.side!=='each' || value.unit==='reps') &&
    (value.movement===undefined || Object.hasOwn(QUICK_MOVEMENTS,value.movement)) &&
    (value.limb===undefined || Object.hasOwn(QUICK_LIMBS,value.limb)) &&
    (value.pattern===undefined || ['fixed','ladder','ladderCumulative'].includes(value.pattern)) &&
    (value.ladderTo===undefined || integer(value.ladderTo,2,20)) &&
    (value.combo===undefined || (Array.isArray(value.combo) && value.combo.length<=12 &&
      value.combo.every(v=>Object.hasOwn(COMBO_STRIKES,v)) && value.category==='combination')) &&
    (value.exchange===undefined || (Object.hasOwn(SPARRING_EXCHANGE,value.exchange) && value.category==='sparring')) &&
    (value.rules===undefined || (Object.hasOwn(SPARRING_RULES,value.rules) && value.category==='sparring')) &&
    (value.contact===undefined || (Object.hasOwn(SPARRING_CONTACT,value.contact) && value.category==='sparring'));
  const validDraft = value => !!value && typeof value === 'object' &&
    dateOk(value.day) && Object.hasOwn(places, value.place) && Object.hasOwn(kinds, value.kind) &&
    optional(value.duration, 1, 360, true) && optional(value.intensity, 1, 10, true) &&
    optional(value.kneePain, 0, 10, true) && Object.hasOwn(fatigueLabels, value.fatigue) &&
    textOk(value.notes, 2000) && Array.isArray(value.activities) && value.activities.length <= 30 &&
    value.activities.every(a => validActivity(a)) &&
    (value.quick===undefined || (value.place==='academia' && validQuick(value.quick))) &&
    (value.editingId === null || textOk(value.editingId, 100));
  const validSession = value => validDraft({ ...value, editingId: null }) &&
    textOk(value.id, 100) && value.id.length > 0 &&
    typeof value.timestamp === 'string' && Number.isFinite(Date.parse(value.timestamp)) &&
    value.activities.length > 0 && value.activities.every(a => validActivity(a, true)) &&
    (value.fastVersion===undefined || value.fastVersion===2);
  const validArchive = value => !!value && typeof value === 'object' &&
    Array.isArray(value.sessions) && value.sessions.length <= 10000 &&
    value.sessions.every(validSession) &&
    (value.draft === null || validDraft(value.draft));
  // Only add the new field when loading an older FORJA backup; never invent sessions.
  function ensureArchive(state) {
    if (state.muay !== undefined) return false;
    state.muay = archive();
    return true;
  }
  function finishDraft(raw, today) {
    if (!validDraft(raw)) return { error: 'Há informações inválidas no formulário.' };
    if (raw.day > today) return { error: 'A data não pode estar no futuro.' };
    if (!raw.activities.length) return { error: 'Adicione ao menos um exercício realizado.' };
    if (raw.activities.some(a => !a.name.trim())) return { error: 'Preencha os nomes dos exercícios.' };
    const values = raw.activities.map(item => ({
      id: item.id, name: item.name.trim(), unit: item.unit,
      quantity: numeric(item.quantity), sets: numeric(item.sets),
      category: item.category||'technique',side:item.side||'total',
      ...Object.fromEntries(['movement','limb','pattern','ladderTo','combo','exchange','rules','contact']
        .filter(key=>item[key]!==undefined).map(key=>[key,Array.isArray(item[key])?[...item[key]]:item[key]])),
    }));
    const session = {
      id: raw.editingId || uid('muay'),
      timestamp: new Date().toISOString(),
      day: raw.day, place: raw.place, kind: raw.kind,
      duration: numeric(raw.duration), intensity: numeric(raw.intensity),
      fatigue: raw.fatigue, kneePain: numeric(raw.kneePain),
      notes: raw.notes.trim().slice(0, 1000), activities: values,
      ...(raw.quick?{fastVersion:2}:{}),
    };
    if (!validSession(session)) return { error: 'Revise os volumes, a duração e a intensidade informados.' };
    return { session };
  }
  function draftFromSession(session) {
    return {
      ...session, editingId: session.id,
      duration: session.duration ?? '', intensity: session.intensity ?? '',
      kneePain: session.kneePain ?? '',
      ...(session.fastVersion===2&&session.place==='academia'?{quick:quickDefaults()}:{}),
      activities: session.activities.map(a => ({
        ...a, quantity: a.quantity ?? '', sets: a.sets ?? '',
      })),
    };
  }
  const dateBR = day => dateOk(day) ? day.slice(8, 10) + '/' + day.slice(5, 7) + '/' + day.slice(0, 4) : 'Sem data';
  const select = (values, current) => Object.entries(values).map(([value, label]) =>
    '<option value="' + esc(value) + '"' + (String(current) === value ? ' selected' : '') + '>' + esc(label) + '</option>'
  ).join('');
  function volumeText(a) {
    const part = a.quantity == null || a.quantity === '' ? '' : String(a.quantity) + ' ' + units[a.unit] +
      (a.unit==='reps' && a.side==='each' ? ' por lado' : '');
    if(a.category==='sparring')return (a.sets||1)+' round(s) × '+(a.quantity||'—')+' min';
    const series = a.sets == null || a.sets === '' ? '' : String(a.sets) + ' séries';
    return [series, part].filter(Boolean).join(' × ') || 'Volume não informado';
  }
  // Backup anterior a categorias e lateralidade: campos ausentes e unidades
  // suspeitas são qualidade limitada de registro, não sinal de recuperação.
  function legacyReview(session) {
    const items=Array.isArray(session?.activities)?session.activities:[];
    const legacy=items.filter(a=>!a.category || !a.side);
    const ambiguous=items.filter(a=>a.unit==='min' && /chute|soco|exaust/i.test(a.name||'') &&
      Number(a.quantity)>20);
    const missing=items.filter(a=>a.quantity==null||a.quantity==='');
    return {legacy:legacy.length,ambiguous:ambiguous.length,missing:missing.length};
  }
  function legacyNotice(session){
    const review=legacyReview(session);
    if(!review.legacy&&!review.ambiguous&&!review.missing)return '';
    return '<p class="muay-legacy-note">Registro da versão anterior: alguns detalhes não foram informados ou a unidade pode estar ambígua. Mantido sem correção automática; edite apenas se souber o que foi realizado.</p>';
  }

  function sessionCard(s,showControls=false,expanded=false){
    const items=(s.activities||[]);
    return '<details class="history-entry muay-record" data-history-id="'+esc(s.id)+'"'+(expanded?' open':'')+'>'+
      '<summary class="history-summary"><span class="history-summary-main"><small>'+esc(dateBR(s.day))+' · Muay Thai</small>'+
      '<strong>'+esc(kinds[s.kind]||'Treino de Muay Thai')+'</strong>'+
      '<span>'+items.length+' atividade(s)'+(s.duration==null?'':' · '+esc(s.duration)+' min')+
      (s.intensity==null?'':' · esforço '+esc(s.intensity)+'/10')+'</span></span>'+
      '<span class="history-chevron" aria-hidden="true">⌄</span></summary>'+
      '<div class="history-content"><p class="small muted">'+esc(places[s.place]||s.place)+'</p>'+
      '<ul class="mini-list muay-record-list">'+items.map(a=>
        '<li><span>'+esc(a.name)+'</span><small>'+esc(volumeText(a))+'</small></li>'
      ).join('')+'</ul>'+
      (s.fatigue?'<p class="small muted">Fadiga: '+esc(fatigueLabels[s.fatigue])+'</p>':'')+
      (s.kneePain==null?'':'<p class="small muted">Joelho após treino: '+esc(s.kneePain)+'/10</p>')+
      (s.notes?'<p class="small muted">Observações: '+esc(s.notes)+'</p>':'')+
      legacyNotice(s)+
      (showControls?'<div class="btnrow mt-12"><button type="button" class="secondary small-button" data-action="muay-edit" data-id="'+esc(s.id)+'">Editar registro</button>'+
        '<button type="button" class="ghost small-button" data-action="muay-delete" data-id="'+esc(s.id)+'">Excluir</button></div>':'')+
      '</div></details>';
  }
  function sortedSessions(sessions){
    return [...sessions].sort((a,b)=>b.day.localeCompare(a.day)||b.timestamp.localeCompare(a.timestamp));
  }
  function historySection(sessions,limit=3){
    const recent=sortedSessions(sessions).slice(0,Math.max(0,limit));
    return '<div class="section-row"><h2 class="section-title">Muay Thai</h2><small>'+sessions.length+' registro(s)</small></div>'+
      (recent.length?recent.map(s=>sessionCard(s,true)).join(''):'<div class="empty">Nenhum treino de Muay Thai registrado.</div>');
  }

  // Structured academy blocks retain the older activity contract; they never
  // modify the strength diary or infer hypertrophy sets from strikes.
  function quickActivity(q){
    if(!validQuick(q))return {error:'Revise os campos deste bloco.'};
    if(q.mode==='exhaustion'){
      const squat=q.movement==='agachamento';
      const limb=squat?'bilateral':q.limb;
      const side=limb==='both'?'each':'total';
      const ladder=['ladder','ladderCumulative'].includes(q.preset),to=Number(q.ladderTo);
      if(ladder&&!integer(q.ladderTo,2,20))return {error:'Informe o último degrau da escada.'};
      const quantity=ladder?(q.preset==='ladderCumulative'?to*(to+1)*(to+2)/6:to*(to+1)/2):
        Number(q.preset==='custom'?q.quantity:q.preset);
      if(!integer(quantity,1,3000))return {error:'Informe uma quantidade válida de repetições.'};
      const label=QUICK_MOVEMENTS[q.movement]+' · '+QUICK_LIMBS[limb];
      return {activity:{...activity(label,'reps',{category:'exhaustion',side,quantity}),
        movement:q.movement,limb,pattern:ladder?q.preset:'fixed',...(ladder?{ladderTo:to}:{})}};
    }
    if(q.mode==='combination'){
      if(!q.combo.length)return {error:'Adicione pelo menos um golpe à sequência.'};
      if(!integer(q.sequenceMinutes,1,90))return {error:'Informe os minutos da sequência.'};
      const name=q.combo.map(key=>COMBO_STRIKES[key]).join(' → ').slice(0,100);
      return {activity:{...activity(name,'min',{category:'combination',quantity:Number(q.sequenceMinutes)}),
        combo:[...q.combo]}};
    }
    if(!integer(q.rounds,1,30)||!integer(q.roundMinutes,1,30))
      return {error:'Informe rounds e minutos por round.'};
    const name='Sparring · '+SPARRING_EXCHANGE[q.exchange]+' · '+SPARRING_RULES[q.rules];
    return {activity:{...activity(name,'min',{category:'sparring',quantity:Number(q.roundMinutes)}),
      sets:Number(q.rounds),exchange:q.exchange,rules:q.rules,contact:q.contact}};
  }
  const EXPOSURE = Object.freeze({
    soco:['frontDelts','sideDelts','triceps','forearms','obliques'],
    chute:['quadriceps','glutes','hamstrings','calves','obliques'],
    agachamento:['quadriceps','glutes','calves'],
    joelho:['quadriceps','glutes','abs','obliques']
  });
  function movementTypes(a){
    if(!a||typeof a!=='object')return [];
    if(a.category==='exhaustion' && Object.hasOwn(EXPOSURE,a.movement))return [a.movement];
    if(a.category==='combination' && Array.isArray(a.combo))return [...new Set(a.combo.map(id=>
      id.startsWith('chute_')?'chute':id.startsWith('joelho_')?'joelho':
        ['jab','direto','cruzado'].includes(id)?'soco':null).filter(Boolean))];
    if(a.category==='sparring' && Object.hasOwn(SPARRING_RULES,a.rules))
      return a.rules==='kicks'?['soco','chute']:['soco'];
    return [];
  }
  // A qualitative overlay. Never returns equivalent sets, unilateral
  // activation, exposure intensity or recovery prescriptions.
  function exposure(sessions=[],today='',days=30){
    days=[7,30,90].includes(Number(days))?Number(days):30;
    const rows={},seen=new Set(),sessionDates=new Set();
    let mappedActivities=0,unclassifiedActivities=0;
    for(const [index,s] of (Array.isArray(sessions)?sessions:[]).entries()){
      if(!dateOk(today)||!dateOk(s?.day))continue;
      const age=Math.round((Date.parse(today+'T12:00:00Z')-Date.parse(s.day+'T12:00:00Z'))/86400000);
      if(age<0||age>=days)continue;
      const id=typeof s.id==='string'&&s.id?s.id:'row:'+index;
      if(seen.has(id))continue;
      seen.add(id);
      for(const a of (Array.isArray(s.activities)?s.activities:[])){
        const types=movementTypes(a);
        if(!types.length){unclassifiedActivities++;continue;}
        mappedActivities++;sessionDates.add(s.day);
        const regions=[...new Set(types.flatMap(type=>EXPOSURE[type]))];
        for(const region of regions){
          if(!rows[region])rows[region]={id:region,sessionIds:new Set(),days:new Set(),lastDay:null};
          const row=rows[region];row.sessionIds.add(id);row.days.add(s.day);
          if(!row.lastDay||s.day>row.lastDay)row.lastDay=s.day;
        }
      }
    }
    const regions=Object.values(rows).map(row=>({id:row.id,sessions:row.sessionIds.size,
      days:row.days.size,lastDay:row.lastDay})).sort((a,b)=>b.sessions-a.sessions||a.id.localeCompare(b.id));
    return {days,sessions:sessionDates.size,regions,byId:Object.fromEntries(regions.map(row=>[row.id,row])),
      mappedActivities,unclassifiedActivities,method:'qualitative-only'};
  }

  function presetButton(p,i){
    return '<button type="button" class="secondary muay-preset" data-action="muay-preset" data-preset="'+i+'">+ '+esc(p.name)+'</button>';
  }
  function quickChoice(items,action,current){
    return '<div class="muay-quick-choices" role="group" aria-label="'+(action==='muay-effort'?'Esforço percebido':'Fadiga das pernas')+'">'+
      items.map(([value,label])=>
        '<button type="button" class="muay-quick-chip '+(String(current)===String(value)?'selected':'')+'" data-action="'+action+'" data-value="'+esc(value)+'" aria-pressed="'+(String(current)===String(value))+'">'+esc(label)+'</button>'
      ).join('')+'</div>';
  }
  function renderEditor(d){
    const featured=new Set([6,7,8,0]);
    return '<section class="card muay-fast-card" aria-labelledby="muay-quick-title">'+
      '<div class="row-between"><h2 id="muay-quick-title" class="section-title">'+(d.editingId?'Editar treino':'Registro rápido')+'</h2><span class="pill green">Salvo automaticamente</span></div>'+
      '<p class="small muted">Escolha o que realizou e informe apenas os dados que souber. O restante é opcional.</p>'+
      '<div class="muay-quick-grid"><div class="field"><label for="muay-duration">Duração total (min)</label>'+
      '<input id="muay-duration" type="number" min="1" max="360" step="1" inputmode="numeric" placeholder="Ex.: 50" data-muay-field="duration" value="'+esc(d.duration)+'" /></div>'+
      '<div class="field"><label for="muay-knee">Joelho após treino</label>'+
      '<select id="muay-knee" data-muay-field="kneePain">'+
      select({'':'Não informado',0:'0 · Sem dor',1:'1',2:'2',3:'3',4:'4',5:'5',6:'6',7:'7',8:'8',9:'9',10:'10 · Máximo'},d.kneePain)+'</select></div></div>'+
      '<div class="muay-quick-question"><strong>Qual foi o esforço?</strong><p>Marque a nota que melhor descreve a sessão.</p>'+
      quickChoice([['5','5/10 · Moderado'],['7','7/10 · Forte'],['9','9/10 · Muito forte']],'muay-effort',d.intensity)+'</div>'+
      '<div class="muay-quick-question"><strong>Como ficaram as pernas?</strong>'+
      quickChoice([['normal','Normal'],['moderada','Moderada'],['alta','Alta fadiga']],'muay-fatigue',d.fatigue)+'</div>'+
      '<details class="muay-advanced"><summary>Data, local e informações adicionais</summary>'+
      '<div class="field-row mt-12"><div class="field"><label for="muay-day">Data</label><input id="muay-day" type="date" data-muay-field="day" value="'+esc(d.day)+'"/></div>'+
      '<div class="field"><label for="muay-place">Local</label><select id="muay-place" data-muay-field="place">'+select(places,d.place)+'</select></div></div>'+
      '<div class="field-row mt-12"><div class="field"><label for="muay-kind">Tipo</label><select id="muay-kind" data-muay-field="kind">'+select(kinds,d.kind)+'</select></div>'+
      '<div class="field"><label for="muay-intensity">Esforço exato (1–10)</label><select id="muay-intensity" data-muay-field="intensity">'+
      select({'':'Não informado',1:'1',2:'2',3:'3',4:'4',5:'5',6:'6',7:'7',8:'8',9:'9',10:'10'},d.intensity)+'</select></div></div>'+
      '<div class="field mt-12"><label for="muay-fatigue">Fadiga</label><select id="muay-fatigue" data-muay-field="fatigue">'+
      select(fatigueLabels,d.fatigue)+'</select></div>'+
      '<div class="field mt-12"><label for="muay-notes">Observações (opcional)</label><textarea id="muay-notes" data-muay-field="notes" maxlength="1000" placeholder="O que foi diferente hoje?">'+esc(d.notes)+'</textarea></div>'+
      '</details></section>'+
      '<section class="muay-activity-section"><div class="section-row"><h2 class="section-title">O que você fez?</h2><small>'+d.activities.length+' exercício(s)</small></div>'+
      '<p class="small muted">Toque para adicionar. Golpes por tempo e exaustão por repetições já vêm com a unidade correta.</p>'+
      '<div class="muay-presets muay-featured" role="group" aria-label="Adicionar atividade realizada">'+
      PRESETS.map((p,i)=>featured.has(i)?presetButton(p,i):'').join('')+'</div>'+
      '<details class="muay-extra-presets"><summary>Mais exercícios e técnicas</summary><div class="muay-presets mt-12">'+
      PRESETS.map((p,i)=>featured.has(i)?'':presetButton(p,i)).join('')+
      '<button type="button" class="secondary muay-preset" data-action="muay-custom">+ Outro exercício</button></div></details>'+
      (d.editingId?'<p class="muay-legacy-note">Se o registro antigo tiver campos incompletos, confirme apenas o que souber. Não converteremos unidades automaticamente.</p>':'')+
      (d.activities.length?d.activities.map((a,i)=>{
        const label=a.unit==='reps'?(a.side==='each'?'Repetições por lado':'Repetições totais'):
          a.unit==='min'?'Minutos por bloco':'Rounds por bloco';
        return '<section class="muay-compact-activity" data-muay-activity="'+esc(a.id)+'">'+
          '<div class="muay-compact-head"><div><span>ATIVIDADE '+(i+1)+'</span><strong class="muay-activity-title">'+esc(a.name||'Novo exercício')+'</strong></div>'+
          '<button type="button" class="button-inline" data-action="muay-remove" data-id="'+esc(a.id)+'" aria-label="Remover '+esc(a.name||'exercício')+'">Remover</button></div>'+
          '<div class="muay-quick-grid"><div class="field"><label for="muay-quantity-'+esc(a.id)+'">'+esc(label)+'</label>'+
          '<input id="muay-quantity-'+esc(a.id)+'" type="number" min="0.1" max="3000" step="any" inputmode="decimal" placeholder="Opcional" data-muay-id="'+esc(a.id)+'" data-muay-prop="quantity" value="'+esc(a.quantity)+'"/></div>'+
          '<div class="field"><label for="muay-sets-'+esc(a.id)+'">Blocos / séries</label>'+
          '<input id="muay-sets-'+esc(a.id)+'" type="number" min="1" max="30" step="1" inputmode="numeric" placeholder="Opcional" data-muay-id="'+esc(a.id)+'" data-muay-prop="sets" value="'+esc(a.sets)+'"/></div></div>'+
          '<details class="muay-activity-more"'+(!a.name.trim()?' open':'')+'><summary>Personalizar nome, unidade e contagem</summary>'+
          '<div class="field mt-12"><label for="muay-name-'+esc(a.id)+'">Nome do exercício</label>'+
          '<input id="muay-name-'+esc(a.id)+'" data-muay-id="'+esc(a.id)+'" data-muay-prop="name" maxlength="100" value="'+esc(a.name)+'" placeholder="Ex.: sequência de chutes"/></div>'+
          '<div class="field mt-12"><label for="muay-category-'+esc(a.id)+'">Tipo de exercício</label><select id="muay-category-'+esc(a.id)+'" data-muay-id="'+esc(a.id)+'" data-muay-prop="category">'+select(categories,a.category||'technique')+'</select></div>'+
          '<div class="field-row mt-12"><div class="field"><label for="muay-unit-'+esc(a.id)+'">Unidade</label><select id="muay-unit-'+esc(a.id)+'" data-muay-id="'+esc(a.id)+'" data-muay-prop="unit">'+select(units,a.unit)+'</select></div>'+
          (a.unit==='reps'?'<div class="field"><label for="muay-side-'+esc(a.id)+'">Contagem</label><select id="muay-side-'+esc(a.id)+'" data-muay-id="'+esc(a.id)+'" data-muay-prop="side">'+select(sides,a.side||'total')+'</select></div>':'')+
          '</div></details></section>';
      }).join(''):'<div class="empty mt-12">Adicione pelo menos um exercício realizado.</div>')+
      '<div class="muay-save-actions"><button type="button" class="primary full" data-action="muay-finish">Salvar treino</button>'+
      '<button type="button" class="button-inline" data-action="muay-cancel">Descartar rascunho</button></div></section>';
  }

  function academyChips(options,field,current,label){
    return '<div class="muay-academy-chips" role="group" aria-label="'+esc(label)+'">'+
      Object.entries(options).map(([value,name])=>
        '<button type="button" class="muay-academy-chip'+(String(current)===String(value)?' selected':'')+
        '" data-action="muay-quick-choice" data-quick-field="'+esc(field)+'" data-value="'+esc(value)+
        '" aria-pressed="'+(String(current)===String(value))+'">'+esc(name)+'</button>').join('')+'</div>';
  }
  function renderAcademyEditor(d){
    const q=d.quick;
    const modeTabs='<div class="muay-academy-modes" role="group" aria-label="Escolher modalidade do bloco">'+
      Object.entries(QUICK_MODES).map(([mode,label])=>
        '<button type="button" data-action="muay-quick-mode" data-value="'+mode+
        '" class="muay-academy-mode'+(mode===q.mode?' selected':'')+'" aria-pressed="'+(mode===q.mode)+'">'+
        esc(label)+'</button>').join('')+'</div>';
    const movement=academyChips({soco:'Soco',chute:'Chute',agachamento:'Agachamento',joelho:'Joelho'},
      'movement',q.movement,'Movimento para exaustão');
    const limbs=q.movement==='agachamento'?
      '<p class="small muted">Agachamento: repetições bilaterais, sem divisão por lado.</p>':
      academyChips({both:'Ambos (por lado)',left:'Esquerdo',right:'Direito'},
        'limb',q.limb,'Lado que executou o movimento');
    const reps=academyChips({'20':'20','50':'50',ladder:'1→10 · 55',ladderCumulative:'1, 12, 123… · 220',custom:'Outro'},
      'preset',q.preset,'Quantidade ou escada de repetições');
    const to=Number(q.ladderTo);
    const ladderSum=q.preset==='ladderCumulative'?to*(to+1)*(to+2)/6:to*(to+1)/2;
    const exhaustion='<div class="muay-academy-form" aria-label="Bloco de exaustão">'+
      '<h3>Movimento</h3>'+movement+
      '<h3>Contagem</h3>'+limbs+reps+
      (q.preset==='custom'?'<div class="field muay-academy-number"><label for="muay-quick-quantity">Repetições '+(q.movement==='agachamento'?'totais':'no lado escolhido')+'</label>'+
        '<input id="muay-quick-quantity" type="number" min="1" max="3000" step="1" inputmode="numeric" value="'+esc(q.quantity)+'" data-muay-quick-field="quantity"></div>':'')+
      (['ladder','ladderCumulative'].includes(q.preset)?'<p class="muay-academy-help" role="note">'+
        (q.preset==='ladderCumulative'?'Escada acumulada: rodada 1 faz 1; rodada 2 faz 1+2; rodada 3 faz 1+2+3; e assim até '+q.ladderTo+'. ':
          'Escada simples: rodada 1 faz 1; rodada 2 faz 2; e assim até '+q.ladderTo+'. ')+
        'São <strong>'+ladderSum+' repetições '+(q.movement==='agachamento'?'no total':'por lado selecionado')+
        '</strong> no protocolo completo.</p>':'')+
      '</div>';
    const strikes=Object.entries(COMBO_STRIKES).map(([key,label])=>
      '<button type="button" class="muay-strike-add" data-action="muay-combo-add" data-value="'+key+
      '"'+(q.combo.length>=12?' disabled':'')+' aria-label="Acrescentar '+esc(label)+' à sequência">+ '+esc(label)+'</button>').join('');
    const comboSteps=q.combo.length?
      '<ol class="muay-combo-steps">'+q.combo.map((id,i)=>
        '<li><span>'+(i+1)+'. '+esc(COMBO_STRIKES[id])+'</span>'+
        '<button type="button" class="button-inline" data-action="muay-combo-remove" data-index="'+i+
        '" aria-label="Retirar '+esc(COMBO_STRIKES[id])+' da sequência">Retirar</button></li>').join('')+'</ol>':
      '<p class="muay-combo-empty">Toque nos golpes abaixo na ordem em que foram executados.</p>';
    const combination='<div class="muay-academy-form" aria-label="Bloco de sequência por tempo">'+
      '<h3>Ordem da combinação</h3>'+comboSteps+
      '<div class="muay-strike-grid" role="group" aria-label="Adicionar golpe à sequência">'+strikes+'</div>'+
      '<p class="small muted">A sequência inteira é repetida durante o período escolhido. A quantidade de repetições não é presumida.</p>'+
      '<div class="field muay-academy-number"><label for="muay-sequence-minutes">Por quantos minutos?</label>'+
      '<input id="muay-sequence-minutes" type="number" min="1" max="90" step="1" inputmode="numeric" data-muay-quick-field="sequenceMinutes" value="'+esc(q.sequenceMinutes)+'"></div>'+
      '</div>';
    const rounds=Number(q.rounds)*Number(q.roundMinutes);
    const sparring='<div class="muay-academy-form" aria-label="Bloco de sparring">'+
      '<h3>Troca de golpes</h3>'+
      academyChips(SPARRING_EXCHANGE,'exchange',q.exchange,'Regra de troca no sparring')+
      '<h3>Técnicas permitidas</h3>'+
      academyChips(SPARRING_RULES,'rules',q.rules,'Técnicas permitidas no sparring')+
      '<div class="muay-academy-number-row">'+
      '<div class="field"><label for="muay-spar-rounds">Rounds</label>'+
      '<input id="muay-spar-rounds" type="number" min="1" max="30" step="1" inputmode="numeric" data-muay-quick-field="rounds" value="'+esc(q.rounds)+'"></div>'+
      '<div class="field"><label for="muay-spar-minutes">Minutos por round</label>'+
      '<input id="muay-spar-minutes" type="number" min="1" max="30" step="1" inputmode="numeric" data-muay-quick-field="roundMinutes" value="'+esc(q.roundMinutes)+'"></div></div>'+
      '<p class="muay-academy-help">Tempo de rounds: <strong id="muay-spar-total">'+rounds+' min</strong> (intervalos não incluídos).</p>'+
      '<details class="muay-advanced"><summary>Contato do sparring (opcional)</summary>'+
      academyChips(SPARRING_CONTACT,'contact',q.contact,'Intensidade de contato relatada')+
      '</details></div>';
    const builder=q.mode==='exhaustion'?exhaustion:q.mode==='combination'?combination:sparring;
    const blocks=d.activities.length?
      '<div class="muay-academy-records">'+d.activities.map((a,i)=>
        '<div class="muay-academy-record"><div><span class="muay-record-index">'+(i+1)+' · '+
        esc(categories[a.category]||'Atividade')+'</span><strong>'+esc(a.name)+'</strong>'+
        '<small>'+esc(volumeText(a))+(a.pattern==='ladder'?' · escada 1→'+a.ladderTo:
          a.pattern==='ladderCumulative'?' · escada 1, 12, 123…':'')+
        (a.contact?' · '+esc(SPARRING_CONTACT[a.contact]||''):'')+'</small></div>'+
        '<button type="button" class="button-inline" data-action="muay-remove" data-id="'+esc(a.id)+
        '" aria-label="Remover bloco '+(i+1)+'">Remover</button></div>').join('')+'</div>':
      '<p class="small muted">Nenhum bloco registrado nesta sessão ainda.</p>';
    return '<section class="card muay-academy-editor" aria-labelledby="muay-academy-heading">'+
      '<div class="row-between"><h2 id="muay-academy-heading" class="section-title">'+
      (d.editingId?'Editar treino na academia':'Registrar treino na academia')+
      '</h2><span class="pill green">Salvo neste aparelho</span></div>'+
      '<p class="small muted">Registre um bloco de cada vez. Só aparece o que é necessário para o tipo escolhido.</p>'+
      modeTabs+builder+
      '<button type="button" class="primary full muay-academy-add" data-action="muay-quick-add">'+
      '+ Adicionar bloco</button></section>'+
      '<section class="card muay-academy-session" aria-labelledby="muay-academy-records">'+
      '<div class="row-between"><h2 id="muay-academy-records" class="section-title">Blocos do treino</h2>'+
      '<span class="pill">'+d.activities.length+' adicionado(s)</span></div>'+
      blocks+
      '<div class="muay-quick-question"><strong>Esforço da sessão (opcional)</strong>'+
      quickChoice([['5','5/10'],['7','7/10'],['9','9/10']],'muay-effort',d.intensity)+'</div>'+
      '<details class="muay-advanced"><summary>Duração, recuperação e observações</summary>'+
      '<div class="muay-academy-number-row mt-12"><div class="field"><label for="muay-duration">Duração total da aula (min)</label>'+
      '<input id="muay-duration" type="number" min="1" max="360" step="1" inputmode="numeric" data-muay-field="duration" value="'+esc(d.duration)+'" placeholder="Ex.: 50"></div>'+
      '<div class="field"><label for="muay-knee">Joelho após a aula</label>'+
      '<select id="muay-knee" data-muay-field="kneePain">'+
      select({'':'Não informado','0':'0 · Sem dor','1':'1','2':'2','3':'3','4':'4','5':'5','6':'6','7':'7','8':'8','9':'9','10':'10'},d.kneePain)+'</select></div></div>'+
      '<div class="muay-quick-question"><strong>Fadiga após a aula</strong>'+
      quickChoice([['normal','Normal'],['moderada','Moderada'],['alta','Alta']],'muay-fatigue',d.fatigue)+'</div>'+
      '<div class="field mt-12"><label for="muay-day">Data</label>'+
      '<input id="muay-day" type="date" data-muay-field="day" value="'+esc(d.day)+'"></div>'+
      '<div class="field mt-12"><label for="muay-notes">Observações</label>'+
      '<textarea id="muay-notes" maxlength="1000" data-muay-field="notes">'+esc(d.notes)+'</textarea></div>'+
      '</details>'+
      '<details class="muay-advanced"><summary>Como isso entra no mapa corporal?</summary>'+
      '<p class="small muted">O mapa pode indicar regiões provavelmente envolvidas em golpes e deslocamentos. '+
      'Não mede ativação, assimetria, fadiga muscular nem converte repetições de Muay Thai em séries de musculação.</p>'+
      '</details>'+
      '<div class="muay-save-actions"><button type="button" class="primary full" data-action="muay-finish"'+
      (d.activities.length?'':' disabled')+'>Salvar treino</button>'+
      '<button type="button" class="button-inline" data-action="muay-cancel">Descartar rascunho</button></div>'+
      '</section>';
  }

  // Avaliação conservadora baseada em esforço relatado, nunca em gasto calórico inferido.
  // Quantidade de golpes e duração não equivalem automaticamente a fadiga fisiológica.
  function readiness(sessions,today,settings={}) {
    const latest=sortedSessions(sessions||[]).find(s=>{
      if(!dateOk(s?.day)||!dateOk(today))return false;
      const days=(Date.parse(today+'T12:00:00Z')-Date.parse(s.day+'T12:00:00Z'))/86400000;
      return days>=0&&days<=2;
    });
    if(!latest)return {level:'unknown',title:'Sem Muay Thai recente para avaliar',
      note:'Registre os exercícios, o esforço percebido e a fadiga para orientar a escolha da próxima sessão.',
      activities:0};
    const days=(Date.parse(today+'T12:00:00Z')-Date.parse(latest.day+'T12:00:00Z'))/86400000;
    const legPain=(latest.kneePain!=null&&Number(latest.kneePain)>0) ||
      (settings.kneePain!==''&&settings.kneePain!=null&&Number(settings.kneePain)>0);
    const high=latest.fatigue==='alta'||Number(latest.intensity)>=9 ||
      (settings.fatigue==='alta');
    const significant=latest.fatigue==='moderada'||Number(latest.intensity)>=7;
    const volume=(latest.activities||[]).filter(a=>a.category==='exhaustion'&&a.unit==='reps'&&Number(a.quantity)>0);
    const combos=(latest.activities||[]).filter(a=>a.category==='combination'&&a.unit==='min'&&Number(a.quantity)>0);
    const kickingExhaustion=volume.some(a=>a.movement==='chute'||a.movement==='joelho'||/chute|perna|joelho/i.test(a.name||''));
    const sparring=(latest.activities||[]).some(a=>a.category==='sparring');
    const nextFocus=sparring?'Houve sparring: considere a intensidade, contato e recuperação antes de repetir rounds.':kickingExhaustion?
      'Como houve exaustão de chutes, prefira mobilidade confortável ou técnica leve de braços, sem repetir alto volume de chutes.':
      combos.length?'Como houve combinações cronometradas, prefira técnica controlada e mobilidade, sem repetir rounds intensos.':
      volume.length?'Como houve exaustão por repetições, prefira técnica leve ou mobilidade em vez de repetir o mesmo volume.':
      'Você pode priorizar técnica de baixa intensidade e mobilidade.';
    if(legPain)return {level:'rest',title:'Evite impactos e treino intenso de pernas',
      note:'Há desconforto relatado no joelho. Prefira recuperação e reavalie os sintomas antes de chutes ou exercícios de pernas. Dor persistente merece avaliação profissional.',
      activities:latest.activities.length,days,volume:volume.length,combos:combos.length};
    if(high&&days<=1)return {level:'rest',title:'Considere descanso ou recuperação leve',
      note:'Fadiga alta ou esforço máximo recente. Amanhã, prefira descanso ou apenas mobilidade confortável. Antes de voltar a golpes intensos, confirme recuperação, sono e ausência de sintomas.',
      activities:latest.activities.length,days,volume:volume.length,combos:combos.length};
    if(significant&&days<=1)return {level:'light',title:'Priorize técnica leve ou recuperação',
      note:'O esforço recente pede cautela. '+nextFocus+' Se ainda houver fadiga, descanse.',
      activities:latest.activities.length,days,volume:volume.length,combos:combos.length};
    if(latest.intensity==null&&(!latest.fatigue||latest.fatigue===''))return {
      level:'unknown',title:'Faltam sinais de recuperação',
      note:'Sem esforço percebido ou fadiga informados, não é possível indicar aumentar a carga amanhã. Registre esses dados para uma orientação mais útil.',
      activities:latest.activities.length,days,volume:volume.length,combos:combos.length};
    return {level:'normal',title:'Treino adaptável à recuperação de hoje',
      note:'Não há sinal de alerta informado. Se estiver recuperado, '+nextFocus+' Alternar focos ou descansar é uma opção; não aumente volume apenas por ter concluído a sessão.',
      activities:latest.activities.length,days,volume:volume.length,combos:combos.length};
  }
  function readinessCard(data) {
    return '<section class="card muay-readiness muay-readiness-'+esc(data.level)+'" aria-label="Orientação de recuperação">'+
      '<p class="section-eyebrow">PRÓXIMA SESSÃO · ORIENTAÇÃO</p><h2>'+esc(data.title)+'</h2>'+
      '<p>'+esc(data.note)+'</p>'+
      (data.activities?'<small>'+data.activities+' atividade(s) na última sessão · '+
         (data.volume||0)+' exercício(s) de exaustão · '+(data.combos||0)+' combinação(ões) cronometradas</small>':'')+
      '</section>';
  }

  function renderPage(muay,today,settings={}){
    const last=sortedSessions(muay.sessions).slice(0,1);
    const guidance=readiness(muay.sessions,today,settings);
    const recovery='<details class="muay-guidance"><summary><span><strong>Recuperação e próximo treino</strong><small>'+esc(guidance.title)+'</small></span><span aria-hidden="true">⌄</span></summary>'+
      readinessCard(guidance)+
      '<section class="card muay-today-check"><h2 class="section-title">Como está sua recuperação hoje?</h2>'+
      '<p class="small muted">Não reutilizamos avaliações de outros dias. Este relato não é diagnóstico.</p>'+
      '<div class="field-row mt-12"><div class="field"><label for="muay-today-fatigue">Fadiga atual</label>'+
      '<select id="muay-today-fatigue" data-recovery-field="fatigue">'+select({normal:'Normal',moderada:'Moderada',alta:'Alta'},settings.fatigue||'normal')+'</select></div>'+
      '<div class="field"><label for="muay-today-knee">Dor no joelho agora</label>'+
      '<select id="muay-today-knee" data-recovery-field="kneePain">'+
      select({'':'Não informado','0':'0 · Sem dor','1':'1 · Mínima','2':'2 · Leve','3':'3 · Moderada','4':'4 · Importante','5':'5+ · Forte'},settings.kneePain??'')+
      '</select></div></div></section></details>';
    return '<p class="eyebrow">Diário de atividades</p><h1 class="page-title">Muay Thai</h1>'+
      '<p class="lead">Registre rapidamente o que fez, sem preencher um formulário longo.</p>'+
      (muay.draft?(muay.draft.place==='academia'&&muay.draft.quick?renderAcademyEditor(muay.draft):renderEditor(muay.draft)):
        '<section class="card muay-start-card"><h2 class="section-title">Registrar treino realizado</h2>'+
        '<p class="small muted">Escolha onde treinou e adicione apenas as atividades que fez.</p>'+
        '<div class="muay-choices mt-12"><button type="button" class="primary" data-action="muay-start" data-place="academia">Aula na academia</button>'+
        '<button type="button" class="secondary" data-action="muay-start" data-place="casa">Treino em casa</button>'+
        '<button type="button" class="ghost" data-action="muay-start" data-place="outro">Outro local</button></div></section>')+
      recovery+
      (!muay.draft?'<div class="section-row"><h2 class="section-title">Último registro</h2><small>'+muay.sessions.length+' no total</small></div>'+
      (last.length?last.map(s=>sessionCard(s)).join(''):'<p class="small muted">Nenhum treino registrado até agora.</p>')+
      '<button type="button" class="secondary full" data-action="navigate" data-to="history">Ver histórico completo</button>':'');
  }
  root.AcademiaMuay = {
    PRESETS, QUICK_MODES, QUICK_MOVEMENTS, QUICK_LIMBS, COMBO_STRIKES,
    SPARRING_EXCHANGE,SPARRING_RULES,SPARRING_CONTACT,
    quickDefaults,validQuick,quickActivity,movementTypes,exposure,
    archive, activity, draft, ensureArchive, validDraft, validSession, legacyReview,
    readiness,readinessCard,
    validArchive, finishDraft, draftFromSession, volumeText, sortedSessions,
    renderPage, historySection, sessionCard,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.AcademiaMuay;
})(typeof globalThis !== 'undefined' ? globalThis : this);
