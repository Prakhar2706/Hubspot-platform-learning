import { modules } from './modules.mjs';
import { beginnerLessons } from './beginner.mjs';
import { marketingLessons } from './marketing.mjs';
import { salesServiceLessons } from './sales-service.mjs';
import { advancedLessons } from './advanced.mjs';

const authored = [...beginnerLessons, ...marketingLessons, ...salesServiceLessons, ...advancedLessons];
const byId = new Map(authored.map(lesson => [lesson.id, lesson]));
if (byId.size !== authored.length) throw new Error('Duplicate authored lesson identifiers');
export const lessons = modules.flatMap(module => module.lessons.map(id => {
  if (!byId.has(id)) throw new Error(`Missing lesson: ${id}`);
  return { ...byId.get(id), moduleId: module.id };
}));
if (lessons.length !== 48) throw new Error('The course must contain exactly 48 complete lessons');