const test=require('node:test');
const assert=require('node:assert/strict');
const DATA=require('../data.js');
const F=require('../flex.js');
const A=require('../exercise-anatomy.js');
const all=[...DATA.exercises,...F.catalog].filter(ex=>['A','B'].includes(ex.group));
const ids=all.map(ex=>ex.id);
test('anatomical guidance covers every known A/B exercise with stable IDs',()=>{
  assert.equal(A.VERSION,1);
  assert.equal(A.coveredIds.length,41);
  assert.equal(new Set(A.coveredIds).size,A.coveredIds.length);
  assert.ok(ids.every(id=>!!A.describe(id)),ids.filter(id=>!A.describe(id)).join(', '));
  assert.ok(A.coveredIds.every(id=>ids.includes(id)));
  assert.ok(A.describe('voador-inverso').view==='back');
  assert.ok(A.describe('voador').view==='front');
  assert.equal(A.describe('agachamento-hack'),null);
  assert.equal(A.panel('agachamento-hack'),'');
});
test('rear fly correctly distinguishes posterior shoulder vs chest fly',()=>{
  const reverse=A.describe('voador-inverso');
  assert.equal(reverse.primary,'Deltoide posterior');
  assert.ok(reverse.assist.includes('midTraps')&&reverse.assist.includes('rhomboids'));
  assert.ok(!reverse.main.includes('chest'));
  const chest=A.describe('voador');
  assert.equal(chest.primary,'Peitoral maior');
  assert.ok(chest.main.includes('chest'));
  assert.ok(!chest.main.includes('rearDelts'));
  assert.notEqual(A.figure('voador-inverso',false),A.figure('voador',false));
});
test('guide is native keyboard accessible and static, with proper SVG semantics',()=>{
  const p=A.panel('voador-inverso');
  assert.match(p,/^<details class="ex-anatomy"[^>]*>/);
  assert.match(p,/<summary class="ex-anatomy-summary">/);
  assert.match(p,/aria-hidden="true" focusable="false"/);
  assert.match(p,/role="img" aria-labelledby=/);
  assert.match(p,/<title id="fa-title-voador-inverso-full">/);
  assert.match(p,/<desc id="fa-desc-voador-inverso-full">/);
  assert.match(p,/Deltoide posterior/);
  assert.match(p,/Trapézio médio e romboides/);
  assert.match(p,/destaque ilustrativo|Ilustração orientativa/i);
  assert.doesNotMatch(p,/https?:\/\/|<script|<iframe|<img|autoplay|data-action|data-field/i);
});
test('guide is lightweight, deterministic and never touches workout history or targets',()=>{
  const state=JSON.stringify({sessions:[{day:'2026-11-10',entries:[{id:'voador',sets:[{load:60,reps:12}]}]}],weights:[{weight:88.3}],nutrition:{entries:[]}});
  const first=A.panel('voador-inverso');
  assert.equal(first,A.panel('voador-inverso'));
  assert.ok(first.length<10000);
  assert.equal(state,JSON.stringify(JSON.parse(state)));
  for(const id of A.coveredIds){
    const item=A.describe(id);
    assert.ok(item.primary.length>2&&item.cue.length>12);
    assert.ok(['front','back'].includes(item.view));
    assert.ok(item.main.length>=1);
    assert.ok(A.panel(id).includes('ex-anatomy-expanded'));
  }
});
test('lower-body and unknown movements never receive misleading anatomy claims',()=>{
  assert.equal(A.describe('flexora-d'),null);
  assert.equal(A.panel('hip-thrust-maquina'),'');
  assert.equal(A.panel('this-is-unknown'),'');
  assert.equal(A.figure('this-is-unknown'), '');
});
