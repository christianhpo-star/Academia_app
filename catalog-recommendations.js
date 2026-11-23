/* FORJA — optional catalog advice based on local recorded work, never a clinical dose.
 * The ACSM 2026 overview finds volume responsive but no universally superior
 * rep range; Pelland et al. (2026) differentiate direct vs indirect sets.
 * Recommendations are descriptive; accepting one never edits a saved plan. */
(function installCatalogRecommendations(root) {
  'use strict';
  const node=typeof module!=='undefined'&&module.exports;
  const BAL=root.ForjaTrainingBalance||(node?require('./training-balance.js'):null);
  const A=root.ForjaExerciseAnatomy||(node?require('./exercise-anatomy.js'):null);
  const H=root.ForjaMuscleHistory||(node?require('./muscle-history.js'):null);
  const SETS=root.ForjaTrainingSets||(node?require('./training-sets.js'):null);
  const F=root.ForjaFlex||(node?require('./flex.js'):null);
  const isValidDate=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v);
  const since=(today,day)=>isValidDate(today)&&isValidDate(day)?
    Math.round((Date.parse(today+'T12:00:00Z')-Date.parse(day+'T12:00:00Z'))/86400000):NaN;
  const GOAL_LABELS=Object.freeze({
    recomposition:'Recomposição corporal',
    fat_loss:'Perda de gordura com preservação muscular',
    muscle_gain:'Ganho de massa muscular',
    maintenance:'Manutenção e consistência'
  });
  // Guards against suggesting optional work on top of work already completed.
  // These are deliberately conservative product heuristics, NOT prescribed
  // minimum/maximum weekly volumes for individual heads of the shoulder.
  const GUARDS=Object.freeze({
    recomposition:{day:4,week:10},
    fat_loss:{day:3,week:8},
    muscle_gain:{day:5,week:12},
    maintenance:{day:3,week:8},
  });
  const VARIANTS=Object.freeze({
    'encolhimento-halteres':['easy','free','Halteres e trajeto simples'],
    'encolhimento-smith':['easy','machine','Trajeto guiado'],
    'encolhimento-barra':['regular','free','Barra com controle'],
    'encolhimento-polia':['easy','machine','Alternativa na polia'],
    'face-pull':['easy','machine','Controle escapular'],
    'face-pull-alto':['regular','machine','Posterior e trapézio médio'],
    'face-pull-elastico':['easy','home','Opção para casa'],
    'elevacao-y-inclinada':['regular','free','Cargas leves e controle'],
    'elevacao-y-elastico':['easy','home','Opção para casa'],
    'crucifixo-inverso-banco':['easy','free','Banco estabiliza o tronco'],
    'crucifixo-inverso-elastico':['easy','home','Opção para casa'],
    'voador-inverso':['easy','machine','Máquina estável'],
    'crucifixo-inverso-halter':['regular','free','Halteres e banco'],
    'crucifixo-inverso-polia':['regular','machine','Tensão por cabo'],
    'elevacao-lateral':['easy','free','Isolamento simples'],
    'elevacao-lateral-maquina':['easy','machine','Máquina estável'],
    'elevacao-lateral-sentado':['easy','free','Banco e halteres'],
    'elevacao-lateral-polia':['regular','machine','Tensão por cabo'],
    'elevacao-lateral-unilateral-polia':['regular','machine','Um braço por vez'],
    'elevacao-frontal-polia':['regular','machine','Deltoide anterior'],
    'elevacao-frontal-halteres':['easy','free','Halteres simples'],
    'desenvolvimento-halter':['regular','free','Pressão com halteres'],
    'desenvolvimento-halter-sentado':['easy','free','Encosto para estabilidade'],
    'desenvolvimento-maquina':['easy','machine','Trajeto guiado'],
    'desenvolvimento-maquina-neutro':['easy','machine','Pegada confortável'],
    'desenvolvimento-barra':['regular','free','Pressão com barra'],
    'remada-alta':['regular','free','Amplitude confortável'],
    'remada-alta-polia':['regular','machine','Corda e amplitude confortável'],
  });
  function variant(exercise){
    const row=VARIANTS[exercise?.id];
    return row?{difficulty:row[0],setting:row[1],tip:row[2]}:null;
  }
  function resolveGoal(settings={},nutritionGoal=''){
    const mode=settings?.goalMode;
    if(['recomposition','fat_loss','muscle_gain','maintenance'].includes(mode))return mode;
    const nutrition={recomposition:'recomposition',loss:'fat_loss',gain:'muscle_gain',maintain:'maintenance'};
    return nutrition[nutritionGoal]||'recomposition';
  }
  // Counts only executed, non-warmup sets with valid load and reps, across
  // completed sessions in the previous 7 days plus the currently open draft.
  // Planned blank rows and Muay activities do not become strength sets.
  function workload({strengthSessions=[],draft=null,today='',muaySessions=[]}={}){
    const out={today:{exercises:0,sets:0},week:{exercises:0,sets:0},
      byRegion:{},muayToday:0,muayWeek:0,unmappedSets:0};
    if(!isValidDate(today)||Number.isNaN(since(today,today)))return out;
    const todayIds=new Set(),weekIds=new Set(),seenSessions=new Set();
    function count(entries,day,skipped=[]){
      const age=since(today,day);
      if(!Number.isFinite(age)||age<0||age>=7)return;
      const excluded=new Set((skipped||[]).map(x=>typeof x==='string'?x:x?.id));
      for(const entry of entries||[]){
        if(!entry?.id||excluded.has(entry.id)||entry.skipped===true||entry.status==='skipped')continue;
        const n=SETS?.workSets?.(entry)?.length||0;
        if(n===0)continue;
        out.week.sets+=n;weekIds.add(entry.id);
        if(age===0){out.today.sets+=n;todayIds.add(entry.id);}
        const anatomy=A?.describe?.(entry.id);
        const direct=new Set(anatomy?.main||[]);
        const indirect=new Set((anatomy?.assist||[]).filter(x=>!direct.has(x)));
        if(!direct.size&&!indirect.size){out.unmappedSets+=n;continue;}
        for(const [region,part] of [...[...direct].map(id=>[id,1]),...[...indirect].map(id=>[id,0.5])]){
          const row=out.byRegion[region]||(out.byRegion[region]={
            today:0,week:0,yesterday:0,directToday:0,directWeek:0,lastDay:null
          });
          row.week+=n*part;
          if(part===1)row.directWeek+=n;
          if(age===0){row.today+=n*part;if(part===1)row.directToday+=n;}
          if(age===1)row.yesterday+=n*part;
          if(!row.lastDay||day>row.lastDay)row.lastDay=day;
        }
      }
    }
    for(const [index,session] of (strengthSessions||[]).entries()){
      const key=typeof session?.id==='string'&&session.id?session.id:null;
      if(key&&seenSessions.has(key))continue;
      if(key)seenSessions.add(key);
      count(session?.entries,session?.day,session?.skipped);
    }
    if(draft?.entries)count(Object.values(draft.entries),today,draft.skipped);
    out.today.exercises=todayIds.size;out.week.exercises=weekIds.size;
    for(const session of muaySessions||[]){
      const age=since(today,session?.day);
      if(Number.isFinite(age)&&age>=0&&age<7){out.muayWeek++;if(age===0)out.muayToday++;}
    }
    return out;
  }
  function status({strengthSessions=[],muaySessions=[],exercises=[],draft=null,settings={},today='',nutritionGoal=''}={}) {
    const balance=BAL?.evaluate?.({strengthSessions,muaySessions,exercises,draft,settings,today})||
      {ready:false,alerts:[],recommendations:[],message:'Registros insuficientes.'};
    const byRegion=new Map((balance.alerts||[]).map((x,i)=>[x.id,{...x,rank:i}]));
    // The home/session alert list is intentionally capped at six; the catalog
    // must still inspect the other reviewed anatomical regions (e.g. trapezius).
    if(balance.ready){
      const long=H?.analyze?.({strengthSessions,today,days:30});
      const anatomyRegions=new Set((F?.options?.(exercises,null)||exercises||[]).flatMap(ex=>A?.describe?.(ex.id)?.main||[]));
      for(const id of anatomyRegions){
        if(byRegion.has(id))continue;
        const row=long?.byId?.[id];
        if(!row||row.directSets>0)continue;
        const last=BAL?.lastDirect?.(id,strengthSessions,today)||null;
        const age=last?since(today,last):null;
        const reason=age!=null&&age>=21?age+' dias sem série direta registrada':
          'Sem série direta registrada nos últimos 30 dias';
        byRegion.set(id,{id,label:row.label,reason,direct30:row.directSets,
          indirect30:row.indirectSets,rank:6+byRegion.size});
      }
    }
    const recent=H?.analyze?.({strengthSessions,today,days:7});
    const totalReport=H?.analyze?.({strengthSessions,today,days:30});
    // The muscle-body map already treats auxiliary sets fractionally.
    // A region with high indirect work should not receive a misleading
    // "insufficient stimulus" badge solely because direct sets are zero.
    const positives=(totalReport?.rows||[]).map(row=>row.total)
      .filter(value=>Number.isFinite(value)&&value>0).sort((a,b)=>a-b);
    const median=positives.length?positives[Math.floor(positives.length/2)]:0;
    const goal=resolveGoal(settings,nutritionGoal);
    return {ready:!!balance.ready,reason:balance.message||'',caution:balance.caution||'',
      alerts:balance.alerts||[],recent,byRegion,totals:totalReport?.byId||{},medianRecorded:median,
      goal,goalLabel:GOAL_LABELS[goal],workload:workload({strengthSessions,muaySessions,draft,today})};
  }
  function forExercise(ex,context) {
    if(!ex||!context?.ready)return null;
    const main=A?.describe?.(ex.id)?.main||[];
    const candidates=main.map(id=>context.byRegion.get(id)).filter(Boolean)
      .filter(alert=>{
        const total=context.totals?.[alert.id]?.total||0;
        const actual=context.workload?.byRegion?.[alert.id]||{today:0,week:0};
        const guard=GUARDS[context.goal]||GUARDS.recomposition;
        // Do not badge a deficit in a region already trained sufficiently
        // TODAY or in the previous 7 days. These are conservative guardrails,
        // not universal set targets for individual deltoid/trapezius regions.
        if(actual.today>=guard.day||actual.week>=guard.week)return false;
        return total===0||total<context.medianRecorded;
      })
      .sort((a,b)=>a.rank-b.rank);
    if(!candidates.length)return null;
    const alert=candidates[0];
    return {exerciseId:ex.id,regionId:alert.id,region:alert.label,reason:alert.reason,
      direct30:alert.direct30,indirect30:alert.indirect30,rank:alert.rank,
      message:'Trabalha '+alert.label.toLowerCase()+', com '+alert.reason.toLowerCase()+
        '. Comparação apenas de séries registradas, sem garantia de resultado.'};
  }
  function ranked(exercises,context,maxPerRegion=3) {
    const counts=new Map(),recommended=new Map();
    const candidates=(exercises||[]).map(ex=>({ex,advice:forExercise(ex,context)}))
      .filter(row=>row.advice).sort((a,b)=>a.advice.rank-b.advice.rank||
        a.ex.name.localeCompare(b.ex.name,'pt-BR'));
    for(const item of candidates){
      const key=item.advice.regionId;
      if((counts.get(key)||0)>=maxPerRegion)continue;
      counts.set(key,(counts.get(key)||0)+1);
      recommended.set(item.ex.id,item.advice);
    }
    return recommended;
  }
  function prescription({exercise,context=null,strengthSessions=[],today='',draft=null,settings={},muaySessions=[]}={}) {
    if(!exercise)return null;
    const advice=context?forExercise(exercise,context):null;
    // Lower default volume when replacing an existing movement; no "catch-up"
    // prescription or doubling after days without a logged direct set.
    const defaultLow=Number.isInteger(exercise.low)?exercise.low:8;
    const defaultHigh=Number.isInteger(exercise.high)?exercise.high:12;
    let low=defaultLow,high=defaultHigh;
    const selectedGoal=context?.goal||resolveGoal(settings);
    // Broad repetition ranges work across goals; a modest, narrower starting
    // range for muscle gain is a UI convenience, not a superior rep formula.
    if(selectedGoal==='muscle_gain'&&defaultHigh-defaultLow>=6){
      low=Math.min(defaultHigh-3,Math.max(defaultLow,Math.round(defaultLow+(defaultHigh-defaultLow)*.2)));
      high=defaultHigh;
    }
    // Only personalize the repetition window when the SAME exercise has at
    // least two previous recorded sessions; estimated effort is not a 1RM.
    const previous=(strengthSessions||[]).filter(s=>{
      const delta=since(today,s?.day);
      return delta>=0&&delta<90;
    }).sort((a,b)=>b.day.localeCompare(a.day)).flatMap(s=>{
      const entry=(s.entries||[]).find(e=>e.id===exercise.id);
      return entry?[{day:s.day,sets:SETS?.workSets?.(entry)||[]}]:[];
    }).filter(x=>x.sets.length>0).slice(0,2);
    let historyHint='';
    if(previous.length===2 && defaultHigh-defaultLow>=3){
      const recorded=previous.flatMap(x=>x.sets.map(set=>Number(set.reps)))
        .filter(reps=>Number.isInteger(reps)&&reps>=defaultLow&&reps<=defaultHigh);
      const effort=previous.flatMap(x=>x.sets.filter(set=>set.rir!==''&&set.rir!=null)
        .map(set=>Number(set.rir))).filter(x=>Number.isFinite(x)&&x>=0&&x<=10);
      if(recorded.length>=2){
        const ordered=recorded.sort((a,b)=>a-b);
        const midpoint=ordered[Math.floor(ordered.length/2)];
        low=Math.max(defaultLow,Math.min(defaultHigh-2,midpoint-1));
        high=Math.min(defaultHigh,Math.max(low+2,midpoint+2));
        historyHint=' No mesmo exercício, duas sessões anteriores registraram a faixa de '+
          ordered[0]+'–'+ordered.at(-1)+' repetições; a faixa proposta de '+
          low+'–'+high+' é uma referência prática, não uma regra fisiológica.';
        if(effort.length&&effort.every(x=>x<=1))historyHint+=
          ' Como o esforço informado foi elevado, priorize execução e recuperação; não aumente carga automaticamente.';
      }
    }
    const regions=A?.describe?.(exercise.id)?.main||[];
    const goal=selectedGoal;
    const guard=GUARDS[goal]||GUARDS.recomposition;
    const observed=context?.workload||workload({strengthSessions,muaySessions,draft,today});
    const used=regions.map(id=>observed.byRegion[id]||{today:0,week:0,yesterday:0,directToday:0,directWeek:0});
    const dayEquivalent=Math.max(0,...used.map(row=>row.today));
    const weekEquivalent=Math.max(0,...used.map(row=>row.week));
    const yesterdayEquivalent=Math.max(0,...used.map(row=>row.yesterday));
    const fatigue=draft?.energy==='intenso'||settings.fatigue==='alta';
    const recentMuay=(muaySessions||[]).some(s=>{
      const gap=since(today,s?.day);return gap>=0&&gap<=1;
    });
    const pain=Number(settings.kneePain)>0 ||
      Object.values(draft?.entries||{}).some(e=>Number(e?.pain)>0);
    const enough=dayEquivalent>=guard.day||weekEquivalent>=guard.week;
    const extraRecovery=fatigue||recentMuay||pain;
    let sets=2,level='consider';
    if(enough){sets=1;level='hold';}
    else if(dayEquivalent>=2||yesterdayEquivalent>=2){sets=1;level='reduce';}
    else if(!extraRecovery&&goal==='muscle_gain'&&weekEquivalent<4){sets=3;}
    // Never compensate for missed days by adding many exercises in one session.
    // Never add a third set during fatigue/Muay discomfort, regardless of goal.
    if(extraRecovery&&sets>2)sets=2;
    const fmt=n=>Number(n).toLocaleString('pt-BR',{maximumFractionDigits:1});
    const headline=level==='hold'?'O volume já registrado sugere não acrescentar trabalho deste grupo agora.':
      level==='reduce'?'Este grupo já recebeu estímulo hoje ou ontem; se precisar trocar, use uma dose menor.':
      'Opção conservadora para esta sessão, sem mudar a ficha permanente.';
    const objective=GOAL_LABELS[goal]||GOAL_LABELS.recomposition;
    const reason=headline+' Objetivo: '+objective+'. A faixa de repetições foi definida pelo exercício e pelos seus registros anteriores quando disponíveis; não aumentamos repetições para compensar déficit calórico. Hoje: '+observed.today.exercises+
      ' exercícios e '+observed.today.sets+' séries efetivas no total; últimos 7 dias: '+
      observed.week.exercises+' exercícios e '+observed.week.sets+
      ' séries. Nesta região: '+fmt(dayEquivalent)+' séries equivalentes hoje e '+
      fmt(weekEquivalent)+' nos últimos 7 dias (diretas + 0,5 × auxiliares). '+
      'O limite de cautela é uma regra do FORJA, não uma meta científica.'+
      (advice?' '+advice.reason+'.':'')+historyHint;
    return {sets,low,high,rirTarget:'2–3 (orientativo)',level,goal,
      reason,region:advice?.region||null,scope:'session-only',basis:'recorded-only',
      todayEquivalent:dayEquivalent,weekEquivalent,
      todayExercises:observed.today.exercises,todaySets:observed.today.sets,
      weekExercises:observed.week.exercises,weekSets:observed.week.sets,
      caution:extraRecovery?'Recuperação/Muay Thai ou desconforto registrado: não aumentar volume automaticamente.':enough?
        'O total recente já é elevado para adicionar uma série opcional desta região.':''};
  }
  const api=Object.freeze({VERSION:2,GOAL_LABELS,GUARDS,status,forExercise,ranked,prescription,resolveGoal,workload,variant});
  root.ForjaCatalogRecommendations=api;
  if(node)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
