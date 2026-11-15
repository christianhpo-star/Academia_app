(function installBodyMeasures(root) {
  'use strict';
  // Values are stored only in local browser data or private backup exports.
  // NEVER add a person's measurements to the public source defaults.
  const FIELDS=Object.freeze([
    {id:'neck',label:'Pescoço',x:25,y:17},
    {id:'chest',label:'Peitoral',x:50,y:27},
    {id:'armRight',label:'Braço direito',x:17,y:32},
    {id:'armLeft',label:'Braço esquerdo',x:83,y:32},
    {id:'forearmRight',label:'Antebraço direito',x:14,y:43},
    {id:'forearmLeft',label:'Antebraço esquerdo',x:86,y:43},
    {id:'abdomen',label:'Abdômen (umbigo)',x:50,y:39},
    {id:'hip',label:'Quadril',x:50,y:52},
    {id:'thighRight',label:'Coxa direita',x:33,y:65},
    {id:'thighLeft',label:'Coxa esquerda',x:67,y:65},
    {id:'calfRight',label:'Panturrilha direita',x:33,y:83},
    {id:'calfLeft',label:'Panturrilha esquerda',x:67,y:83},
  ]);
  const IDS=new Set(FIELDS.map(f=>f.id));
  const validDate=s=>{
    if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;
    const date=new Date(s+'T12:00:00Z');
    return !Number.isNaN(date.getTime())&&date.toISOString().slice(0,10)===s;
  };
  function validRecord(item){
    if(!item||typeof item!=='object'||Array.isArray(item)||
      !validDate(item.date)||typeof item.id!=='string'||item.id.length>100||
      !item.values||typeof item.values!=='object'||Array.isArray(item.values))return false;
    const pairs=Object.entries(item.values);
    return pairs.length>0&&pairs.length<=FIELDS.length&&pairs.every(([key,value])=>
      IDS.has(key)&&typeof value==='number'&&Number.isFinite(value)&&value>0&&value<=300);
  }
  function validRecords(items){
    if(items===undefined)return true; // FORJA v1 backups did not include body measurements
    if(!Array.isArray(items)||items.length>2500)return false;
    const days=new Set(),ids=new Set();
    return items.every(item=>{
      if(!validRecord(item)||days.has(item.date)||ids.has(item.id))return false;
      days.add(item.date);ids.add(item.id);return true;
    });
  }
  const recent=items=>(items||[]).slice().sort((a,b)=>b.date.localeCompare(a.date));
  const findDay=(items,date)=>(items||[]).find(item=>item.date===date)||null;
  function upsert(items,date,values){
    if(!validDate(date)||!values||typeof values!=='object')return {error:'Data inválida.'};
    const cleaned={};
    for(const field of FIELDS){
      const value=values[field.id];
      if(value===undefined||value===null||value==='')continue;
      const n=typeof value==='string'?Number(value.replace(',','.')):value;
      if(!Number.isFinite(n)||n<=0||n>300)return {error:'Confira a medida de '+field.label+'.'};
      cleaned[field.id]=n;
    }
    if(!Object.keys(cleaned).length)return {error:'Informe pelo menos uma medida.'};
    const previous=findDay(items,date);
    const item={...previous,id:previous?.id||'body-'+date,date,values:cleaned};
    if(!validRecord(item))return {error:'Medidas inválidas.'};
    const rows=previous?items.map(x=>x.date===date?item:x):[...items,item];
    return validRecords(rows)?{items:rows,item}:{error:'Histórico incompatível.'};
  }
  function merge(current,incoming){
    const result=[...(current||[])],days=new Set(result.map(x=>x.date)),ids=new Set(result.map(x=>x.id));
    for(const item of incoming||[]){
      if(!days.has(item.date)&&!ids.has(item.id)){
        result.push(item);days.add(item.date);ids.add(item.id);
      }
    }
    return result;
  }
  function diff(current,previous,id){
    const a=current?.values?.[id],b=previous?.values?.[id];
    return Number.isFinite(a)&&Number.isFinite(b)?Math.round((a-b)*10)/10:null;
  }
  // Optional manual Galaxy Watch bioimpedance readings. Estimates, not clinical diagnosis.
  const BIO_FIELDS=Object.freeze([
    {id:'bodyFatPercent',label:'Gordura corporal',unit:'%',min:1,max:75},
    {id:'skeletalMuscleKg',label:'Músculo esquelético',unit:'kg',min:1,max:200},
    {id:'fatMassKg',label:'Massa de gordura',unit:'kg',min:.1,max:250},
    {id:'bodyWaterKg',label:'Água corporal',unit:'kg',min:1,max:250},
    {id:'basalMetabolicRateKcal',label:'Metabolismo basal do relógio',unit:'kcal',min:400,max:5000},
    {id:'bmi',label:'IMC do relógio',unit:'kg/m²',min:10,max:80},
    {id:'weightKg',label:'Peso registrado no relógio',unit:'kg',min:20,max:350},
  ]);
  const BIO_BY_ID=Object.fromEntries(BIO_FIELDS.map(field=>[field.id,field]));
  function validBioRecord(record){
    if(!record||typeof record!=='object'||Array.isArray(record)||!validDate(record.date)||
       record.id!=='bia-'+record.date||record.source!=='galaxy-watch-manual'||
       !record.values||typeof record.values!=='object'||Array.isArray(record.values))return false;
    const pairs=Object.entries(record.values);
    return pairs.length>0&&pairs.length<=BIO_FIELDS.length&&pairs.every(([key,value])=>{
      const field=BIO_BY_ID[key];
      return field&&typeof value==='number'&&Number.isFinite(value)&&value>=field.min&&value<=field.max;
    });
  }
  function validBioRecords(rows){
    if(rows===undefined)return true;
    if(!Array.isArray(rows)||rows.length>2500)return false;
    const dates=new Set();
    return rows.every(row=>{
      if(!validBioRecord(row)||dates.has(row.date))return false;
      dates.add(row.date);return true;
    });
  }
  function upsertBio(rows,date,values){
    if(!validDate(date)||!Array.isArray(rows)||!values||typeof values!=='object')
      return {error:'Confira a data da leitura.'};
    const cleaned={};
    for(const field of BIO_FIELDS){
      const raw=values[field.id];
      if(raw===undefined||raw===null||String(raw).trim()==='')continue;
      const value=typeof raw==='string'?Number(raw.trim().replace(',','.')):raw;
      if(!Number.isFinite(value)||value<field.min||value>field.max)
        return {error:'Confira '+field.label+' ('+field.unit+').'};
      cleaned[field.id]=value;
    }
    if(!Object.keys(cleaned).length)return {error:'Informe pelo menos um valor da bioimpedância.'};
    const item={id:'bia-'+date,date,source:'galaxy-watch-manual',values:cleaned};
    const next=rows.some(r=>r.date===date)?rows.map(r=>r.date===date?item:r):[...rows,item];
    return validBioRecords(next)?{items:next,item}:{error:'Histórico de bioimpedância inválido.'};
  }
  function mergeBio(current,incoming){
    if(!validBioRecords(current)||!validBioRecords(incoming))throw new Error('Dados de bioimpedância incompatíveis.');
    const result=(current||[]).slice(),dates=new Set(result.map(r=>r.date));
    for(const item of incoming||[])if(!dates.has(item.date)){
      result.push(item);dates.add(item.date);
    }
    return result;
  }
  const recentBio=recent;
  const fmt=value=>typeof value==='number' ? new Intl.NumberFormat('pt-BR',{maximumFractionDigits:1}).format(value)+' cm':'—';
  root.ForjaBodyMeasures={FIELDS,validDate,validRecord,validRecords,recent,findDay,upsert,merge,diff,fmt,BIO_FIELDS,validBioRecord,validBioRecords,upsertBio,mergeBio,recentBio};
  if(typeof module!=='undefined'&&module.exports)module.exports=root.ForjaBodyMeasures;
})(typeof window!=='undefined'?window:globalThis);
