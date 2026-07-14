function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function escapePointer(value) {
  return String(value).replaceAll('~', '~0').replaceAll('/', '~1');
}

function childPath(parent, child) {
  return parent === '' ? `/${escapePointer(child)}` : `${parent}/${escapePointer(child)}`;
}

function issue(path, code, message) {
  return { path, code, message };
}

function resolveLocalRef(rootSchema, reference) {
  if (typeof reference !== 'string' || !reference.startsWith('#/')) return undefined;
  let value = rootSchema;
  for (const encodedSegment of reference.slice(2).split('/')) {
    const segment = encodedSegment.replaceAll('~1', '/').replaceAll('~0', '~');
    if (!value || typeof value !== 'object' || !Object.hasOwn(value, segment)) return undefined;
    value = value[segment];
  }
  return value;
}

const SUPPORTED_JSON_SCHEMA_KEYWORDS = new Set([
  '$schema',
  '$id',
  '$ref',
  '$defs',
  'title',
  'description',
  'type',
  'additionalProperties',
  'required',
  'properties',
  'const',
  'enum',
  'minLength',
  'pattern',
  'format',
  'minimum',
  'minItems',
  'maxItems',
  'uniqueItems',
  'items',
  'contains',
  'minContains',
  'allOf',
  'anyOf',
  'oneOf',
  'if',
  'then',
  'else',
  'not',
]);

function isSchema(value) {
  return value === true || value === false || isPlainObject(value);
}

function inspectSchemaNode(schema, path, issues, nodes) {
  if (schema === true || schema === false) return;
  if (!isPlainObject(schema)) {
    issues.push(`${path} must be a schema object or boolean`);
    return;
  }
  nodes.set(schema, path);

  for (const [keyword, value] of Object.entries(schema)) {
    const keywordPath = `${path}/${escapePointer(keyword)}`;
    if (!SUPPORTED_JSON_SCHEMA_KEYWORDS.has(keyword)) {
      issues.push(`${keywordPath} is unsupported`);
      continue;
    }

    if (['$schema', '$id', 'title', 'description'].includes(keyword)) {
      if (typeof value !== 'string') issues.push(`${keywordPath} must be a string`);
    } else if (keyword === '$ref') {
      if (typeof value !== 'string' || !value.startsWith('#/')) {
        issues.push(`${keywordPath} must be a local JSON Pointer reference`);
      }
    } else if (keyword === 'type') {
      if (!['object', 'array', 'string', 'integer', 'number', 'boolean', 'null'].includes(value)) {
        issues.push(`${keywordPath} uses unsupported value ${JSON.stringify(value)}`);
      }
    } else if (keyword === 'additionalProperties') {
      if (typeof value !== 'boolean' && !isPlainObject(value)) {
        issues.push(`${keywordPath} must be a boolean or schema`);
      } else if (isPlainObject(value)) {
        inspectSchemaNode(value, keywordPath, issues, nodes);
      }
    } else if (keyword === 'required') {
      if (
        !Array.isArray(value) ||
        !value.every((field) => typeof field === 'string') ||
        new Set(value).size !== value.length
      ) {
        issues.push(`${keywordPath} must be an array of unique strings`);
      }
    } else if (keyword === 'properties' || keyword === '$defs') {
      if (!isPlainObject(value)) {
        issues.push(`${keywordPath} must be an object`);
      } else {
        for (const [name, child] of Object.entries(value)) {
          inspectSchemaNode(child, `${keywordPath}/${escapePointer(name)}`, issues, nodes);
        }
      }
    } else if (keyword === 'enum') {
      if (
        !Array.isArray(value) ||
        value.length === 0 ||
        value.some((item, index) => value.slice(0, index).some((prior) => sameValue(item, prior)))
      ) {
        issues.push(`${keywordPath} must be a non-empty array of unique values`);
      }
    } else if (['minLength', 'minItems', 'maxItems', 'minContains'].includes(keyword)) {
      if (!Number.isInteger(value) || value < 0) {
        issues.push(`${keywordPath} must be a non-negative integer`);
      }
    } else if (keyword === 'minimum') {
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        issues.push(`${keywordPath} must be a finite number`);
      }
    } else if (keyword === 'uniqueItems') {
      if (typeof value !== 'boolean') issues.push(`${keywordPath} must be a boolean`);
    } else if (keyword === 'pattern') {
      if (typeof value !== 'string') {
        issues.push(`${keywordPath} must be a string`);
      } else {
        try {
          new RegExp(value);
        } catch {
          issues.push(`${keywordPath} must be a valid regular expression`);
        }
      }
    } else if (keyword === 'format') {
      if (value !== 'date-time') {
        issues.push(`${keywordPath} uses unsupported value ${JSON.stringify(value)}`);
      }
    } else if (['items', 'contains', 'if', 'then', 'else', 'not'].includes(keyword)) {
      if (!isSchema(value)) {
        issues.push(`${keywordPath} must be a schema`);
      } else {
        inspectSchemaNode(value, keywordPath, issues, nodes);
      }
    } else if (['allOf', 'anyOf', 'oneOf'].includes(keyword)) {
      if (!Array.isArray(value) || value.length === 0) {
        issues.push(`${keywordPath} must be a non-empty schema array`);
      } else {
        value.forEach((child, index) => {
          inspectSchemaNode(child, `${keywordPath}/${index}`, issues, nodes);
        });
      }
    }
  }
}

