/* FORJA — one exercise library, three explicit intentions.
   This module NEVER writes storage or modifies the input draft. The UI
   only commits its returned snapshot after an explicit confirmation. */
(function installCatalogSession(root){
  'use strict';
  const F=root.ForjaFlex||(typeof require==='function'?require('./flex.js'):null);
  const SETS=root.ForjaTrainingSets||(typeof require==='function'?require('./training-sets.js'):null);
  const copy=v=>JSON.parse(JSON.stringify(v));
  const modes=['browse','replace','add','extra'];
  function sourceOptions(draft){
    return Object.values(draft?.entries||{}).filter(entry=>
      entry&&typeof entry.id==='string'&&!F.hasRecordedReps(entry));
  }
  function canChoose({draft,mode,sourceId,targetId,eligibleExtraIds=[]}={}){
    if(!['replace','add','extra'].includes(mode))return {ok:false,error:'Ação não reconhecida.'};
    if(!draft?.entries)return {ok:false,error:'Nenhum treino em andamento.'};
    if(!targetId||typeof targetId!=='string')return {ok:false,error:'Escolha um exercício do catálogo.'};
    if(Object.hasOwn(draft.entries,targetId)||(draft.skipped||[]).some(s=>s.id===targetId))
      return {ok:false,error:'Este exercício já pertence à sessão ou foi retirado. Restaure-o para reutilizar.'};
    if(Object.keys(draft.entries).length>=30 && mode!=='replace')
      return {ok:false,error:'Limite de exercícios por sessão atingido.'};
    if(mode==='replace'){
      if(!sourceId||!Object.hasOwn(draft.entries,sourceId))
        return {ok:false,error:'Escolha qual exercício será substituído.'};
      if(sourceId===targetId)return {ok:false,error:'Escolha um exercício diferente.'};
      if(F.hasRecordedReps(draft.entries[sourceId]))
        return {ok:false,error:'Este exercício já possui repetições registradas. Seus dados não serão apagados.'};
    }
    if(mode==='extra'){
      if(draft.extraChoice)return {ok:false,error:'Já existe um acréscimo opcional nesta sessão.'};
      if(!eligibleExtraIds.includes(targetId))
        return {ok:false,error:'A sugestão mudou. Revise o treino e a recuperação antes de acrescentar.'};
    }
    return {ok:true};
  }
  function prepare({draft,mode,sourceId,targetId,exercise,extraSourceId,eligibleExtraIds=[]}={}){
    const gate=canChoose({draft,mode,sourceId,targetId,eligibleExtraIds});
    if(!gate.ok)return gate;
    if(!exercise||exercise.id!==targetId||!Number.isInteger(exercise.sets)||exercise.sets<1||exercise.sets>12)
      return {ok:false,error:'Exercício inválido ou sem configuração de séries.'};
    const next=copy(draft);
    F.ensureDraft(next);
    if(mode==='replace'){
      const result=F.withdraw(next,sourceId);
      if(result.error)return {ok:false,error:result.error};
      if(next.extraChoice?.kind==='exercise'&&next.extraChoice.id===sourceId)
        delete next.extraChoice;
      const old=next.skipped.find(row=>row.id===sourceId);
      if(old&&!old.reason)old.reason='preferencia';
    }
    const sets=Array.from({length:mode==='extra'?1:exercise.sets},()=>({
      load:SETS.allowsZero(exercise)?0:'',reps:'',rir:'',warmup:false
    }));
    if(!F.addToDraft(next,targetId,exercise,{id:targetId,sets,pain:''}))
      return {ok:false,error:'Não foi possível incluir o exercício nesta sessão.'};
    if(mode==='extra')next.extraChoice={kind:'exercise',id:targetId,sourceId:extraSourceId||''};
    return {ok:true,draft:next,removedId:mode==='replace'?sourceId:null,addedId:targetId};
  }
  const api={VERSION:1,modes,sourceOptions,canChoose,prepare};
  root.ForjaCatalogSession=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
