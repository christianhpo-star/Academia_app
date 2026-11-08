(function install(root) {
  'use strict';
  const validPositive = v => v !== '' && v != null && Number.isFinite(Number(v)) && Number(v) > 0;
  const performed = set => set && validPositive(set.load) && Number.isInteger(Number(set.reps)) &&
    validPositive(set.reps) && Number(set.reps) <= 100;
  const workPerformed = set => performed(set) && !set.warmup;
  function summary(entries) {
    const list=Object.values(entries||{}).filter(Boolean);
    let completed=0, effectiveSets=0;
    const byExercise={};
    for(const entry of list) {
      const sets=Array.isArray(entry.sets)?entry.sets:[];
      const working=sets.filter(set=>!set.warmup);
      const done=working.filter(workPerformed).length;
      const finished=working.length>0 && done===working.length;
      byExercise[entry.id]={finished,done,total:working.length};
      if(finished)completed++;
      effectiveSets+=done;
    }
    return {total:list.length,completed,effectiveSets,byExercise};
  }
  function selectedId(entries,preferred) {
    const list=Object.keys(entries||{});
    if(preferred && list.includes(preferred))return preferred;
    const stats=summary(entries).byExercise;
    return list.find(id=>!stats[id]?.finished)||list[0]||null;
  }
  function quickLoad(entry,index,mode,previousSets=[]) {
    if(!entry || !Array.isArray(entry.sets) || !Number.isInteger(index) ||
      index<0 || index>=entry.sets.length)return {error:'Série não encontrada.'};
    const target=entry.sets[index];
    if(performed(target)||validPositive(target.reps))
      return {error:'A série já possui repetições; preserve o registro antes de copiar outra carga.'};
    let source;
    if(mode==='previous-session')source=previousSets[index];
    else if(mode==='last-set' && index>0)source=entry.sets[index-1];
    else return {error:'Não existe uma série anterior disponível.'};
    if(!source || !validPositive(source.load))
      return {error:'A série de referência não possui carga registrada.'};
    return {load:String(source.load)};
  }
  root.ForjaFocus={performed,workPerformed,summary,selectedId,quickLoad};
  if(typeof module!=='undefined' && module.exports)module.exports=root.ForjaFocus;
})(typeof globalThis !== 'undefined'?globalThis:this);
