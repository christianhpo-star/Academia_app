(function installDose(root) {
  'use strict';
  /*
   * FORJA / dose-analysis v1. References:
   * ACSM 2026, DOI 10.1249/MSS.0000000000003897
   * Pelland et al. 2026, DOI 10.1007/s40279-025-02344-w
   * Robinson et al. 2024, PMID 38970765
   * The half-weight for secondary-muscle sets is a descriptive convention
   * from a population-level meta-regression, not a precise biological dose.
   * All escalation gates below are unvalidated, conservative product rules.
   */
  const MUSCLES = [
    ['peito','Peito'],['costas','Costas'],['ombros','Ombros'],
    ['biceps','Bíceps'],['triceps','Tríceps'],['quadriceps','Quadríceps'],
    ['posteriores','Posteriores'],['gluteos','Glúteos'],
    ['panturrilhas','Panturrilhas'],['adutores','Adutores'],['abdutores','Abdutores'],
  ];
  const MAP = Object.create(null);
  const map = (ids, direct, indirect=[]) => {
    for (const id of ids.split(' ')) MAP[id] = { direct, indirect };
  };
  map('pulley-aberto pulley-fechado puxada-neutra', ['costas'], ['biceps']);
  map('remada-baixa remada-cavalinho remada-unilateral-halter remada-articulada', ['costas'], ['biceps']);
  map('pullover-polia', ['costas']);
  map('face-pull', ['ombros'], ['costas']);
  map('rosca-w rosca-martelo rosca-inversa rosca-scott', ['biceps']);
  map('supino-halteres supino-barra supino-inclinado supino-maquina', ['peito'], ['triceps','ombros']);
  map('voador crucifixo-cabo crossover-polia', ['peito']);
  map('elevacao-lateral desenvolvimento-halter remada-alta', ['ombros'], ['triceps']);
  map('triceps-testa triceps-corda triceps-maquina triceps-frances', ['triceps']);
  map('agachamento-hack agachamento-livre leg-press agachamento-goblet', ['quadriceps'], ['gluteos']);
  map('bulgaro passada-reversa step-up-baixo', ['quadriceps'], ['gluteos']);
  map('extensora extensora-d', ['quadriceps']);
  map('flexora-c flexora-d flexora-sentada', ['posteriores']);
  map('panturrilha-leg panturrilha-banco panturrilha-em-pe', ['panturrilhas']);
  map('stiff terra-romeno-halter', ['posteriores'], ['gluteos']);
  map('elevacao-pelvica gluteo-cabo ponte-gluteo', ['gluteos']);
  map('sumo-maquina', ['gluteos'], ['quadriceps','adutores']);
  map('abdutora', ['abdutores']);
  map('cadeira-adutora', ['adutores']);

  const labelFor = id => MUSCLES.find(row=>row[0]===id)?.[1] || id;
  function validDate(day) {
    if(typeof day!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(day))return false;
    const time=Date.parse(day+'T12:00:00Z');
    return Number.isFinite(time) && new Date(time).toISOString().slice(0,10)===day;
  }
  const dayAge=(today,day)=>(validDate(today)&&validDate(day))
    ? Math.round((Date.parse(today+'T12:00:00Z')-Date.parse(day+'T12:00:00Z'))/86400000):NaN;
  const number=v=>v==null||v===''?null:
    (Number.isFinite(Number(v))?Number(v):null);
  function workSets(entry) {
    return (Array.isArray(entry?.sets)?entry.sets:[]).filter(set=>{
      const load=number(set?.load), reps=number(set?.reps);
      return !set?.warmup && load!==null && load>0 && load<=1500 &&
        reps!==null && Number.isInteger(reps) && reps>=1 && reps<=100;
    });
  }
  function doseItem(id,entry) {
    const profile=MAP[id];
    if(!profile)return null;
    const sets=workSets(entry).length;
    return {id,sets,profile};
  }
  function initStats() {
    return Object.fromEntries(MUSCLES.map(([id,label])=>[id,{
      id,label,direct7:0,indirect7:0,estimated7:0,
      direct28:0,indirect28:0,estimated28:0,
      prior21:0,activeDays7:[],activeDays28:[],lastDay:null,
    }]));
  }
  function accumulate(stats,id,entry,day,today) {
    const item=doseItem(id,entry);
    if(!item || !item.sets) return !!item;
    const age=dayAge(today,day);
    if(!Number.isFinite(age) || age<0 || age>=28) return true;
    const {direct,indirect}=item.profile;
    for(const muscle of direct){
      const m=stats[muscle];m.direct28+=item.sets;
      m.estimated28+=item.sets;
      if(!m.activeDays28.includes(day))m.activeDays28.push(day);
      if(m.lastDay===null || day>m.lastDay)m.lastDay=day;
      if(age<7){m.direct7+=item.sets;m.estimated7+=item.sets;if(!m.activeDays7.includes(day))m.activeDays7.push(day);}
      else m.prior21+=item.sets;
    }
    for(const muscle of indirect){
      const m=stats[muscle];const part=.5*item.sets;
      m.indirect28+=part;m.estimated28+=part;
      if(!m.activeDays28.includes(day))m.activeDays28.push(day);
      if(m.lastDay===null || day>m.lastDay)m.lastDay=day;
      if(age<7){m.indirect7+=part;m.estimated7+=part;if(!m.activeDays7.includes(day))m.activeDays7.push(day);}
      else m.prior21+=part;
    }
    return true;
  }
  function volume({strengthSessions=[],draft=null,today=''}={}) {
    const stats=initStats();
    let unknown=0, known=0, actualEntries=0, completedSessions=0;
    const consume=(entries,day)=>{
      for(const entry of entries){
        if(!entry || !workSets(entry).length)continue;
        actualEntries++;
        if(!MAP[entry.id])unknown++;
        else known++;
        accumulate(stats,entry.id,entry,day,today);
      }
    };
    for(const session of strengthSessions||[]){
      const age=dayAge(today,session?.day);
      if(!Number.isFinite(age) || age<0 || age>=28)continue;
      const entries=Array.isArray(session.entries)?session.entries:[];
      if(entries.some(en=>workSets(en).length))completedSessions++;
      consume(entries,session.day);
    }
    if(draft?.entries && validDate(today))
      consume(Object.values(draft.entries),today);
    const rows=Object.values(stats).map(m=>({
      ...m, priorWeekly:m.prior21/3,
      days7:m.activeDays7.length,days28:m.activeDays28.length,
    }));
    return {rows,unknown,known,actualEntries,completedSessions,fromDraft:!!draft,
      hasEvidence:completedSessions>0,coverage:actualEntries?known/actualEntries:null};
  }
  function recentExercise(exId,sessions,today) {
    return (Array.isArray(sessions)?sessions:[])
      .filter(s=>{
        const age=dayAge(today,s?.day);
        return age>=0 && age<28;
      }).flatMap(s=>{
        return (s.entries||[]).filter(en=>en?.id===exId && workSets(en).length)
          .map(en=>({session:s,entry:en}));
      }).sort((a,b)=>String(b.session.timestamp||b.session.day).localeCompare(String(a.session.timestamp||a.session.day)));
  }
  const estimatedStrength=set=>{
    const load=number(set?.load),reps=number(set?.reps);
    return load>0&&reps>=1&&reps<=30 ? load*(1+reps/30):null;
  };
  function bestEffort(entry) {
    const ranked=workSets(entry).map(s=>({set:s,score:estimatedStrength(s)}))
      .filter(row=>row.score!==null).sort((a,b)=>b.score-a.score);
    return ranked[0]||null;
  }
  function kneeRelevant(profile) {
    return [...profile.direct,...profile.indirect].some(id=>['quadriceps','posteriores','gluteos'].includes(id));
  }
  function currentPain(draft,id) {
    const raw=draft?.entries?.[id];
    return raw ? number(raw.pain) : null;
  }
  function recoverySignal({settings={},muaySessions=[],today,draft=null,profile=null}={}) {
    if(settings.fatigue==='alta')return 'Você informou fadiga alta.';
    if(draft?.energy==='intenso')return 'Você informou muita fadiga na sessão.';
    if(settings.kneePain!=='' && settings.kneePain!=null && number(settings.kneePain)>0 &&
       profile && kneeRelevant(profile))return 'Há desconforto atual no joelho.';
    const recentMuay=(muaySessions||[]).filter(s=>{
      const age=dayAge(today,s?.day);
      return age>=0 && age<=1;
    });
    if(recentMuay.some(s=>{
      const n=number(s.intensity);return s.day===today || n===null || n>=7;
    }))return 'Há Muay Thai hoje ou sessão recente intensa ou sem esforço informado. Não aumente o volume automaticamente.';
    return null;
  }
  function candidateFor(exercise,sessionRows,draft,summary,settings,muaySessions,today) {
    const entry=draft?.entries?.[exercise.id];
    if(!entry || !MAP[exercise.id])return {eligible:false,reason:'Exercício não mapeado ou não presente no treino atual.'};
    const profile=MAP[exercise.id];
    if(draft?.energy!=='leve')return {eligible:false,reason:'A sessão ainda não foi registrada como leve/com energia sobrando.'};
    if(exercise.knee && currentPain(draft,exercise.id)!==0)
      return {eligible:false,reason:'Joelho não avaliado como sem dor (0) neste exercício.'};
    const recovery=recoverySignal({settings,muaySessions,today,draft,profile});
    if(recovery)return {eligible:false,reason:recovery};
    const work=workSets(entry);
    if(!work.length)return {eligible:false,reason:'Ainda não há séries efetivas realizadas neste exercício.'};
    if(work.length>=12)return {eligible:false,reason:'Limite de séries por exercício atingido.'};
    // A bonus series is considered only after planned work has actually been
    // completed, never while empty rows are still awaiting execution.
    if(work.length<Number(exercise.sets) || (entry.sets||[]).some(row=>
        !row?.warmup && (number(row?.reps)===null || number(row?.reps)<=0)))
      return {eligible:false,reason:'Conclua primeiro as séries planejadas antes de considerar volume adicional.'};
    if(work.some(s=>number(s.rir)===null || number(s.rir)<2))
      return {eligible:false,reason:'Faltam RIR válidos ou há esforço elevado nas séries registradas.'};
    const history=recentExercise(exercise.id,sessionRows,today)
      .filter(item=>dayAge(today,item.session.day)>=1);
    if(history.length<2)return {eligible:false,reason:'Ainda não há duas sessões anteriores comparáveis deste exercício.'};
    const top=history.slice(0,2).map(item=>bestEffort(item.entry));
    if(top.some(t=>!t||number(t.set.rir)===null||number(t.set.rir)<2))
      return {eligible:false,reason:'Histórico recente sem RIR suficiente para analisar a margem de esforço.'};
    if(top[0].score<top[1].score*.95)
      return {eligible:false,reason:'Estimativa de desempenho caiu em relação ao registro anterior; revise recuperação.'};
    if(kneeRelevant(profile)){
      for(const h of history.slice(0,2)){
        if(exercise.knee && (number(h.entry.pain)!==0||number(h.session.kneeNextDay)!==0))
          return {eligible:false,reason:'Joelho sem registro confirmado de ausência de sintomas nos dias anteriores.'};
      }
    }
    const dominant=profile.direct[0];
    const muscle=summary.rows.find(m=>m.id===dominant);
    if(!muscle || muscle.priorWeekly<=0)
      return {eligible:false,reason:'Não há referência semanal comparável para este grupo muscular.'};
    if(muscle.estimated7>muscle.priorWeekly+1)
      return {eligible:false,reason:'O volume já supera a média registrada nas três semanas anteriores.'};
    const lastMuscleDay=history[0]?.session.day;
    if(lastMuscleDay && dayAge(today,lastMuscleDay)<2)
      return {eligible:false,reason:'Há uma sessão recente do mesmo exercício; priorize recuperação.'};
    // *1 series* is a guarded, optional experiment, never an automatic prescription.
    return {eligible:true,muscleId:dominant,exerciseId:exercise.id,
      muscle:labelFor(dominant),exercise:exercise.name,
      note:'Pode considerar uma única série adicional opcional, mantendo carga e técnica; não aumente a carga simultaneamente. Pare se houver dor, queda de execução ou fadiga.'};
  }
  function analyze({strengthSessions=[],muaySessions=[],exercises=[],draft=null,
    settings={},today=''}={}) {
    const summary=volume({strengthSessions,draft,today});
    const active=exercises.filter(ex=>draft?.entries?.[ex.id]);
    const options=[];
    for(const ex of active){
      const v=candidateFor(ex,strengthSessions,draft,summary,settings,muaySessions,today);
      if(v.eligible)options.push(v);
    }
    const anyRecovery=recoverySignal({settings,muaySessions,today,draft,
      profile:{direct:['quadriceps'],indirect:[]}});
    const missing=summary.unknown>0;
    const suggestions=[];
    if(anyRecovery)suggestions.push({
      level:'recover',title:'Priorize recuperação antes de acrescentar volume',reason:anyRecovery,
    });
    else if(draft && options.length){
      const choice=options.sort((a,b)=>a.muscle.localeCompare(b.muscle,'pt-BR'))[0];
      suggestions.push({
        level:'consider',title:`Uma série opcional em ${choice.exercise}`,
        reason:`${choice.muscle}: o histórico recente apresenta ao menos duas sessões comparáveis e o volume da semana não excede claramente o padrão registrado. ${choice.note}`,
        exerciseId:choice.exerciseId,
      });
    } else if(draft){
      suggestions.push({
        level:'maintain',title:'Mantenha o volume planejado por enquanto',
        reason:'Os dados de execução, RIR, recuperação e volume ainda não justificam sugerir séries extras. Registre somente o que realizar.',
      });
    }
    if(missing)suggestions.push({
      level:'unknown',title:'Alguns exercícios não têm mapeamento muscular',
      reason:`Há ${summary.unknown} registro(s) de exercício sem classificação disponível. Eles não entram no volume muscular estimado; isso limita a análise.`,
    });
    return {summary,suggestions,candidates:options,objective:'recomposition',
      disclaimer:'Estimativas de treinamento, não medição de hipertrofia, diagnóstico ou promessa de resultado. Indicadores de disponibilidade e limites para +1 série são heurísticas do FORJA.',
    };
  }
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const val=value=>Number(value).toLocaleString('pt-BR',{maximumFractionDigits:1});
  function renderPanel(data,{duringWorkout=false}={}) {
    const rows=data.summary.rows.filter(m=>m.estimated28>0 || m.estimated7>0);
    return `<section class="card dose-card" aria-labelledby="dose-title">
      <div class="row-between"><h2 class="section-title" id="dose-title">Volume por grupo muscular</h2><span class="pill green">Recomposição</span></div>
      <p class="small muted">Séries efetivas realizadas, não planejadas. Exercícios principais contam como uma série por músculo; participações auxiliares como 0,5 (estimativa de pesquisa, não medida individual).</p>
      ${rows.length?`<div class="dose-table" role="table" aria-label="Volume de treino estimado nos últimos sete e vinte e oito dias">
        <div role="row" class="dose-header"><span role="columnheader">Grupo</span><span role="columnheader">7 dias</span><span role="columnheader">Média 28 dias/sem.</span></div>
        ${rows.map(m=>`<div role="row" class="dose-row"><strong role="cell">${escape(m.label)}</strong><span role="cell">${val(m.estimated7)}</span><span role="cell">${val(m.estimated28/4)}</span></div>`).join('')}
      </div>`:'<p class="small muted">Ainda não há séries registradas e classificadas nesta janela de 28 dias.</p>'}
      <p class="tiny muted">Uma semana não define se você está ganhando ou perdendo massa muscular. A média de 28 dias é descritiva; não é uma meta mínima nem um limite máximo.</p>
      ${duringWorkout?`<div class="dose-recommendations" aria-live="polite">
        <strong>O que ajustar hoje?</strong>
        ${data.suggestions.map(s=>`<div class="dose-suggestion dose-${escape(s.level)}"><strong>${escape(s.title)}</strong><p>${escape(s.reason)}</p>${s.level==='consider' && s.exerciseId?`<button type="button" class="secondary small-button mt-12" data-action="dose-add-one" data-ex="${escape(s.exerciseId)}">Adicionar 1 série opcional</button>`:''}</div>`).join('')}
      </div>`:''}
      ${data.summary.unknown && !duringWorkout ? `<p class="small muted">${data.summary.unknown} exercício(s) sem classificação não entraram nesta estimativa.</p>`:''}
      <p class="tiny muted">${escape(data.disclaimer)}</p>
    </section>`;
  }
  root.ForjaDose={MUSCLES,MAP,validDate,dayAge,workSets,volume,
    candidateFor,recoverySignal,analyze,renderPanel};
  if(typeof module!=='undefined'&&module.exports)module.exports=root.ForjaDose;
})(typeof globalThis !== 'undefined' ? globalThis : this);
