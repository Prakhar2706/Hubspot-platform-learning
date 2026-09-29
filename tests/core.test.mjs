import test from 'node:test';
import assert from 'node:assert/strict';
import '../src/core.js';
import { lessons } from '../src/content/curriculum.mjs';
const core=globalThis.LabCore;

test('route parser handles shared lesson links and rejects malformed paths',()=>{
  assert.deepEqual(core.parseRoute('#/lesson/first-contact'),{page:'lesson',id:'first-contact'});
  assert.equal(core.parseRoute('#/missing').page,'missing');
  assert.equal(core.parseRoute('#/lesson/<img>').page,'missing');
  assert.equal(core.parseRoute('#/lesson/first-contact/extra').page,'missing');
  assert.equal(core.parseRoute('').page,'home');
});
test('escaping treats imported content as text',()=>{
  assert.equal(core.escapeHTML('<img src=x onerror="bad">'), '&lt;img src=x onerror=&quot;bad&quot;&gt;');
  assert.equal(core.escapeHTML("&'"),'&amp;&#39;');
});
test('search supports case-insensitive multiword matching and empty results',()=>{
  assert.ok(core.searchLessons(lessons,'WORKFLOW trigger').length>0);
  assert.equal(core.searchLessons(lessons,'zzznomatchzzz').length,0);
  assert.equal(core.searchLessons(lessons,' ').length,48);
});
test('AND and OR produce exact sample audiences; exclusions stay required',()=>{
  const settings={interest:'Design',city:'London',operator:'AND',subscribedOnly:false};
  assert.deepEqual(core.filterContacts(settings).map(person=>person.id),['maya','noah']);
  settings.operator='OR';
  assert.deepEqual(core.filterContacts(settings).map(person=>person.id),['maya','sam','leo','noah']);
  settings.subscribedOnly=true;
  assert.deepEqual(core.filterContacts(settings).map(person=>person.id),['maya','sam','leo']);
  settings.operator='AND';
  assert.deepEqual(core.filterContacts(settings).map(person=>person.id),['maya']);
});
test('static snapshot stays fixed when filters change',()=>{
  const settings={...core.initialLab('segments'),mode:'static',snapshot:['maya'],interest:'Writing',city:'Berlin'};
  assert.deepEqual(core.segmentMembers(settings).map(person=>person.id),['maya']);
  settings.mode='active';
  assert.deepEqual(core.segmentMembers(settings).map(person=>person.id),['nia']);
});
test('empty filters mean no restriction rather than accidentally matching every OR branch',()=>{
  assert.equal(core.filterContacts({interest:'',city:'',operator:'OR'}).length,6);
  assert.equal(core.filterContacts({interest:'Design',city:'',operator:'OR'}).length,3);
  assert.equal(core.filterContacts({interest:'',city:'London',operator:'AND'}).length,3);
});
test('mapping identifies each mismatch and a fully correct mapping',()=>{
  assert.ok(core.checkMapping({}).every(result=>!result.correct));
  assert.ok(core.checkMapping({given:'firstname',family:'lastname',email:'email',city:'city'}).every(result=>result.correct));
  assert.equal(core.checkMapping({given:'company',family:'lastname',email:'email',city:'city'}).filter(result=>result.correct).length,3);
});
test('contact challenge only accepts fictional .example addresses',()=>{
  assert.deepEqual(core.validateContact(core.initialLab('contact')),[]);
  assert.ok(core.validateContact({...core.initialLab('contact'),email:'person@real.com'}).length);
  assert.ok(core.validateContact({...core.initialLab('contact'),firstName:' '}).length);
});
test('email fallback handles whitespace and does not evaluate entered markup',()=>{
  assert.equal(core.emailGreeting('Maya','there'),'Hello Maya,');
  assert.equal(core.emailGreeting('  ','friend'),'Hello friend,');
  assert.equal(core.emailGreeting('',''),'Hello there,');
  assert.equal(core.emailGreeting('<script>','there'),'Hello <script>,');
});
test('workflow separates eligibility, suppression and non-enrollment',()=>{
  const config=core.initialLab('workflow');
  const results=Object.fromEntries(['maya','noah','leo'].map(id=>[id,core.simulateWorkflow(core.contacts.find(contact=>contact.id===id),config)]));
  assert.equal(results.maya.outcome,'eligible');
  assert.equal(results.noah.outcome,'blocked');
  assert.equal(results.leo.outcome,'not-enrolled');
  assert.ok(!results.noah.steps.some(step=>step.kind==='action'));
  assert.ok(!results.leo.steps.some(step=>step.kind==='action'));
});
test('pipeline aggregates won, lost and open values without duplicating deals',()=>{
  const settings=core.initialLab('pipeline');
  assert.equal(core.pipelineTotals(settings.stages).open,4500);
  settings.stages.cedar='Closed won';
  assert.deepEqual(core.pipelineTotals(settings.stages),{open:2100,won:2400,lost:0,openCount:2,wonCount:1});
  settings.stages.north='Closed lost';
  assert.deepEqual(core.pipelineTotals(settings.stages),{open:900,won:2400,lost:1200,openCount:1,wonCount:1});
});
test('sample CSV has six records and excludes consent claims',()=>{
  const csv=core.sampleCSV();
  assert.equal(csv.trim().split('\r\n').length,7);
  assert.ok(!csv.toLowerCase().includes('consent'));
  assert.match(core.csvCell('=1+1'),/^"'/);
});