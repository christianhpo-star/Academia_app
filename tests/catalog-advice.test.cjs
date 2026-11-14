const test=require('node:test');
const assert=require('node:assert/strict');
const A=require('../catalog-advice.js');
const F=require('../flex.js');
const D=require('../data.js');
const DOSE=require('../dose.js');
const TODAY='2026-11-20';
const row=(id,load=40)=>({id,pain:'',sets:[{load,reps:'',rir:'',warmup:false}]});
const done=(id,sets=4)=>({id,pain:0,sets:Array.from({length:sets},()=>({load:25,reps:10,rir:3,warmup:false}))});
const session=(day,id)=>({id:'s'+day,day:'2026-11-'+day,timestamp:'2026-11-'+day+'T13:00:00Z',entries:[{id,pain:0,sets:[{load:40,reps:10,rir:3,warmup:false}]}],planId:'A'});
function run(draft,extra={}){
 const options=F.options(D.exercises,draft);
 return A.suggest({options,draft,exercises:D.exercises,settings:{fatigue:'normal',kneePain:''},
   strengthSessions:[],today:TODAY,dose:DOSE,...extra});
}
test('sem rascunho ou análise não inventa sugestão',()=>{
 assert.equal(A.suggest({}).recommendations.length,0);
 assert.match(A.suggest({}).message,/Sem dados/);
});
test('ficha A gera até três alternativas relacionadas à musculatura da ficha',()=>{
 const draft={planId:'A',entries:{'remada-baixa':row('remada-baixa')}};
 const result=run(draft);
 assert.ok(result.recommendations.length>0);
 assert.ok(result.recommendations.length<=3);
 assert.ok(result.recommendations.every(x=>DOSE.MAP[x.id]));
 assert.ok(result.recommendations.every(x=>x.group==='A'||x.kind==='variation'));
 assert.equal(result.recommendations.some(x=>x.group==='C'),false);
 assert.match(result.message,/alternativas/);
});
test('supino canadense aparece como alternativa de peito sem alterar o treino',()=>{
  const draft={planId:'B',entries:{'supino-halteres':row('supino-halteres')}};
  const original=structuredClone(draft);
  // Isolar a alternativa para validar a compatibilidade, sem exigir top 3 no ranqueamento.
  const options=F.options(D.exercises,draft).filter(x=>x.id==='supino-canadense');
  const suggestions=run(draft,{options}).recommendations;
  const candidate=suggestions.find(x=>x.id==='supino-canadense');
  assert.ok(candidate,'recomendar o supino canadense como variação');
  assert.equal(candidate.kind,'variation');
  assert.equal(candidate.referenceId,'supino-halteres');
  assert.equal(candidate.group,'B');
  assert.deepEqual(draft,original);
});
test('prioriza uma substituição do exercício removido e explica o movimento',()=>{
 const draft={planId:'C',entries:{},skipped:[{id:'leg-press',reason:'equipamento'}]};
 const result=run(draft);
 assert.ok(result.recommendations.length>0);
 assert.equal(result.recommendations[0].kind,'replacement');
 assert.match(result.recommendations[0].reason,/Leg press/i);
});
test('exercícios já presentes ou retirados não aparecem como opções duplicadas',()=>{
 const draft={planId:'A',entries:{'pulley-aberto':row('pulley-aberto')},
   skipped:[{id:'remada-baixa',reason:'tempo'}]};
 const choices=F.options(D.exercises,draft);
 const result=run(draft);
 assert.ok(result.recommendations.every(x=>choices.some(y=>y.id===x.id)));
 assert.ok(result.recommendations.every(x=>x.id!=='pulley-aberto'&&x.id!=='remada-baixa'));
});
test('dor no joelho impede recomendações com participação muscular principal das pernas',()=>{
 const draft={planId:'C',entries:{'leg-press':row('leg-press')}};
 draft.entries['leg-press'].pain=2;
 const result=run(draft);
 assert.match(result.caution,/joelho/);
 assert.ok(result.recommendations.every(x=>!['quadriceps','posteriores','gluteos'].some(
   muscle=>DOSE.MAP[x.id].direct.includes(muscle))));
});
test('fadiga elevada e Muay Thai recente geram cautela sem somar séries fictícias',()=>{
 const draft={planId:'A',entries:{'remada-baixa':row('remada-baixa')}};
 let result=run(draft,{settings:{fatigue:'alta',kneePain:''}});
 assert.match(result.caution,/Fadiga/);
 result=run(draft,{muaySessions:[{day:TODAY,intensity:9}]});
 assert.match(result.caution,/Muay Thai/);
 assert.ok(result.recommendations.every(x=>x.kind==='variation'));
});
test('sem histórico suficiente marca recomendações como heurísticas de alternativa',()=>{
 const draft={planId:'B',entries:{'supino-halteres':row('supino-halteres')}};
 const result=run(draft);
 assert.match(result.basis,/Histórico ainda limitado/);
 assert.ok(result.recommendations.every(x=>!x.reason.includes('precisa adicionar')));
});
test('histórico real aparece como referência quando registrado, não altera ficha',()=>{
 const draft={planId:'A',entries:{'pulley-aberto':row('pulley-aberto')}};
 const before=structuredClone(draft);
 const state=structuredClone(D.exercises);
 const result=run(draft,{strengthSessions:[session('18','puxada-neutra'),session('12','puxada-neutra')]});
 assert.ok(result.recommendations.some(x=>x.id==='puxada-neutra'&&x.reason.includes('18/11')));
 assert.deepEqual(draft,before);
 assert.deepEqual(D.exercises,state);
});