export function inspectJsonSchemaSupport(schema) {
  const issues = [];
  const nodes = new Map();
  inspectSchemaNode(schema, '#', issues, nodes);

  for (const [node, path] of nodes) {
    if (!Object.hasOwn(node, '$ref')) continue;
    const target = resolveLocalRef(schema, node.$ref);
    if (!isSchema(target)) {
      issues.push(`${path}/$ref does not resolve to a local schema`);
    } else if (isPlainObject(target) && !nodes.has(target)) {
      inspectSchemaNode(target, `${path}/$ref-target`, issues, nodes);
    }
  }

  const states = new Map();
  function sameInstanceChildren(node) {
    if (!isPlainObject(node)) return [];
    const children = [];
    if (Object.hasOwn(node, '$ref')) {
      const target = resolveLocalRef(schema, node.$ref);
      if (isPlainObject(target)) children.push({ node: target, path: `${nodes.get(node)}/$ref` });
    }
    for (const keyword of ['allOf', 'anyOf', 'oneOf']) {
      const branches = Array.isArray(node[keyword]) ? node[keyword] : [];
      for (const [index, child] of branches.entries()) {
        if (isPlainObject(child)) {
          children.push({ node: child, path: `${nodes.get(node)}/${keyword}/${index}` });
        }
      }
    }
    for (const keyword of ['if', 'then', 'else', 'not']) {
      if (isPlainObject(node[keyword])) {
        children.push({ node: node[keyword], path: `${nodes.get(node)}/${keyword}` });
      }
    }
    for (const [name, child] of Object.entries(node.properties ?? {})) {
      if (isPlainObject(child)) {
        children.push({
          node: child,
          path: `${nodes.get(node)}/properties/${escapePointer(name)}`,
        });
      }
    }
    for (const keyword of ['additionalProperties', 'items', 'contains']) {
      if (isPlainObject(node[keyword])) {
        children.push({ node: node[keyword], path: `${nodes.get(node)}/${keyword}` });
      }
    }
    return children;
  }

  function inspectCycles(node) {
    if (!isPlainObject(node)) return;
    if (states.get(node) === 2) return;
    if (states.get(node) === 1) return;
    states.set(node, 1);
    for (const child of sameInstanceChildren(node)) {
      if (states.get(child.node) === 1) {
        issues.push(`${child.path} participates in a cyclic local $ref evaluation`);
      } else {
        inspectCycles(child.node);
      }
    }
    states.set(node, 2);
  }

  for (const node of nodes.keys()) inspectCycles(node);
  return [...new Set(issues)].sort();
}

function matchesType(value, type) {
  if (type === 'object') return isPlainObject(value);
  if (type === 'array') return Array.isArray(value);
  if (type === 'string') return typeof value === 'string';
  if (type === 'integer') return Number.isInteger(value);
  if (type === 'number') return typeof value === 'number' && Number.isFinite(value);
  if (type === 'boolean') return typeof value === 'boolean';
  if (type === 'null') return value === null;
  return false;
}

