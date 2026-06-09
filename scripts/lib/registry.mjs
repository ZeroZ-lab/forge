/**
 * registry.mjs — Shared utilities for reading skill metadata from SKILL.md YAML frontmatter.
 *
 * This module replaces the old registry.yaml file. Skills declare their metadata
 * in the YAML frontmatter block of each SKILL.md (between --- delimiters).
 * This module extracts and parses that frontmatter into JS objects.
 *
 * Zero external dependencies. Pure Node.js built-ins (fs, path).
 */

import fs from 'node:fs';
import path from 'node:path';

// ---------------------------------------------------------------------------
// 1. parseFrontmatter(text)
// ---------------------------------------------------------------------------

/**
 * Extract and parse YAML frontmatter from a Markdown string.
 *
 * Frontmatter is the text between the first pair of `---` delimiters.
 * The supported YAML subset is intentionally narrow:
 *
 *   - key: string_value          (quoted or unquoted strings)
 *   - key:                       followed by `- item` lines (arrays of strings)
 *   - key:                       followed by `- key: value` sequences
 *                                 (arrays of flat objects with string values)
 *   - key: true / false          (booleans)
 *
 * No nesting beyond one level. No numbers, no multiline strings, no anchors,
 * no flow sequences.
 *
 * @param {string} text — Full Markdown file content.
 * @returns {object|null} Parsed frontmatter as a plain JS object, or null if
 *   no frontmatter is found.
 */
export function parseFrontmatter(text) {
  // Match the opening --- (at line start, possibly with trailing whitespace)
  // through to the closing --- (also at line start).
  // We only capture the FIRST pair — files like frontend-design/SKILL.md
  // contain additional --- delimited blocks in their body.
  const match = text.match(/^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/);
  if (!match) return null;

  const body = match[1];
  return parseYamlSubset(body);
}

/**
 * Minimal YAML parser supporting the restricted subset described above.
 *
 * Lines are processed sequentially. Indentation is used to detect list items
 * and their children. The parser does NOT handle:
 *   - nested mappings beyond one level of depth
 *   - numeric values (everything non-boolean is a string)
 *   - flow syntax (inline arrays like [a, b])
 *   - multiline/block strings
 *   - anchors, aliases, tags
 */
function parseYamlSubset(text) {
  const result = {};
  const lines = text.split(/\r?\n/);

  /** Current top-level key being accumulated (for multi-line array values). */
  let currentKey = null;
  /** Are we inside an array for currentKey? */
  let inArray = false;
  /** Array items accumulated for currentKey. */
  let arrayItems = [];
  /** If the array contains objects (- key: value), track the current object. */
  let currentObj = null;
  /** Track whether the last line was a flat array item (- value). */
  let lastWasFlatItem = false;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];

    // Skip blank lines and comments
    if (/^\s*$/.test(raw) || /^\s*#/.test(raw)) continue;

    // Detect indented continuation lines that are properties of the current
    // array-of-objects item (e.g. "    to: detail" after "- signal: ...").
    // These are indented but do NOT start with "- ".
    if (currentKey !== null && inArray && currentObj && /^\s+\w[\w_-]*:\s*/.test(raw) && !/^\s*- /.test(raw)) {
      const propMatch = raw.match(/^\s+(\w[\w_-]*):\s*(.*)/);
      if (propMatch) {
        currentObj[propMatch[1]] = parseScalar(propMatch[2].trim());
        continue;
      }
    }

    // Detect indented continuation lines (part of an array block)
    if (currentKey !== null && /^\s+- /.test(raw)) {
      inArray = true;
      const itemContent = raw.replace(/^\s+- /, '').trim();

      // Check if the item itself is a key: value pair (object element)
      const objMatch = itemContent.match(/^(\w[\w_-]*):\s*(.*)/);
      if (objMatch) {
        // We are in an array-of-objects context
        if (lastWasFlatItem) {
          // Mixed — treat as string; push previous obj if any
          if (currentObj && Object.keys(currentObj).length > 0) {
            arrayItems.push(currentObj);
          }
          currentObj = null;
          arrayItems.push(itemContent);
        } else {
          // Start a new object — flush previous if any
          if (currentObj && Object.keys(currentObj).length > 0) {
            arrayItems.push(currentObj);
          }
          currentObj = {};
          const objKey = objMatch[1];
          const objVal = objMatch[2].trim();
          currentObj[objKey] = parseScalar(objVal);
        }
      } else {
        // Flat string item
        if (currentObj && Object.keys(currentObj).length > 0) {
          arrayItems.push(currentObj);
          currentObj = null;
        }
        lastWasFlatItem = true;
        arrayItems.push(parseScalar(itemContent));
      }
      continue;
    }

    // If we were building an array, flush it before processing a new top-level key
    if (currentKey !== null) {
      if (currentObj && Object.keys(currentObj).length > 0) {
        arrayItems.push(currentObj);
        currentObj = null;
      }
      result[currentKey] = arrayItems.length > 0 ? arrayItems : result[currentKey];
      currentKey = null;
      inArray = false;
      arrayItems = [];
      lastWasFlatItem = false;
    }

    // Top-level key: value line
    const kvMatch = raw.match(/^(\w[\w_-]*):\s*(.*)/);
    if (kvMatch) {
      const key = kvMatch[1];
      const val = kvMatch[2].trim();

      if (val === '') {
        // Value is empty — the next lines may be an array block.
        currentKey = key;
        arrayItems = [];
        currentObj = null;
        lastWasFlatItem = false;
      } else {
        result[key] = parseScalar(val);
      }
    }
  }

  // Flush any trailing array in progress
  if (currentKey !== null) {
    if (currentObj && Object.keys(currentObj).length > 0) {
      arrayItems.push(currentObj);
    }
    result[currentKey] = arrayItems.length > 0 ? arrayItems : result[currentKey];
  }

  return result;
}

