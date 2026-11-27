const test = require('node:test');
const assert = require('node:assert/strict');
const CARDIO = require('../cardio.js');

test('optional blank and zero minutes create no saved cardio entries', () => {
  for (const rows of [undefined, null, [], [
    {type:'esteira',minutes:''}, {type:'escada',minutes:0},
    {type:'bicicleta',minutes:'  '}, {type:'eliptico',minutes:'0'}, {type:'outro'},
  ]]) assert.deepEqual(CARDIO.parse(rows), {ok:true, entries:[], totalMinutes:0});
});

test('minutes are normalized without fabricating metrics or changing the draft', () => {
  const draft = [
    {type:'esteira',minutes:'10.5'}, {type:'escada',minutes:'7,25'},
    {type:'bicicleta',minutes:5,calories:100,intensity:8},
  ];
  const before = structuredClone(draft);
  assert.deepEqual(CARDIO.parse(draft), {ok:true, entries:[
    {type:'esteira',minutes:10.5}, {type:'escada',minutes:7.25}, {type:'bicicleta',minutes:5},
  ], totalMinutes:22.75});
  assert.deepEqual(draft,before);
  assert.equal(CARDIO.parse([{type:'esteira',minutes:0.1},{type:'escada',minutes:0.2}]).totalMinutes,0.3);
  assert.equal(CARDIO.parse([{type:'esteira',minutes:300}]).ok,true);
});

test('malformed durations cannot be silently saved or turned into zero', () => {
  for (const minutes of [-1,300.01,NaN,Infinity,-Infinity,true,false,[],[10],{},'abc','Infinity','1:30','0x10']) {
    const result = CARDIO.parse([{type:'esteira',minutes}]);
    assert.equal(result.ok,false,String(minutes));
    assert.deepEqual(result.entries,[]);
    assert.equal(result.totalMinutes,0);
    assert.match(result.error,/Esteira/);
  }
});

test('unknown types, duplicated types and excessive rows reject the whole draft', () => {
  for (const rows of [
    {}, '10', [null], [[]], [{type:'corrida',minutes:10}],
    [{type:'esteira',minutes:10},{type:'esteira',minutes:5}],
    [{type:'escada',minutes:''},{type:'escada',minutes:5}],
    Array.from({length:6},()=>({type:'esteira',minutes:1})),
  ]) {
    const result=CARDIO.parse(rows);
    assert.equal(result.ok,false);
    assert.deepEqual(result.entries,[]);
    assert.equal(result.totalMinutes,0);
    assert.equal(typeof result.error,'string');
  }
});

test('history summary safely keeps valid known entries and counts each type once', () => {
  const records=[null, {type:'bad',minutes:100}, {type:'esteira',minutes:Infinity},
    {type:'esteira',minutes:10}, {type:'esteira',minutes:20},
    {type:'escada',minutes:0}, {type:'escada',minutes:12.5},
    {type:'bicicleta',minutes:true}, {type:'eliptico',minutes:5}];
  const before=structuredClone(records);
  assert.deepEqual(CARDIO.summarize(records), {entries:[
    {type:'esteira',minutes:10},{type:'escada',minutes:12.5},{type:'eliptico',minutes:5},
  ], totalMinutes:27.5});
  assert.deepEqual(records,before);
  for (const empty of [undefined,null,{},false,'10'])
    assert.deepEqual(CARDIO.summarize(empty),{entries:[],totalMinutes:0});
  assert.equal(CARDIO.label('escada'),'Escada');
  assert.equal(CARDIO.label('<script>'),'Cardio');
});

