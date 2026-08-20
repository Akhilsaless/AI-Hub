import assert from 'node:assert/strict';
import {allLessons} from '../functions/lib/academy.js';
import {contentFor,contentStats} from '../functions/lib/academy-content.js';
const lessons=allLessons(),stats=contentStats();
assert.ok(lessons.length>=220,'deep curriculum must remain at least 220 activities');
assert.equal(stats.activities,lessons.length,'every activity needs content');
assert.equal(stats.withObjectives,lessons.length,'every activity needs a learning objective');
assert.equal(stats.withPractice,lessons.length,'every activity needs evidence-based practice');
assert.equal(stats.withMastery,lessons.length,'every activity needs mastery checks');
assert.ok(stats.estimatedMinutes>=2400,'core academy should contain at least 40 hours of planned learning');
for(const l of lessons){const c=contentFor(l.id);assert.ok(c.objective.length>30,`${l.id} objective too shallow`);assert.ok(c.explanation.length>180,`${l.id} explanation too shallow`);assert.ok(c.workedExample.length>60,`${l.id} needs a worked example`);assert.ok(c.practice.instruction.length>40,`${l.id} needs real practice`);assert.ok(c.tutorPrompts.length>=3,`${l.id} needs tutor prompts`);assert.ok(c.mastery.passScore>=80,`${l.id} mastery threshold too low`);}
for(const level of ['beginner','intermediate','advanced'])assert.ok(lessons.filter(x=>x.levelId===level&&x.capstone).length>=1,`${level} needs capstone content`);
console.log(`academy content gate: PASS (${stats.activities} activities, ${stats.estimatedMinutes} planned minutes)`);