/**
 * Parse a scalar YAML value (string, boolean, or empty array).
 * Unquoted strings are kept as-is. Booleans are converted.
 * Empty flow arrays "[]" are converted to empty arrays.
 * Quoted strings have quotes stripped.
 */
function parseScalar(val) {
  if (val === 'true') return true;
  if (val === 'false') return false;
  if (val === '[]') return [];
  // Strip surrounding quotes (single or double) if present
  if (
    (val.startsWith('"') && val.endsWith('"')) ||
    (val.startsWith("'") && val.endsWith("'"))
  ) {
    return val.slice(1, -1);
  }
  return val;
}

// ---------------------------------------------------------------------------
// 2. loadRegistry(rootDir)
// ---------------------------------------------------------------------------

/**
 * Scan plugins/forge/skills/* directories, read each SKILL.md, parse its
 * frontmatter, and return a registry object.
 *
 * The 'shared' directory is skipped — it contains templates and concepts,
 * not skill definitions.
 *
 * @param {string} rootDir — Absolute path to the Forge project root.
 * @returns {{ skills: Array<object> }} Registry with a skills array. Each
 *   skill object contains all frontmatter fields plus a `_dir` property with
 *   the skill directory name.
 */
export function loadRegistry(rootDir) {
  const skillsDir = path.join(rootDir, 'plugins', 'forge', 'skills');

  const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
  const skills = [];

  for (const entry of entries) {
    // Only process directories; skip the shared resource directory
    if (!entry.isDirectory()) continue;
    if (entry.name === 'shared') continue;

    const skillMdPath = path.join(skillsDir, entry.name, 'SKILL.md');
    if (!fs.existsSync(skillMdPath)) continue;

    const content = fs.readFileSync(skillMdPath, 'utf8');
    const frontmatter = parseFrontmatter(content);
    if (!frontmatter) continue;

    skills.push({
      _dir: entry.name,
      ...frontmatter,
    });
  }

  return { skills };
}

// ---------------------------------------------------------------------------
// 3. deriveSignalVocabulary(skills)
// ---------------------------------------------------------------------------

/**
 * Scan all skills' signals_in and signals_out to build a signal map.
 *
 * Each signal is identified by its string value. The resulting map records
 * which skills produce each signal and which skills consume it.
 *
 * @param {Array<object>} skills — Array of skill objects (as returned by
 *   loadRegistry). Each skill may have `signals_in` and/or `signals_out`
 *   fields (arrays of strings).
 * @returns {object} Map of signalId -> { producers: [...skillNames], consumers: [...skillNames] }
 */
export function deriveSignalVocabulary(skills) {
  const signalMap = {};

  for (const skill of skills) {
    const skillName = skill.name || skill._dir;

    // Record producers from signals_out
    if (Array.isArray(skill.signals_out)) {
      for (const signal of skill.signals_out) {
        if (!signalMap[signal]) {
          signalMap[signal] = { producers: [], consumers: [] };
        }
        signalMap[signal].producers.push(skillName);
      }
    }

    // Record consumers from signals_in
    if (Array.isArray(skill.signals_in)) {
      for (const signal of skill.signals_in) {
        if (!signalMap[signal]) {
          signalMap[signal] = { producers: [], consumers: [] };
        }
        signalMap[signal].consumers.push(skillName);
      }
    }
  }

  return signalMap;
}