test('stair cadence or machine level is optional, explicit and never inferred', () => {
  const rows=[{type:'escada',minutes:'12,5',avgSpeed:'58,5',speedUnit:'steps_min'}];
  const before=structuredClone(rows);
  const parsed=CARDIO.parse(rows);
  assert.deepEqual(parsed,{ok:true,entries:[{type:'escada',minutes:12.5,avgSpeed:58.5,speedUnit:'steps_min'}],totalMinutes:12.5});
  assert.equal(CARDIO.paceLabel(parsed.entries[0]),'58,5 degraus/min');
  assert.deepEqual(rows,before);
  const level=CARDIO.parse([{type:'escada',minutes:10,avgSpeed:'7',speedUnit:'machine_level'}]);
  assert.equal(level.ok,true);
  assert.equal(CARDIO.paceLabel(level.entries[0]),'nível 7 (máquina)');
  assert.deepEqual(CARDIO.parse([{type:'escada',minutes:10}]).entries,[{type:'escada',minutes:10}]);
  assert.deepEqual(CARDIO.parse([{type:'esteira',minutes:8,avgSpeed:100}]).entries,[{type:'esteira',minutes:8}]);
  assert.deepEqual(CARDIO.summarize([{type:'escada',minutes:9,avgSpeed:52,speedUnit:'steps_min'}]).entries,
    [{type:'escada',minutes:9,avgSpeed:52,speedUnit:'steps_min'}]);
});

test('invalid stair cadence is rejected, while old cardio history remains readable', () => {
  for (const avgSpeed of [0,-1,241,'0x10',NaN,Infinity,true,{},'n/a']) {
    const out=CARDIO.parse([{type:'escada',minutes:8,avgSpeed,speedUnit:'steps_min'}]);
    assert.equal(out.ok,false,String(avgSpeed));
    assert.match(out.error,/velocidade média da escada/);
  }
  assert.equal(CARDIO.parse([{type:'escada',minutes:8,avgSpeed:100,speedUnit:'km_h'}]).ok,false);
  assert.equal(CARDIO.parse([{type:'escada',minutes:8,avgSpeed:100,speedUnit:'machine_level'}]).ok,false);
  assert.equal(CARDIO.parse([{type:'escada',minutes:'',avgSpeed:60}]).ok,false);
  assert.equal(CARDIO.summarize([{type:'escada',minutes:8,avgSpeed:'invalid'}]).entries[0].avgSpeed,undefined);
  assert.equal(CARDIO.paceLabel({type:'escada',minutes:8,avgSpeed:'invalid'}),'');
});

test('treadmill distance is optional, normalized and speed is derived without altering raw time',()=>{
 const row={type:'esteira',minutes:'10',distanceKm:'1,25'};
 assert.deepEqual(CARDIO.parse([row]).entries,[{type:'esteira',minutes:10,distanceKm:1.25}]);
 assert.equal(CARDIO.treadmillMetrics(row).speedKmh,7.5);
 assert.equal(CARDIO.paceLabel(row),'1,25 km · 7,5 km/h');
 assert.deepEqual(CARDIO.parse([{type:'esteira',minutes:10,distanceKm:''}]).entries,[{type:'esteira',minutes:10}]);
 for(const distanceKm of [0,-1,301,Infinity,true,'abc'])assert.equal(CARDIO.parse([{type:'esteira',minutes:10,distanceKm}]).ok,false);
 assert.equal(CARDIO.parse([{type:'esteira',minutes:0,distanceKm:1}]).ok,false);
 assert.equal(CARDIO.parse([{type:'esteira',minutes:1,distanceKm:2}]).ok,false);
 assert.deepEqual(CARDIO.summarize([{type:'esteira',minutes:10,distanceKm:'bad'}]).entries,[{type:'esteira',minutes:10}]);
});
test('treadmill progress aggregates known distance and matching time only',()=>{
 const row=(id,day,minutes,distanceKm)=>({id,day,cardio:[{type:'esteira',minutes,distanceKm}]});
 const rows=[row('a','2026-11-27',10,1),row('b','2026-11-27',20,3),row('c','2026-11-26',15),row('d','2026-10-01',20,2)];
 const m=CARDIO.treadmillHistory([...rows,rows[0]],'2026-11-27',7);
 assert.equal(m.sessionCount,3);assert.equal(m.knownSessions,2);assert.equal(m.totalMinutes,45);
 assert.equal(m.knownMinutes,30);assert.equal(m.distanceKm,4);assert.equal(m.speedKmh,8);
 assert.equal(m.rows[0].distanceKm,null);assert.equal(m.rows[0].speedKmh,null);
 assert.equal(m.rows[1].speedKmh,8);
});
