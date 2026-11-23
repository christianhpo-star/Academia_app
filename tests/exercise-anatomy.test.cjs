const test=require('node:test');
const assert=require('node:assert/strict');
const DATA=require('../data.js');
const F=require('../flex.js');
const A=require('../exercise-anatomy.js');
const all=[...new Map([...F.catalog,...DATA.exercises].map(ex=>[ex.id,ex])).values()];
const ids=all.map(ex=>ex.id);
const upperIds=all.filter(ex=>['A','B'].includes(ex.group)).map(ex=>ex.id);
const lowerIds=all.filter(ex=>['C','D'].includes(ex.group)).map(ex=>ex.id);
const description=svg=>(svg.match(/<desc\b[^>]*>([\s\S]*?)<\/desc>/)||[])[1]||'';
const title=svg=>(svg.match(/<title\b[^>]*>([\s\S]*?)<\/title>/)||[])[1]||'';

test('anatomical guidance covers the 69 upper/core and 38 lower movements with stable IDs',()=>{
  assert.equal(A.VERSION,4);
  assert.equal(upperIds.length,69);
  assert.equal(lowerIds.length,38);
  assert.equal(A.coveredIds.length,107);
  assert.equal(new Set(A.coveredIds).size,A.coveredIds.length);
  assert.ok(ids.every(id=>!!A.describe(id)),ids.filter(id=>!A.describe(id)).join(', '));
  assert.ok(A.coveredIds.every(id=>ids.includes(id)));
  assert.deepEqual([...A.coveredIds].sort(),[...ids].sort());
  for(const id of upperIds)assert.notEqual(A.describe(id).body,'lower',id);
  for(const id of lowerIds)assert.equal(A.describe(id).body,'lower',id);
  assert.equal(A.describe('voador-inverso').view,'back');
  assert.equal(A.describe('voador').view,'front');
});

test('abdominal guides distinguish trunk flexion from anti-rotation and stay in the front view',()=>{
  for(const id of ['abdominal-solo','abdominal-inverso','abdominal-polia','pallof-press']){
    const pallof=id==='pallof-press';
    const item=A.describe(id),front=A.viewInfo(id,'front'),back=A.viewInfo(id,'back');
    assert.equal(item.view,'front',id);
    assert.deepEqual(item.main,[pallof?'obliques':'abs'],id);
    assert.deepEqual(item.assist,[pallof?'abs':'obliques'],id);
    assert.deepEqual(front.visibleMain,item.main,id);
    assert.deepEqual(front.visibleAssist,item.assist,id);
    assert.deepEqual(back.visibleMain,[],id);
    assert.deepEqual(back.visibleAssist,[],id);
    assert.match(back.note,/Sem músculos destacados nesta vista. Veja Frente/);
    const frontSvg=A.figure(id,false,'front'),backSvg=A.figure(id,false,'back');
    assert.match(frontSvg,/class="primary" data-muscle="(?:abs|obliques)"/);
    assert.match(frontSvg,/class="secondary" data-muscle="(?:abs|obliques)"/);
    assert.match(description(frontSvg),/Reto do abdômen|reto do abdômen/);
    assert.match(description(frontSvg),/Oblíquos|oblíquos/);
    assert.doesNotMatch(backSvg,/data-muscle="(?:abs|obliques)"/);
    assert.doesNotMatch(description(backSvg),/abdômen|oblíquos/i);
    assert.doesNotMatch(item.primary+item.secondary,/superior|inferior|transverso/);
  }
  assert.match(A.describe('abdominal-inverso').cue,/pelve.*costelas/);
  assert.match(A.describe('pallof-press').cue,/sem girar.*dois lados.*uma série/);
  // Compound lifts retain their prior classification: stabilizing the trunk
  // does not manufacture recorded abdominal sets.
  for(const id of ['agachamento-livre','stiff','remada-cavalinho','supino-barra']){
    const item=A.describe(id);
    assert.ok(![...item.main,...item.assist].some(region=>['abs','obliques'].includes(region)),id);
  }
});

test('leg variants are mapped by movement rather than by their training block',()=>{
  const groups=[
    {ids:'agachamento-hack agachamento-livre bulgaro leg-press agachamento-goblet passada-reversa step-up-baixo agachamento-smith leg-press-horizontal',view:'front',main:['quadriceps'],assist:['glutes']},
    {ids:'extensora extensora-d extensora-unilateral',view:'front',main:['quadriceps'],assist:[]},
    {ids:'cadeira-adutora aducao-polia',view:'front',main:['adductors'],assist:[]},
    {ids:'flexora-c flexora-d flexora-sentada flexora-unilateral flexora-em-pe',view:'back',main:['hamstrings'],assist:[]},
    {ids:'stiff terra-romeno-halter',view:'back',main:['hamstrings'],assist:['glutes']},
    {ids:'elevacao-pelvica gluteo-cabo ponte-gluteo hip-thrust-maquina',view:'back',main:['glutes'],assist:[]},
    {ids:'pull-through-polia',view:'back',main:['glutes'],assist:['hamstrings']},
    {ids:'sumo-maquina agachamento-sumo-halter',view:'back',main:['glutes'],assist:['quadriceps','adductors']},
    {ids:'abdutora abducao-polia',view:'back',main:['hipAbductors'],assist:[]},
    {ids:'extensao-lombar-45',view:'back',main:['glutes','hamstrings'],assist:[]},
    {ids:'passada-lateral-halter',view:'back',main:['hipAbductors','glutes'],assist:['quadriceps']},
    {ids:'panturrilha-leg panturrilha-banco panturrilha-em-pe panturrilha-unilateral-pe panturrilha-smith panturrilha-sentada-maquina',view:'back',main:['calves'],assist:[]}
  ];
  const checked=[];
  for(const expected of groups){
    for(const id of expected.ids.split(' ')){
      const item=A.describe(id);
      assert.equal(item.body,'lower',id);
      assert.equal(item.view,expected.view,id);
      assert.deepEqual(item.main,expected.main,id);
      assert.deepEqual(item.assist,expected.assist,id);
      checked.push(id);
    }
  }
  assert.deepEqual(checked.sort(),[...lowerIds].sort());
  // A hamstring exercise in C and a quad exercise in D must keep their own map.
  assert.equal(all.find(ex=>ex.id==='flexora-c').group,'C');
  assert.equal(A.describe('flexora-c').view,'back');
  assert.equal(all.find(ex=>ex.id==='extensora-d').group,'D');
  assert.equal(A.describe('extensora-d').view,'front');
  assert.match(A.describe('sumo-maquina').cue,/movimento composto/i);
  assert.match(A.describe('sumo-maquina').cue,/execução.*aparelho/i);
});

