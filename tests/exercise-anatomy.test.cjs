const test=require('node:test');
const assert=require('node:assert/strict');
const DATA=require('../data.js');
const F=require('../flex.js');
const A=require('../exercise-anatomy.js');
const all=[...DATA.exercises,...F.catalog].filter(ex=>['A','B'].includes(ex.group));
const ids=all.map(ex=>ex.id);
const description=svg=>(svg.match(/<desc\b[^>]*>([\s\S]*?)<\/desc>/)||[])[1]||'';
const title=svg=>(svg.match(/<title\b[^>]*>([\s\S]*?)<\/title>/)||[])[1]||'';

test('anatomical guidance covers every known A/B exercise with stable IDs',()=>{
  assert.equal(A.VERSION,2);
  assert.equal(A.coveredIds.length,41);
  assert.equal(new Set(A.coveredIds).size,A.coveredIds.length);
  assert.ok(ids.every(id=>!!A.describe(id)),ids.filter(id=>!A.describe(id)).join(', '));
  assert.ok(A.coveredIds.every(id=>ids.includes(id)));
  assert.equal(A.describe('voador-inverso').view,'back');
  assert.equal(A.describe('voador').view,'front');
  assert.equal(A.describe('agachamento-hack'),null);
  assert.equal(A.panel('agachamento-hack'),'');
});

test('bench press shows the chest and anterior shoulder in front, and triceps in back',()=>{
  const front=A.viewInfo('supino-barra','front');
  const back=A.viewInfo('supino-barra','back');
  assert.deepEqual(front.visibleMain,['chest']);
  assert.deepEqual(front.visibleAssist,['frontDelts']);
  assert.deepEqual(front.hiddenAssist,['triceps']);
  assert.deepEqual(back.visibleMain,[]);
  assert.deepEqual(back.visibleAssist,['triceps']);
  assert.deepEqual(back.hiddenMain,['chest']);
  assert.deepEqual(back.hiddenAssist,['frontDelts']);
  assert.match(front.note,/tríceps/i);
  assert.match(front.note,/costas/i);
  assert.match(back.note,/peitoral/i);
  assert.match(back.note,/frente/i);
  const frontSvg=A.figure('supino-barra',false,'front');
  const backSvg=A.figure('supino-barra',false,'back');
  assert.match(title(frontSvg),/anterior|frente/i);
  assert.match(title(backSvg),/posterior|costas/i);
  assert.match(description(frontSvg),/Peitoral maior/);
  assert.match(description(frontSvg),/Deltoide anterior/);
  assert.doesNotMatch(description(frontSvg),/tríceps/i);
  assert.match(description(backSvg),/Tríceps/i);
  assert.doesNotMatch(description(backSvg),/Peitoral maior|Deltoide anterior/);
});

test('posterior exercises and curls do not invent highlights on the opposite side',()=>{
  const reverse=A.describe('voador-inverso');
  assert.equal(reverse.primary,'Deltoide posterior');
  assert.ok(reverse.assist.includes('midTraps')&&reverse.assist.includes('rhomboids'));
  assert.ok(!reverse.main.includes('chest'));
  const back=A.viewInfo('voador-inverso','back');
  const front=A.viewInfo('voador-inverso','front');
  assert.deepEqual(back.visibleMain,['rearDelts']);
  assert.deepEqual(front.visibleMain,[]);
  assert.deepEqual(front.visibleAssist,[]);
  assert.match(front.note,/sem músculos destacados/i);
  assert.match(front.note,/costas/i);
  const curl=A.viewInfo('rosca-w','back');
  assert.deepEqual(curl.visibleMain,[]);
  assert.ok(curl.hiddenMain.includes('biceps'));
  assert.doesNotMatch(description(A.figure('rosca-w',false,'back')),/bíceps/i);
  const pull=A.viewInfo('pulley-aberto','back');
  assert.ok(!pull.visibleAssist.includes('biceps'));
  assert.ok(pull.hiddenAssist.includes('biceps'));
});

test('guide exposes native controls and independently named SVGs without remote assets',()=>{
  const panel=A.panel('voador-inverso');
  assert.match(panel,/^<details class="ex-anatomy"[^>]*>/);
  assert.match(A.panel('voador-inverso',true),/^<details class="ex-anatomy"[^>]* open>/);
  assert.doesNotMatch(panel,/^<details[^>]+ open>/);
  assert.match(panel,/<summary class="ex-anatomy-summary">/);
  assert.match(panel,/aria-hidden="true" focusable="false"/);
  assert.match(panel,/role="img" aria-labelledby=/);
  assert.match(panel,/Deltoide posterior/);
  assert.match(panel,/Trapézio médio e romboides/);
  assert.match(panel,/destaque ilustrativo|Ilustração orientativa/i);
  assert.equal((panel.match(/data-action="anatomy-view"/g)||[]).length,2);
  assert.equal((panel.match(/aria-pressed="true"/g)||[]).length,1);
  assert.equal((panel.match(/aria-pressed="false"/g)||[]).length,1);
  assert.match(panel,/role="group"/);
  assert.match(panel,/role="status"/);
  assert.doesNotMatch(panel,/(?:<script|<iframe|<img|<animate\b|autoplay|data-field|(?:src|href)=["']https?:)/i);

  // Repeated instances must not redirect paint references or accessible names
  // to the SVG of a different exercise card.
  const repeated=panel+A.panel('voador-inverso',true,'front')+A.viewer('voador-inverso','back','catalog');
  const generatedIds=Array.from(repeated.matchAll(/\sid="([^"]+)"/g),match=>match[1]);
  assert.equal(new Set(generatedIds).size,generatedIds.length);
  for(const match of repeated.matchAll(/aria-labelledby="([^"]+)"/g)){
    for(const id of match[1].split(/\s+/))assert.ok(generatedIds.includes(id),id);
  }
  for(const match of repeated.matchAll(/url\(#([^)]+)\)/g))assert.ok(generatedIds.includes(match[1]),match[1]);
});

test('each exercise defaults to its useful view and invalid view requests remain safe',()=>{
  for(const id of A.coveredIds){
    const item=A.describe(id);
    assert.ok(item.primary.length>2&&item.cue.length>12);
    assert.ok(['front','back'].includes(item.view));
    assert.ok(item.main.length>=1);
    assert.equal(A.viewInfo(id).view,item.view);
    assert.equal(A.viewInfo(id,'invalid').view,item.view);
    assert.ok(A.viewInfo(id).visibleMain.length>0,id);
    for(const view of ['front','back']){
      const info=A.viewInfo(id,view);
      assert.equal(info.view,view);
      assert.deepEqual([...info.visibleMain,...info.hiddenMain].sort(),[...item.main].sort());
      assert.deepEqual([...info.visibleAssist,...info.hiddenAssist].sort(),[...item.assist].sort());
      assert.ok(A.panel(id,false,view).includes('ex-anatomy-expanded'));
    }
  }
});

test('lower-body and unknown movements never receive misleading anatomy claims',()=>{
  assert.equal(A.describe('flexora-d'),null);
  assert.equal(A.panel('hip-thrust-maquina'),'');
  assert.equal(A.panel('this-is-unknown'),'');
  assert.equal(A.figure('this-is-unknown'),'');
  assert.equal(A.viewer('this-is-unknown'),'');
  assert.equal(A.viewInfo('this-is-unknown'),null);
});
