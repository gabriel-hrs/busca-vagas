import assert from 'node:assert/strict';
const base = process.env.TEST_BASE_URL || 'http://localhost:3000';
const user = `qa-${Date.now()}`;
async function request(path, body, identity = user, extra = {}) {
  const response = await fetch(base + path, { method: body ? 'POST' : 'GET', headers: { 'oai-authenticated-user-id': identity, 'content-type': 'application/json', ...extra }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const text = await response.text();
  let data; try { data = JSON.parse(text); } catch { data = { error: text }; }
  return { status: response.status, data };
}
const initial = await request('/api/workspace');
assert.equal(initial.status, 200);
assert.equal(initial.data.profiles.length, 2);
const profile = { ...initial.data.profiles[0], resume: 'QA Teste. Desenvolvedor com experiência real em React e TypeScript. Formação em 2024.', skills: 'React, TypeScript' };
assert.equal((await request('/api/workspace', { type: 'profile', value: profile })).status, 200);
const reread = await request('/api/workspace');
assert.equal(reread.data.profiles[0].resume, profile.resume);
assert.equal((await request('/api/workspace', undefined, user + '-other')).data.profiles[0].resume, '');
const job = { title: 'QA Front-end React', company: 'QA Fictícia', description: 'Buscamos pessoa com React, TypeScript e Docker. Esta vaga é um teste técnico automatizado.', url: 'https://example.com/jobs/qa', mode: 'Remoto', role: 'Front-end', level: 'Júnior', salary: '' };
assert.equal((await request('/api/workspace', { type: 'job', value: { ...job, url: 'javascript:alert(1)' } })).status, 400);
assert.equal((await request('/api/workspace', { type: 'job', value: job }, user, { origin: 'https://untrusted.example' })).status, 403);
assert.equal((await request('/api/workspace', { type: 'job', value: job })).status, 200);
const added = (await request('/api/workspace')).data.jobs.find(j => j.title === job.title);
assert.ok(added);
const action = { saved: true, stage: 'Entrevista', notes: 'QA: conversar sobre equipe.' };
assert.equal((await request('/api/workspace', { type: 'action', key: `gabriel:${added.id}`, value: action })).status, 200);
assert.deepEqual((await request('/api/workspace')).data.actions[`gabriel:${added.id}`], action);
const resume = await request('/api/resume', { profileId: 'gabriel', jobId: added.id });
assert.equal(resume.status, 200);
assert.ok(resume.data.text.endsWith(profile.resume));
assert.ok(!resume.data.text.includes('Docker'));
assert.deepEqual(resume.data.missing, ['Docker']);
assert.equal((await request('/api/resume', { profileId: 'milena', jobId: added.id })).status, 400);
console.log('API checks passed: persistence, account isolation, URL validation, origin validation, manual import, pipeline and truthful resume adaptation.');
console.log(`QA records are isolated under ${user}; no real profiles were changed.`);