test('leg front and back views show only anatomically visible highlighted regions',()=>{
  const front=A.viewInfo('agachamento-hack','front');
  const back=A.viewInfo('agachamento-hack','back');
  assert.deepEqual(front.visibleMain,['quadriceps']);
  assert.deepEqual(front.visibleAssist,[]);
  assert.deepEqual(front.hiddenAssist,['glutes']);
  assert.deepEqual(back.visibleMain,[]);
  assert.deepEqual(back.visibleAssist,['glutes']);
  assert.deepEqual(back.hiddenMain,['quadriceps']);
  assert.match(front.note,/glúteo/i);
  assert.match(front.note,/costas/i);
  assert.match(back.note,/quadríceps/i);
  assert.match(back.note,/frente/i);
  assert.doesNotMatch(description(A.figure('agachamento-hack',false,'front')),/glúteo/i);
  assert.doesNotMatch(description(A.figure('agachamento-hack',false,'back')),/quadríceps/i);

  for(const [id,hiddenView,region,label] of [
    ['extensora-d','back','quadriceps',/quadríceps/i],
    ['flexora-c','front','hamstrings',/posteriores|isquiotibiais/i],
    ['panturrilha-leg','front','calves',/panturrilha|gastrocnêmio|sóleo/i]
  ]){
    const info=A.viewInfo(id,hiddenView);
    assert.deepEqual(info.visibleMain,[],id);
    assert.deepEqual(info.visibleAssist,[],id);
    assert.ok(info.hiddenMain.includes(region),id);
    assert.match(info.note,/sem músculos destacados/i);
    assert.doesNotMatch(description(A.figure(id,false,hiddenView)),label,id);
  }
  assert.deepEqual(A.viewInfo('stiff','back').visibleMain,['hamstrings']);
  assert.deepEqual(A.viewInfo('stiff','back').visibleAssist,['glutes']);
  assert.deepEqual(A.viewInfo('sumo-maquina','front').visibleAssist,['quadriceps','adductors']);
  assert.deepEqual(A.viewInfo('sumo-maquina','front').hiddenMain,['glutes']);
});

test('lower figures use leg regions and preserve the separate upper-body artwork',()=>{
  const legRegions=new Set(['quadriceps','glutes','hamstrings','hipAbductors','adductors','calves']);
  for(const id of lowerIds){
    for(const view of ['front','back']){
      const svg=A.figure(id,false,view);
      assert.match(svg,/data-anatomy-body="lower"/,id);
      assert.match(title(svg),view==='front'?/anterior|frente/i:/posterior|costas/i);
      const regions=Array.from(svg.matchAll(/data-muscle="([^"]+)"/g),match=>match[1]);
      assert.ok(regions.length>0,id);
      assert.ok(regions.every(region=>legRegions.has(region)),id);
      assert.doesNotMatch(svg,/(?:<script|<iframe|<img|<animate\b|(?:src|href)=["']https?:)/i);
    }
  }
  for(const id of upperIds){
    const svg=A.figure(id);
    assert.match(svg,/data-anatomy-body="upper"/,id);
    assert.doesNotMatch(svg,/data-muscle="(?:quadriceps|glutes|hamstrings|hipAbductors|adductors|calves)"/,id);
  }
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
  const repeated=panel+A.panel('voador-inverso',true,'front')+A.viewer('voador-inverso','back','catalog')+
    A.panel('agachamento-hack',true,'front')+A.viewer('hip-thrust-maquina','back','catalog')+
    A.panel('agachamento-hack',true,'back');
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

test('unknown movements never receive fabricated anatomy claims',()=>{
  assert.equal(A.describe('this-is-unknown'),null);
  assert.equal(A.describe('agachamento-nao-catalogado'),null);
  assert.equal(A.panel('agachamento-nao-catalogado'),'');
  assert.equal(A.panel('this-is-unknown'),'');
  assert.equal(A.figure('this-is-unknown'),'');
  assert.equal(A.viewer('this-is-unknown'),'');
  assert.equal(A.viewInfo('this-is-unknown'),null);
});
