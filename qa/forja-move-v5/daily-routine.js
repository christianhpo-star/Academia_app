/* FORJA UX20 - optional on-open daily routine.
 * Does not prescribe doses, infer medication adherence, schedule push messages,
 * or change nutrition/training suggestions. Data remains in the local FORJA state.
 */
(function(root){
  'use strict';
  const IDS=['medication','supplement'];
  const meta={
    medication:{title:'Medicamento prescrito',kind:'medication'},
    supplement:{title:'Suplemento',kind:'supplement'}
  };
  const dayOK=d=>{
    if(typeof d!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(d))return false;
    const date=new Date(d+'T12:00:00Z');
    return !Number.isNaN(date.getTime())&&date.toISOString().slice(0,10)===d;
  };
  const timeOK=t=>typeof t==='string'&&(t===''||/^([01]\d|2[0-3]):[0-5]\d$/.test(t));
  const labelOK=t=>typeof t==='string'&&t.length<=80;
  const recordId=(id,day)=>'daily-routine-'+id+'-'+day;
  const defaults=()=>({
    version:1,enabled:false,
    slots:IDS.map(id=>({id,label:'',time:'',active:true})),
    records:[]
  });
  const hasConfiguredSlots=archive=>archive.slots.some(s=>s.active&&s.label.trim());
  function valid(archive){
    if(archive===undefined)return true; // Pre-UX20 backups
    if(!archive||typeof archive!=='object'||Array.isArray(archive)||
       archive.version!==1||typeof archive.enabled!=='boolean'||
       !Array.isArray(archive.slots)||archive.slots.length!==2||
       !Array.isArray(archive.records)||archive.records.length>10000)return false;
    const seen=new Set();
    for(const slot of archive.slots){
      if(!slot||typeof slot!=='object'||!IDS.includes(slot.id)||
         seen.has(slot.id)||!labelOK(slot.label)||!timeOK(slot.time)||
         typeof slot.active!=='boolean')return false;
      seen.add(slot.id);
    }
    if(archive.enabled&&!hasConfiguredSlots(archive))return false;
    const seenDays=new Set();
    for(const r of archive.records){
      if(!r||typeof r!=='object'||!IDS.includes(r.slotId)||!dayOK(r.date)||
         r.id!==recordId(r.slotId,r.date)||r.status!=='confirmed'||
         (r.label!==undefined&&(!labelOK(r.label)||!r.label.trim()))||
         typeof r.recordedAt!=='string'||!Number.isFinite(Date.parse(r.recordedAt))||
         r.recordedAt.length>40||seenDays.has(r.id))return false;
      seenDays.add(r.id);
    }
    return true;
  }
  function normalize(archive){
    return valid(archive)&&archive?archive:defaults();
  }
  function status(archive,date){
    if(!dayOK(date))return {configured:false,items:[]};
    const current=normalize(archive);
    return {
      configured:current.enabled&&hasConfiguredSlots(current),
      items:current.enabled?current.slots.filter(s=>s.active&&s.label.trim()).map(s=>({
        ...s,kind:meta[s.id].kind,title:meta[s.id].title,
        confirmed:current.records.some(r=>r.id===recordId(s.id,date)&&(!r.label||r.label===s.label))
      })):[],
      totalRecords:current.records.length
    };
  }
  function configure(archive,settings,day){
    if(!valid(archive))return {error:'Dados de rotina incompatíveis.'};
    const current=normalize(archive),next=JSON.parse(JSON.stringify(current));
    const hadConfigured=hasConfiguredSlots(current);
    const rows=[];
    for(const id of IDS){
      const row=settings?.[id];
      if(!row||typeof row!=='object')return {error:'Revise a configuração da rotina.'};
      const label=String(row.label??'').trim();
      const time=String(row.time??'');
      if(!labelOK(label)||!timeOK(time)||typeof row.active!=='boolean')
        return {error:'Confira nome (até 80 caracteres) e horário.'};
      if(dayOK(day)&&label!==current.slots.find(s=>s.id===id).label&&
         current.records.some(r=>r.id===recordId(id,day)))
        return {error:'Antes de mudar o nome, desfaça a confirmação de hoje desse item para não atribuí-la a outro produto.'};
      rows.push({id,label,time,active:row.active});
    }
    next.slots=rows;
    if(!hadConfigured&&hasConfiguredSlots(next))next.enabled=true; // explicit save of populated preferences
    if(!hasConfiguredSlots(next))next.enabled=false;
    if(!valid(next))return {error:'Configuração inválida.'};
    return {archive:next};
  }
  function setEnabled(archive,enabled){
    if(!valid(archive)||typeof enabled!=='boolean')return {error:'Preferência inválida.'};
    const next=JSON.parse(JSON.stringify(normalize(archive)));
    if(enabled&&!hasConfiguredSlots(next))
      return {error:'Primeiro configure ao menos um item da rotina.'};
    next.enabled=enabled;
    return {archive:next};
  }
  function toggleRecord(archive,slotId,date,recordedAt){
    if(!valid(archive)||!dayOK(date)||!IDS.includes(slotId))
      return {error:'Registro incompatível.'};
    const current=normalize(archive),slot=current.slots.find(s=>s.id===slotId);
    if(!current.enabled||!slot?.active||!slot.label.trim())
      return {error:'Configure e ative o item antes de registrar.'};
    const next=JSON.parse(JSON.stringify(current)),id=recordId(slotId,date);
    const index=next.records.findIndex(row=>row.id===id);
    if(index>=0){
      if(next.records[index].label&&next.records[index].label!==slot.label)
        return {error:'Registro associado a outro nome. Revise o histórico antes de continuar.'};
      next.records.splice(index,1);
      return {archive:next,confirmed:false};
    }
    const at=typeof recordedAt==='string'&&Number.isFinite(Date.parse(recordedAt))?
      recordedAt:new Date().toISOString();
    next.records.push({id,date,slotId,label:slot.label,status:'confirmed',recordedAt:at});
    return valid(next)?{archive:next,confirmed:true}:{error:'Histórico cheio ou incompatível.'};
  }
  function merge(current,incoming){
    if(!valid(current)||!valid(incoming))throw Error('Histórico de rotina incompatível');
    const left=normalize(current),right=normalize(incoming);
    const settingsSource=hasConfiguredSlots(left)?left:hasConfiguredSlots(right)?right:left;
    const combined=JSON.parse(JSON.stringify(settingsSource));
    const ids=new Set(left.records.map(r=>r.id));
    combined.records=left.records.slice();
    for(const row of right.records)if(!ids.has(row.id)){
      combined.records.push(row);ids.add(row.id);
    }
    if(!valid(combined))throw Error('Histórico mesclado incompatível');
    return combined;
  }
  const api={IDS,meta,defaults,valid,normalize,status,configure,setEnabled,toggleRecord,merge,dayOK};
  root.ForjaDailyRoutine=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
