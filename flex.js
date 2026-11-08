(function installFlex(root) {
  'use strict';
  // Curated offline catalogue. Stable IDs prevent changing the identity of
  // an exercise when an individual workout or a future template is edited.
  const catalog = [
    ['puxada-neutra', 'Puxada alta · pegada neutra', 'A', 'Polia', 'Costas', 3, 8, 12, 5],
    ['remada-unilateral-halter', 'Remada unilateral com halter', 'A', 'Halteres', 'Costas', 3, 8, 12, 2.5, 'kg/halter'],
    ['remada-articulada', 'Remada articulada', 'A', 'Máquina', 'Costas', 3, 8, 12, 5],
    ['pullover-polia', 'Pullover na polia', 'A', 'Polia', 'Costas', 2, 10, 15, 2.5],
    ['face-pull', 'Face pull', 'A', 'Polia', 'Ombros posteriores', 2, 12, 15, 2.5],
    ['rosca-scott', 'Rosca Scott', 'A', 'Máquina / barra', 'Bíceps', 2, 10, 12, 2.5],
    ['crucifixo-cabo', 'Crucifixo no cabo', 'B', 'Polia', 'Peito', 3, 10, 15, 2.5],
    ['supino-maquina', 'Supino na máquina', 'B', 'Máquina', 'Peito', 3, 8, 12, 5],
    ['flexao-solo', 'Flexão de braços (com lastro, se necessário)', 'B', 'Peso corporal', 'Peito', 2, 8, 15, 1, 'kg'],
    ['desenvolvimento-halter', 'Desenvolvimento com halteres', 'B', 'Halteres', 'Ombros', 3, 8, 12, 2.5, 'kg/halter'],
    ['triceps-frances', 'Tríceps francês na polia', 'B', 'Polia', 'Tríceps', 3, 10, 15, 2.5],
    ['agachamento-goblet', 'Agachamento goblet', 'C', 'Halter', 'Quadríceps', 2, 8, 12, 2.5, 'kg', true],
    ['passada-reversa', 'Passada reversa', 'C', 'Halteres', 'Quadríceps', 2, 8, 12, 2.5, 'kg/halter', true],
    ['step-up-baixo', 'Subida em degrau baixo', 'C', 'Banco / degrau', 'Quadríceps', 2, 8, 12, 2.5, 'kg', true],
    ['cadeira-adutora', 'Cadeira adutora', 'C', 'Máquina', 'Adutores', 2, 12, 15, 5],
    ['panturrilha-em-pe', 'Panturrilha em pé', 'C', 'Máquina', 'Panturrilhas', 3, 12, 20, 5],
    ['terra-romeno-halter', 'Levantamento romeno com halteres', 'D', 'Halteres', 'Posteriores / glúteos', 3, 8, 12, 2.5, 'kg/halter'],
    ['flexora-sentada', 'Cadeira flexora sentada', 'D', 'Máquina', 'Posteriores', 3, 10, 15, 5],
    ['gluteo-cabo', 'Extensão de quadril na polia', 'D', 'Polia', 'Glúteos', 2, 12, 15, 2.5],
    ['ponte-gluteo', 'Ponte de glúteos', 'D', 'Solo / peso', 'Glúteos', 3, 10, 15, 2.5],
  ].map(([id,name,group,equipment,muscle,sets,low,high,step,unit='kg',knee=false]) =>
    ({id,name,group,equipment,muscle,sets,low,high,step,unit,knee,mode:'double',active:false}));
  const REASONS = {
    '': 'Prefiro não informar',
    tempo: 'Tempo disponível',
    equipamento: 'Equipamento indisponível',
    fadiga: 'Fadiga / recuperação',
    desconforto: 'Dor ou desconforto',
    preferencia: 'Preferência pessoal',
    outro: 'Outro motivo',
  };
  function ensureDraft(draft) {
    if (!draft || typeof draft !== 'object') return false;
    if (!Array.isArray(draft.plannedIds)) draft.plannedIds = Object.keys(draft.entries || {});
    if (!Array.isArray(draft.skipped)) draft.skipped = [];
    if (!Array.isArray(draft.addedIds)) draft.addedIds = [];
    return true;
  }
  const hasRecordedReps = entry => (entry?.sets || []).some(set =>
    set && set.reps !== '' && set.reps != null && Number(set.reps) > 0);
  const hasWork = entry => (entry?.sets || []).some(set =>
    set && !set.warmup && Number(set.load) > 0 && Number(set.reps) > 0);
  const effectiveSets = entry => (entry?.sets || []).filter(set =>
    set && !set.warmup && Number(set.load) > 0 && Number(set.reps) > 0).length;
  function withdraw(draft,id) {
    if (!ensureDraft(draft) || !Object.hasOwn(draft.entries || {},id)) return {error:'Exercício não encontrado.'};
    const entry=draft.entries[id];
    if (hasRecordedReps(entry)) return {error:'Já existem repetições registradas. Para não perder dados, revise as séries antes de retirar.'};
    const isAdded=draft.addedIds.includes(id);
    if (!isAdded && !draft.skipped.some(item=>item.id===id)) {
      draft.skipped.push({id,reason:'',entry});
    }
    delete draft.entries[id];
    if (isAdded) draft.addedIds=draft.addedIds.filter(value=>value!==id);
    return {skipped:!isAdded};
  }
  function restore(draft,id) {
    if(!ensureDraft(draft) || Object.hasOwn(draft.entries||{},id)) return false;
    const index=draft.skipped.findIndex(item=>item.id===id);
    if(index<0)return false;
    const skipped=draft.skipped.splice(index,1)[0];
    draft.entries[id]=skipped.entry;
    return true;
  }
  function setReason(draft,id,reason) {
    if(!ensureDraft(draft) || !Object.hasOwn(REASONS,reason)) return false;
    const item=draft.skipped.find(row=>row.id===id);
    if(!item)return false;
    item.reason=reason;return true;
  }
  function prepareCatalog(id,existing) {
    const known=existing.find(ex=>ex.id===id);
    if (known) return {exercise:known,isNew:false};
    const c=catalog.find(item=>item.id===id);
    if (!c) return null;
    const {equipment,muscle,...exercise}=c;
    return {exercise:{...exercise},isNew:true};
  }
  function addToDraft(draft,id,exercise,entry) {
    if (!ensureDraft(draft) || Object.hasOwn(draft.entries||{},id) ||
        draft.skipped.some(s=>s.id===id) || Object.keys(draft.entries).length>=30) return false;
    draft.entries[id]=entry;
    if(!draft.addedIds.includes(id))draft.addedIds.push(id);
    return true;
  }
  function options(exercises=[],draft=null,query='',group='all') {
    const active=new Set(Object.keys(draft?.entries||{}));
    for (const s of draft?.skipped||[]) active.add(s.id);
    const merged=new Map();
    for (const item of catalog)merged.set(item.id,{...item});
    for (const item of exercises) {
      const previous=merged.get(item.id);
      merged.set(item.id,{...previous,...item,equipment:previous?.equipment||'Ficha pessoal',
        muscle:previous?.muscle||({A:'Costas / bíceps',B:'Peito / ombros / tríceps',C:'Quadríceps',D:'Posteriores / glúteos'}[item.group]||'Outro')});
    }
    const term=String(query).toLocaleLowerCase('pt-BR').trim();
    return [...merged.values()].filter(item=>!active.has(item.id) &&
      (group==='all' || item.group===group) &&
      (!term || [item.name,item.muscle,item.equipment].some(v=>String(v||'').toLocaleLowerCase('pt-BR').includes(term))))
      .sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
  }
  function skippedForSave(draft) {
    return (Array.isArray(draft?.skipped)?draft.skipped:[])
      .filter(item=>typeof item?.id==='string' && Object.hasOwn(REASONS,item.reason||''))
      .map(item=>({id:item.id,reason:item.reason||''}));
  }
  const dayTime=day=>typeof day==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(day)?Date.parse(day+'T12:00:00Z'):NaN;
  function dayAge(today,day) {
    const a=dayTime(today),b=dayTime(day);
    const diff=(a-b)/86400000;
    return Number.isFinite(diff)&&Number.isInteger(diff)?diff:NaN;
  }
  const distinctDays=(sessions)=>new Set(sessions.map(s=>s.day)).size;
  // Evidence-informed but unvalidated product triggers (not clinical cutoffs).
  // Missing records are not counted as skipped exercises.
  function insights({strengthSessions=[],muaySessions=[],exercises=[],today='',draft=null,settings={}}={}) {
    const actual=(strengthSessions||[]).filter(s=>(s.entries||[]).some(hasWork));
    const recent=actual.filter(s=>{const n=dayAge(today,s.day);return n>=0&&n<14;});
    const prior=actual.filter(s=>{const n=dayAge(today,s.day);return n>=14&&n<28;});
    const active7=distinctDays(recent.filter(s=>dayAge(today,s.day)<7));
    const last14=distinctDays(recent),before14=distinctDays(prior);
    const recentMuay=(muaySessions||[]).filter(s=>{const n=dayAge(today,s.day);return n>=0&&n<7;}).length;
    const signals=[];
    if (before14>=3 && last14<=Math.floor(before14/2)) {
      signals.push({kind:'frequency',tone:'notice',title:'Seu ritmo de musculação mudou',
        detail:`Nos 14 dias mais recentes houve ${last14} dia(s) de musculação; nos 14 anteriores foram ${before14}.`,
        suggestion:'Considere uma rotina mais curta e repetível (por exemplo, dois ou três dias com exercícios essenciais), sem compensar sessões perdidas com volume excessivo.'});
    } else if(before14>=2 && last14===0) {
      signals.push({kind:'frequency',tone:'notice',title:'Há um intervalo maior entre as sessões de força',
        detail:'Não há musculação salva nos últimos 14 dias, embora existam sessões no período anterior.',
        suggestion:'Ao retomar, priorize uma sessão viável e gradual. Se a rotina A/B/C/D estiver difícil, considere reorganizar a distribuição dos movimentos.'});
    }
    const recent28=actual.filter(s=>{const n=dayAge(today,s.day);return n>=0&&n<28;});
    const exposures=new Map();
    for (const session of recent28) {
      if (!Array.isArray(session.plannedIds)) continue; // older data did not track intention
      const skipped=Array.isArray(session.skipped)?session.skipped:[];
      const performed=new Set((session.entries||[]).filter(hasWork).map(en=>en.id));
      for (const id of session.plannedIds) {
        const skip=skipped.find(s=>s.id===id);
        if(!performed.has(id)&&!skip)continue; // unknown, never call a skip
        const record=exposures.get(id)||{opportunities:0,omissions:0,reasons:[]};
        record.opportunities++;
        if(skip){record.omissions++;record.reasons.push(skip.reason||'');}
        exposures.set(id,record);
      }
    }
    const nameFor=id=>exercises.find(e=>e.id===id)?.name || catalog.find(e=>e.id===id)?.name || 'Exercício registrado';
    for(const [id,row] of exposures) {
      if(row.opportunities<3 || row.omissions<2 || row.omissions/row.opportunities<.5)continue;
      const frequencies=row.reasons.reduce((map,reason)=>map.set(reason,(map.get(reason)||0)+1),new Map());
      const common=[...frequencies].sort((a,b)=>b[1]-a[1])[0]?.[0]||'';
      let suggestion='Se esse exercício não cabe bem na rotina, considere uma variação da mesma função ou redistribua as séries para uma sessão mais viável.';
      if(common==='equipamento')suggestion='O equipamento pode ser um obstáculo. Escolha uma alternativa disponível do catálogo, sem perder o registro do movimento anterior.';
      if(common==='tempo')suggestion='Talvez uma sessão menor, com menos movimentos e foco nas séries prioritárias, seja mais fácil de manter.';
      if(common==='desconforto')suggestion='Evite insistir no movimento doloroso ou aumentar o volume; avalie a causa com um profissional qualificado.';
      if(common==='fadiga')suggestion='Reavalie descanso e distribuição do treino. Não é necessário compensar séries puladas na sessão seguinte.';
      signals.push({kind:'skip',tone:'notice',exerciseId:id,title:`${nameFor(id)} tem sido frequentemente retirado`,
        detail:`Você marcou que não fez este exercício em ${row.omissions} de ${row.opportunities} sessões com registro explícito nos últimos 28 dias.`,
        suggestion});
    }
    const recentGroups=new Set(recent28.map(s=>s.planId));
    if (recent28.length>=6) {
      for(const id of ['A','C','B','D']){
        if(recentGroups.has(id))continue;
        signals.push({kind:'group',tone:'notice',group:id,title:`Bloco ${id} não aparece nos treinos recentes`,
          detail:`Foram salvas ${recent28.length} sessões de musculação nos últimos 28 dias, nenhuma identificada como bloco ${id}.`,
          suggestion:'Verifique se os movimentos dessa região muscular estão sendo realizados em outros blocos. Se não, considere uma distribuição mais simples das sessões.'});
      }
    }
    const todayMuay=(muaySessions||[]).some(s=>s.day===today);
    const kneePain=settings.kneePain;
    const protects=(kneePain!=='' && kneePain!==undefined && kneePain!==null && Number(kneePain)>0)
      || settings.fatigue==='alta';
    const currentWork=Object.values(draft?.entries||{}).reduce((sum,en)=>sum+effectiveSets(en),0);
    return {
      objective:'recomposition',
      summary:{strengthDays7:active7,strengthDays14:last14,strengthDaysPrevious14:before14,muaySessions7:recentMuay,completedSetsToday:currentWork},
      signals:signals.slice(0,5), // avoid excessive reminders
      sameDayMuay:todayMuay,protects,
      note:protects?'Recuperação ou desconforto informado: não proponha volume adicional automaticamente.':
        todayMuay?'Muay Thai registrado hoje: considere a fadiga adicional antes de aumentar o volume.':
        'A disposição do dia, isoladamente, não prova que acrescentar séries melhorará seus resultados.',
    };
  }
  root.ForjaFlex={catalog,reasons:REASONS,ensureDraft,hasRecordedReps,hasWork,effectiveSets,
    withdraw,restore,setReason,prepareCatalog,addToDraft,options,skippedForSave,dayAge,insights};
  if(typeof module!=='undefined'&&module.exports)module.exports=root.ForjaFlex;
})(typeof globalThis !== 'undefined' ? globalThis : this);
