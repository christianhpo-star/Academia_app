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
