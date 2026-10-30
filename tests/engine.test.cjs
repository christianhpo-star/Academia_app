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


test('forca estimada considera carga e repeticoes da melhor serie',()=>{
  assert.equal(Engine.estimateStrength(100,10),133.33);
  const entry={sets:[{load:90,reps:12,warmup:false},{load:100,reps:8,warmup:false}]};
  assert.equal(Engine.entryStrength(entry),126.67);
});

test('evolucao por exercicio compara referencia com registro atual',()=>{
  const s1=session(1,25,10,2,{exId:'supino-halteres'});
  const s2=session(2,27.5,10,2,{exId:'supino-halteres'});
  const result=Engine.exerciseStrength(ex('supino-halteres'),[s1,s2],3650);
  assert.equal(result.count,2);
  assert.equal(result.firstTop.load,25);
  assert.equal(result.latestTop.load,27.5);
  assert.ok(result.percent>0);
});

test('radar por grupo agrega a evolucao dos exercicios ativos',()=>{
  const s1=session(1,25,10,2,{exId:'supino-halteres'});
  const s2=session(2,27.5,10,2,{exId:'supino-halteres'});
  const s3=session(3,240,10,2,{exId:'leg-press',planId:'C',pain:0,nextDay:0});
  const s4=session(4,260,10,2,{exId:'leg-press',planId:'C',pain:0,nextDay:0});
  s3.entries[0].sets=[{load:240,reps:10,rir:2,warmup:false},{load:240,reps:10,rir:2,warmup:false},{load:240,reps:10,rir:2,warmup:false}];
  s4.entries[0].sets=[{load:260,reps:10,rir:2,warmup:false},{load:260,reps:10,rir:2,warmup:false},{load:260,reps:10,rir:2,warmup:false}];
  const groups=Engine.groupStrength(Data.exercises,[s1,s2,s3,s4],3650);
  const peito=groups.find(item=>item.group==='B');
  const quadriceps=groups.find(item=>item.group==='C');
  assert.ok(peito.current>100);
  assert.ok(quadriceps.current>100);
  assert.equal(peito.best.id,'supino-halteres');
});

test('curva de forca prioriza melhor estimativa, nao apenas maior carga',()=>{
  const s=session(1,100,8,2,{exId:'supino-halteres'});
  s.entries[0].sets = [
    {load:20,reps:15,rir:5,warmup:true},
    {load:105,reps:5,rir:2,warmup:false},
    {load:90,reps:15,rir:2,warmup:false},
  ];
  const time=Date.parse('2026-10-30T18:00:00.000Z');
  const series=Engine.strengthSeries(ex('supino-halteres'),[s],365,time);
  assert.equal(series.length,1);
  assert.equal(series[0].strength,135);
  assert.equal(series[0].top.load,90);
  assert.equal(series[0].top.reps,15);
});

test('janela de 90 dias descarta sessoes antigas sem fabricar dados',()=>{
  const old=session(1,25,10,2);
  const recent=session(29,27.5,12,2);
  const now=Date.parse('2026-10-30T23:59:59Z');
  const few=Engine.strengthSeries(ex('supino-halteres'),[old,recent],7,now);
  assert.equal(few.length,1);
  assert.equal(few[0].top.load,27.5);
  const metric=Engine.exerciseStrength(ex('supino-halteres'),[old,recent],7,now);
  assert.equal(metric.count,1);
  assert.equal(metric.percent,0);
  const absent=Engine.exerciseStrength(ex('supino-halteres'),[],90,now);
  assert.equal(absent.count,0);
  assert.equal(absent.current,null);
});

test('grupos sem duas sessoes nao recebem pontuacao inventada',()=>{
  const s=session(1,25,10,2,{exId:'supino-halteres'});
  const groups=Engine.groupStrength(Data.exercises,[s],3650);
  const b=groups.find(item=>item.group==='B');
  assert.equal(b.tracked,0);
  assert.equal(b.current,null);
  assert.equal(b.delta,null);
});

test('exercicio desativado nao influencia radar mas pode manter historico detalhado',()=>{
  const left=Data.exercises.map(item=>({...item}));
  const target=left.find(item=>item.id==='supino-halteres');
  target.active=false;
  const sessions=[session(1,25,10,2),session(2,27.5,12,2)];
  const groups=Engine.groupStrength(left,sessions,3650);
  assert.equal(groups.find(item=>item.group==='B').tracked,0);
  assert.equal(Engine.strengthSeries(target,sessions,3650).length,2);
});


test('cargas aproximadas ficam somente como modelos sem repeticoes inventadas',()=>{
  const expected={
    'supino-halteres':[20,22.5,25,25],
    'supino-inclinado':[20,22.5,22.5,22.5],
    'voador':[55,55,55,55],
    'triceps-testa':[50,55,60,60],
  };
  for (const [id, loads] of Object.entries(expected)) {
    const item=ex(id);
    assert.deepEqual(item.example.map(s=>s.load),loads);
    assert.ok(item.example.every(s=>s.reps === '' && s.rir === ''));
    assert.equal(item.sets,4);
    assert.equal(Engine.historyOf([],id).length,0);
    assert.equal(Engine.recommend(item,[]).level,'start');
  }
  assert.equal(ex('supino-inclinado').unit,'kg/halter');
  assert.equal(ex('triceps-testa').name,'Tríceps testa na polia');
});
test('demais exercícios permanecem sem cargas presumidas',()=>{
  assert.equal(ex('triceps-corda').example,undefined);
  assert.equal(ex('elevacao-lateral').example,undefined);
});