test('substituição considera somente exercício ainda não executado na sessão',()=>{
 const completed=done('supino-halteres');
 const draft={planId:'B',entries:{
   'supino-halteres':completed,
   'triceps-corda':row('triceps-corda')
 }};
 const choices=F.options(D.exercises,draft);
 const result=run(draft,{options:choices});
 assert.ok(result.recommendations.every(x=>x.referenceId!=='supino-halteres'));
 assert.ok(result.recommendations.every(x=>x.kind!=='extra-set'&&x.kind!=='extra-exercise'));
});
test('energia sobrando não sugere equipamento novo sem histórico e execução suficientes',()=>{
 const draft={planId:'B',energy:'leve',entries:{'supino-inclinado':done('supino-inclinado')}};
 const advice=run(draft,{mode:'extra',
   analysis:DOSE.analyze({today:TODAY,exercises:D.exercises,draft,settings:{fatigue:'normal',kneePain:''}})});
 assert.equal(advice.recommendations.length,0);
 assert.match(advice.message,/histórico|recuperação/i);
});
test('depois de realizar séries, recomenda +1 série OU novo equipamento para o mesmo músculo',()=>{
 const sessions=[2,4,6,8,11,13,18].map(day=>({
   id:'s'+day,day:'2026-11-'+String(day).padStart(2,'0'),
   timestamp:'2026-11-'+String(day).padStart(2,'0')+'T13:00:00Z',
   planId:'B',entries:[done('supino-inclinado')]
 }));
 const draft={planId:'B',energy:'leve',entries:{'supino-inclinado':done('supino-inclinado')}};
 const original=structuredClone(draft);
 const settings={fatigue:'normal',kneePain:''};
 const analysis=DOSE.analyze({today:TODAY,strengthSessions:sessions,exercises:D.exercises,draft,settings});
 assert.ok(analysis.candidates.some(x=>x.exerciseId==='supino-inclinado'));
 const result=run(draft,{strengthSessions:sessions,settings,analysis,mode:'extra'});
 assert.ok(result.recommendations.some(x=>x.kind==='extra-set'&&x.id==='supino-inclinado'));
 assert.ok(result.recommendations.some(x=>x.kind==='extra-exercise'&&x.id!=='supino-inclinado'));
 assert.ok(result.recommendations.every(x=>['extra-set','extra-exercise'].includes(x.kind)));
 assert.deepEqual(draft,original);
 draft.extraChoice={kind:'set',id:'supino-inclinado'};
 const blocked=run(draft,{strengthSessions:sessions,settings,mode:'extra',
   analysis:DOSE.analyze({today:TODAY,strengthSessions:sessions,exercises:D.exercises,draft,settings})});
 assert.equal(blocked.recommendations.length,0);
});
test('Muay Thai recente impede acréscimos mesmo com energia informada',()=>{
 const draft={planId:'B',energy:'leve',entries:{'supino-inclinado':done('supino-inclinado')}};
 const result=run(draft,{mode:'extra',muaySessions:[{day:TODAY,intensity:8}],
   analysis:{candidates:[{exerciseId:'supino-inclinado',muscleId:'peito',muscle:'Peito'}]}});
 assert.equal(result.recommendations.length,0);
 assert.match(result.caution,/Muay Thai/);
});

test('omissão por fadiga não vira pedido para substituir o treino',()=>{
 const draft={planId:'C',entries:{},skipped:[{id:'leg-press',reason:'fadiga'}]};
 const result=run(draft);
 assert.match(result.caution,/Fadiga/);
 assert.equal(result.recommendations.length,0);
});
