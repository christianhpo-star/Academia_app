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
  function status({strengthSessions=[],muaySessions=[],exercises=[],draft=null,settings={},today=''}={}) {
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
    return {ready:!!balance.ready,reason:balance.message||'',caution:balance.caution||'',
      alerts:balance.alerts||[],recent,byRegion};
  }
  function forExercise(ex,context) {
    if(!ex||!context?.ready)return null;
    const main=A?.describe?.(ex.id)?.main||[];
    const candidates=main.map(id=>context.byRegion.get(id)).filter(Boolean)
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
    const low=Number.isInteger(exercise.low)?exercise.low:8;
    const high=Number.isInteger(exercise.high)?exercise.high:12;
    const todayMuscles=A?.describe?.(exercise.id)?.main||[];
    const already=Object.values(draft?.entries||{}).reduce((sum,e)=>{
      const names=A?.describe?.(e.id)?.main||[];
      if(!todayMuscles.some(x=>names.includes(x)))return sum;
      return sum+(SETS?.workSets?.(e)?.length||0);
    },0);
    const fatigue=draft?.energy==='intenso'||settings.fatigue==='alta';
    const recentMuay=(muaySessions||[]).some(s=>{
      const gap=since(today,s?.day);return gap>=0&&gap<=1;
    });
    const pain=Number(settings.kneePain)>0 ||
      Object.values(draft?.entries||{}).some(e=>Number(e?.pain)>0);
    const recent=advice?.regionId?context?.recent?.byId?.[advice.regionId]:null;
    // Two sets are a conservative starting suggestion for a NEW or changed
    // exercise. Three is allowed only for documented missing DIRECT stimulus,
    // no completed work for the same region today, and no risk flags.
    const more=advice&&advice.direct30===0&&
      (recent?.directSets||0)===0&&already===0&&!fatigue&&!recentMuay&&!pain;
    const sets=more?3:2;
    const reason=advice?
      'Sugestão pontual: '+advice.reason+'. Comece com '+sets+
      ' séries, respeite técnica, esforço e recuperação; não é compensação obrigatória por períodos sem registro.':
      'Faixa inicial do catálogo; ajuste à técnica e ao esforço percebido.';
    return {sets,low,high,rirTarget:'2–3 (orientativo)',
      reason,region:advice?.region||null,scope:'session-only',basis:'recorded-only',
      caution:fatigue||recentMuay||pain?'Atenção à recuperação ou desconforto registrado; não aumentar volume automaticamente.':''};
  }
  const api=Object.freeze({VERSION:1,status,forExercise,ranked,prescription});
  root.ForjaCatalogRecommendations=api;
  if(node)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
