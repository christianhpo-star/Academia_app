const test = require('node:test');
const assert = require('node:assert/strict');
const Engine = require('../engine.js');
const Data = require('../data.js');
const ex = (id) => Data.exercises.find(x => x.id === id);
const session = (id, load, reps, rir, opt = {}) => ({
  id: 's'+id, planId: opt.planId || 'B', timestamp: `2026-10-${String(id).padStart(2,'0')}T15:00:00.000Z`,day:`2026-10-${String(id).padStart(2,'0')}`,
  kneeNextDay:opt.nextDay??null,
  entries:[{id:opt.exId||'supino-halteres',pain:opt.pain??null,sets:[
    {load:20,reps:12,rir:5,warmup:true},
    {load,reps,rir,warmup:false},
  ]}],
});
test('sem historico, os pesos exemplificados nao se tornam ultima carga',()=>{
  const r=Engine.recommend(ex('supino-halteres'),[]);
  assert.equal(r.level,'start'); assert.equal(r.last,null);
});
test('aquecimento nao define a ultima carga efetiva',()=>{
  const s=session(1,25,12,2);
  s.entries[0].sets[0].load=70;
  assert.equal(Engine.topSet(s.entries[0]).load,25);
});
test('uma unica sessao nao libera aumento',()=>{
  const r=Engine.recommend(ex('supino-halteres'),[session(1,25,12,2)]);
  assert.equal(r.level,'confirm'); assert.equal(r.next,25);
});
test('duas sessoes piramide iguais no topo liberam passo de 2,5 por halter',()=>{
  const r=Engine.recommend(ex('supino-halteres'),[session(1,25,12,2),session(2,25,12,2)]);
  assert.equal(r.level,'increase'); assert.equal(r.next,27.5);
});
test('sem RIR nao ha recomendacao de subir',()=>{
  const r=Engine.recommend(ex('supino-halteres'),[session(1,25,12,null),session(2,25,12,null)]);
  assert.equal(r.level,'hold');
});
test('dor no joelho ou ausencia de resposta no dia seguinte bloqueiam aumento',()=>{
  const opts={exId:'leg-press',planId:'C',pain:0};
  const s1=session(1,250,12,2,opts), s2=session(2,250,12,2,opts);
  // leg press requires 3 work sets, so replicate compliant sets
  for(const s of [s1,s2])s.entries[0].sets=[
    {load:250,reps:12,rir:2,warmup:false},{load:250,reps:12,rir:2,warmup:false},{load:250,reps:12,rir:2,warmup:false},
  ];
  assert.equal(Engine.recommend(ex('leg-press'),[s1,s2]).level,'protect');
  s1.kneeNextDay=0;s2.kneeNextDay=0;
  assert.equal(Engine.recommend(ex('leg-press'),[s1,s2]).level,'increase');
  s2.entries[0].pain=1;
  assert.equal(Engine.recommend(ex('leg-press'),[s1,s2]).level,'protect');
});
test('fadiga alta antecipa superiores sem eliminar opcao de pernas',()=>{
  const last={...session(10,25,12,2),planId:'A'};
  const r=Engine.nextWorkout([last],'alta',0,Data.rotation);
  assert.equal(r.id,'B');assert.equal(r.modified,true);
});
test('progresso de peso considera registro mais recente',()=>{
  const p=Engine.progress([{weight:88.3,date:'2026-10-30'},{weight:86,date:'2026-11-13'}],88.3,82);
  assert.equal(p.current,86);assert.equal(p.remaining,4);assert.ok(p.percent>0);
});

const done = (id, planId) => ({id:`p${id}`,planId,timestamp:`2026-11-${String(id).padStart(2,'0')}T16:00:00Z`,entries:[{id:'irrelevant',sets:[{load:30,reps:12,warmup:false}]}]});
test('ao realizar perna antes de costas, costas permanece pendente e volta a ser recomendada',()=>{
  const r=Engine.nextWorkout([done(1,'C')],'normal',0,Data.rotation);
  assert.equal(r.id,'A');
  assert.deepEqual(r.pending,['A','B','D']);
  assert.deepEqual(r.completed,['C']);
});
test('repetir treino ja realizado nao remove outros blocos pendentes',()=>{
  const r=Engine.nextWorkout([done(1,'C'),done(2,'C')],'normal',0,Data.rotation);
  assert.equal(r.id,'A');
  assert.deepEqual(r.pending,['A','B','D']);
});
test('pendentes seguem por toda a rodada, independente da ordem',()=>{
  const r=Engine.nextWorkout([done(1,'C'),done(2,'B'),done(3,'A')],'normal',0,Data.rotation);
  assert.equal(r.id,'D');
  assert.deepEqual(r.pending,['D']);
  assert.deepEqual(r.completed,['A','C','B']);
});
test('rodada completa cria rodada nova e evita repetir bloco anterior imediatamente',()=>{
  const sessions=[done(1,'C'),done(2,'B'),done(3,'D'),done(4,'A')];
  const r=Engine.nextWorkout(sessions,'normal',0,Data.rotation);
  assert.equal(r.completedRounds,1);
  assert.deepEqual(r.pending,Data.rotation);
  assert.equal(r.id,'C');
});
test('sem superiores pendentes e pernas com dor, a sugestao eh recuperar',()=>{
  const sessions=[done(1,'A'),done(2,'B')];
  const r=Engine.nextWorkout(sessions,'alta',1,Data.rotation);
  assert.equal(r.id,null);
  assert.equal(r.rest,true);
  assert.deepEqual(r.pending,['C','D']);
});
test('dor redireciona para superiores pendentes, nao recupera bloco ja feito',()=>{
  const r=Engine.nextWorkout([done(1,'A')],'alta',1,Data.rotation);
  assert.equal(r.id,'B');
  assert.deepEqual(r.pending,['C','B','D']);
});
test('comparacao da mesma carga reconhece mais repeticoes',()=>{
  const prev={load:25,reps:10,warmup:false};
  const now={load:25,reps:12,warmup:false};
  const c=Engine.compareSet(prev,now);
  assert.equal(c.kind,'good');
  assert.match(c.label,/\+2/);
});
test('comparacao nunca confunde aquecimento e series efetivas',()=>{
  const prev={load:20,reps:12,warmup:true};
  const now={load:25,reps:12,warmup:false};
  const c=Engine.compareSet(prev,now);
  assert.equal(c.kind,'neutral');
  assert.match(c.label,/Tipo/);
});
test('repeticoes nao informadas nao sao tratadas como progresso',()=>{
  const c=Engine.compareSet({load:25,reps:12,warmup:false},{load:27.5,reps:'',warmup:false});
  assert.equal(c.kind,'none');
});

test('registro vazio importado nao marca bloco como concluido',()=>{
  const empty={planId:'C',timestamp:'2026-11-03T15:00:00Z',entries:[]};
  const r=Engine.nextWorkout([empty],'normal',null,Data.rotation);
  assert.equal(r.id,'A');
  assert.deepEqual(r.pending,Data.rotation);
});
