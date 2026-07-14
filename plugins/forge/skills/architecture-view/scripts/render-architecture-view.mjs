#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const SKILL_DIR = path.resolve(import.meta.dirname, '..');
const DEFAULT_TEMPLATE = path.join(SKILL_DIR, 'assets', 'template.html');

const COVERAGE = [
  ['modules', '功能模块关系'],
  ['dataModels', '数据模型'],
  ['interfaces', '接口关系'],
  ['runtime', '运行链路'],
  ['deployment', '部署拓扑'],
];

const STABLE_HEADINGS = {
  moduleResponsibility: ['责任与不变量'],
  goalPointers: ['需要细节时'],
  dataModels: ['数据模型', '表清单'],
  interfaces: ['公共接口', '接口合约'],
  dependencies: ['依赖关系', '数据消费'],
  runtime: ['页面结构', '数据消费', '运行链路'],
  deployment: ['部署架构', '部署流程', '技术选型', 'Deploy 专属约束', '环境变量', '健康检查', '回滚'],
};

function assertFeatureIdentifier(feature) {
  if (typeof feature !== 'string' || feature.length === 0) {
    throw new Error('feature must be a single path segment');
  }

  let decodedFeature;
  try {
    decodedFeature = decodeURIComponent(feature);
  } catch {
    throw new Error('feature must be a single path segment');
  }

  for (const candidate of [feature, decodedFeature]) {
    if (
      candidate === '.' ||
      candidate === '..' ||
      candidate.includes('/') ||
      candidate.includes('\\') ||
      candidate.includes('\0') ||
      path.isAbsolute(candidate) ||
      path.win32.isAbsolute(candidate)
    ) {
      throw new Error('feature must be a single path segment');
    }
  }

  return feature;
}

export function parseArgs(argv) {
  const args = { feature: null, out: null, format: 'html', strict: false, root: process.cwd() };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--feature') {
      args.feature = argv[++index];
    } else if (arg === '--out') {
      args.out = argv[++index];
    } else if (arg === '--format') {
      args.format = argv[++index];
      if (!['html', 'json'].includes(args.format)) throw new Error('--format must be html or json');
    } else if (arg === '--strict') {
      args.strict = true;
    } else if (arg === '--root') {
      args.root = path.resolve(argv[++index]);
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }
  if (!args.feature) throw new Error('--feature is required');
  assertFeatureIdentifier(args.feature);
  return args;
}

function readDoc(root, relativePath, required = false) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    if (required) throw new Error(`${relativePath}: missing`);
    return null;
  }
  const text = fs.readFileSync(absolutePath, 'utf8');
  return parseMarkdown(relativePath, text);
}

function parseMarkdown(relativePath, text) {
  const lines = text.split(/\r?\n/);
  const headings = [];
  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/^(#{1,6})\s+(.+?)\s*$/);
    if (!match) continue;
    headings.push({
      level: match[1].length,
      title: match[2].trim(),
      index,
      line: index + 1,
    });
  }
  return { relativePath, text, lines, headings };
}

function findSections(doc, headingNames) {
  if (!doc) return [];
  const sections = [];
  for (let index = 0; index < doc.headings.length; index += 1) {
    const heading = doc.headings[index];
    if (!headingNames.some((name) => heading.title.includes(name))) continue;
    const next = doc.headings
      .slice(index + 1)
      .find((candidate) => candidate.level <= heading.level);
    const endIndex = next ? next.index : doc.lines.length;
    sections.push({
      doc,
      heading,
      contentLines: doc.lines.slice(heading.index + 1, endIndex),
      startLine: heading.line,
    });
  }
  return sections;
}

function sourceRef(section) {
  return {
    file: section.doc.relativePath,
    line: section.heading.line,
    heading: section.heading.title,
  };
}

function firstMeaningfulLine(lines) {
  return lines
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith('---') && !line.startsWith('```') && !/^\|[-:\s|]+\|$/.test(line));
}

