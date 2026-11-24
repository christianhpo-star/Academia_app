/* FORJA: independent, optional free-form strength session after Muay or on any day.
 * Uses the same recorded-set contract as planned strength sessions, but never
 * completes a rotation block or modifies the user's A/B/C/D sheet. */
(function installFreeWorkout(root){
  'use strict';
  const node=typeof module!=='undefined'&&module.exports;
  const F=root.ForjaFlex || (node?require('./flex.js'):null);
  const SETS=root.ForjaTrainingSets || (node?require('./training-sets.js'):null);
  const PLAN_ID='FREE';
  const limit=30;
  const clone=x=>JSON.parse(JSON.stringify(x));
  const isFree=source=>typeof source==='string'?source===PLAN_ID:source?.planId===PLAN_ID;
  const validDay=day=>{
    if(typeof day!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(day))return false;
    const time=Date.parse(day+'T12:00:00Z');
    return Number.isFinite(time)&&new Date(time).toISOString().slice(0,10)===day;
  };
  const create=({day,afterMuayId=null}={})=>{
    if(!validDay(day))return {error:'Informe uma data válida.'};
    return {planId:PLAN_ID,day,afterMuayId:typeof afterMuayId==='string'&&afterMuayId?afterMuayId:null,
      energy:'',notes:'',entries:{},plannedIds:[],skipped:[],addedIds:[]};
  };
  const fold=text=>String(text||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').trim();
  function options(exercises=[],draft=null,search='',all=false){
    const available=F.options(exercises,draft,search);
    const core=ex=>ex?.complement==='abdomen'||/abdom|core|obl[ií]qu|dead.bug|prancha/i.test(
      [ex?.name,ex?.muscle,...(ex?.aliases||[])].join(' '));
    const sorted=available.slice().sort((a,b)=>Number(core(b))-Number(core(a))||a.name.localeCompare(b.name,'pt-BR'));
    if(fold(search))return sorted.slice(0,25);
    if(all)return sorted.slice(0,80);
    return sorted.filter(core).slice(0,10);
  }
  function add(draft,exercise){
    if(!isFree(draft)||!draft?.entries||!exercise||typeof exercise.id!=='string'||
       !Number.isInteger(Number(exercise.sets))||Number(exercise.sets)<1||Number(exercise.sets)>12)
      return {error:'Rascunho ou exercício inválido.'};
    if(Object.hasOwn(draft.entries,exercise.id))return {error:'Exercício já está neste treino.'};
    if(Object.keys(draft.entries).length>=limit)return {error:'Limite de 30 exercícios por treino livre.'};
    const next=clone(draft);
    const entry={id:exercise.id,sets:[{load:SETS.allowsZero(exercise)?0:'',reps:'',rir:'',warmup:false}],
      pain:exercise.knee?'':''};
    if(!F.addToDraft(next,exercise.id,exercise,entry))return {error:'Não foi possível adicionar este exercício.'};
    return {draft:next,entry};
  }
  function custom(name,bodyweight=false){
    const cleaned=String(name||'').trim().replace(/\s+/g,' ');
    if(!cleaned||cleaned.length>100)return {error:'Informe um nome com até 100 caracteres.'};
    const id=(bodyweight?'free-bodyweight-':'free-custom-')+
      Date.now()+'-'+Math.random().toString(36).slice(2,8);
    return {exercise:{id,name:cleaned,group:PLAN_ID,sets:1,low:8,high:20,step:1,
      unit:'kg',mode:bodyweight?'bodyweight':'double',active:false,knee:false,
      muscle:'Não classificado',equipment:bodyweight?'Peso do corpo':'Carga livre'}};
  }

  function remove(draft,id){
    if(!isFree(draft)||!Object.hasOwn(draft.entries||{},id))
      return {error:'Exercício não encontrado neste treino.'};
    const entry=draft.entries[id];
    if((entry?.sets||[]).some(row=>row?.reps!==''&&row?.reps!=null))
      return {error:'O exercício possui repetições preenchidas. Limpe as séries antes de removê-lo.'};
    const next=clone(draft);
    delete next.entries[id];
    next.addedIds=(next.addedIds||[]).filter(v=>v!==id);
    next.plannedIds=(next.plannedIds||[]).filter(v=>v!==id);
    return {draft:next};
  }
  function linkedMuay(sessions=[],day=''){
    return [...sessions].filter(row=>row?.day===day&&typeof row?.id==='string')
      .sort((a,b)=>String(b.timestamp||'').localeCompare(String(a.timestamp||'')))[0]||null;
  }
  function count(draft){
    const entries=Object.values(draft?.entries||{});
    const done=entries.filter(row=>SETS.workSets(row).length);
    return {selected:entries.length,performed:done.length,sets:done.reduce((n,row)=>n+SETS.workSets(row).length,0)};
  }
  const api=Object.freeze({VERSION:1,PLAN_ID,isFree,validDay,create,options,add,custom,remove,linkedMuay,count});
  root.ForjaFreeWorkout=api;
  if(node)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
