const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../muay.js');
const today='2026-11-02';
test('migração conserva sessões de musculação e começa sem Muay inventado',()=>{
  const state={sessions:[{id:'strength-real'}]};
  assert.equal(M.ensureArchive(state),true);
  assert.equal(M.ensureArchive(state),false);
  assert.equal(state.sessions[0].id,'strength-real');
  assert.deepEqual(state.muay.sessions,[]);
});
test('treino em casa pode ser registrado sem musculação e sem volumes presumidos',()=>{
  const draft=M.draft(today,'casa');
  draft.activities.push(M.activity('Polichinelos','reps'));
  draft.activities.push(M.activity('Sombra','rounds'));
  draft.duration='35'; draft.intensity='7';
  const {session,error}=M.finishDraft(draft,today);
  assert.equal(error,undefined);
  assert.equal(session.place,'casa');
  assert.equal(session.kind,'individual');
  assert.equal(session.activities.length,2);
  assert.equal(session.activities[0].quantity,null);
  assert.ok(M.validSession(session));
});
test('sessão sem exercício realizado não é salva',()=>{
  assert.ok(M.finishDraft(M.draft(today,'academia'),today).error);
});
test('data futura e quantidades inválidas são rejeitadas',()=>{
  let d=M.draft('2026-11-03');d.activities.push(M.activity('Afundos'));
  assert.ok(M.finishDraft(d,today).error);
  d.day=today;d.activities[0].sets='-1';
  assert.ok(M.finishDraft(d,today).error);
});
test('histórico inválido não é aceito no backup',()=>{
  assert.equal(M.validArchive({sessions:[{id:'sem-dados'}],draft:null}),false);
});
test('HTML em observações e nomes é escapado',()=>{
  const d=M.draft(today);
  d.notes='<img src=x onerror=alert(1)>';
  d.activities.push(M.activity('<script>alert(1)</script>'));
  const html=M.renderPage({sessions:[],draft:d},today);
  assert.equal(html.includes('<script>'),false);
  assert.equal(html.includes('<img'),false);
});
test('treino salvo pode ser reaberto para edição',()=>{
  const d=M.draft(today,'academia');d.activities.push(M.activity('Manoplas','rounds'));
  const {session}=M.finishDraft(d,today);
  const edited=M.draftFromSession(session);
  assert.equal(edited.editingId,session.id);
  assert.equal(edited.activities[0].quantity,'');
  assert.ok(M.validDraft(edited));
});

test('exaustão por perna registra 50 chutes para cada lado, sem converter em tempo',()=>{
 const d=M.draft(today,'casa');
 d.activities.push(M.activity('Chutes circulares','reps',{category:'exhaustion',side:'each',quantity:50}));
 d.activities.push(M.activity('Jab + direto + chute','min',{category:'combination',quantity:3}));
 d.intensity='7';d.fatigue='moderada';
 const result=M.finishDraft(d,today);
 assert.equal(result.error,undefined);
 assert.equal(result.session.activities[0].quantity,50);
 assert.equal(result.session.activities[0].side,'each');
 assert.equal(result.session.activities[0].category,'exhaustion');
 assert.equal(result.session.activities[1].unit,'min');
 assert.equal(result.session.activities[1].quantity,3);
 assert.match(M.volumeText(result.session.activities[0]),/50 repetições por lado/);
 assert.match(M.volumeText(result.session.activities[1]),/3 minutos/);
 assert.ok(M.validArchive({sessions:[result.session],draft:null}));
 const recovered=M.draftFromSession(result.session);
 assert.equal(recovered.activities[0].side,'each');
 assert.equal(recovered.activities[1].category,'combination');
});
test('dados antigos sem categoria ou lado permanecem válidos',()=>{
 const d=M.draft(today);
 d.activities.push(M.activity('Sombra','rounds'));
 const {session}=M.finishDraft(d,today);
 const older=structuredClone(session);
 delete older.activities[0].category;
 delete older.activities[0].side;
 assert.ok(M.validSession(older));
 assert.ok(M.validArchive({sessions:[older],draft:null}));
});
test('sugestão pós Muay distingue recuperação, técnica leve e ausência de evidência',()=>{
 const d=M.draft(today,'academia');
 d.activities.push(M.activity('Chutes','reps',{quantity:50,side:'each',category:'exhaustion'}));
 d.duration='50';d.intensity='8';d.fatigue='moderada';
 const {session}=M.finishDraft(d,today);
 const dayAfter='2026-11-03';
 const medium=M.readiness([session],dayAfter,{fatigue:'normal',kneePain:''});
 assert.equal(medium.level,'light');
 assert.match(medium.note,/técnica leve de braços/i);
 const high={...session,intensity:9,fatigue:'alta'};
 assert.equal(M.readiness([high],dayAfter).level,'rest');
 const knee={...session,kneePain:3};
 assert.equal(M.readiness([knee],dayAfter).level,'rest');
 const missing={...session,intensity:null,fatigue:''};
 assert.equal(M.readiness([missing],dayAfter).level,'unknown');
 assert.equal(M.readiness([],dayAfter).level,'unknown');
 const old={...session,day:'2026-10-20'};
 assert.equal(M.readiness([old],dayAfter).level,'unknown');
 assert.match(M.readinessCard(medium),/PRÓXIMA SESSÃO/);
});

test('registros antigos incompletos são sinalizados sem conversão automática',()=>{
 const old={
  activities:[{id:'old-chutes',name:'CHUTES',unit:'min',quantity:50,sets:2},
              {id:'old-sombra',name:'Sombra',unit:'min',quantity:null,sets:null}]
 };
 const before=structuredClone(old);
 const review=M.legacyReview(old);
 assert.equal(review.legacy,2);
 assert.equal(review.ambiguous,1);
 assert.equal(review.missing,1);
 assert.deepEqual(old,before);
 const fresh={activities:[M.activity('50 chutes por perna','reps',{category:'exhaustion',side:'each',quantity:50})]};
 assert.equal(M.legacyReview(fresh).legacy,0);
});
