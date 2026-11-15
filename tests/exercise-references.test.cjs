'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const ref=require('../exercise-references.js');
const data=require('../data.js');
const flex=require('../flex.js');
const ids=new Set([...data.exercises,...flex.catalog].map(e=>e.id));
test('curated external references match known catalogue IDs only',()=>{
 assert.ok(ref.count>=20);
 for(const id of ids){const x=ref.get(id);if(x){assert.equal(x.id,id);assert.match(x.url,/^https:\/\/fitlapse\.com\/en\/exercise\/[a-z0-9-]+\/$/);}}
 assert.equal(ref.has('unknown-exercise'),false);
 assert.equal(ref.get('unknown-exercise'),null);
});
test('links are external without embedding media or modifying data',()=>{
 const before=JSON.stringify(data.exercises);
 const html=ref.link('supino-canadense','Supino canadense');
 assert.match(html,/target="_blank"/);
 assert.match(html,/rel="noopener noreferrer"/);
 assert.doesNotMatch(html,/<(?:iframe|video|img|script)\b/i);
 assert.equal(JSON.stringify(data.exercises),before);
});
test('safe names are escaped and unknown exercises do not display false demos',()=>{
 assert.match(ref.link('supino-canadense','<img src=x onerror=alert(1)>'),/&lt;img/);
 assert.equal(ref.link('not-found','something'),'');
 assert.match(ref.get('supino-canadense').url,/barbell-decline-bench-press/);
});
