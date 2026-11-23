const test=require('node:test');
const assert=require('node:assert/strict');
const M=require('../muay.js');
const MAP=require('../muscle-map.js');
const TODAY='2026-11-23';

const academy=()=>M.draft(TODAY,'academia');
function add(d){const result=M.quickActivity(d.quick);assert.equal(result.error,undefined);d.activities.push(result.activity);return result.activity;}
function save(d){const result=M.finishDraft(d,TODAY);assert.equal(result.error,undefined);return result.session;}

test('academy uses one optional fast draft; home/older records retain their editor and format',()=>{
 const quick=academy();
 assert.equal(quick.place,'academia');
 assert.equal(quick.kind,'aula');
 assert.equal(quick.quick.mode,'exhaustion');
 assert.deepEqual(quick.activities,[]);
 assert.ok(M.validDraft(quick));
 const home=M.draft(TODAY,'casa');
 assert.equal(Object.hasOwn(home,'quick'),false);
 home.activities.push(M.activity('Sombra','rounds'));
 const older=save(home);
 assert.equal(Object.hasOwn(older,'fastVersion'),false);
 assert.equal(Object.hasOwn(M.draftFromSession(older),'quick'),false);
 const legacyAcademy=M.draft(TODAY,'academia');
 legacyAcademy.activities.push(M.activity('Manoplas','rounds'));
 delete legacyAcademy.quick;
 const original=save(legacyAcademy);
 const edit=M.draftFromSession(original);
 assert.equal(Object.hasOwn(edit,'quick'),false,'legacy academy session should keep legacy editor');
 assert.ok(M.validDraft(edit));
});

test('exhaustion 20/50 per limb and unilateral, squat bilateral and explicit 1-to-10 ladder',()=>{
 const d=academy();
 d.quick.movement='chute';d.quick.limb='both';d.quick.preset='50';
 let a=add(d);
 assert.equal(a.name,'Chutes · Ambos os lados');
 assert.equal(a.unit,'reps');
 assert.equal(a.quantity,50);
 assert.equal(a.side,'each');
 assert.equal(a.limb,'both');
 d.quick.preset='20';d.quick.movement='soco';d.quick.limb='right';
 a=add(d);
 assert.equal(a.quantity,20);assert.equal(a.limb,'right');assert.equal(a.side,'total');
 d.quick.movement='agachamento';d.quick.preset='ladder';d.quick.ladderTo='10';
 a=add(d);
 assert.equal(a.quantity,55);assert.equal(a.limb,'bilateral');
 assert.equal(a.pattern,'ladder');assert.equal(a.ladderTo,10);
 d.quick.movement='chute';d.quick.limb='left';d.quick.preset='ladder';
 a=add(d);
 assert.equal(a.quantity,55);assert.equal(a.side,'total');
 assert.equal(a.limb,'left');
 d.quick.preset='ladderCumulative';d.quick.movement='chute';d.quick.limb='both';
 a=add(d);
 assert.equal(a.quantity,220,'1, 12, 123... até o 10 completa 220 repetições por lado');
 assert.equal(a.pattern,'ladderCumulative');
 assert.equal(a.side,'each');
 const original=structuredClone(d);
 const session=save(d);
 assert.deepEqual(d,original,'save must never change the draft');
 assert.equal(session.activities.length,5);
 assert.equal(session.fastVersion,2);
 assert.ok(M.validArchive({sessions:[session],draft:null}));
 const replay=M.draftFromSession(session);
 assert.equal(replay.editingId,session.id);
 assert.equal(replay.quick.mode,'exhaustion');
 assert.deepEqual(replay.activities[2].pattern,'ladder');
 assert.equal(M.finishDraft(replay,TODAY).session.activities[2].quantity,55);
});

test('timed sequence stores ordered strikes, minutes and not invented strike counts',()=>{
 const d=academy();
 d.quick.mode='combination';
 d.quick.combo=['jab','direto','chute_d','cruzado','joelho_d'];
 d.quick.sequenceMinutes='5';
 const a=add(d);
 assert.equal(a.category,'combination');
 assert.equal(a.unit,'min');assert.equal(a.quantity,5);
 assert.deepEqual(a.combo,['jab','direto','chute_d','cruzado','joelho_d']);
 assert.match(a.name,/Jab.*Direto.*Chute direito.*Cruzado.*Joelho direito/);
 assert.equal(a.sets,'');
 assert.ok(M.validSession(save(d)));
 const invalid=academy();invalid.quick.mode='combination';invalid.quick.combo=[];
 assert.match(M.quickActivity(invalid.quick).error,/golpe/);
 invalid.quick.combo=['jab'];invalid.quick.sequenceMinutes='';
 assert.match(M.quickActivity(invalid.quick).error,/minutos/);
 invalid.quick.sequenceMinutes='5';invalid.quick.combo=['<img src=x>'];
 assert.equal(M.validQuick(invalid.quick),false);
});

