import test from 'node:test';
import assert from 'node:assert/strict';
import { modules } from '../src/content/modules.mjs';
import { lessons } from '../src/content/curriculum.mjs';
import { sources } from '../src/content/sources.mjs';
import { glossary, studyPlan, projectChecklist } from '../src/content/resources.mjs';

const lessonIds = lessons.map(lesson => lesson.id);
test('complete curriculum has exactly 16 ordered modules and 48 unique lessons', () => {
  assert.equal(modules.length, 16);
  assert.equal(lessons.length, 48);
  assert.equal(new Set(lessonIds).size, 48);
  assert.deepEqual(modules.flatMap(module => module.lessons), lessonIds);
  for (const module of modules) assert.equal(module.lessons.length, 3);
});

for (const lesson of lessons) {
  test(`complete original lesson: ${lesson.id}`, () => {
    for (const key of ['title', 'objective', 'prerequisite', 'example', 'outcome', 'advanced', 'accessNote']) {
      assert.equal(typeof lesson[key], 'string', `${key} missing`);
      assert.ok(lesson[key].length >= 20, `${key} too short`);
    }
    assert.ok(lesson.explanation.length >= 3);
    assert.ok(lesson.explanation.every(paragraph => paragraph.length > 100));
    assert.ok(lesson.steps.length >= 5);
    assert.ok(lesson.pitfalls.length >= 2);
    assert.ok(lesson.recap.length >= 3);
    assert.ok(lesson.quiz.length >= 2);
    assert.ok(lesson.minutes >= 5);
    assert.ok(['Free-account practice', 'Paid feature', 'Practice here without HubSpot'].includes(lesson.access));
    assert.ok(lesson.sources.length);
    for (const id of lesson.sources) assert.ok(sources[id], `Unknown source ${id}`);
    for (const question of lesson.quiz) {
      assert.equal(question.options.length, 3);
      assert.equal(new Set(question.options).size, 3);
      assert.ok(Number.isInteger(question.answer) && question.answer >= 0 && question.answer < 3);
      assert.ok(question.explanation.length >= 60, 'Answer must include a meaningful plain-English explanation');
    }
  });
}

test('every quiz is original to its lesson with an explained answer', () => {
  const questions = lessons.flatMap(lesson => lesson.quiz);
  assert.equal(questions.length, 96);
  assert.equal(new Set(questions.map(question => question.prompt)).size, 96);
});

test('references use official HTTPS documentation and disclose review method', () => {
  const hosts = new Set(['www.hubspot.com', 'knowledge.hubspot.com', 'academy.hubspot.com', 'developers.hubspot.com', 'legal.hubspot.com']);
  for (const source of Object.values(sources)) {
    const url = new URL(source.url);
    assert.equal(url.protocol, 'https:');
    assert.ok(hosts.has(url.hostname));
    assert.ok(source.review);
    assert.match(source.checked, /^\d{4}-\d{2}-\d{2}$/);
  }
});

test('30-day study plan covers every lesson and glossary links resolve', () => {
  assert.equal(studyPlan.length, 30);
  const planned = new Set(studyPlan.flatMap(day => day.lessons));
  assert.equal(planned.size, 48);
  for (const id of planned) assert.ok(lessonIds.includes(id));
  assert.ok(glossary.length >= 60);
  for (const term of glossary) assert.ok(lessonIds.includes(term.lesson));
  assert.equal(new Set(glossary.map(term => term.term)).size, glossary.length);
  assert.ok(projectChecklist.length >= 10);
});