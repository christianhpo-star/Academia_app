/* FORJA activity history: recorded steps and finished sessions, never calories burned. */
(function(root){
  'use strict';
  const CARDIO=root.ForjaCardio||(typeof require==='function'?require('./cardio.js'):null);
  const dayOK=d=>{
    if(typeof d!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(d))return false;
    const t=new Date(d+'T12:00:00Z');return !Number.isNaN(t.getTime())&&t.toISOString().slice(0,10)===d;
  };
  const dateNumber=d=>Date.parse(d+'T12:00:00Z');
  const daysApart=(start,end)=>Math.round((dateNumber(end)-dateNumber(start))/86400000);
  const earliest=(day,days)=>{
    const d=new Date(day+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-(days-1));
    return d.toISOString().slice(0,10);
  };
  const validStep=row=>row&&typeof row==='object'&&!Array.isArray(row)&&
    dayOK(row.date)&&row.id==='steps-'+row.date&&row.source==='samsung-health-manual'&&
    Number.isInteger(row.steps)&&row.steps>=0&&row.steps<=100000;
  function validSteps(rows){
    if(rows===undefined)return true; // Backups from before the steps feature
    if(!Array.isArray(rows)||rows.length>2500)return false;
    const seen=new Set();
    return rows.every(row=>{
      if(!validStep(row)||seen.has(row.date))return false;
      seen.add(row.date);return true;
    });
  }
  function upsertSteps(rows,date,steps){
    if(!validSteps(rows)||!dayOK(date))return {error:'Confira a data.'};
    const count=typeof steps==='string'&&/^\d+$/.test(steps.trim())?Number(steps.trim()):steps;
    if(!Number.isInteger(count)||count<0||count>100000)
      return {error:'Informe um número inteiro de passos entre 0 e 100.000.'};
    const row={id:'steps-'+date,date,steps:count,source:'samsung-health-manual'};
    const next=(rows||[]).some(x=>x.date===date)
      ?rows.map(x=>x.date===date?row:x):[...(rows||[]),row];
    return validSteps(next)?{items:next,item:row}:{error:'Histórico de passos inválido.'};
  }
  function mergeSteps(current,incoming){
    if(!validSteps(current)||!validSteps(incoming))throw new Error('Histórico de passos inválido.');
    const result=(current||[]).slice(),days=new Set(result.map(x=>x.date));
    for(const row of incoming||[])if(!days.has(row.date)){result.push(row);days.add(row.date);}
    return result;
  }
  const sessionDate=s=>s?.day||s?.date||s?.timestamp?.slice(0,10)||null;
  const median=values=>{
    const arr=values.slice().sort((a,b)=>a-b);
    if(!arr.length)return null;
    const i=Math.floor(arr.length/2);
    return arr.length%2?arr[i]:Math.round((arr[i-1]+arr[i])/2);
  };
  function assess(state,day){
    if(!dayOK(day))return {error:'Data de referência inválida.'};
    const steps=(state?.activitySteps||[]).filter(row=>validStep(row)&&row.date<=day&&row.date>=earliest(day,28));
    const validDate=d=>dayOK(d)&&d<=day&&d>=earliest(day,28);
    const strength=(state?.sessions||[]).filter(s=>!CARDIO?.isStandalone?.(s)).map(sessionDate).filter(validDate);
    const cardio=(state?.sessions||[]).filter(s=>CARDIO?.isStandalone?.(s)).map(sessionDate).filter(validDate);
    const muay=(state?.muay?.sessions||[]).map(sessionDate).filter(d=>dayOK(d)&&d<=day&&d>=earliest(day,28));
    const activeDays=new Set([...strength,...muay,...cardio]);
    const period=n=>{
      const from=earliest(day,n);
      const daySteps=steps.filter(row=>row.date>=from);
      return {periodDays:n,stepDays:daySteps.length,
        avgSteps:daySteps.length?Math.round(daySteps.reduce((sum,row)=>sum+row.steps,0)/daySteps.length):null,
        strength:strength.filter(d=>d>=from).length,
        cardio:cardio.filter(d=>d>=from).length,
        muay:muay.filter(d=>d>=from).length,
        workoutDays:[...activeDays].filter(d=>d>=from).length};
    };
    const windows={last7:period(7),last14:period(14),last28:period(28)};
    const sorted=steps.slice().sort((a,b)=>a.date.localeCompare(b.date));
    const avg=windows.last28.avgSteps;
    const span=sorted.length?daysApart(sorted[0].date,sorted.at(-1).date):0;
    const stepOverlap=steps.filter(row=>activeDays.has(row.date)).length;
    const concentrated=steps.length>=7&&stepOverlap/steps.length>=0.8&&steps.length<14;
    const representative=steps.length>=7&&span>=6&&!concentrated;
    const coverage=steps.length>=21&&span>=20?'ampla':steps.length>=14&&span>=13?'moderada':'limitada';
    const warnings=[
      'O fator é heurística do FORJA, não é PAL medido nem estimativa validada individualmente.',
      'Sem registro de passos ou treinos não significa ausência de atividade; não inferimos descanso ou sedentarismo.',
      'Passos incluem deslocamentos e parte dos exercícios: não somamos calorias dos treinos outra vez.'
    ];
    if(!steps.length)warnings.push('Registre passos de pelo menos 7 dias diferentes, incluindo dias sem treino, para sugerir um fator.');
    else if(steps.length<7||span<6)warnings.push('Amostra insuficiente: faltam dias distribuídos pela semana para sugerir um fator.');
    if(concentrated)warnings.push('Passos concentrados em dias com treino: adicione dias sem treino antes de obter uma sugestão.');
    if(representative&&coverage==='limitada')warnings.push('Sugestão provisória: registre 14–21 dias de passos para representar melhor a rotina.');
    let suggestedFactor=null;
    if(representative){
      // Provisional conservative category, not a mathematical conversion of steps to PAL.
      // Exercise days influence at most one category; no separate calorie addition.
      // Step-count bands are FORJA review categories, never an individual PAL equation.
      const base=avg<4000?1.2:avg<7500?1.375:avg<11000?1.55:1.725;
      const mayUseTraining=coverage!=='limitada'&&windows.last14.workoutDays>=6&&avg>=4000;
      const next={1.2:1.375,1.375:1.55,1.55:1.725,1.725:1.725};
      suggestedFactor=mayUseTraining?next[base]:base;
    }
    const bands={1.2:[1.2,1.375],1.375:[1.2,1.55],1.55:[1.375,1.725],1.725:[1.55,1.9]};
    return {day,windows,stepDays:steps.length,spanDays:span,
      medianSteps:median(steps.map(row=>row.steps)),coverage,
      suggestedFactor,range:suggestedFactor?bands[suggestedFactor]:null,
      evidence:'diário de passos + sessões concluídas; observações sem medição direta de energia',warnings};
  }
  const api={validStep,validSteps,upsertSteps,mergeSteps,assess};
  root.ForjaActivity=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
