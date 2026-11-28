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
  const isHistoryEdit=draft=>typeof draft?.editingId==='string'&&draft.editingId.length>0;
  const isEditor=draft=>isFree(draft)||isHistoryEdit(draft);
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
    const available=F.options(exercises,isHistoryEdit(draft)?{...draft,skipped:[]}:draft,search);
    const core=ex=>ex?.complement==='abdomen'||/abdom|core|obl[ií]qu|dead.bug|prancha/i.test(
      [ex?.name,ex?.muscle,...(ex?.aliases||[])].join(' '));
    const front=['prancha-frontal','prancha-joelhos','prancha-lateral',
      'abdominal-solo','abdominal-inverso'];
    const order=ex=>front.indexOf(ex.id)>=0?front.indexOf(ex.id):front.length;
    const sorted=available.slice().sort((a,b)=>Number(core(b))-Number(core(a))||
      order(a)-order(b)||a.name.localeCompare(b.name,'pt-BR'));
    if(fold(search))return sorted.slice(0,25);
    if(all)return sorted.slice(0,80);
    return sorted.filter(core).slice(0,10);
  }
  function add(draft,exercise){
    if(!isEditor(draft)||!draft?.entries||!exercise||typeof exercise.id!=='string'||
       !Number.isInteger(Number(exercise.sets))||Number(exercise.sets)<1||Number(exercise.sets)>12)
      return {error:'Rascunho ou exercício inválido.'};
    if(Object.hasOwn(draft.entries,exercise.id))return {error:'Exercício já está neste treino.'};
    if(Object.keys(draft.entries).length>=limit)return {error:'Limite de 30 exercícios por treino livre.'};
    const next=clone(draft);
    if(isHistoryEdit(next))next.skipped=(next.skipped||[]).filter(row=>row.id!==exercise.id);
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

  function remove(draft,id,confirmed=false){
    if(!isEditor(draft)||!Object.hasOwn(draft.entries||{},id))
      return {error:'Exercício não encontrado neste treino.'};
    const entry=draft.entries[id];
    if(!(isHistoryEdit(draft)&&confirmed)&&(entry?.sets||[]).some(row=>row?.reps!==''&&row?.reps!=null))
      return {error:'O exercício possui repetições preenchidas. Limpe as séries antes de removê-lo.'};
    const next=clone(draft);
    delete next.entries[id];
    next.addedIds=(next.addedIds||[]).filter(v=>v!==id);
    if(!isHistoryEdit(next))next.plannedIds=(next.plannedIds||[]).filter(v=>v!==id);
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
  // Isolated, recoverable copy. No record or sheet changes until explicit save.
  // A snapshot detects stale edits, including edits interrupted by an import.
  function fromSession(session){
    if(!session||typeof session.id!=='string'||!session.id||!['A','B','C','D',PLAN_ID].includes(session.planId)||
       !validDay(session.day)||!Number.isFinite(Date.parse(session.timestamp))||!Array.isArray(session.entries)||
       session.entries.length>30||session.entries.some(en=>!en||typeof en.id!=='string'||!en.id||
         !Array.isArray(en.sets)||!en.sets.length||en.sets.length>12||en.sets.some(set=>!set||typeof set!=='object'))||
       new Set(session.entries.map(en=>en.id)).size!==session.entries.length)
      return {error:'Este registro antigo precisa de revisão antes de ser editado. O original foi preservado.'};
    const original=clone(session);
    return {draft:{planId:original.planId,day:original.day,editingId:original.id,editOriginal:JSON.stringify(original),
      editExercises:[],afterMuayId:original.afterMuayId||null,energy:typeof original.energy==='string'?original.energy:'',
      notes:typeof original.notes==='string'?original.notes:'',entries:Object.fromEntries(original.entries.map(en=>[en.id,en])),
      plannedIds:Array.isArray(original.plannedIds)?[...original.plannedIds]:original.entries.map(en=>en.id),
      skipped:Array.isArray(original.skipped)?original.skipped:[],addedIds:[],cardio:Array.isArray(original.cardio)?original.cardio:[],
      kneeNextDay:original.kneeNextDay??''}};
  }
  function updateSession(original,draft,entries,cardio,today,muaySessions=[]){
    if(!isHistoryEdit(draft)||!original||original.id!==draft.editingId||original.planId!==draft.planId||
      JSON.stringify(original)!==draft.editOriginal)
      return {error:'O registro original mudou ou não está mais disponível. Descarte a edição e abra-o novamente.'};
    if(!validDay(draft.day)||draft.day>today)return {error:'Informe uma data válida que não esteja no futuro.'};
    if(!Array.isArray(entries)||!Array.isArray(cardio)||(!entries.length&&(!isFree(draft)||!cardio.length)))
      return {error:'Registre pelo menos uma série efetiva ou, no treino livre, cardio com duração positiva.'};
    const performed=new Set(entries.map(row=>row.id));
    const next={...clone(original),day:draft.day,entries:clone(entries),
      energy:typeof draft.energy==='string'?draft.energy:'',notes:String(draft.notes??'').trim().slice(0,1000)};
    if(draft.day!==original.day){
      const delta=Date.parse(draft.day+'T12:00:00Z')-Date.parse(original.day+'T12:00:00Z');
      next.timestamp=new Date(Date.parse(original.timestamp)+delta).toISOString();
    }
    if(Array.isArray(original.skipped))next.skipped=original.skipped.filter(row=>!performed.has(row.id));
    if(isFree(draft)){next.plannedIds=[];next.skipped=[];}
    if(cardio.length)next.cardio=clone(cardio);else delete next.cardio;
    if(original.afterMuayId&&!muaySessions.some(row=>row.id===original.afterMuayId&&row.day===draft.day))delete next.afterMuayId;
    const knee=draft.kneeNextDay;
    if(knee!==''&&knee!=null){
      if(!['number','string'].includes(typeof knee)||!Number.isInteger(Number(knee))||Number(knee)<0||Number(knee)>5)
        return {error:'Confira a avaliação do joelho no dia seguinte (0 a 5).'};
      next.kneeNextDay=Number(knee);
    }else if(original.kneeNextDay!=null)next.kneeNextDay=null;
    return {session:next};
  }
  const api=Object.freeze({VERSION:1,PLAN_ID,isFree,isHistoryEdit,isEditor,validDay,create,options,add,custom,remove,linkedMuay,count,fromSession,updateSession});
  root.ForjaFreeWorkout=api;
  if(node)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