test('sparring separates exchange format from allowed techniques and preserves round duration',()=>{
 const d=academy();d.quick.mode='sparring';
 d.quick.exchange='three';d.quick.rules='kicks';
 d.quick.rounds='4';d.quick.roundMinutes='3';d.quick.contact='technical';
 const a=add(d);
 assert.equal(a.name,'Sparring · 3 golpes · Boxe e chutes');
 assert.equal(a.category,'sparring');
 assert.equal(a.unit,'min');assert.equal(a.quantity,3);assert.equal(a.sets,4);
 assert.equal(a.rules,'kicks');assert.equal(a.exchange,'three');assert.equal(a.contact,'technical');
 assert.match(M.volumeText(a),/4 round\(s\) × 3 min/);
 assert.ok(M.validSession(save(d)));
 d.quick.exchange='free';d.quick.rules='boxing';
 const b=add(d);
 assert.match(b.name,/Livre · Somente boxe/);
 assert.equal(b.sets,4);
 const bad=academy();bad.quick.mode='sparring';bad.quick.rounds='';
 assert.match(M.quickActivity(bad.quick).error,/rounds/);
});

test('qualitative map exposure reads structured recorded actions, not old text guesses',()=>{
 const d=academy();
 d.quick.movement='chute';d.quick.preset='50';
 add(d);
 d.quick.mode='combination';d.quick.combo=['jab','direto','chute_d','cruzado','joelho_d'];
 add(d);
 d.quick.mode='sparring';d.quick.rules='boxing';d.quick.exchange='one';
 add(d);
 const saved=save(d);
 const original=structuredClone(saved);
 const legacy={...saved,id:'legacy',activities:[{...saved.activities[0],
    id:'free-text',name:'Exaustão de socos',movement:undefined,limb:undefined,pattern:undefined}]};
 const ex=M.exposure([saved,saved,legacy],TODAY,7);
 assert.equal(ex.sessions,1);
 assert.equal(ex.mappedActivities,3);
 assert.equal(ex.unclassifiedActivities,1);
 assert.ok(ex.byId.frontDelts);
 assert.ok(ex.byId.triceps);
 assert.ok(ex.byId.quadriceps);
 assert.ok(ex.byId.glutes);
 assert.ok(ex.byId.obliques);
 assert.equal(ex.byId.quadriceps.sessions,1);
 assert.equal(ex.byId.quadriceps.days,1);
 assert.equal(ex.byId.quadriceps.lastDay,TODAY);
 assert.deepEqual(saved,original,'exposure must be read-only');
 const model=MAP.model({sessions:[],muay:{sessions:[saved]}},TODAY,7);
 assert.equal(model.completedSessions,0,'Muay must not be counted as a strength session');
 assert.equal(model.byId.quadriceps.total,0,'kicks cannot become squat/strength sets');
 assert.equal(model.byId.frontDelts.total,0);
 assert.equal(model.muay.byId.quadriceps.sessions,1);
 const html=MAP.render({sessions:[],muay:{sessions:[saved]}},TODAY,{days:7,view:'front',selected:'quadriceps'});
 assert.match(html,/data-muay-exposure="true"/);
 assert.match(html,/Contorno violeta pontilhado/);
 assert.match(html,/Muay Thai · participação provável/);
 assert.match(html,/Nenhuma série classificada para esta região/);
 const older=M.exposure([saved], '2026-12-10', 7);
 assert.equal(older.mappedActivities,0);
});

test('markup is escaped and invalid structured activities are rejected',()=>{
 const d=academy();
 d.quick.mode='combination';d.quick.combo=['jab'];add(d);
 d.notes='<img src=x onerror=alert(1)>';
 const html=M.renderPage({sessions:[],draft:d},TODAY);
 assert.doesNotMatch(html,/<img src=x/);
 assert.match(html,/muay-academy-modes/);
 assert.match(html,/muay-strike-grid/);
 assert.match(html,/data-action="muay-quick-add"/);
 assert.match(html,/Blocos do treino/);
 const saved=save(d);
 const invalid=structuredClone(saved);
 invalid.activities[0].combo=['bad-golpe'];
 assert.equal(M.validSession(invalid),false);
 invalid.activities[0].combo=['jab'];
 invalid.activities[0].category='sparring';
 assert.equal(M.validSession(invalid),false);
});
