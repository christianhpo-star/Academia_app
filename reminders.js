/* FORJA UX16: contextual, optional review suggestions.
 * Frequency and numeric thresholds are explicit PRODUCT HEURISTICS,
 * not clinical diagnostic cutoffs. No reminders are external push messages.
 */
(function(root){
 'use strict';
 const KEYS=['weight-check','profile-weight','goal-nutrition','measure-review','bio-review','activity-review','profile-age'];
 const dayOK=d=>{
   if(typeof d!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(d))return false;
   const t=new Date(d+'T12:00:00Z');
   return Number.isFinite(t.getTime())&&t.toISOString().slice(0,10)===d;
 };
 const diff=(a,b)=>Math.round((Date.parse(a+'T12:00:00Z')-Date.parse(b+'T12:00:00Z'))/86400000);
 const addDays=(day,n)=>{
   const d=new Date(day+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);
 };
 const validPrefs=p=>{
   if(p===undefined)return true;
   if(!p||typeof p!=='object'||Array.isArray(p)||typeof p.enabled!=='boolean')return false;
   const entries=p.items;
   if(!entries||typeof entries!=='object'||Array.isArray(entries)||Object.keys(entries).length>KEYS.length)return false;
   return Object.entries(entries).every(([id,v])=>KEYS.includes(id)&&v&&typeof v==='object'&&!Array.isArray(v)&&
     typeof v.signature==='string'&&v.signature.length<=180&&
     typeof v.dismissed==='boolean'&&(v.until===null||dayOK(v.until)));
 };
 const prefsOrDefault=p=>validPrefs(p)&&p?{enabled:p.enabled,items:{...p.items}}:{enabled:true,items:{}};
 const recordedWeights=(s,day)=>(s?.weights||[])
    .filter(w=>w&&!w.initial&&dayOK(w.date)&&w.date<=day&&Number.isFinite(Number(w.weight))&&Number(w.weight)>0)
    .slice().sort((a,b)=>a.date.localeCompare(b.date));
 const nearest=(weights,date)=>{
   const withDiff=weights.map(w=>({...w,gap:Math.abs(diff(w.date,date))})).filter(x=>x.gap<=7);
   return withDiff.sort((a,b)=>a.gap-b.gap)[0]||null;
 };
 const ratio=(a,b)=>b>0?Math.abs(a-b)/b*100:0;
 const make=(id,priority,headline,reason,action,signature,footnote)=>({id,priority,headline,reason,action,signature,footnote,
   optional:true});
 function candidates(state,day){
   if(!dayOK(day))return [];
   const weights=recordedWeights(state,day),current=weights.at(-1),previous=weights.at(-2);
   const n=state?.nutrition?.settings||{},profile=n.profile;
   const out=[];
   let rapidChange=false;
   if(current&&previous&&diff(current.date,previous.date)>0&&diff(current.date,previous.date)<=3&&
      ratio(Number(current.weight),Number(previous.weight))>=3){
     rapidChange=true;
     out.push(make('weight-check',0,'Conferir uma variação recente de peso',
       'A diferença entre duas pesagens próximas foi grande. Horário, hidratação e equipamento podem influenciar; confirme antes de reinterpretar medidas.',
       'weight',previous.date+'|'+current.date,'Limite de 3% em até três dias: convenção prudente do FORJA, não diagnóstico.'));
   }
   if(profile&&profile.adultScope&&current&&Number.isFinite(profile.weightKg)&&profile.weightKg>0&&!rapidChange){
     const change=ratio(Number(current.weight),profile.weightKg);
     if(change>=5){
       out.push(make('profile-weight',1,'Revisar o peso usado nas estimativas',
         'O peso informado no perfil alimentar difere da pesagem recente. Isso pode alterar estimativas de energia e proteína por kg, mas nenhuma meta será trocada automaticamente.',
         'nutrition',String(profile.confirmedAt)+'|'+profile.weightKg+'|'+(change>=10?'10+':'5+'),
         'Diferença de 5%: critério operacional do FORJA, não limiar clínico.'));
     }
   }
   const mode=state?.settings?.goalMode||'weight';
   const expected=mode==='recomposition'?'recomposition':mode==='fat_loss'?'loss':mode==='muscle_gain'?'gain':mode==='maintenance'?'maintain':
     current&&Number(state?.settings?.targetWeight)<Number(current.weight)?'loss':
     current&&Number(state?.settings?.targetWeight)>Number(current.weight)?'gain':null;
   const targets=(n.targets||[]).filter(t=>dayOK(t?.from)&&t.from<=day).sort((a,b)=>b.from.localeCompare(a.from));
   const target=targets[0];
   if(target?.source==='suggested'&&profile&&expected&&profile.goal!==expected){
     out.push(make('goal-nutrition',2,'Conferir metas após mudar o objetivo',
       'O objetivo corporal selecionado difere daquele usado para gerar a recomendação alimentar atual. Metas aceitas continuam preservadas até você revisá-las.',
       'nutrition',String(mode)+'|'+String(state?.settings?.targetWeight)+'|'+String(target.id)+'|'+String(profile.confirmedAt),
       'Compatibilidade entre duas escolhas do aplicativo, não recomendação clínica.'));
   }
   const body=(state?.bodyMeasurements||[]).filter(x=>dayOK(x?.date)&&x.date<=day).slice().sort((a,b)=>b.date.localeCompare(a.date))[0];
   if(body){
     const days=diff(day,body.date),baseline=nearest(weights,body.date);
     const changed=Boolean(current&&baseline&&current.date>body.date&&diff(current.date,body.date)>=14&&ratio(Number(current.weight),Number(baseline.weight))>=4);
     if(changed||days>=56){
       out.push(make('measure-review',3,'Talvez seja útil atualizar as medidas',
         changed?'O peso registrado mudou desde as últimas circunferências. Uma nova medição pode ajudar a interpretar tendências, mas não presumimos que as medidas mudaram.':
           'Sua última medição de circunferências foi há algumas semanas. Se acompanhar essa tendência, uma nova leitura pode ser útil.',
         'body',body.date+'|'+(changed?'weight-4':'time-56'),
         'Quatro por cento de peso ou 56 dias: critérios de lembrete do produto, não periodicidade clínica obrigatória.'));
     }
   }
   const bio=(state?.bioimpedance||[]).filter(x=>dayOK(x?.date)&&x.date<=day).slice().sort((a,b)=>b.date.localeCompare(a.date))[0];
   if(bio){
     const days=diff(day,bio.date),baseline=nearest(weights,bio.date);
     const changed=Boolean(current&&baseline&&current.date>bio.date&&diff(current.date,bio.date)>=14&&ratio(Number(current.weight),Number(baseline.weight))>=5);
     if(changed||days>=90){
       out.push(make('bio-review',4,'Revisar a leitura do relógio, se desejar',
         changed?'O peso variou desde sua última bioimpedância. Caso queira comparar, repita a leitura em condições semelhantes de horário e hidratação.':
           'Sua última leitura de composição pelo relógio é antiga. Repetir é opcional: o valor é uma estimativa indireta.',
         'bio',bio.date+'|'+(changed?'weight-5':'time-90'),
         'Variações da hidratação podem afetar BIA; 5% e 90 dias são convenções do produto.'));
     }
   }
   const steps=(state?.activitySteps||[]).filter(x=>dayOK(x?.date)&&x.date<=day).sort((a,b)=>a.date.localeCompare(b.date));
   if(profile?.adultScope&&profile.activity>=1.725&&steps.length>=7&&diff(day,steps.at(-1).date)>=28){
     out.push(make('activity-review',5,'Conferir o fator de atividade',
       'Há registros antigos de passos, mas poucos dados recentes para contextualizar o fator selecionado. Ausência de registro não significa sedentarismo.',
       'activity',steps.at(-1).date+'|'+profile.confirmedAt+'|'+profile.activity,
       'Intervalo de 28 dias: regra de atualização dos registros, não fórmula para gasto energético.'));
   }
   if(profile?.adultScope&&dayOK(profile.confirmedAt)&&diff(day,profile.confirmedAt)>=365){
     out.push(make('profile-age',6,'Conferir dados básicos do perfil',
       'Seu perfil foi confirmado há mais de um ano. Idade e rotina podem ter mudado; você pode revisar quando preferir.',
       'nutrition',profile.confirmedAt,'Um ano: lembrete de qualidade de dados, sem obrigação.'));
   }
   return out.sort((a,b)=>a.priority-b.priority);
 }
 function assess(state,day){
   const all=candidates(state,day),prefs=prefsOrDefault(state?.reminderPrefs);
   if(!prefs.enabled)return {visible:[],suppressed:all.length,disabled:true,all};
   const visible=all.filter(r=>{
     const v=prefs.items[r.id];
     return !v||v.signature!==r.signature||(!v.dismissed&&(!v.until||v.until<=day));
   });
   return {visible,suppressed:all.length-visible.length,disabled:false,all};
 }
 function changePreference(prefs,id,signature,action,day,days=14){
   if(!KEYS.includes(id)||typeof signature!=='string'||signature.length>180||!dayOK(day)||
      !['snooze','dismiss'].includes(action)||(action==='snooze'&&![7,14,30].includes(days)))
     return {error:'Lembrete inválido.'};
   const next=prefsOrDefault(prefs);
   next.items[id]={signature,dismissed:action==='dismiss',until:action==='snooze'?addDays(day,days):null};
   return {prefs:next};
 }
 function setEnabled(prefs,enabled){
   if(typeof enabled!=='boolean')return {error:'Preferência inválida.'};
   const next=prefsOrDefault(prefs);next.enabled=enabled;return {prefs:next};
 }
 const api={KEYS,validPrefs,candidates,assess,changePreference,setEnabled,addDays};
 root.ForjaReminders=api;
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
