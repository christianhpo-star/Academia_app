/* Evidence-informed starting estimates, not measured expenditure. See docs/nutrition-goals.md. */
(function(root){
  'use strict';
  const KEYS=['energyKcal','proteinG','carbsG','fatG','fiberG'];
  const range=(v,a,b)=>typeof v==='number'&&Number.isFinite(v)&&v>=a&&v<=b;
  const date=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v+'T12:00:00Z'))&&new Date(v+'T12:00:00Z').toISOString().slice(0,10)===v;
  const profileKeys={heightCm:[100,250],age:[18,100],weightKg:[30,350],activity:[1.2,1.9]};
  function validProfile(p){
    return p&&typeof p==='object'&&!Array.isArray(p)&&Object.entries(profileKeys).every(([k,r])=>p[k]==null||range(p[k],...r))&&
      (p.age==null||Number.isInteger(p.age))&&['','male','female'].includes(p.sex)&&
      ['recomposition','loss','maintain','gain'].includes(p.goal)&&typeof p.adultScope==='boolean'&&date(p.confirmedAt);
  }
  function validTarget(t){return t&&typeof t==='object'&&typeof t.id==='string'&&/^[\w:-]{1,100}$/.test(t.id)&&date(t.from)&&
    ['suggested','manual','professional'].includes(t.source)&&
    KEYS.every(k=>t.values?.[k]===null||range(t.values?.[k],1,k==='energyKcal'?10000:1000))&&
    (t.profile==null||validProfile(t.profile))&&typeof t.formula==='string'&&t.formula.length<80;}
  function validSettings(s){return (s.profile===undefined||validProfile(s.profile))&&
    (s.targets===undefined||(Array.isArray(s.targets)&&s.targets.length<=1000&&s.targets.every(validTarget)&&new Set(s.targets.map(t=>t.id)).size===s.targets.length));}
  function estimate(p){
    if(!validProfile(p)||!p.adultScope||Object.keys(profileKeys).some(k=>p[k]==null)||!p.sex)
      return {error:'Confirme altura, idade adulta, peso, atividade e parâmetro da fórmula. Metas manuais continuam disponíveis.'};
    const resting=10*p.weightKg+6.25*p.heightCm-5*p.age+(p.sex==='male'?5:-161);
    const maintenance=resting*p.activity;
    const factor={loss:.9,recomposition:1,maintain:1,gain:1.05}[p.goal];
    const energyKcal=Math.round(maintenance*factor/10)*10;
    const proteinG=Math.round(p.weightKg*1.8),fatG=Math.round(energyKcal*.25/9);
    const carbsG=Math.round((energyKcal-4*proteinG-9*fatG)/4);
    if(resting<=0||carbsG<=0||energyKcal<resting)return {error:'O perfil produziu uma estimativa inconsistente. Revise os dados ou use metas profissionais.'};
    return {values:{energyKcal,proteinG,carbsG,fatG,fiberG:25},resting:Math.round(resting),maintenance:Math.round(maintenance),
      formula:'mifflin-1990-forja-v1',warnings:[
        'Estimativa inicial: atividade inclui a rotina e os treinos; não somamos calorias de sessões novamente.',
        '1,8 g/kg de proteína, 25% de gordura e ajuste de energia são escolhas iniciais editáveis, não valores ótimos medidos.',
        ...(carbsG/p.weightKg<3?['Carboidratos abaixo de 3 g/kg: confira energia e desempenho se houver treinos exigentes.']:[])]};
  }
  // Personal-use reference from a nutrition professional. This preset never changes
  // an existing target without explicit choice and is stored in the local diary.
  // The original prescription specifies no numeric fibre goal.
  const PROFESSIONAL_VALUES=Object.freeze({
    energyKcal:1710,proteinG:159,carbsG:146,fatG:28,fiberG:null,
  });
  function professionalTarget(from){
    if(!date(from))return null;
    const target={id:'professional-'+from,from,source:'professional',
      values:{...PROFESSIONAL_VALUES},profile:null,formula:'professional-plan-20261113'};
    return validTarget(target)?target:null;
  }
  // User requested a 2,170 kcal daily display despite the scanned PDF stating
  // 1,710 kcal. Treat this as a PERSONAL override, never as text from the PDF.
  const USER_ENERGY_KCAL=2170;
  function userTarget(from){
    const base=professionalTarget(from);
    return base?{...base,id:'personal-'+from,source:'manual',
      values:{...base.values,energyKcal:USER_ENERGY_KCAL},
      formula:'user-preference-2170-v2'}:null;
  }
  function useUserTarget(settings,from){
    if(!settings||!date(from))return false;
    const targets=settings.targets||[];
    if(targets.length===0){settings.targets=[userTarget(from)];return true;}
    const onlyOld=targets.length===1&&targets[0].source==='professional'&&
      targets[0].formula==='professional-plan-20261113'&&
      JSON.stringify(targets[0].values)===JSON.stringify(PROFESSIONAL_VALUES);
    if(!onlyOld)return false;
    // Preserve previous reference in backup, even when it has the same start date.
    settings.priorPrescriptionTarget={...targets[0]};
    settings.targets=[userTarget(from)];
    return true;
  }
  function professionalDefault(settings,from){
    if(!settings || !date(from))return false;
    if(Array.isArray(settings.targets)&&settings.targets.length)return false;
    settings.targets=[professionalTarget(from)];
    return true;
  }
  // Mifflin-St Jeor predicts resting energy expenditure (REE/RMR), not a measured BMR
  // or total daily expenditure. Latest dated diary weight takes priority over an old profile.
  function restingFromState(state,day){
    const p=state?.nutrition?.settings?.profile;
    const weights=(state?.weights||[])
      .filter(w=>w&&date(w.date)&&w.date<=day&&range(Number(w.weight),30,350))
      .sort((a,b)=>b.date.localeCompare(a.date));
    const weightRecord=weights[0]||null;
    const weightKg=weightRecord?Number(weightRecord.weight):p?.weightKg;
    const missing=[];
    if(!range(weightKg,30,350))missing.push('peso');
    if(!range(p?.heightCm,100,250))missing.push('altura');
    if(!range(p?.age,18,100)||!Number.isInteger(p?.age))missing.push('idade');
    if(!['male','female'].includes(p?.sex))missing.push('parâmetro da fórmula');
    if(missing.length)return {valueKcal:null,missing,weightKg:range(weightKg,30,350)?weightKg:null,
      weightDate:weightRecord?.date||null,formula:'mifflin-st-jeor-1990'};
    const kcal=Math.round(10*weightKg+6.25*p.heightCm-5*p.age+(p.sex==='male'?5:-161));
    return {valueKcal:kcal,missing:[],weightKg,weightDate:weightRecord?.date||null,
      formula:'mifflin-st-jeor-1990'};
  }
  function active(settings,day){return (settings.targets||[]).filter(t=>t.from<=day).sort((a,b)=>b.from.localeCompare(a.from))[0]||null;}
  function difference(v){return KEYS.slice(0,4).some(k=>v[k]==null)?null:Math.round(v.energyKcal-4*v.proteinG-4*v.carbsG-9*v.fatG);}
  function context(state,day){
    const strength=(state.sessions||[]).filter(s=>(s.day||s.date||s.timestamp?.slice(0,10))===day).length;
    const muay=(state.muay?.sessions||[]).filter(s=>(s.day||s.date)===day).length;
    const weights=(state.weights||[]).filter(w=>!w.initial&&w.date<=day).sort((a,b)=>a.date.localeCompare(b.date));
    const cutoff=new Date(day+'T12:00:00Z');cutoff.setUTCDate(cutoff.getUTCDate()-28);
    const recent=weights.filter(w=>w.date>=cutoff.toISOString().slice(0,10));
    const measurements=(state.bodyMeasurements||[]).filter(m=>m.date<=day).sort((a,b)=>a.date.localeCompare(b.date));
    const measures=measurements.length;
    const abdomen=measurements.filter(m=>m.date>=cutoff.toISOString().slice(0,10)&&Number.isFinite(m.values?.abdomen));
    const abdomenChange=abdomen.length>=2&&Date.parse(abdomen.at(-1).date)-Date.parse(abdomen[0].date)>=14*86400000?Math.round((abdomen.at(-1).values.abdomen-abdomen[0].values.abdomen)*10)/10:null;
    const week=new Date(day+'T12:00:00Z');week.setUTCDate(week.getUTCDate()-6);const weekStart=week.toISOString().slice(0,10);
    const inWeek=d=>d>=weekStart&&d<=day;
    const weeklyStrength=(state.sessions||[]).filter(s=>inWeek(s.day||s.date||s.timestamp?.slice(0,10))).length;
    const weeklyMuay=(state.muay?.sessions||[]).filter(s=>inWeek(s.day||s.date)).length;
    return {strength,muay,measures,abdomenChange,weeklyStrength,weeklyMuay,recentWeights:recent.length,
      weightChange:recent.length>=2&&Date.parse(recent.at(-1).date)-Date.parse(recent[0].date)>=14*86400000?Math.round((recent.at(-1).weight-recent[0].weight)*10)/10:null};
  }
  const api={KEYS,validProfile,validTarget,validSettings,estimate,active,difference,context,PROFESSIONAL_VALUES,professionalTarget,professionalDefault,restingFromState,USER_ENERGY_KCAL,userTarget,useUserTarget};root.ForjaNutritionGoals=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
