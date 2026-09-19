import assert from 'node:assert/strict';
import test from 'node:test';
import { assess, tailor, containsSkill, profileFits, safeUrl, profiles } from '../lib/model.ts';
const job = { id: 'test', title: 'Front-end Developer', company: 'Teste', tags: ['React', 'TypeScript'], description: 'React e TypeScript', role: 'Front-end', level: 'Júnior' };
test('unknown profile does not get a fabricated score', () => {
  assert.equal(assess(job, profiles[0]).score, null);
});
test('matching uses whole skills, accents and aliases without counting UI inside construir', () => {
  assert.equal(containsSkill('Construir interfaces', 'UI'), false);
  assert.equal(containsSkill('React Native, NODEJS, prototipacao', 'Node.js'), true);
  assert.equal(containsSkill('Prototipação', 'Prototipação'), true);
  const result = assess(job, { ...profiles[0], resume: 'Experiência com React.' });
  assert.equal(result.score, 50);
  assert.deepEqual(result.missing, ['TypeScript']);
});
test('tailored resume preserves source exactly and never inserts missing experience', () => {
  const original = 'Maria\nContato: maria@example.com\nEstágio: 2024 a 2025\nProjeto com React.\nFormação: Design.';
  const result = tailor(job, { ...profiles[0], name: 'Maria', resume: original });
  assert.ok(result.text.endsWith(original));
  assert.match(result.text, /OBJETIVO: Front-end Developer/);
  assert.equal(result.text.includes('TypeScript'), false);
  assert.deepEqual(result.missing, ['TypeScript']);
  assert.throws(() => tailor(job, profiles[0]), /currículo-base/);
});
test('Milena sees junior or unspecified design roles only', () => {
  assert.equal(profileFits({ ...job, role: 'UI/UX' }, profiles[1]), true);
  assert.equal(profileFits({ ...job, role: 'UI/UX', level: 'Sênior' }, profiles[1]), false);
  assert.equal(profileFits(job, profiles[1]), false);
  assert.equal(profileFits({ ...job, role: 'UI/UX', level: 'Não informada' }, profiles[1]), true);
});
test('external job links cannot execute scripts', () => {
  assert.equal(safeUrl('javascript:alert(1)'), '');
  assert.equal(safeUrl('data:text/html,hello'), '');
  assert.equal(safeUrl('https://example.com/jobs/1'), 'https://example.com/jobs/1');
});
