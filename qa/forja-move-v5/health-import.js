/* FORJA: import private Samsung Health screenshot transcriptions without faking daily history. */
(function(root){
  'use strict';
  const ACT=root.ForjaActivity||(typeof require==='function'?require('./activity.js'):null);
  const FORMAT='FORJA_SAMSUNG_HEALTH_IMPORT_V1';
  const SOURCE='samsung-health-screenshot';
  const dayOK=d=>{
    if(typeof d!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(d))return false;
    const date=new Date(d+'T12:00:00Z');
    return !Number.isNaN(date.getTime())&&date.toISOString().slice(0,10)===d;
  };
  const integer=(v,min,max)=>Number.isInteger(v)&&v>=min&&v<=max;
  const real=(v,min,max)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
  const daysOfMonth=ym=>{
    if(typeof ym!=='string'||!/^\d{4}-(0[1-9]|1[0-2])$/.test(ym))return null;
    const [year,month]=ym.split('-').map(Number);
    return new Date(Date.UTC(year,month,0)).getUTCDate();
  };
  const validMonthly=row=>{
    if(!row||typeof row!=='object'||Array.isArray(row))return false;
    const days=daysOfMonth(row.month);
    if(!days||row.id!=='health-month-'+row.month||row.source!==SOURCE||
       row.periodStart!==row.month+'-01'||!dayOK(row.periodEnd)||
       !row.periodEnd.startsWith(row.month)||typeof row.complete!=='boolean')return false;
    const endDay=Number(row.periodEnd.slice(-2));
    return integer(row.daysCovered,1,days)&&row.daysCovered===endDay&&
      row.complete===(endDay===days)&&integer(row.steps,0,3500000)&&
      integer(row.activeMinutes,0,60000)&&integer(row.activityKcal,0,500000)&&
      integer(row.goalDays,0,row.daysCovered);
  };
  function validMonthlyList(rows){
    if(rows===undefined)return true; // legacy local states and backups
    if(!Array.isArray(rows)||rows.length>240)return false;
    const months=new Set();
    return rows.every(row=>{
      if(!validMonthly(row)||months.has(row.month))return false;
      months.add(row.month);return true;
    });
  }
  const validWeightReport=row=>{
    if(!row||typeof row!=='object'||Array.isArray(row)||!dayOK(row.date)||
       row.id!=='health-weight-'+row.date||row.source!==SOURCE||
       !real(row.weightKg,20,350)||!real(row.reportedBmi,10,80))return false;
    return (row.weightChangeKg==null||real(row.weightChangeKg,-100,100))&&
      (row.bmiChange==null||real(row.bmiChange,-20,20));
  };
  function validWeightReports(rows){
    if(rows===undefined)return true;
    if(!Array.isArray(rows)||rows.length>2500)return false;
    const seen=new Set();
    return rows.every(row=>{
      if(!validWeightReport(row)||seen.has(row.date))return false;
      seen.add(row.date);return true;
    });
  }
  const validDaily=row=>ACT.validStep(row)&&
    (row.activeMinutes===undefined||integer(row.activeMinutes,0,1440))&&
    (row.activityKcal===undefined||integer(row.activityKcal,0,20000));
  function validImport(payload,asOf){
    if(!payload||typeof payload!=='object'||Array.isArray(payload)||
       payload.format!==FORMAT||!dayOK(asOf))return false;
    const monthly=payload.monthlySummaries,daily=payload.dailySteps,weight=payload.weightReports;
    if(!Array.isArray(monthly)||monthly.length>48||!validMonthlyList(monthly)||
       !Array.isArray(daily)||daily.length>1000||!ACT.validSteps(daily)||
       !Array.isArray(weight)||weight.length>100||!validWeightReports(weight))return false;
    return monthly.every(r=>r.periodEnd<=asOf)&&daily.every(r=>validDaily(r)&&r.date<=asOf)&&
      weight.every(r=>r.date<=asOf);
  }
  function mergeMonthly(current,incoming){
    if(!validMonthlyList(current)||!validMonthlyList(incoming))throw Error('Resumos mensais incompatíveis');
    const out=(current||[]).slice(),months=new Set(out.map(x=>x.month));
    for(const row of incoming||[])if(!months.has(row.month)){out.push(row);months.add(row.month);}
    return out;
  }
  function mergeWeightReports(current,incoming){
    if(!validWeightReports(current)||!validWeightReports(incoming))throw Error('Pesagens relatadas incompatíveis');
    const out=(current||[]).slice(),dates=new Set(out.map(x=>x.date));
    for(const row of incoming||[])if(!dates.has(row.date)){out.push(row);dates.add(row.date);}
    return out;
  }
  function apply(current,payload,asOf){
    if(!validImport(payload,asOf))return {error:'Arquivo Samsung Health incompatível ou com datas futuras.'};
    if(!validMonthlyList(current.healthMonthly)||!validWeightReports(current.healthWeightReports)||
       !ACT.validSteps(current.activitySteps))return {error:'Os dados locais precisam ser verificados antes da importação.'};
    const monthly=mergeMonthly(current.healthMonthly,payload.monthlySummaries);
    const daily=ACT.mergeSteps(current.activitySteps,payload.dailySteps);
    const reports=mergeWeightReports(current.healthWeightReports,payload.weightReports);
    const dates=new Set((current.weights||[]).map(w=>w.date));
    const weights=(current.weights||[]).slice();
    let addedWeights=0,alreadyWeighted=0;
    for(const row of payload.weightReports){
      if(dates.has(row.date)){alreadyWeighted++;continue;}
      weights.push({id:'health-import-weight-'+row.date,date:row.date,weight:row.weightKg,source:SOURCE});
      dates.add(row.date);addedWeights++;
    }
    const changes={
      monthly:monthly.length-(current.healthMonthly||[]).length,
      daily:daily.length-(current.activitySteps||[]).length,
      weightReports:reports.length-(current.healthWeightReports||[]).length,
      weights:addedWeights,existingWeightDays:alreadyWeighted
    };
    return {next:{...current,healthMonthly:monthly,healthWeightReports:reports,activitySteps:daily,weights},
      changes,warnings:[
        'Resumos mensais nunca são repartidos em dias individuais.',
        'Calorias de atividade não são gasto energético diário total.',
        'O IMC informado é um indicador calculado; não foi tratado como medida de gordura.',
        ...(alreadyWeighted?['Pesagem já existente na mesma data foi preservada.']:[])
      ]};
  }
  function averages(rows){
    if(!validMonthlyList(rows))return [];
    return (rows||[]).slice().sort((a,b)=>a.month.localeCompare(b.month)).map(row=>({
      month:row.month,complete:row.complete,daysCovered:row.daysCovered,
      stepsPerCalendarDay:Math.round(row.steps/row.daysCovered),steps:row.steps,
      activityMinutes:row.activeMinutes,activityKcal:row.activityKcal,goalDays:row.goalDays
    }));
  }
  const api={FORMAT,SOURCE,validMonthly,validMonthlyList,validWeightReport,validWeightReports,
    validImport,mergeMonthly,mergeWeightReports,apply,averages};
  root.ForjaHealthImport=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
