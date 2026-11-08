const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../calendar.js');

test('datas reais, fevereiro bissexto e meses de virada',()=>{
  assert.equal(C.validDay('2024-02-29'),true);
  assert.equal(C.validDay('2026-02-30'),false);
  assert.equal(C.validDay('2026-13-01'),false);
  assert.equal(C.shiftMonth('2026-12',1),'2027-01');
  assert.equal(C.shiftMonth('2026-01',-1),'2025-12');
});
test('mes inclui ambos os tipos e conta um dia ativo sem duplicar',()=>{
  const strength=[{day:'2026-11-08',planId:'B',entries:[]},{day:'2026-11-08',planId:'A',entries:[]},{day:'2026-10-30',planId:'C'}];
  const muay=[{day:'2026-11-08',kind:'individual',activities:[]},{day:'2026-11-09',kind:'aula',activities:[]}];
  const data=C.collect(strength,muay,'2026-11');
  assert.equal(data.daysActive,2);
  assert.equal(data.strengthCount,2);
  assert.equal(data.muayCount,2);
  assert.equal(data.total,4);
  assert.equal(data.byDay['2026-11-08'].length,3);
});
test('calendario do mes vazio nao inventa atividades',()=>{
  const html=C.render({strengthSessions:[],muaySessions:[],month:'2026-11',today:'2026-11-08'});
  assert.match(html,/Nenhum treino salvo neste mês/);
  assert.match(html,/0<\/strong><span>dias ativos/);
  assert.match(html,/Selecionar|Nenhum treino concluído/);
  assert.equal((html.match(/data-action="calendar-select"/g)||[]).length,30);
});
test('detalhes exibem exercicios e modalidades do mesmo dia com escape HTML',()=>{
  const html=C.render({today:'2026-11-08',month:'2026-11',selectedDay:'2026-11-08',
    plans:[{id:'A',title:'Costas'}],exercises:[{id:'ex1',name:'<img src=x>'}],
    strengthSessions:[{day:'2026-11-08',planId:'A',entries:[{id:'ex1'}]}],
    muaySessions:[{day:'2026-11-08',kind:'individual',place:'casa',activities:[{name:'Polichinelos'}]}]});
  assert.match(html,/2 sessões salvas/);
  assert.match(html,/Polichinelos/);
  assert.match(html,/&lt;img src=x&gt;/);
  assert.doesNotMatch(html,/<img src=x>/);
  assert.match(html,/calendar-dot--muay/);
  assert.match(html,/calendar-dot--strength/);
});
test('meses anteriores iniciam na ultima data registrada e opcao de retorno',()=>{
  const html=C.render({today:'2026-11-08',month:'2026-10',
    strengthSessions:[{day:'2026-10-30',planId:'D',entries:[]}]});
  assert.match(html,/Mês atual/);
  assert.match(html,/30 de outubro de 2026/);
});
