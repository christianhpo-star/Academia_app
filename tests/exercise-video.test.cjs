'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const videos=require('../exercise-video.js');
function file(name,size,type){return {name,size,type};}
test('validates bounded user supplied video types',()=>{
 assert.equal(videos.validateFile(file('decline.mp4',1024*1024,'video/mp4')),null);
 assert.equal(videos.validateFile(file('squat.webm',1024*1024,'video/webm')),null);
 assert.match(videos.validateFile(file('photo.gif',2048,'image/gif')),/Formato/);
 assert.match(videos.validateFile(file('bad.mp4',2048,'video/webm')),/Formato/);
 assert.match(videos.validateFile(file('huge.mp4',50*1024*1024,'video/mp4')),/48 MB/);
 assert.match(videos.validateFile(file('tiny.mp4',10,'video/mp4')),/vazio/);
});
test('local media module has no upload or third party iframe',()=>{
 const source=require('node:fs').readFileSync(require('node:path').join(__dirname,'../exercise-video.js'),'utf8');
 assert.match(source,/indexedDB/);
 assert.doesNotMatch(source,/fetch\s*\(|XMLHttpRequest|sendBeacon\s*\(/);
 assert.doesNotMatch(source,/<iframe/);
 assert.equal(videos.storageName,'forja.exercise.video.v1');
});
