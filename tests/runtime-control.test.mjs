import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const registry = JSON.parse(fs.readFileSync('registry.yaml', 'utf8'));
const skillNames = fs
  .readdirSync('skills', { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && entry.name !== 'shared')
  .map((entry) => `forge-${entry.name}`)
  .sort();
const allowedExternalTargets = new Set(['human decision', 'runtime release execution', 'skill maintenance']);

test('registry covers every forge skill exactly once', () => {
  assert.deepEqual(
    registry.skills.map((skill) => skill.name).sort(),
    skillNames,
  );
});

test('runtime registry records static control-surface fields for every skill', () => {
  for (const skill of registry.skills) {
    assert.equal(skill.path, `skills/${skill.name.replace(/^forge-/, '')}/SKILL.md`);
    assert.ok(fs.existsSync(skill.path));
    for (const field of ['role', 'consumes', 'signals_in', 'signals_out', 'escalates_when', 'stage_next', 'feedback_to', 'quality_gates', 'signal_routes']) {
      assert.ok(skill[field], `${skill.name} missing ${field}`);
    }
    assert.ok(
      skill.produces || (skill.own_produces && skill.orchestrated_produces),
      `${skill.name} missing produces or split produces`,
    );
  }
});

test('typed registry edges only link known skills or allowed external targets', () => {
  const byName = Object.fromEntries(registry.skills.map((skill) => [skill.name, skill]));

  for (const skill of registry.skills) {
    for (const field of ['stage_next', 'feedback_to', 'quality_gates']) {
      assert.ok(Array.isArray(skill[field]), `${skill.name}.${field} must be an array`);
      for (const target of skill[field]) {
        assert.ok(byName[target], `${skill.name}.${field} references unknown skill ${target}`);
      }
    }
    assert.ok(Array.isArray(skill.signal_routes), `${skill.name}.signal_routes must be an array`);
    for (const route of skill.signal_routes) {
      assert.equal(typeof route.signal, 'string', `${skill.name}.signal_routes.signal must be a string`);
      assert.equal(typeof route.to, 'string', `${skill.name}.signal_routes.to must be a string`);
      assert.equal(typeof route.when, 'string', `${skill.name}.signal_routes.when must be a string`);
      assert.ok(byName[route.to] || allowedExternalTargets.has(route.to), `${skill.name}.signal_routes has unknown target ${route.to}`);
    }
    if (skill.external_downstream) {
      assert.ok(Array.isArray(skill.external_downstream), `${skill.name} external_downstream must be an array`);
    }
  }
});

test('typed signal routes cover goal verification loops', () => {
  const byName = Object.fromEntries(registry.skills.map((skill) => [skill.name, skill]));
  assert.ok(byName['forge-codegen'].signal_routes.some((route) => route.signal === 'goal not met' && route.to === 'forge-detail'));
  assert.ok(byName['forge-codegen'].signal_routes.some((route) => route.signal === 'goal conflict' && route.to === 'human decision'));
  assert.ok(byName['forge-review'].signal_routes.some((route) => route.signal === 'skill/document/code gap attribution' && route.to === 'forge-learn'));
});

test('runtime recovery blockers are encoded as registry signals', () => {
  const byName = Object.fromEntries(registry.skills.map((skill) => [skill.name, skill]));
  assert.ok(byName['forge-codegen'].escalates_when.includes('goal conflict'));
  assert.ok(byName['forge-codegen'].escalates_when.includes('3 corrections without convergence'));
  assert.ok(byName['forge-deploy'].escalates_when.includes('无回滚方案'));
});

test('runtime registry includes Change Unit and goal verification signals', () => {
  const signalIds = new Set(registry.signal_vocabulary.map((signal) => signal.id));
  for (const signalId of [
    'change_unit.created',
    'change_unit.updated',
    'goal_verification.completed',
  ]) {
    assert.ok(signalIds.has(signalId), `missing signal ${signalId}`);
  }

  const byName = Object.fromEntries(registry.skills.map((skill) => [skill.name, skill]));
  assert.ok(byName['forge-review'].signals_out.includes('goal_verification.completed'));
});

test('every skill declares Change Unit participation', () => {
  for (const skill of registry.skills) {
    const produces = skill.produces ?? [...(skill.own_produces ?? []), ...(skill.orchestrated_produces ?? [])];
    assert.ok(produces.includes('docs/change-units/CU-*.md'), `${skill.name} missing CU output`);
    assert.ok(skill.signals_out.includes('change_unit.updated'), `${skill.name} missing CU signal`);
  }
});

test('Change Unit protocol templates exist', () => {
  for (const file of [
    'skills/shared/change-unit-template.md',
    'skills/shared/goal-template.md',
  ]) {
    assert.ok(fs.existsSync(file), `${file} missing`);
  }
});

test('runtime control documentation defines goal verification model', () => {
  const doc = fs.readFileSync('docs/goal-verification.md', 'utf8');
  assert.match(doc, /skills 是协议节点/);
  assert.match(doc, /goal-refiner/);
  assert.match(doc, /executor/);
  assert.match(doc, /verifier/);
});
