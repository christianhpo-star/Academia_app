/* FORJA trend context. Observational patterns, never diagnosis or calorie changes.
   Evidence: IOC REDs 2023 doi:10.1136/bjsports-2023-106994;
   Murphy & Koehler 2022 doi:10.1111/sms.14075.
   Minimum samples and 5% trigger below are software heuristics, NOT validated clinical cut-offs. */
(function(root){
 'use strict';
 const E=root.AcademiaEngine||(typeof require==='function'?require('./engine.js'):null);
 const SETS=root.ForjaTrainingSets||(typeof require==='function'?require('./training-sets.js'):null);
 const CARDIO=root.ForjaCardio||(typeof require==='function'?require('./cardio.js'):null);
 const dayOf=(row)=>row?.day||row?.date||row?.timestamp?.slice(0,10)||'';
 const shift=(day,offset)=>{const date=new Date(day+'T12:00:00Z');date.setUTCDate(date.getUTCDate()+offset);return date.toISOString().slice(0,10);};
 const median=arr=>{const n=arr.slice().sort((a,b)=>a-b);return n.length?(n.length%2?n[(n.length-1)/2]:(n[n.length/2-1]+n[n.length/2])/2):null;};
 const average=arr=>arr.length?arr.reduce((s,n)=>s+n,0)/arr.length:null;
 const round=n=>Math.round(n*10)/10;
 function upsertRecovery(rows,check){
   if(!check||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(check.day)||!['boa','normal','baixa'].includes(check.energy)||!['normal','moderada','alta'].includes(check.fatigue))return null;
   const keep=(Array.isArray(rows)?rows:[]).filter(row=>row.day!==check.day);
   return [...keep,{day:check.day,energy:check.energy,fatigue:check.fatigue,kneePain:check.kneePain??''}].sort((a,b)=>a.day.localeCompare(b.day)).slice(-1095);
 }
 function assess(state,endDay){
   const recentStart=shift(endDay,-13),previousStart=shift(endDay,-27),previousEnd=shift(endDay,-14);
   const dateOk=d=>typeof d==='string'&&d.length===10;
   const weights=(state?.weights||[]).filter(w=>dateOk(w.date)&&w.date<=endDay&&Number(w.weight)>0)
     .sort((a,b)=>a.date.localeCompare(b.date));
   const unique=new Map(weights.map(w=>[w.date,Number(w.weight)]));
   const previousWeights=[...unique].filter(([d])=>d>=previousStart&&d<=previousEnd).map(([,v])=>v);
   const recentWeights=[...unique].filter(([d])=>d>=recentStart&&d<=endDay).map(([,v])=>v);
   const weightReady=previousWeights.length>=3&&recentWeights.length>=3;
   const meanPrev=average(previousWeights),meanRecent=average(recentWeights);
   const weightChangePctWeek=weightReady?round((meanRecent-meanPrev)/meanPrev*100/2):null;
   const sessions=(state?.sessions||[]).filter(row=>!CARDIO?.isStandalone?.(row)&&dayOf(row)>=previousStart&&dayOf(row)<=endDay);
   const within=(rows,start,stop)=>rows.filter(row=>dayOf(row)>=start&&dayOf(row)<=stop);
   const recentSessions=within(sessions,recentStart,endDay),priorSessions=within(sessions,previousStart,previousEnd);
   function exerciseScores(rows){
     const map=new Map();
     for(const session of rows){
       for(const ex of session.entries||[]){
         // Added external load is only part of a bodyweight movement's resistance.
         // It must never be treated as total load for Epley or decline alerts.
         if(SETS.allowsZero(ex))continue;
         const scored=SETS.workSets(ex).filter(set=>Number(set.reps)<=12)
           .map(set=>E?.estimateStrength(Number(set.load),Number(set.reps))).filter(Number.isFinite);
         if(!scored.length)continue;
         const best=Math.max(...scored),arr=map.get(ex.id)||[];arr.push(best);map.set(ex.id,arr);
       }
     }
     return map;
   }
   const earlier=exerciseScores(priorSessions),later=exerciseScores(recentSessions);
   const comparisons=[...earlier.entries()].flatMap(([exerciseId,prev])=>{
     const next=later.get(exerciseId);
     if(prev.length<2||!next||next.length<2)return [];
     const base=median(prev),current=median(next);
     return [{exerciseId,before:round(base),now:round(current),changePct:round((current-base)/base*100),samplesBefore:prev.length,samplesNow:next.length}];
   });
   const down=comparisons.filter(row=>row.changePct<=-5);
   const recovery=(state?.recoveryHistory||[]).filter(row=>row.day>=recentStart&&row.day<=endDay);
   const lowEnergy=recovery.filter(row=>row.energy==='baixa').length;
   const highFatigue=recovery.filter(row=>row.fatigue==='alta').length;
   const enoughForEnergy=recovery.length>=4;
   const repeatedLower=down.length>=2;
   const review=repeatedLower&&(enoughForEnergy&&(lowEnergy>=2||highFatigue>=2));
   return {window:{recentStart,endDay,previousStart,previousEnd},
     weight:{ready:weightReady,previousCount:previousWeights.length,recentCount:recentWeights.length,
       previousMean:meanPrev==null?null:round(meanPrev),recentMean:meanRecent==null?null:round(meanRecent),
       pctPerWeek:weightChangePctWeek},
     training:{previousSessions:priorSessions.length,recentSessions:recentSessions.length,comparisons,decliningExercises:down.length,
       sufficient:comparisons.length>=2},
     recovery:{recordedDays:recovery.length,lowEnergyDays:lowEnergy,highFatigueDays:highFatigue,sufficient:enoughForEnergy},
     interpretation:review?'review':!comparisons.length&&!weightReady?'insufficient':'trend',
     warnings:[
       'Comparações de força só usam o mesmo exercício com >=2 sessões em cada quinzena e séries executadas de 1 a 12 repetições.',
       'Abdominais com peso corporal não entram na força estimada, mesmo quando há carga adicional registrada.',
       'Um treino com menor carga pode refletir descanso planejado, técnica, equipamento, dor, sono ou esforço distinto.',
       'O limiar de 5% e as quantidades mínimas de dados são regras exploratórias do aplicativo, não critérios clínicos.',
       'Energia e fadiga são autorrelatos; falta de check-in não equivale a energia normal.',
       'Sem gastos energéticos medidos, não calculamos disponibilidade energética/RED-S nem ajustamos a dieta automaticamente.'
     ]};
 }
 const api={VERSION:1,shift,median,upsertRecovery,assess};root.ForjaPerformanceTrends=api;
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
