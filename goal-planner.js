/* FORJA UX15 - goal planning with transparent evidence and strict non-prescription rules.
 * Pace is arithmetic, NOT a prediction of future weight. Estimated calories are a
 * broad optional starting range, NOT a deadline-derived deficit.
 */
(function(root){
 'use strict';
 const G=root.ForjaNutritionGoals||(typeof require==='function'?require('./nutrition-goals.js'):null);
 const MODES=Object.freeze({
   weight:'Alcançar um peso até uma data',
   recomposition:'Recomposição corporal',
   fat_loss:'Reduzir gordura preservando músculos',
   muscle_gain:'Ganhar massa muscular',
   maintenance:'Manter peso e desempenho'
 });
 const dateOK=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&
   !Number.isNaN(Date.parse(value+'T12:00:00Z'))&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;
 const numeric=(value,min,max)=>typeof value==='number'&&Number.isFinite(value)&&value>=min&&value<=max;
 const daysBetween=(from,to)=>Math.round((Date.parse(to+'T12:00:00Z')-Date.parse(from+'T12:00:00Z'))/86400000);
 const round10=value=>Math.round(value/10)*10;
 const validMode=mode=>mode===undefined||Object.hasOwn(MODES,mode);
 function latestWeight(state,day){
   const reports=(state?.weights||[]).filter(x=>x&&dateOK(x.date)&&x.date<=day&&numeric(Number(x.weight),20,400));
   reports.sort((a,b)=>b.date.localeCompare(a.date)||(Boolean(a.initial)-Boolean(b.initial)));
   if(reports.length){
     const observed=reports.find(x=>!x.initial);
     const r=observed||reports[0];return {weight:Number(r.weight),date:r.date,reference:!!r.initial};
   }
   const initial=Number(state?.settings?.startWeight);
   return numeric(initial,20,400)?{weight:initial,date:null,reference:true}:null;
 }
 const labelFor=type=>MODES[type]||MODES.weight;
 const trainingWeek=(state,day)=>{
   const since=new Date(day+'T12:00:00Z');since.setUTCDate(since.getUTCDate()-6);const from=since.toISOString().slice(0,10);
   const dateOf=s=>s?.day||s?.date||s?.timestamp?.slice(0,10);
   const strength=(state?.sessions||[]).filter(s=>{const d=dateOf(s);return dateOK(d)&&d>=from&&d<=day;});
   const muay=(state?.muay?.sessions||[]).filter(s=>{const d=dateOf(s);return dateOK(d)&&d>=from&&d<=day;});
   return {strength:strength.length,muay:muay.length,distinctDays:new Set([...strength,...muay].map(dateOf)).size};
 };
 function plan(state,day){
   if(!dateOK(day))return {error:'Data de avaliação inválida.'};
   const settings=state?.settings||{};
   const mode=validMode(settings.goalMode)?(settings.goalMode||'weight'):'weight';
   const measured=latestWeight(state,day),target=Number(settings.targetWeight);
   const deadline=settings.goalDate;
   const futureDays=dateOK(deadline)?daysBetween(day,deadline):null;
   const isWeightGoal=mode==='weight'||mode==='fat_loss'||mode==='muscle_gain';
   const hasTarget=isWeightGoal&&numeric(target,30,350)&&!!measured;
   const difference=hasTarget?Math.round((target-measured.weight)*10)/10:null;
   const direction=difference==null||Math.abs(difference)<0.2?'stable':difference<0?'loss':'gain';
   const pace=hasTarget&&futureDays>0?Math.abs(difference)*7/futureDays:null;
   const pacePercent=pace!=null?pace/measured.weight*100:null;
   const sport=trainingWeek(state,day);
   const profile=state?.nutrition?.settings?.profile;
   const calculated=profile&&G?.estimate(profile);
   const profileWeightStale=Boolean(measured&&!measured.reference&&numeric(profile?.weightKg,30,350)&&Math.abs(profile.weightKg-measured.weight)/measured.weight>.05);
   const lastWeightDays=measured?.date?daysBetween(measured.date,day):null;
   const measurementStale=lastWeightDays!=null&&lastWeightDays>45;
   const maintenance=calculated&&!calculated.error&&!profileWeightStale&&!measurementStale?calculated.maintenance:null;
   const warnings=[
     'Peso e prazo indicam apenas o ritmo matemático; não são previsão de resultado.',
     'Não convertemos quilogramas em calorias usando a regra fixa de 7.700 kcal/kg.',
     'Calorias de treino e Samsung Health não são somadas novamente ao fator de atividade.'
   ];
   let status='informational';
   if(isWeightGoal&&!hasTarget){status='incomplete';warnings.push('Registre um peso atual e uma meta para avaliar o prazo.');}
   if(isWeightGoal&&hasTarget&&futureDays!=null&&futureDays<=0&&direction!=='stable'){
     status='expired';warnings.push('O prazo terminou: escolha uma nova data, sem compensações drásticas.');
   }
   if(mode==='fat_loss'&&direction==='gain'||mode==='muscle_gain'&&direction==='loss'){
     status='conflict';warnings.push('O sentido do peso-alvo não corresponde à modalidade; revise a meta.');
   }
   if(direction==='stable'&&isWeightGoal&&hasTarget)status='at-target';
   if(status==='informational'&&isWeightGoal&&pacePercent!=null&&pacePercent>1){
     status='review';warnings.push('O ritmo requerido ultrapassa 1% do peso atual por semana; revise o prazo com um profissional, sobretudo se pratica várias modalidades.');
   }else if(status==='informational'&&direction==='loss'&&pacePercent!=null&&pacePercent>0.75){
     status='caution';warnings.push('O ritmo solicitado se aproxima da faixa superior frequentemente usada em contextos esportivos. Priorize adesão e preservação muscular.');
   }
   if(!measured||measured.reference)warnings.push('Peso de referência, não pesagem recente: confirme antes de ajustar metas.');
   if(profileWeightStale)warnings.push('O peso do perfil nutricional difere mais de 5% da última pesagem: revise o perfil antes de estimar energia.');
   if(measurementStale)warnings.push('Última pesagem com mais de 45 dias: atualize o peso antes de estimar energia.');
   if(maintenance==null)warnings.push('Sem perfil nutricional atualizado e completo não calculamos valores calóricos.');
   if(profile?.activity>=1.725)warnings.push('Fator de atividade alto: as calorias calculadas podem superestimar o gasto real.');
   // Starting bands are PRODUCT DESIGN HEURISTICS, not NIDDK dynamic simulations.
   // They are intentionally independent of desired deadline.
   let band=null;
   if(maintenance!=null&&status!=='conflict'&&status!=='expired'){
     const isReduction=(mode==='weight'&&direction==='loss')||mode==='fat_loss';
     const isIncrease=(mode==='weight'&&direction==='gain')||mode==='muscle_gain';
     const multipliers=isReduction?[.85,.95]:isIncrease?[1.02,1.05]:[.97,1.03];
     band={low:round10(maintenance*multipliers[0]),high:round10(maintenance*multipliers[1]),
       kind:isReduction?'déficit inicial moderado':isIncrease?'superávit inicial pequeno':'faixa próxima à manutenção',
       provenance:'heurística editável, não prescrição nem previsão de peso'};
     if(band.low<calculated.resting){
       band=null;warnings.push('A faixa heurística resultou abaixo do repouso estimado; nenhum valor energético será sugerido automaticamente.');
     }
   }
   const weightForProtein=measured?((direction==='loss'&&hasTarget)?Math.min(measured.weight,target):measured.weight):
     (numeric(profile?.weightKg,30,350)?profile.weightKg:null);
   const protein=weightForProtein&&profile?.adultScope?
     {low:Math.round(weightForProtein*1.6),high:Math.round(weightForProtein*2.2),unit:'g/dia',
       note:'Faixa contextual para adultos que treinam força, não meta automática. Confirmar situações clínicas.'}:null;
   const needsStrength=sport.strength<2;
   const training=needsStrength?
     'Se for compatível com sua recuperação, organize pelo menos dois dias semanais de fortalecimento dos principais grupos. O registro incompleto não significa que você não treinou.':
     'Mantenha progressão e qualidade das séries; não adicione sessões automaticamente por causa de um prazo.';
   const food=direction==='loss'||mode==='fat_loss'?
     'Priorize adequação energética, fontes de proteína, frutas, vegetais e refeições que você consiga manter. Evite restrições bruscas e preserve o treino de força.':
     direction==='gain'||mode==='muscle_gain'?
     'Priorize ingestão suficiente para treinar e recuperar, proteína adequada e progressão gradual; ajuste pelo peso e desempenho observados.':
     'Mantenha variedade, refeições adequadas ao treino e acompanhamento de tendência, sem inferir consumo não registrado.';
   const trainingOptions=[
     {id:'continuity',label:'Manter rotina e evoluir',detail:'Manter as sessões habituais registradas, progredir cargas ou repetições gradualmente e respeitar recuperação.'},
     {id:'recovery',label:'Semana de recuperação',detail:'Quando houver fadiga ou dor, rever volume e intensidade; a meta de peso não exige aumentar séries.'},
     {id:'conditioning',label:'Condicionamento complementar',detail:'Usar caminhada, atividade aeróbia ou Muay Thai conforme capacidade, sem contabilizar novamente as calorias.'}
   ];
   const foodOptions=[
     {id:'balanced',label:'Distribuição equilibrada',detail:'Ajustar alimentos habituais, porções e frequência; manter registro real dos macros conhecidos.'},
     {id:'protein',label:'Prioridade à proteína',detail:'Distribuir fontes de proteína ao longo das refeições e verificar a ingestão total; não substituir a avaliação alimentar completa.'},
     {id:'training',label:'Energia para os treinos',detail:'Planejar refeições com fontes de carboidratos próximas aos treinos conforme tolerância, sem inventar calorias consumidas.'}
   ];
   return {trainingOptions,foodOptions,mode,label:labelFor(mode),asOf:day,sourceWeight:measured,targetKg:hasTarget?target:null,
     deadline:dateOK(deadline)?deadline:null,daysRemaining:futureDays,weightDeltaKg:difference,direction,
     paceKgPerWeek:pace==null?null:Math.round(pace*100)/100,
     pacePercentPerWeek:pacePercent==null?null:Math.round(pacePercent*100)/100,
     status,warnings,maintenanceKcal:maintenance,energyBand:band,proteinBand:protein,
     trainingWeek:sport,trainingAdvice:training,foodAdvice:food,
     evidenceVersion:'forja-evidence-2026-11-15-v1',
     nextReview:'Revisar após 2–4 semanas de registros consistentes; não ajustar por uma única pesagem.'};
 }
 const api={MODES,dateOK,validMode,latestWeight,trainingWeek,plan};
 root.ForjaGoalPlanner=api;
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
