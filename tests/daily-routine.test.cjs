const test=require('node:test'),assert=require('node:assert/strict');
const R=require('../daily-routine.js');
const DAY='2026-11-15';
const at='2026-11-15T12:30:00.000Z';
function configure(){
 const base=R.defaults();
 const out=R.configure(base,{
   medication:{label:'Medicamento de teste',time:'08:00',active:true},
   supplement:{label:'Suplemento de teste',time:'09:30',active:true}
 });
 assert.ok(out.archive,JSON.stringify(out));
 return out.archive;
}
test('empty routine defaults to disabled, with no assumed consumption',()=>{
 const d=R.defaults();
 assert.equal(R.valid(d),true);
 assert.equal(R.valid(undefined),true); // old FORJA backups
 assert.equal(R.status(d,DAY).configured,false);
 assert.deepEqual(R.status(d,DAY).items,[]);
 assert.deepEqual(d.records,[]);
});
test('user configuration stores names and reference times, no dose and no alert scheduler',()=>{
 const d=configure();
 assert.equal(d.enabled,true);
 assert.equal(R.valid(d),true);
 assert.equal(d.slots[0].time,'08:00');
 assert.ok(!JSON.stringify(d).includes('dose'));
 const view=R.status(d,DAY);
 assert.equal(view.configured,true);
 assert.equal(view.items.length,2);
 assert.ok(view.items.every(x=>x.confirmed===false));
 assert.equal(d.records.length,0);
});
test('explicit confirm, undo and separate days preserve exact record histories',()=>{
 let d=configure();
 let out=R.toggleRecord(d,'medication',DAY,at);
 assert.equal(out.confirmed,true);
 d=out.archive;
 assert.equal(d.records.length,1);
 assert.equal(R.status(d,DAY).items[0].confirmed,true);
 assert.equal(R.status(d,'2026-11-16').items[0].confirmed,false);
 assert.equal(R.status(d,DAY).items[1].confirmed,false);
 out=R.toggleRecord(d,'medication',DAY,at);
 assert.equal(out.confirmed,false);
 assert.equal(out.archive.records.length,0);
 out=R.toggleRecord(out.archive,'supplement','2026-11-16',at);
 assert.equal(out.archive.records.length,1);
 assert.equal(out.archive.records[0].slotId,'supplement');
});
test('disabled mode suppresses confirmations but preserves history',()=>{
 const d=R.toggleRecord(configure(),'medication',DAY,at).archive;
 const off=R.setEnabled(d,false).archive;
 assert.equal(off.enabled,false);
 assert.deepEqual(off.records,d.records);
 assert.equal(R.status(off,DAY).configured,false);
 assert.deepEqual(R.status(off,DAY).items,[]);
 assert.ok(R.toggleRecord(off,'medication',DAY,at).error);
 assert.equal(R.setEnabled(off,true).archive.enabled,true);
});
test('reject invalid name, time, dates, unknown slots and malformed records',()=>{
 const d=R.defaults();
 assert.ok(R.configure(d,{medication:{label:'A',time:'99:00',active:true},supplement:{label:'B',time:'',active:true}}).error);
 assert.ok(R.configure(d,{medication:{label:'A'.repeat(81),time:'08:00',active:true},supplement:{label:'B',time:'',active:true}}).error);
 assert.ok(R.setEnabled(d,true).error);
 assert.ok(R.toggleRecord(configure(),'other',DAY,at).error);
 assert.ok(R.toggleRecord(configure(),'medication','2026-02-30',at).error);
 const bad=configure();
 bad.records.push({id:'fake',date:DAY,slotId:'medication',status:'confirmed',recordedAt:at});
 assert.equal(R.valid(bad),false);
});
test('backup merging keeps current configuration and de-duplicates dated records',()=>{
 const current=R.toggleRecord(configure(),'medication',DAY,at).archive;
 const older=R.toggleRecord(configure(),'supplement','2026-11-14',at).archive;
 older.slots[0].label='Nome antigo';
 const merged=R.merge(current,older);
 assert.equal(merged.slots[0].label,'Medicamento de teste');
 assert.equal(merged.records.length,2);
 assert.deepEqual(R.merge(merged,older),merged);
 assert.deepEqual(R.merge(undefined,older),older);
 assert.equal(R.merge(merged,undefined).records.length,2);
});
test('save of an empty configuration leaves reminders disabled, no false positives',()=>{
 const d=R.configure(R.defaults(),{
  medication:{label:'',time:'',active:true},supplement:{label:'',time:'',active:true}
 });
 assert.ok(d.archive);
 assert.equal(d.archive.enabled,false);
 assert.equal(d.archive.records.length,0);
});
