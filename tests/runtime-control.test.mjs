import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const registry = JSON.parse(fs.readFileSync('registry.yaml', 'utf8'));
const skillNames = fs
  .readdirSync('skills', { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && entry.name.startsWith('forge-'))
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
    assert.equal(skill.path, `skills/${skill.name}/SKILL.md`);
    assert.ok(fs.existsSync(skill.path));
    for (const field of ['runtime_role', 'consumes', 'produces', 'signals_in', 'signals_out', 'escalates_when', 'stage_next', 'feedback_to', 'quality_gates', 'signal_routes']) {
      assert.ok(skill[field], `${skill.name} missing ${field}`);
    }
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

test('typed signal routes cover fast, middle, and slow deviation loops', () => {
  const byName = Object.fromEntries(registry.skills.map((skill) => [skill.name, skill]));
  assert.ok(byName['forge-codegen'].signal_routes.some((route) => route.signal === 'L1 deviation' && route.to === 'forge-detail'));
  assert.ok(byName['forge-codegen'].signal_routes.some((route) => route.signal === 'L2 drift' && route.to === 'human decision'));
  assert.ok(byName['forge-review'].signal_routes.some((route) => route.signal === 'document drift' && route.to === 'forge-detail'));
  assert.ok(byName['forge-review'].signal_routes.some((route) => route.signal === 'skill/document/code attribution' && route.to === 'forge-learn'));
});

test('runtime recovery blockers are encoded as registry signals', () => {
  const byName = Object.fromEntries(registry.skills.map((skill) => [skill.name, skill]));
  assert.ok(byName['forge-codegen'].escalates_when.includes('L2 drift'));
  assert.ok(byName['forge-deploy'].escalates_when.includes('无回滚方案'));
  assert.ok(byName['forge-learn'].avoid_when.includes('没有足够偏差证据'));
});

test('runtime control documentation rejects per-skill MAPE-K templating', () => {
  const doc = fs.readFileSync('docs/runtime-control-loop.md', 'utf8');
  assert.match(doc, /skills 是协议节点，不是控制系统本体/);
  assert.match(doc, /不校验每个 skill 是否有 MAPE-K 标题/);
});
