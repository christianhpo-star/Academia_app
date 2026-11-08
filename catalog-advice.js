(function installCatalogAdvice(root) {
  'use strict';
  const TARGETS={
    A:['costas','biceps'],B:['peito','triceps','ombros'],
    C:['quadriceps','panturrilhas'],D:['posteriores','gluteos'],
  };
  const isPain=v=>v!==''&&v!==null&&v!==undefined&&Number.isFinite(Number(v))&&Number(v)>0;
  const age=(today,day)=>{
    if(!/^\d{4}-\d{2}-\d{2}$/.test(String(today))||!/^\d{4}-\d{2}-\d{2}$/.test(String(day)))return NaN;
    return (Date.parse(today+'T12:00:00Z')-Date.parse(day+'T12:00:00Z'))/86400000;
  };
  function recentUse(id,sessions,today) {
    const found=(sessions||[]).filter(s=>{
      const a=age(today,s?.day);
      return Number.isFinite(a)&&a>=0&&a<28&&
        (s.entries||[]).some(e=>e?.id===id&&(e.sets||[]).some(
          t=>!t.warmup&&Number(t.load)>0&&Number(t.reps)>0));
    });
    return found.sort((a,b)=>String(b.day).localeCompare(String(a.day)))[0]?.day||null;
  }
  const intersection=(a,b)=>a.some(x=>b.includes(x));
  function suggest({options=[],draft=null,exercises=[],strengthSessions=[],muaySessions=[],
    settings={},today='',dose=null}={}) {
    const result={recommendations:[],message:'',caution:'',basis:'',scope:'replacement'};
    if(!draft?.entries||!dose?.MAP||typeof dose.volume!=='function') {
      result.message='Sem dados suficientes para recomendações nesta sessão.';
      return result;
    }
    const catalogue=[...(options||[])];
    const lookup=new Map(exercises.map(x=>[x.id,x]));
    for(const x of catalogue)lookup.set(x.id,x);
    const plan=TARGETS[draft.planId]||[];
    const skipped=(draft.skipped||[]).map(s=>({
      ...s,ex:lookup.get(s.id)||exercises.find(e=>e.id===s.id),
      profile:dose.MAP[s.id],
    })).filter(s=>s.profile);
    const active=Object.keys(draft.entries).map(id=>({
      ex:lookup.get(id)||exercises.find(e=>e.id===id),
      profile:dose.MAP[id],
    })).filter(s=>s.ex&&s.profile);
    const kneePain=isPain(settings.kneePain)||Object.values(draft.entries).some(e=>isPain(e?.pain))||
      (draft.skipped||[]).some(s=>s.reason==='desconforto' && (lookup.get(s.id)?.knee||dose.MAP[s.id]?.direct?.includes('quadriceps')));
    const fatigue=draft.energy==='intenso'||settings.fatigue==='alta';
    const muayToday=(muaySessions||[]).some(s=>{
      const a=age(today,s?.day);return a>=0&&a<=1;
    });
    const legs=['quadriceps','posteriores','gluteos'];
    const caution=kneePain?'Há registro de desconforto no joelho. Não aumente o treino de pernas; considere orientação profissional.':
      fatigue?'Fadiga elevada informada. Priorize recuperação em vez de acrescentar volume.':
      muayToday?'Muay Thai registrado hoje ou ontem: considere a fadiga antes de aumentar volume.':'';
    result.caution=caution;
    const data=dose.volume({strengthSessions,draft,today});
    const priorities=[];
    for(const option of catalogue){
      const profile=dose.MAP[option.id];
      if(!profile||!profile.direct?.length)continue;
      if(kneePain&&intersection(profile.direct,legs))continue;
      let skippedFor=skipped.find(s=>s.profile.direct&&intersection(profile.direct,s.profile.direct) && s.reason!=='desconforto');
      let activeFor=active.find(s=>intersection(profile.direct,s.profile.direct));
      const relatedToPlan=intersection(profile.direct,plan);
      if(!skippedFor&&!activeFor&&!relatedToPlan)continue;
      if(!skippedFor&&!activeFor)continue; // do not suggest expanding an untrained muscle by default
      const direct=profile.direct[0];
      const muscle=data.rows.find(row=>row.id===direct);
      const lastDay=recentUse(option.id,strengthSessions,today);
      let description,kind;
      if(skippedFor){
        description=`Alternativa para ${skippedFor.ex?.name||'o exercício retirado'}: ambos trabalham ${muscle?.label||'um grupo muscular semelhante'}. Compare execução, equipamento e conforto.`;
        kind='replacement';
      }else{
        description=`Alternativa a ${activeFor.ex.name}, com participação principal de ${muscle?.label||'um grupo muscular semelhante'}. Para substituir, retire o original; não acumule ambos automaticamente.`;
        kind='variation';
      }
      if(lastDay)description+=` Já foi registrado em ${lastDay.slice(8,10)}/${lastDay.slice(5,7)}.`;
      if(muscle && data.completedSessions>=2){
        description+=` Volume desse grupo nos últimos 7 dias: ${Number(muscle.estimated7).toLocaleString('pt-BR',{maximumFractionDigits:1})} série(s) estimada(s), incluindo participações auxiliares.`;
      }
      const score=(skippedFor?100:0)+(option.group===draft.planId?30:0)+(lastDay?12:0)+
        (activeFor?6:0)-(option.knee?4:0);
      priorities.push({id:option.id,name:option.name,group:option.group,muscle:muscle?.label||option.muscle,
        equipment:option.equipment,kind,score,reason:description,referenceId:skippedFor?.id||activeFor?.ex.id,
        completedSessions:data.completedSessions});
    }
    priorities.sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name,'pt-BR'));
    result.recommendations=priorities.slice(0,3);
    if(result.recommendations.length){
      result.message='Priorizei alternativas para exercícios retirados ou movimentos da ficha atual. Isso não significa que aumentar a quantidade de exercícios seja necessário.';
    }else{
      result.message=kneePain?'Sem alternativa segura para sugerir automaticamente com os registros atuais de desconforto.':
        'Sem alternativa suficientemente relacionada à ficha atual. Consulte o catálogo completo para escolher manualmente.';
    }
    result.basis=data.completedSessions<2?
      'Histórico ainda limitado: sugestões baseadas principalmente nos grupos musculares da ficha; não há evidência individual suficiente para recomendar mais volume.':
      'Usa ficha do dia, grupos musculares, sessões realizadas nos últimos 28 dias e volume estimado. Os critérios de ordenação são heurísticos e não foram validados clinicamente.';
    return result;
  }
  root.ForjaCatalogAdvice={suggest,TARGETS};
  if(typeof module!=='undefined'&&module.exports)module.exports=root.ForjaCatalogAdvice;
})(typeof globalThis!=='undefined'?globalThis:this);