function isRealUtcDateTime(value) {
  if (typeof value !== 'string') return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?Z$/.exec(value);
  if (!match) return false;
  const [, yearText, monthText, dayText, hourText, minuteText, secondText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const monthLengths = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return (
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= monthLengths[month - 1] &&
    hour <= 23 &&
    minute <= 59 &&
    second <= 59
  );
}

function sameValue(left, right) {
  if (left === right) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    return (
      Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((value, index) => sameValue(value, right[index]))
    );
  }
  if (!isPlainObject(left) || !isPlainObject(right)) return false;
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();
  return (
    leftKeys.length === rightKeys.length &&
    leftKeys.every(
      (key, index) => key === rightKeys[index] && sameValue(left[key], right[key]),
    )
  );
}

function hasMinimumCodePoints(value, minimum) {
  if (minimum === 0) return true;
  let count = 0;
  for (const _character of value) {
    count += 1;
    if (count >= minimum) return true;
  }
  return false;
}

function validateNode(value, schema, rootSchema, path) {
  if (schema === true) return [];
  if (schema === false) return [issue(path, 'false_schema', 'value is forbidden')];
  if (!isPlainObject(schema)) return [issue(path, 'invalid_schema', 'schema node must be an object')];

  const issues = [];
  if (Object.hasOwn(schema, '$ref')) {
    const target = resolveLocalRef(rootSchema, schema.$ref);
    if (!isSchema(target)) {
      issues.push(issue(path, 'invalid_schema_ref', `unresolved local $ref ${schema.$ref}`));
    } else {
      issues.push(...validateNode(value, target, rootSchema, path));
    }
  }

  if (Object.hasOwn(schema, 'const') && !sameValue(value, schema.const)) {
    issues.push(issue(path, 'const', `must equal ${JSON.stringify(schema.const)}`));
  }
  if (Array.isArray(schema.enum) && !schema.enum.some((candidate) => sameValue(value, candidate))) {
    issues.push(issue(path, 'enum', `must be one of ${schema.enum.map(String).join(', ')}`));
  }

  if (Array.isArray(schema.anyOf)) {
    const branches = schema.anyOf.map((branch) => validateNode(value, branch, rootSchema, path));
    if (!branches.some((branchIssues) => branchIssues.length === 0)) {
      issues.push(issue(path, 'any_of', 'must match at least one allowed shape'));
      const minimum = Math.min(...branches.map((branchIssues) => branchIssues.length));
      for (const branchIssues of branches.filter((candidate) => candidate.length === minimum)) {
        issues.push(...branchIssues);
      }
    }
  }
  if (Array.isArray(schema.oneOf)) {
    const branches = schema.oneOf.map((branch) => validateNode(value, branch, rootSchema, path));
    const matches = branches.filter((branchIssues) => branchIssues.length === 0);
    if (matches.length !== 1) {
      issues.push(issue(path, 'one_of', 'must match exactly one allowed shape'));
      if (matches.length === 0) {
        const minimum = Math.min(...branches.map((branchIssues) => branchIssues.length));
        for (const branchIssues of branches.filter((candidate) => candidate.length === minimum)) {
          issues.push(...branchIssues);
        }
      }
    }
  }
  for (const branch of schema.allOf ?? []) {
    issues.push(...validateNode(value, branch, rootSchema, path));
  }

  if (Object.hasOwn(schema, 'if')) {
    const conditionMatches = validateNode(value, schema.if, rootSchema, path).length === 0;
    if (conditionMatches && Object.hasOwn(schema, 'then')) {
      issues.push(...validateNode(value, schema.then, rootSchema, path));
    } else if (!conditionMatches && Object.hasOwn(schema, 'else')) {
      issues.push(...validateNode(value, schema.else, rootSchema, path));
    }
  }
  if (Object.hasOwn(schema, 'not') && validateNode(value, schema.not, rootSchema, path).length === 0) {
    const forbiddenFields = Array.isArray(schema.not.required) ? schema.not.required : [];
    if (forbiddenFields.length === 1 && isPlainObject(value)) {
      issues.push(
        issue(childPath(path, forbiddenFields[0]), 'forbidden', 'field is forbidden in this state'),
      );
    } else {
      issues.push(issue(path, 'not', 'must not match the forbidden shape'));
    }
  }

  if (schema.type && !matchesType(value, schema.type)) {
    issues.push(issue(path, 'type', `must be ${schema.type}`));
    return issues;
  }

  if (isPlainObject(value)) {
    for (const field of schema.required ?? []) {
      if (!Object.hasOwn(value, field)) {
        issues.push(issue(childPath(path, field), 'required', 'field is required'));
      }
    }
    for (const [field, fieldValue] of Object.entries(value)) {
      const fieldSchema = schema.properties?.[field];
      if (fieldSchema !== undefined) {
        issues.push(...validateNode(fieldValue, fieldSchema, rootSchema, childPath(path, field)));
      } else if (schema.additionalProperties === false) {
        issues.push(issue(childPath(path, field), 'additional_property', 'field is not supported'));
      } else if (isPlainObject(schema.additionalProperties)) {
        issues.push(
          ...validateNode(fieldValue, schema.additionalProperties, rootSchema, childPath(path, field)),
        );
      }
    }
  }

  if (Array.isArray(value)) {
    const ownKeys = Object.keys(value);
    const indexes = ownKeys
      .filter((key) => /^(?:0|[1-9]\d*)$/.test(key) && Number(key) < value.length)
      .map(Number)
      .sort((left, right) => left - right);
    const customKey = ownKeys.find(
      (key) => !/^(?:0|[1-9]\d*)$/.test(key) || Number(key) >= value.length,
    );
    if (customKey !== undefined) {
      issues.push(
        issue(childPath(path, customKey), 'array_property', 'custom array properties are not valid JSON'),
      );
      return issues;
    }
    if (indexes.length !== value.length) {
      let missingIndex = 0;
      for (const index of indexes) {
        if (index !== missingIndex) break;
        missingIndex += 1;
      }
      issues.push(
        issue(childPath(path, missingIndex), 'sparse_item', 'sparse arrays are not valid JSON values'),
      );
      return issues;
    }
    if (Number.isInteger(schema.minItems) && value.length < schema.minItems) {
      issues.push(issue(path, 'min_items', `must contain at least ${schema.minItems} item(s)`));
    }
    if (Number.isInteger(schema.maxItems) && value.length > schema.maxItems) {
      issues.push(issue(path, 'max_items', `must contain at most ${schema.maxItems} item(s)`));
    }
    if (schema.uniqueItems) {
      let duplicate = false;
      for (let index = 0; index < value.length && !duplicate; index += 1) {
        if (!Object.hasOwn(value, index)) continue;
        for (let prior = 0; prior < index; prior += 1) {
          if (Object.hasOwn(value, prior) && sameValue(value[index], value[prior])) {
            duplicate = true;
            break;
          }
        }
      }
      if (duplicate) {
        issues.push(issue(path, 'unique_items', 'items must be unique'));
      }
    }
    if (schema.items !== undefined) {
      for (let index = 0; index < value.length; index += 1) {
        if (!Object.hasOwn(value, index)) continue;
        issues.push(...validateNode(value[index], schema.items, rootSchema, childPath(path, index)));
      }
    }
    if (schema.contains !== undefined) {
      let matchingItems = 0;
      for (let index = 0; index < value.length; index += 1) {
        if (
          Object.hasOwn(value, index) &&
          validateNode(value[index], schema.contains, rootSchema, childPath(path, index)).length === 0
        ) {
          matchingItems += 1;
        }
      }
      const minimum = schema.minContains ?? 1;
      if (matchingItems < minimum) {
        issues.push(issue(path, 'contains', `must contain at least ${minimum} matching item(s)`));
      }
    }
  }

  if (typeof value === 'string') {
    if (Number.isInteger(schema.minLength) && !hasMinimumCodePoints(value, schema.minLength)) {
      issues.push(issue(path, 'min_length', `must contain at least ${schema.minLength} character(s)`));
    }
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
      issues.push(issue(path, 'pattern', `must match ${schema.pattern}`));
    }
    if (schema.format === 'date-time' && !isRealUtcDateTime(value)) {
      issues.push(issue(path, 'format', 'must be a real UTC date-time'));
    }
  }

  if (
    (typeof value === 'number' && Number.isFinite(value)) &&
    typeof schema.minimum === 'number' &&
    value < schema.minimum
  ) {
    issues.push(issue(path, 'minimum', `must be greater than or equal to ${schema.minimum}`));
  }

  return issues;
}

export function validateJsonSchema(value, schema) {
  return validateNode(value, schema, schema, '').sort(
    (left, right) => left.path.localeCompare(right.path) || left.code.localeCompare(right.code),
  );
}