function extractFences(section) {
  const fences = [];
  let active = null;
  for (let index = 0; index < section.contentLines.length; index += 1) {
    const line = section.contentLines[index];
    if (line.trim().startsWith('```')) {
      if (active) {
        active.endLine = section.heading.line + index + 1;
        fences.push(active);
        active = null;
      } else {
        active = { startLine: section.heading.line + index + 1, lines: [] };
      }
      continue;
    }
    if (active) active.lines.push(line);
  }
  return fences;
}

function extractTableRows(section) {
  return section.contentLines
    .map((line, offset) => ({ line, lineNumber: section.heading.line + offset + 1 }))
    .filter(({ line }) => /^\s*\|.*\|\s*$/.test(line))
    .filter(({ line }) => !/^\s*\|[-:\s|]+\|\s*$/.test(line))
    .map(({ line, lineNumber }) => ({
      cells: line.split('|').slice(1, -1).map((cell) => cell.trim()),
      lineNumber,
    }))
    .filter((row) => row.cells.length > 0 && !/^表名$|^#$/i.test(row.cells[0]));
}

function item(id, label, status, section, extra = {}) {
  return {
    id,
    label,
    status,
    detail: extra.detail ?? '',
    payload: extra.payload ?? '',
    sourceRefs: section ? [sourceRef(section)] : [],
  };
}

function parseGoalModulePointers(goalDoc) {
  const sections = findSections(goalDoc, STABLE_HEADINGS.goalPointers);
  const pointers = [];
  for (const section of sections) {
    for (let index = 0; index < section.contentLines.length; index += 1) {
      const line = section.contentLines[index];
      const matches = line.matchAll(/modules\/([A-Za-z0-9._-]+\.md)/g);
      for (const match of matches) {
        pointers.push({
          target: `modules/${match[1]}`,
          label: line.replace(/^[-*]\s*/, '').trim(),
          sourceRefs: [{
            file: section.doc.relativePath,
            line: section.heading.line + index + 1,
            heading: section.heading.title,
          }],
        });
      }
    }
  }
  return pointers;
}

function moduleLabel(relativePath) {
  return path.basename(relativePath, '.md');
}

function parseModuleItems(moduleDocs, goalPointers) {
  const existingTargets = new Set(moduleDocs.map((doc) => `modules/${path.basename(doc.relativePath)}`));
  const items = [];
  const edges = [];
  for (const doc of moduleDocs) {
    const title = doc.headings.find((heading) => heading.level === 1)?.title ?? moduleLabel(doc.relativePath);
    const responsibility = findSections(doc, STABLE_HEADINGS.moduleResponsibility)[0];
    const detail = responsibility ? firstMeaningfulLine(responsibility.contentLines)?.replace(/^[-*]\s*/, '') : '';
    items.push({
      id: `module:${moduleLabel(doc.relativePath)}`,
      label: title.replace(/\s*模块$/, ''),
      status: 'confirmed',
      detail: detail ?? '',
      payload: doc.relativePath,
      sourceRefs: responsibility ? [sourceRef(responsibility)] : [{
        file: doc.relativePath,
        line: doc.headings[0]?.line ?? 1,
        heading: doc.headings[0]?.title ?? title,
      }],
    });
    for (const section of findSections(doc, STABLE_HEADINGS.dependencies)) {
      for (const match of section.contentLines.join('\n').matchAll(/modules\/([A-Za-z0-9._-]+\.md)/g)) {
        edges.push({
          from: moduleLabel(doc.relativePath),
          to: path.basename(match[1], '.md'),
          status: 'confirmed',
          sourceRefs: [sourceRef(section)],
        });
      }
    }
  }
  for (const pointer of goalPointers) {
    if (existingTargets.has(pointer.target)) continue;
    items.push({
      id: `missing-module:${pointer.target}`,
      label: pointer.target,
      status: 'inferred',
      detail: 'goal.md points to this module, but the module file is missing.',
      payload: pointer.label,
      sourceRefs: pointer.sourceRefs,
    });
  }
  return { items, edges };
}

function parseDataModelItems(moduleDocs) {
  const items = [];
  for (const doc of moduleDocs) {
    for (const section of findSections(doc, STABLE_HEADINGS.dataModels)) {
      for (const fence of extractFences(section)) {
        const first = firstMeaningfulLine(fence.lines);
        if (!first) continue;
        const label = first.match(/^([A-Za-z0-9_ -]+)\s*:/)?.[1]?.trim() ?? first.slice(0, 80);
        items.push(item(`model:${doc.relativePath}:${label}`, label, 'confirmed', section, {
          detail: `Defined in ${doc.relativePath}`,
          payload: first,
        }));
      }
      for (const row of extractTableRows(section)) {
        const label = row.cells[0];
        if (!label || /^表名$|^层$/i.test(label)) continue;
        items.push(item(`table:${doc.relativePath}:${label}`, label, 'confirmed', section, {
          detail: row.cells.slice(1).join(' · '),
          payload: `line ${row.lineNumber}`,
        }));
      }
    }
  }
  return items;
}

function parseInterfaceItems(moduleDocs) {
  const items = [];
  for (const doc of moduleDocs) {
    for (const section of findSections(doc, STABLE_HEADINGS.interfaces)) {
      for (const fence of extractFences(section)) {
        const first = firstMeaningfulLine(fence.lines);
        if (!first) continue;
        items.push(item(`interface:${doc.relativePath}:${first}`, first, 'confirmed', section, {
          detail: `Contract from ${doc.relativePath}`,
          payload: first,
        }));
      }
    }
  }
  return items;
}

function parseRuntimeItems(moduleDocs) {
  const items = [];
  for (const doc of moduleDocs) {
    for (const section of findSections(doc, STABLE_HEADINGS.runtime)) {
      const firstFence = extractFences(section)[0];
      const firstLine = firstFence ? firstMeaningfulLine(firstFence.lines) : firstMeaningfulLine(section.contentLines);
      if (!firstLine) continue;
      items.push(item(`runtime:${doc.relativePath}:${section.heading.title}`, section.heading.title, 'confirmed', section, {
        detail: `Runtime-facing section in ${doc.relativePath}`,
        payload: firstLine.replace(/^[-*]\s*/, ''),
      }));
    }
  }
  return items;
}

function parseDeploymentItems(deployDoc, projectDoc) {
  const items = [];
  for (const doc of [deployDoc, projectDoc].filter(Boolean)) {
    for (const section of findSections(doc, STABLE_HEADINGS.deployment)) {
      const firstFence = extractFences(section)[0];
      const firstLine = firstFence ? firstMeaningfulLine(firstFence.lines) : firstMeaningfulLine(section.contentLines);
      if (!firstLine) continue;
      items.push(item(`deployment:${doc.relativePath}:${section.heading.title}`, section.heading.title, 'confirmed', section, {
        detail: `Deployment source in ${doc.relativePath}`,
        payload: firstLine.replace(/^[-*]\s*/, ''),
      }));
    }
  }
  return items;
}

function coverageRow(id, label, viewItems, context = {}) {
  const confirmed = viewItems.filter((entry) => entry.status === 'confirmed');
  if (confirmed.length > 0) {
    return {
      id,
      label,
      status: 'confirmed',
      summary: `${confirmed.length} source-backed item(s)`,
      sourceRefs: confirmed.flatMap((entry) => entry.sourceRefs).slice(0, 3),
    };
  }
  const inferred = viewItems.filter((entry) => entry.status === 'inferred');
  if (inferred.length > 0) {
    return {
      id,
      label,
      status: 'inferred',
      summary: `${inferred.length} inferred gap(s) from goal pointers`,
      sourceRefs: inferred.flatMap((entry) => entry.sourceRefs).slice(0, 3),
    };
  }
  return {
    id,
    label,
    status: context.notApplicable ? 'not_applicable' : 'missing',
    summary: context.notApplicable ? 'No source signal found for this view' : 'Expected stable section not found',
    sourceRefs: [],
  };
}

function collectSources(docs) {
  return docs.filter(Boolean).map((doc) => ({
    file: doc.relativePath,
    line: 1,
    heading: doc.headings[0]?.title ?? path.basename(doc.relativePath),
  }));
}

function assertConfirmedSources(viewModel) {
  const allItems = Object.values(viewModel.views).flatMap((view) => view.items ?? []);
  const missing = allItems.filter((entry) => entry.status === 'confirmed' && entry.sourceRefs.length === 0);
  if (missing.length > 0) {
    throw new Error(`confirmed items missing sourceRefs: ${missing.map((entry) => entry.id).join(', ')}`);
  }
}

export function buildViewModel({ root = process.cwd(), feature, generatedAt = new Date().toISOString() }) {
  const featureIdentifier = assertFeatureIdentifier(feature);
  const featureDir = `docs/features/${featureIdentifier}`;
  const goalDoc = readDoc(root, `${featureDir}/goal.md`, true);
  const projectDoc = readDoc(root, 'docs/project.md');
  const deployDoc = readDoc(root, `${featureDir}/deploy/plan.md`);
  const modulesDir = path.join(root, featureDir, 'modules');
  const moduleDocs = fs.existsSync(modulesDir)
    ? fs.readdirSync(modulesDir)
      .filter((file) => file.endsWith('.md'))
      .sort()
      .map((file) => readDoc(root, `${featureDir}/modules/${file}`))
      .filter(Boolean)
    : [];

  const goalPointers = parseGoalModulePointers(goalDoc);
  const modules = parseModuleItems(moduleDocs, goalPointers);
  const dataModels = { items: parseDataModelItems(moduleDocs) };
  const interfaces = { items: parseInterfaceItems(moduleDocs) };
  const runtime = { items: parseRuntimeItems(moduleDocs) };
  const deployment = { items: parseDeploymentItems(deployDoc, projectDoc) };

  const views = {
    modules,
    dataModels,
    interfaces,
    runtime,
    deployment,
  };
  const coverage = COVERAGE.map(([id, label]) => coverageRow(id, label, views[id].items ?? [], {
    notApplicable:
      (id === 'deployment' && !deployDoc && deployment.items.length === 0) ||
      (id === 'runtime' && runtime.items.length === 0),
  }));
  const viewModel = {
    schemaVersion: 1,
    feature: featureIdentifier,
    generatedAt,
    sources: collectSources([goalDoc, ...moduleDocs, deployDoc, projectDoc]),
    coverage,
    views,
  };
  assertConfirmedSources(viewModel);
  return viewModel;
}

function escapeJsonForHtml(value) {
  return JSON.stringify(value, null, 2).replaceAll('</', '<\\/');
}

export function renderHtml(viewModel, templatePath = DEFAULT_TEMPLATE) {
  const template = fs.readFileSync(templatePath, 'utf8');
  return template.replace('__ARCHITECTURE_VIEW_DATA__', escapeJsonForHtml(viewModel));
}

function writeOutput(outPath, content) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, content);
}

export function runCli(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const viewModel = buildViewModel({ root: args.root, feature: args.feature });
  if (args.strict) assertConfirmedSources(viewModel);
  const content = args.format === 'json'
    ? `${JSON.stringify(viewModel, null, 2)}\n`
    : renderHtml(viewModel);
  const defaultOut = args.format === 'html'
    ? `.forge/architecture-views/${args.feature}/index.html`
    : null;
  const outPath = args.out ?? defaultOut;
  if (outPath) {
    writeOutput(path.resolve(args.root, outPath), content);
    return path.resolve(args.root, outPath);
  }
  process.stdout.write(content);
  return null;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const written = runCli();
    if (written) console.log(written);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
