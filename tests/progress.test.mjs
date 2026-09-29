import test from 'node:test';
import assert from 'node:assert/strict';
import '../src/core.js';
import { lessons } from '../src/content/curriculum.mjs';
const core=globalThis.LabCore;

function populated() {
  const state=core.blankState();
  state.completed=['what-is-crm'];
  state.bookmarks=['first-contact'];
  state.lastLesson='first-contact';
  state.notes['what-is-crm']='My own plain-English explanation.';
  const lesson=lessons[0],answers=lesson.quiz.map(question=>question.answer);
  state.quizzes[lesson.id]={answers,score:answers.length,attempts:1};
  for(const id of ['contact','import','segments','email','workflow','pipeline'])state.labs[id]=core.initialLab(id);
  return state;
}

test('blank learning record survives a complete round trip',()=>{
  assert.deepEqual(core.parseBackup(JSON.stringify(core.blankState()),lessons),core.blankState());
});
test('populated learning record round-trips all expected fields',()=>{
  const state=populated();
  state.project=[0,3];state.preferences={theme:'dark',motion:'off'};
  state.labs.segments.snapshot=['maya'];
  state.labs.workflow.runs=['eligible','blocked'];
  assert.deepEqual(core.parseBackup(JSON.stringify({...state,exportedAt:'2026-09-29T00:00:00Z'}),lessons),state);
});
test('rejects malformed JSON and files over one megabyte',()=>{
  assert.throws(()=>core.parseBackup('{broken',lessons),/valid JSON/);
  assert.throws(()=>core.parseBackup('x'.repeat(core.maxImportBytes+1),lessons),/smaller than 1 MB/);
});
test('rejects other applications, future schemas and unknown fields',()=>{
  for(const extra of [{format:'another-app'},{version:2},{unexpected:true}])assert.throws(()=>core.validateState({...populated(),...extra},lessons));
});
test('rejects unknown lesson identifiers and duplicate entries',()=>{
  assert.throws(()=>core.validateState({...populated(),completed:['not-a-lesson']},lessons));
  assert.throws(()=>core.validateState({...populated(),completed:['what-is-crm','what-is-crm']},lessons));
  assert.throws(()=>core.validateState({...populated(),lastLesson:'__proto__'},lessons));
});
test('validates nested lab enumerations and types before they reach a renderer',()=>{
  const cases=[['workflow','sampleId','unknown'],['segments','operator','XOR'],['pipeline','answer','javascript:'],['email','checklist',[99]],['contact','city',42],['segments','snapshot','maya']];
  for(const [id,key,value] of cases){const state=populated();state.labs[id][key]=value;assert.throws(()=>core.validateState(state,lessons));}
});
test('rejects inconsistent scores and invalid answer indices',()=>{
  const badScore=populated();badScore.quizzes['what-is-crm'].score=0;
  assert.throws(()=>core.validateState(badScore,lessons),/score/);
  const badAnswer=populated();badAnswer.quizzes['what-is-crm'].answers[0]=100;
  assert.throws(()=>core.validateState(badAnswer,lessons),/answers/);
});
test('bounds notes and rejects unexpected nested keys',()=>{
  const longNote=populated();longNote.notes['what-is-crm']='a'.repeat(4001);
  assert.throws(()=>core.validateState(longNote,lessons),/text/);
  const injected=JSON.stringify(populated()).replace('"notes":{','"notes":{"__proto__":{"polluted":true},');
  assert.throws(()=>core.parseBackup(injected,lessons),/unknown field/);
  assert.equal({}.polluted,undefined);
});
test('retains ordinary text including markup without interpreting it',()=>{
  const state=populated();state.notes['what-is-crm']='<img src=x onerror=alert(1)>';
  const clean=core.validateState(state,lessons);
  assert.equal(clean.notes['what-is-crm'],state.notes['what-is-crm']);
  assert.equal(core.escapeHTML(clean.notes['what-is-crm']),'&lt;img src=x onerror=alert(1)&gt;');
});
test('validation returns a detached allowlisted record',()=>{
  const state=populated(),clean=core.validateState(state,lessons);
  clean.completed.push('hubspot-hubs');clean.labs.segments.snapshot=['maya'];
  assert.equal(state.completed.length,1);assert.equal(state.labs.segments.snapshot,null);
});