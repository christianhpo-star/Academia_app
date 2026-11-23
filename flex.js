(function installFlex(root) {
  'use strict';
  const SETS = typeof module !== 'undefined' && module.exports
    ? require('./training-sets.js') : root.ForjaTrainingSets;
  // Curated offline catalogue. Stable IDs prevent changing the identity of
  // an exercise when an individual workout or a future template is edited.
  const catalog = [
    ['puxada-neutra', 'Puxada alta · pegada neutra', 'A', 'Polia', 'Costas', 3, 8, 12, 5, 'kg', false,
      ['puxada neutra','puxada alta neutra','pulldown neutral grip']],
    ['remada-unilateral-halter', 'Remada unilateral com halter', 'A', 'Halteres', 'Costas', 3, 8, 12, 2.5, 'kg/halter'],
    ['remada-articulada', 'Remada articulada', 'A', 'Máquina', 'Costas', 3, 8, 12, 5],
    ['pullover-polia', 'Pullover na polia', 'A', 'Polia', 'Costas', 2, 10, 15, 2.5],
    ['face-pull', 'Face pull', 'A', 'Polia', 'Ombros posteriores', 2, 12, 15, 2.5],
    ['rosca-scott', 'Rosca Scott', 'A', 'Máquina / barra', 'Bíceps', 2, 10, 12, 2.5],
    // Puxar / deltóide posterior: variações opcionais, não entram automaticamente na ficha.
    ['voador-inverso', 'Voador inverso (peck deck)', 'A', 'Máquina', 'Ombros posteriores', 3, 12, 15, 5,
      'kg', false, ['voador invertido','peck deck inverso','crucifixo inverso na máquina','reverse peck deck']],
    ['crucifixo-inverso-halter', 'Crucifixo inverso com halteres', 'A', 'Halteres / banco', 'Ombros posteriores', 3, 12, 15, 2.5,
      'kg/halter', false, ['elevação posterior','elevação posterior inclinado','rear delt fly halter']],
    ['crucifixo-inverso-polia', 'Crucifixo inverso na polia', 'A', 'Polia', 'Ombros posteriores', 3, 12, 15, 2.5,
      'kg', false, ['crucifixo invertido cabo','cross inverso','reverse cable fly']],
    ['remada-peito-apoiado', 'Remada com peito apoiado', 'A', 'Banco inclinado / halteres', 'Costas', 3, 8, 12, 2.5,
      'kg/halter', false, ['remada apoiada','remada banco inclinado','chest supported row']],
    ['puxada-unilateral-polia', 'Puxada unilateral na polia alta', 'A', 'Polia', 'Costas', 3, 10, 12, 2.5,
      'kg', false, ['pulldown unilateral','puxada alta um braço']],
    ['rosca-inclinada-halter', 'Rosca inclinada com halteres', 'A', 'Halteres / banco inclinado', 'Bíceps', 3, 10, 12, 2.5,
      'kg/halter', false, ['rosca bíceps banco inclinado','incline dumbbell curl']],
    ['rosca-polia-baixa', 'Rosca direta na polia baixa', 'A', 'Polia', 'Bíceps', 3, 10, 15, 2.5,
      'kg', false, ['rosca no cabo','rosca bíceps polia','cable curl']],
    ['crucifixo-cabo', 'Crucifixo no cabo', 'B', 'Polia', 'Peito', 3, 10, 15, 2.5],
    ['supino-maquina', 'Supino na máquina', 'B', 'Máquina', 'Peito', 3, 8, 12, 5],
    ['supino-canadense', 'Supino canadense (declinado) com barra', 'B', 'Barra / banco declinado', 'Peito', 3, 8, 12, 2.5],
    ['crossover-polia', 'Crossover na polia alta', 'B', 'Polia', 'Peito', 3, 10, 15, 2.5],
    ['desenvolvimento-halter', 'Desenvolvimento com halteres', 'B', 'Halteres', 'Ombros', 3, 8, 12, 2.5, 'kg/halter'],
    ['triceps-frances', 'Tríceps francês na polia', 'B', 'Polia', 'Tríceps', 3, 10, 15, 2.5],
    // Empurrar / peito / deltoide lateral: técnicas e equipamentos distintos.
    ['elevacao-lateral-polia', 'Elevação lateral unilateral na polia', 'B', 'Polia', 'Ombros', 3, 12, 15, 2.5,
      'kg', false, ['elevação lateral no cabo','elevação lateral cabo','cable lateral raise']],
    ['desenvolvimento-maquina', 'Desenvolvimento de ombros na máquina', 'B', 'Máquina', 'Ombros', 3, 8, 12, 5,
      'kg', false, ['shoulder press máquina','desenvolvimento sentado máquina']],
    ['crucifixo-inclinado-halter', 'Crucifixo inclinado com halteres', 'B', 'Halteres / banco inclinado', 'Peito', 3, 10, 15, 2.5,
      'kg/halter', false, ['fly inclinado','incline dumbbell fly']],
    ['supino-inclinado-maquina', 'Supino inclinado na máquina', 'B', 'Máquina', 'Peito', 3, 8, 12, 5,
      'kg', false, ['chest press inclinado','máquina supino inclinado']],
    ['triceps-unilateral-polia', 'Tríceps unilateral na polia', 'B', 'Polia', 'Tríceps', 3, 10, 15, 2.5,
      'kg', false, ['tríceps um braço no cabo','extensão de tríceps unilateral']],
    ['triceps-coice-halter', 'Tríceps coice com halter', 'B', 'Halteres', 'Tríceps', 2, 10, 15, 2.5,
      'kg/halter', false, ['tríceps kickback','coice tríceps']],
    ['agachamento-goblet', 'Agachamento goblet', 'C', 'Halter', 'Quadríceps', 2, 8, 12, 2.5, 'kg', true],
    ['passada-reversa', 'Passada reversa', 'C', 'Halteres', 'Quadríceps', 2, 8, 12, 2.5, 'kg/halter', true],
    ['step-up-baixo', 'Subida em degrau baixo', 'C', 'Banco / degrau', 'Quadríceps', 2, 8, 12, 2.5, 'kg', true],
    ['cadeira-adutora', 'Cadeira adutora', 'C', 'Máquina', 'Adutores', 2, 12, 15, 5],
    ['panturrilha-em-pe', 'Panturrilha em pé', 'C', 'Máquina', 'Panturrilhas', 3, 12, 20, 5],
    // Membros inferiores: sinalizar dor no joelho nos movimentos relevantes.
    ['agachamento-smith', 'Agachamento no Smith', 'C', 'Máquina / barra guiada', 'Quadríceps / glúteos', 3, 8, 12, 5,
      'kg', true, ['agachamento guiado','agachamento smith machine']],
    ['leg-press-horizontal', 'Leg press horizontal', 'C', 'Máquina', 'Quadríceps / glúteos', 3, 10, 15, 5,
      'kg', true, ['leg press sentado','leg horizontal']],
    ['extensora-unilateral', 'Cadeira extensora unilateral', 'C', 'Máquina', 'Quadríceps', 2, 10, 15, 2.5,
      'kg', true, ['extensão unilateral joelho','extensora uma perna']],
    ['panturrilha-unilateral-pe', 'Panturrilha unilateral em pé', 'C', 'Halter / apoio', 'Panturrilhas', 3, 12, 20, 2.5,
      'kg/halter', false, ['elevação unilateral de panturrilha','calf raise unilateral']],
    ['aducao-polia', 'Adução de quadril na polia', 'C', 'Polia', 'Adutores', 2, 12, 15, 2.5,
      'kg', false, ['adução cabo','adutor em pé','hip adduction cable']],
    ['terra-romeno-halter', 'Levantamento romeno com halteres', 'D', 'Halteres', 'Posteriores / glúteos', 3, 8, 12, 2.5, 'kg/halter'],
    ['flexora-sentada', 'Cadeira flexora sentada', 'D', 'Máquina', 'Posteriores', 3, 10, 15, 5],
    ['gluteo-cabo', 'Extensão de quadril na polia', 'D', 'Polia', 'Glúteos', 2, 12, 15, 2.5],
    ['ponte-gluteo', 'Ponte de glúteos', 'D', 'Solo / peso', 'Glúteos', 3, 10, 15, 2.5],
    ['flexora-unilateral', 'Mesa flexora unilateral', 'D', 'Máquina', 'Posteriores', 3, 10, 15, 2.5,
      'kg', false, ['flexão de joelho unilateral','leg curl uma perna']],
    ['hip-thrust-maquina', 'Elevação pélvica na máquina', 'D', 'Máquina', 'Glúteos', 3, 8, 12, 5,
      'kg', false, ['hip thrust máquina','glute bridge máquina']],
    ['abducao-polia', 'Abdução de quadril na polia', 'D', 'Polia', 'Abdutores / glúteos', 2, 12, 20, 2.5,
      'kg', false, ['abdutor polia','abdução em pé no cabo','cable hip abduction']],
    ['pull-through-polia', 'Pull-through na polia', 'D', 'Polia', 'Glúteos / posteriores', 3, 10, 15, 2.5,
      'kg', false, ['puxada entre as pernas','cable pull through']],
    ['flexora-em-pe', 'Flexora em pé na máquina', 'D', 'Máquina', 'Posteriores', 3, 10, 15, 2.5,
      'kg', false, ['flexora vertical','standing leg curl']],

    // Ombros e trapézio: alternativas opcionais em blocos existentes, mas
    // exploráveis por categoria muscular independente da divisão A/B.
    ['encolhimento-halteres','Encolhimento de ombros com halteres','A','Halteres','Trapézio superior',2,10,15,2.5,'kg/halter',false,['shrug','trapézio halteres','encolhimento halter']],
    ['encolhimento-barra','Encolhimento de ombros com barra','A','Barra','Trapézio superior',2,10,15,2.5,'kg',false,['shrug barra','trapezio barra']],
    ['encolhimento-smith','Encolhimento de ombros no Smith','A','Barra guiada','Trapézio superior',2,10,15,5,'kg',false,['shrug smith','encolhimento guiado']],
    ['face-pull-alto','Face pull com cotovelos altos','A','Polia / corda','Deltoide posterior / trapézio médio',2,12,20,2.5,'kg',false,['face pull alto','ombro posterior cabo']],
    ['elevacao-y-inclinada','Elevação em Y no banco inclinado','A','Banco inclinado / halteres','Trapézio médio / estabilidade escapular',2,12,20,1,'kg/halter',false,['y raise','elevação y','trapezio inferior']],
    ['crucifixo-inverso-banco','Crucifixo inverso no banco inclinado','A','Banco / halteres','Deltoide posterior / trapézio médio',2,12,20,2.5,'kg/halter',false,['voador inverso banco','rear delt fly banco']],
    ['elevacao-lateral-maquina','Elevação lateral na máquina','B','Máquina','Deltoide lateral',2,10,20,2.5,'kg',false,['elevação lateral máquina','ombro lateral máquina']],
    ['elevacao-frontal-polia','Elevação frontal na polia','B','Polia','Deltoide anterior',2,10,15,2.5,'kg',false,['front raise','ombro frontal polia']],
    ['desenvolvimento-barra','Desenvolvimento de ombros com barra','B','Barra / banco','Deltoide anterior / lateral / tríceps',2,8,12,2.5,'kg',false,['shoulder press barra','overhead press']],
    ['remada-alta-polia','Remada alta na polia com corda','B','Polia','Deltoide lateral / trapézio superior',2,10,15,2.5,'kg',false,['upright row cable','remada alta cabo']],
    ['abdominal-polia', 'Abdominal na polia', 'A', 'Polia alta / corda', 'Abdômen', 2, 10, 15, 2.5,
      'kg', false, ['crunch na polia','abdominal com corda','cable crunch','core']],
    ['pallof-press', 'Pallof press na polia', 'B', 'Polia', 'Abdômen / oblíquos', 2, 10, 12, 2.5,
      'kg', false, ['pallof','antirrotação','anti rotação','core','oblíquos']],
    // Cobertura do tronco: movimentos diretos e combinados, todos opcionais.
    ['abdominal-bicicleta', 'Abdominal bicicleta alternado', 'A', 'Solo / colchonete', 'Abdômen / oblíquos', 2, 10, 20, 1, 'kg', false, ['bicicleta','crunch bicicleta','core']],
    ['elevacao-joelhos-suspenso', 'Elevação de joelhos suspenso', 'A', 'Barra / apoio', 'Abdômen', 2, 8, 15, 1, 'kg', false, ['joelhos na barra','elevação de joelhos','hanging knee raise']],
    ['flexao-lateral-polia', 'Flexão lateral do tronco na polia', 'A', 'Polia', 'Oblíquos / abdômen', 2, 10, 15, 2.5, 'kg', false, ['oblíquo polia','side bend cabo']],
    ['dead-bug', 'Dead bug alternado', 'B', 'Solo / colchonete', 'Abdômen / estabilidade', 2, 10, 15, 1, 'kg', false, ['dead bug','contralateral','core']],
    ['woodchop-polia', 'Woodchop na polia (diagonal)', 'B', 'Polia', 'Oblíquos / abdômen', 2, 10, 15, 2.5, 'kg', false, ['lenhador polia','diagonal cabo','cable wood chop']],
    ['panturrilha-smith', 'Panturrilha em pé no Smith', 'C', 'Barra guiada', 'Panturrilhas', 3, 10, 20, 2.5, 'kg', false, ['elevação calcanhares smith','calf raise smith']],
    ['panturrilha-sentada-maquina', 'Panturrilha sentada na máquina', 'D', 'Máquina', 'Panturrilhas', 3, 12, 20, 5, 'kg', false, ['sóleo','seated calf raise']],
    ['agachamento-sumo-halter', 'Agachamento sumô com halter', 'D', 'Halter', 'Glúteos / adutores / quadríceps', 2, 8, 12, 2.5, 'kg', true, ['agachamento sumô goblet','sumo dumbbell']],
    ['passada-lateral-halter', 'Passada lateral com halter', 'D', 'Halteres', 'Abdutores / glúteos / quadríceps', 2, 8, 12, 2.5, 'kg/halter', true, ['afundo lateral','lateral lunge']],
    ['extensao-lombar-45', 'Extensão de quadril no banco 45°', 'D', 'Banco 45°', 'Glúteos / posteriores (lombar estabiliza)', 2, 10, 15, 1, 'kg', false, ['banco romano','extensão 45','hip extension']],
  ].map(([id,name,group,equipment,muscle,sets,low,high,step,unit='kg',knee=false,aliases=[]]) =>
    ({id,name,group,equipment,muscle,sets,low,high,step,unit,knee,aliases,mode:'double',active:false,
      ...(['pallof-press','abdominal-bicicleta','flexao-lateral-polia','dead-bug','woodchop-polia','passada-lateral-halter'].includes(id)?{repPerSide:true}:{}),
      ...(['abdominal-bicicleta','elevacao-joelhos-suspenso','dead-bug','extensao-lombar-45'].includes(id)?{mode:'bodyweight',bodyweight:true}:{}),
      ...(['abdominal-polia','pallof-press','abdominal-bicicleta','elevacao-joelhos-suspenso','flexao-lateral-polia','dead-bug','woodchop-polia'].includes(id)?{complement:'abdomen'}:{})}));
  const REASONS = {
    '': 'Prefiro não informar',
    tempo: 'Tempo disponível',
    equipamento: 'Equipamento indisponível',
    'sem-registro': 'Sem repetições registradas',
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
  const hasWork = entry => SETS.workSets(entry).length > 0;
  const effectiveSets = entry => SETS.workSets(entry).length;
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
      merged.set(item.id,{...previous,...item,equipment:previous?.equipment||item.equipment||'Ficha pessoal',
        muscle:previous?.muscle||item.muscle||({A:'Costas / bíceps',B:'Peito / ombros / tríceps',C:'Quadríceps',D:'Posteriores / glúteos'}[item.group]||'Outro')});
    }
    const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').trim();
    const term=normalize(query);
    return [...merged.values()].filter(item=>!active.has(item.id) &&
      (group==='all' || item.group===group) &&
      (!term || [item.name,item.muscle,item.equipment,...(item.aliases||[])].some(v=>normalize(v).includes(term))))
      .sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
  }
  // Exercícios sem repetições são explicitamente pulados ao finalizar uma sessão
  // com trabalho efetivo. Cargas pré-preenchidas são apenas referências.
  // Sem completedEntries, preserva o contrato antigo para omissões manuais.
  function skippedForSave(draft,completedEntries=null) {
    const skipped=(Array.isArray(draft?.skipped)?draft.skipped:[])
      .filter(item=>typeof item?.id==='string' && Object.hasOwn(REASONS,item.reason||''))
      .map(item=>({id:item.id,reason:item.reason||''}));
    if(!Array.isArray(completedEntries))return skipped;
    const performed=new Set(completedEntries.map(entry=>entry?.id));
    const seen=new Set(skipped.map(entry=>entry.id));
    for(const entry of Object.values(draft?.entries||{})){
      if(!entry || typeof entry.id!=='string' || performed.has(entry.id) || seen.has(entry.id))continue;
      // Série só com carga sugerida (sem reps) não foi executada.
      if(hasRecordedReps(entry))continue;
      skipped.push({id:entry.id,reason:'sem-registro',automatic:true});
      seen.add(entry.id);
    }
    return skipped;
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
    // Detect longer between-session gaps only when there are enough actual
    // completed days to compare; never infer a missed appointment from silence.
    const days= [...new Set(actual.map(s=>s.day))]
      .filter(day=>{const age=dayAge(today,day);return age>=0&&age<70;})
      .sort();
    if(days.length>=7 && !signals.some(s=>s.kind==='frequency')){
      const gaps=days.slice(1).map((day,i)=>dayAge(day,days[i]));
      const mean=rows=>rows.reduce((sum,v)=>sum+v,0)/rows.length;
      const latest=mean(gaps.slice(-3));
      const previous=mean(gaps.slice(-6,-3));
      if(Number.isFinite(latest) && latest>=4 && latest>previous*1.5){
        signals.push({kind:'spacing',tone:'notice',title:'Os intervalos entre sessões aumentaram',
          detail:`A média dos últimos 3 intervalos registrados foi de ${latest.toFixed(1).replace('.',',')} dias, frente a ${previous.toFixed(1).replace('.',',')} dias nos 3 anteriores.`,
          suggestion:'Se o espaçamento não foi planejado, considere uma programação de menos sessões e mais fácil de repetir. Não é necessário recuperar sessões antigas em um único treino.'});
      }
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
