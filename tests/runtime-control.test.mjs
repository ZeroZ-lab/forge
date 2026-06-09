import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { loadRegistry, deriveSignalVocabulary } from '../scripts/lib/registry.mjs';

const root = path.resolve(import.meta.dirname, '..');
const registry = loadRegistry(root);
const skillNames = fs
  .readdirSync('plugins/forge/skills', { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && entry.name !== 'shared')
  .map((entry) => entry.name)
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
    const skillDir = skill._dir ?? skill.name;
    const skillPath = `plugins/forge/skills/${skillDir}/SKILL.md`;
    assert.ok(fs.existsSync(skillPath));
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
  assert.ok(byName['codegen'].signal_routes.some((route) => route.signal === 'goal not met' && route.to === 'detail'));
  assert.ok(byName['codegen'].signal_routes.some((route) => route.signal === 'goal conflict' && route.to === 'human decision'));
});

test('runtime recovery blockers are encoded as registry signals', () => {
  const byName = Object.fromEntries(registry.skills.map((skill) => [skill.name, skill]));
  assert.ok(byName['codegen'].escalates_when.includes('goal conflict'));
  assert.ok(byName['codegen'].escalates_when.includes('3 corrections without convergence'));
  assert.ok(byName['deploy'].escalates_when.includes('无回滚方案'));
});

test('runtime registry includes Change Unit and goal verification signals', () => {
  const signalVocabulary = deriveSignalVocabulary(registry.skills);
  const signalIds = new Set(Object.keys(signalVocabulary));
  for (const signalId of [
    'change_unit.created',
    'change_unit.updated',
    'goal_verification.completed',
  ]) {
    assert.ok(signalIds.has(signalId), `missing signal ${signalId}`);
  }

  const byName = Object.fromEntries(registry.skills.map((skill) => [skill.name, skill]));
  assert.ok(byName['review'].signals_out.includes('goal_verification.completed'));
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
    'plugins/forge/skills/shared/change-unit-template.md',
    'plugins/forge/skills/shared/goal-template.md',
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
