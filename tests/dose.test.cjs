const test=require('node:test');
const assert=require('node:assert/strict');
const DOSE=require('../dose.js');
const Data=require('../data.js');
const today='2026-11-20';
const row=(id,sets=3,rir=3,load=25)=>({
  id,pain:0,sets:Array.from({length:sets},()=>({load,reps:10,rir,warmup:false}))
});
const sess=(day,entries)=>({
  id:'s'+day,day:'2026-11-'+String(day).padStart(2,'0'),
  timestamp:'2026-11-'+String(day).padStart(2,'0')+'T17:00:00Z',
  entries,kneeNextDay:0,planId:'B'
});
const ex=(id)=>Data.exercises.find(x=>x.id===id);
test('mapeamento dos exercícios originais e extras preserva o nome de cada grupo',()=>{
  for(const x of Data.exercises)
    assert.ok(DOSE.MAP[x.id],x.id+' sem mapeamento');
  assert.equal(DOSE.MUSCLES.length,11);
});
test('conta somente séries executadas, exclui aquecimentos e valores exemplificados',()=>{
  const entry=row('supino-halteres',3);
  entry.sets.push({load:20,reps:10,rir:5,warmup:true});
  entry.sets.push({load:30,reps:'',rir:'',warmup:false});
  const data=DOSE.volume({today,strengthSessions:[sess(19,[entry])]});
  assert.equal(data.rows.find(x=>x.id==='peito').direct7,3);
  assert.equal(data.rows.find(x=>x.id==='triceps').indirect7,1.5);
  assert.equal(data.rows.find(x=>x.id==='ombros').indirect7,1.5);
});
test('janela de 7 dias inclui rascunho realizado, sem contar planejado duas vezes',()=>{
  const sessions=[sess(11,[row('supino-halteres')]),sess(16,[row('supino-halteres')])];
  const draft={entries:{'supino-halteres':{
    id:'supino-halteres',sets:[{load:25,reps:10,rir:3,warmup:false},
    {load:25,reps:'',rir:'',warmup:false}]
  }}};
  const data=DOSE.volume({today,strengthSessions:sessions,draft});
  const chest=data.rows.find(x=>x.id==='peito');
  assert.equal(chest.direct7,4);
  assert.equal(chest.direct28,7);
  assert.equal(chest.priorWeekly,1);
});
test('dados sem mapeamento são explicitamente reconhecidos e reduzem cobertura',()=>{
  const data=DOSE.analyze({today,strengthSessions:[sess(19,[row('custom')])],exercises:[]});
  assert.equal(data.summary.unknown,1);
  assert.equal(data.summary.coverage,0);
  assert.equal(data.suggestions.some(x=>x.level==='unknown'),true);
});
test('não sugere +1 série sem histórico, RIR ou execução real',()=>{
  const e=ex('supino-halteres');
  const draft={entries:{[e.id]:row(e.id,2)}};
  let output=DOSE.analyze({today,exercises:[e],draft});
  assert.equal(output.candidates.length,0);
  const history=[sess(11,[row(e.id,3)]),sess(18,[row(e.id,3,0)])];
  output=DOSE.analyze({today,strengthSessions:history,exercises:[e],draft});
  assert.equal(output.candidates.length,0);
});
test('sugere somente uma série opcional com duas sessões comparáveis, RIR e sem queda',()=>{
  const e=ex('supino-halteres');
  const sessions=[2,4,6,8,11,13,18].map(day=>sess(day,[row(e.id,4,3,25)]));
  const draft={entries:{[e.id]:row(e.id,4,3,25)},energy:'leve'};
  let output=DOSE.analyze({today,strengthSessions:sessions,exercises:[e],draft:{...draft,energy:'normal'},settings:{fatigue:'normal',kneePain:''}});
  assert.equal(output.candidates.length,0);
  output=DOSE.analyze({today,strengthSessions:sessions,exercises:[e],draft,settings:{fatigue:'normal',kneePain:''}});
  assert.equal(output.candidates.length,1);
  assert.equal(output.suggestions[0].level,'consider');
  assert.match(output.suggestions[0].reason,/opcional/);
  assert.match(output.disclaimer,/heurísticas/);
});
test('fadiga alta e Muay Thai no dia bloqueiam proposta de aumentar volume',()=>{
  const e=ex('supino-halteres');
  const h=[sess(4,[row(e.id)]),sess(11,[row(e.id)]),sess(18,[row(e.id)])];
  const draft={entries:{[e.id]:row(e.id,2)},energy:'normal'};
  let output=DOSE.analyze({today,strengthSessions:h,exercises:[e],draft,settings:{fatigue:'alta'}});
  assert.equal(output.candidates.length,0);
  assert.equal(output.suggestions[0].level,'recover');
  output=DOSE.analyze({today,strengthSessions:h,exercises:[e],draft,
    settings:{fatigue:'normal'},muaySessions:[{day:today,intensity:5}]});
  assert.equal(output.candidates.length,0);
  assert.equal(output.suggestions[0].level,'recover');
});
test('dor no joelho e ausencia de comprovacao impedem aumento de série de membros inferiores',()=>{
  const e=ex('leg-press');
  const h=[sess(4,[row(e.id)]),sess(11,[row(e.id)]),sess(18,[row(e.id)])];
  const draft={entries:{[e.id]:row(e.id,2)},energy:'normal'};
  draft.entries[e.id].pain='';
  let output=DOSE.analyze({today,strengthSessions:h,exercises:[e],draft,settings:{fatigue:'normal',kneePain:''}});
  assert.equal(output.candidates.length,0);
  draft.entries[e.id].pain=0;
  output=DOSE.analyze({today,strengthSessions:h,exercises:[e],draft,settings:{fatigue:'normal',kneePain:1}});
  assert.equal(output.candidates.length,0);
});
test('escapa nomes registrados ao gerar painel HTML',()=>{
  const output=DOSE.analyze({today,strengthSessions:[sess(19,[row('custom')])]});
  const html=DOSE.renderPanel(output,{duringWorkout:true});
  assert.doesNotMatch(html,/<script>/);
  assert.match(html,/não entram no volume muscular estimado/);
});
