const test=require('node:test');
const assert=require('node:assert/strict');
const M=require('../body-measures.js');
test('valida aferições por data com 12 regiões, decimais e limites',()=>{
 const values={neck:43,chest:104,armRight:37,armLeft:37,forearmRight:30,forearmLeft:30,
   abdomen:91,hip:106,thighRight:66,thighLeft:67,calfRight:40,calfLeft:39};
 const result=M.upsert([],'2026-11-14',values);
 assert.equal(result.error,undefined);
 assert.equal(Object.keys(result.item.values).length,12);
 assert.equal(result.item.values.abdomen,91);
 assert.equal(result.item.values.thighRight,66);
 assert.equal(result.item.values.thighLeft,67);
 assert.ok(M.validRecords(result.items));
 assert.equal(M.validRecords(undefined),true);
 assert.equal(M.upsert([],'2026-02-30',values).error,'Data inválida.');
 assert.ok(M.upsert([],'2026-11-14',{chest:0}).error);
 assert.ok(M.upsert([],'2026-11-14',{chest:301}).error);
 assert.ok(M.upsert([],'2026-11-14',{}).error);
 assert.ok(!M.validRecords([{...result.item,values:{other:35}}]));
});
test('corrige data existente e não duplica medições da mesma data',()=>{
 const one=M.upsert([],'2026-11-14',{chest:104,abdomen:91}).items;
 const amended=M.upsert(one,'2026-11-14',{chest:104,abdomen:'90,5',hip:106}).items;
 assert.equal(amended.length,1);
 assert.equal(amended[0].id,one[0].id);
 assert.equal(amended[0].values.abdomen,90.5);
 const older=M.upsert([],'2026-11-07',{chest:103,abdomen:92}).items;
 const combined=M.merge(amended,[...one,...older]);
 assert.equal(combined.length,2);
 assert.equal(combined[0].values.abdomen,90.5);
 assert.equal(M.diff(combined[0],combined[1],'abdomen'),-1.5);
 assert.equal(M.diff(combined[0],combined[1],'neck'),null);
 assert.equal(M.recent(combined)[0].date,'2026-11-14');
 assert.equal(M.recent(combined)[1].date,'2026-11-07');
});
