/* FORJA: descriptive balance of recorded sessions; no clinical conclusions.
 * Read-only, evidence-informed heuristics. Only the session UI commits swaps. */
(function installTrainingBalance(root) {
  'use strict';
  const node=typeof module!=='undefined'&&module.exports;
  const H=root.ForjaMuscleHistory || (node?require('./muscle-history.js'):null);
  const ANATOMY=root.ForjaExerciseAnatomy || (node?require('./exercise-anatomy.js'):null);
  const F=root.ForjaFlex || (node?require('./flex.js'):null);
  const SETS=root.ForjaTrainingSets || (node?require('./training-sets.js'):null);
  const TARGETS=['abs','obliques','calves','hipAbductors','adductors','rearDelts','hamstrings',
    'glutes','quadriceps','chest','lats','biceps','triceps','sideDelts','frontDelts','forearms','midTraps','rhomboids','upperTraps'];
  const age=(today,day)=>/^\d{4}-\d{2}-\d{2}$/.test(day||'')&&/^\d{4}-\d{2}-\d{2}$/.test(today||'')?
    Math.round((Date.parse(today+'T12:00:00Z')-Date.parse(day+'T12:00:00Z'))/86400000):NaN;
  function lastDirect(id,sessions,today){
    const dates=[],seen=new Set();
    for(const s of Array.isArray(sessions)?sessions:[]){
      if(s?.id&&seen.has(s.id))continue;
      if(s?.id)seen.add(s.id);
      const a=age(today,s?.day);
      if(!Number.isFinite(a)||a<0||a>=90)continue;
      if((Array.isArray(s.entries)?s.entries:[]).some(e=>
        ANATOMY?.describe?.(e?.id)?.main?.includes(id)&&SETS?.workSets?.(e)?.length>0))dates.push(s.day);
    }
    return dates.sort().at(-1)||null;
  }
  function risk(settings,draft,muaySessions,today){
    const joint=Number(settings?.kneePain)>0 ||
      Object.values(draft?.entries||{}).some(row=>Number(row.pain)>0)||
      (draft?.skipped||[]).some(row=>row.reason==='desconforto');
    const fatigue=settings?.fatigue==='alta'||draft?.energy==='intenso'||
      (draft?.skipped||[]).some(row=>row.reason==='fadiga');
    const muay=(muaySessions||[]).some(row=>{const a=age(today,row?.day);return a>=0&&a<=1;});
    return {joint,fatigue,muay,blockNew:fatigue||muay};
  }
  function evaluate({strengthSessions=[],muaySessions=[],exercises=[],draft=null,settings={},today=''}={}) {
    const empty={ready:false,alerts:[],recommendations:[],caution:'',message:''};
    const report=H?.analyze?.({strengthSessions,today,days:30});
    if(!report?.validToday)return {...empty,message:'Histórico ou data indisponível para avaliar regiões.'};
    if(report.completedSessions<3||report.coverage==null||report.coverage<.8)return {
      ...empty,completedSessions:report.completedSessions,coverage:report.coverage,
      message:'Ainda há poucos registros classificados para identificar diferenças entre os grupos. Sem alerta de falta de treino.'};
    const riskInfo=risk(settings,draft,muaySessions,today);
    const recent=H.analyze({strengthSessions,today,days:7});
    const catalog=F?.options?.(exercises,draft)||[];
    const alerts=[];
    for(const id of TARGETS){
      const row=report.byId[id],lastWeek=recent.byId[id];
      if(!row||!lastWeek)continue;
      const lastDay=lastDirect(id,strengthSessions,today),gap=lastDay?age(today,lastDay):null;
      // Absent DIRECT sets != proof of no muscle activity: indirect sets are separate.
      const missing=row.directSets===0,low=row.directSets>0&&row.directSets<=2&&lastWeek.directSets===0;
      if(!missing&&!low)continue;
      const options=catalog.filter(item=>ANATOMY?.describe?.(item.id)?.main?.includes(id))
        .sort((a,b)=>{
          const aa=ANATOMY.describe(a.id)?.main||[],bb=ANATOMY.describe(b.id)?.main||[];
          const companionA=aa.filter(x=>x!==id&&report.byId[x]?.directSets===0).length;
          const companionB=bb.filter(x=>x!==id&&report.byId[x]?.directSets===0).length;
          const gA=a.group===draft?.planId?1:0,gB=b.group===draft?.planId?1:0;
          return companionB-companionA||gB-gA||a.name.localeCompare(b.name,'pt-BR');
        });
      if(!options.length&&!missing)continue;
      const reason=gap!=null&&gap>=21?gap+' dias sem série direta registrada':
        missing?'Sem série direta registrada nos últimos 30 dias':'Poucas séries diretas no período';
      alerts.push({id,label:row.label,direct30:row.directSets,indirect30:row.indirectSets,
        direct7:lastWeek.directSets,lastDirectDay:lastDay,gapDays:gap,
        severity:missing?'unrecorded':'low',reason,
        options:options.slice(0,5).map(x=>({id:x.id,name:x.name,group:x.group,knee:!!x.knee})),
        score:missing?100:40});
    }
    alerts.sort((a,b)=>b.score-a.score||
      TARGETS.indexOf(a.id)-TARGETS.indexOf(b.id)||
      ((b.gapDays||0)-(a.gapDays||0))||a.label.localeCompare(b.label,'pt-BR'));
    const recommendations=[];
    if(draft?.entries&&!riskInfo.blockNew){
      const entries=Object.values(draft.entries);
      const sources=entries.filter(entry=>!F.hasRecordedReps(entry)&&!entry.skipped);
      const available=new Map(catalog.map(ex=>[ex.id,ex]));
      for(const alert of alerts){
        for(const candidate of alert.options){
          const ex=available.get(candidate.id);
          if(!ex||(riskInfo.joint&&(ex.knee||['quadriceps','hamstrings','glutes','calves','hipAbductors','adductors'].includes(alert.id))))continue;
          const source=sources.find(entry=>{
            const p=ANATOMY?.describe?.(entry.id);
            if(!p?.main?.length)return false;
            const same=entries.filter(e=>ANATOMY?.describe?.(e.id)?.main?.some(id=>p.main.includes(id)));
            if(same.length<2)return false;
            const current=p.main.some(id=>recent.byId[id]?.directSets>=6&&report.byId[id]?.directSets>=9);
            return current&&!p.main.includes(alert.id);
          });
          if(!source)break;
          recommendations.push({id:'balance:'+source.id+':'+candidate.id,
            sourceId:source.id,targetId:candidate.id,targetName:candidate.name,
            sourceName:exercises.find(ex=>ex.id===source.id)?.name||source.id,
            regionId:alert.id,region:alert.label,reason:alert.reason,
            explanation:'O grupo de origem já tem várias séries diretas registradas, enquanto '+alert.label.toLowerCase()+
            ' tem poucos registros. Uma opção de variedade, não prescrição nem prova de excesso de treino.',
            temporary:true});
          break;
        }
        if(recommendations.length>=2)break;
      }
    }
    return {ready:true,alerts:alerts.slice(0,6),recommendations,caution:
      riskInfo.joint?'Há dor ou desconforto registrados: não sugerimos trocas automáticas por exercícios de pernas.':
      riskInfo.fatigue?'Fadiga elevada: não sugerimos acréscimos.':
      riskInfo.muay?'Muay Thai recente: considere a recuperação antes de alterar o treino.':'',
      completedSessions:report.completedSessions,coverage:report.coverage,
      message:'Comparação descritiva das séries executadas em 7 e 30 dias. Não mede crescimento nem comprova ausência de treino fora do aplicativo.'};
  }
  const api=Object.freeze({VERSION:1,TARGETS,evaluate,lastDirect});
  root.ForjaTrainingBalance=api;
  if(node)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
