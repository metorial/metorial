export type Schema = {
  type?: unknown;
  enum?: unknown[];
  const?: unknown;
  format?: string;
  pattern?: string;
  multipleOf?: number;
  minLength?: number;
  minimum?: number;
  exclusiveMinimum?: number;
  minItems?: number;
  minProperties?: number;
  maxLength?: number;
  maximum?: number;
  exclusiveMaximum?: number;
  maxItems?: number;
  maxProperties?: number;
  required?: string[];
  properties?: Record<string, Schema>;
  items?: Schema;
  additionalProperties?: boolean | Schema;
  anyOf?: Schema[];
  oneOf?: Schema[];
  allOf?: Schema[];
};

export type ContractTool = {
  key: string;
  method: string;
  path: string;
  instanceScoped: boolean;
  params: Record<string, { in: string; name: string }>;
  inputSchema: Schema;
};

export type Contract = {
  generatedFrom?: { apiVersion?: string };
  categories: { key: string }[];
  tools: ContractTool[];
};

let LOWER_BOUNDS = [
  'minLength',
  'minimum',
  'exclusiveMinimum',
  'minItems',
  'minProperties'
] as const;
let UPPER_BOUNDS = [
  'maxLength',
  'maximum',
  'exclusiveMaximum',
  'maxItems',
  'maxProperties'
] as const;
let EXACT_CONSTRAINTS = ['format', 'pattern', 'multipleOf'] as const;

let same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
let typeList = (type: unknown) =>
  type === undefined ? undefined : ([] as unknown[]).concat(type);

let branchTypes = (schema: Schema) => {
  let branches = schema.anyOf ?? schema.oneOf;
  return branches?.every(branch => branch.type !== undefined)
    ? branches.flatMap(branch => typeList(branch.type)!)
    : undefined;
};

let matchBranch = (branch: Schema, index: number, branches: Schema[]) => {
  let positional = branches[index];
  return (
    branches.find(candidate => same(candidate, branch)) ??
    (positional && same(positional.type, branch.type)
      ? positional
      : branches.find(candidate => same(candidate.type, branch.type)))
  );
};

let constraintBreaks = (at: string, previous: Schema, next: Schema) => {
  let breaks: string[] = [];

  for (let key of LOWER_BOUNDS) {
    let bound = next[key];
    if (bound !== undefined && !(previous[key]! >= bound)) {
      breaks.push(`${at}: ${key} raised to ${bound}`);
    }
  }
  for (let key of UPPER_BOUNDS) {
    let bound = next[key];
    if (bound !== undefined && !(previous[key]! <= bound)) {
      breaks.push(`${at}: ${key} lowered to ${bound}`);
    }
  }
  for (let key of EXACT_CONSTRAINTS) {
    if (next[key] !== undefined && next[key] !== previous[key]) {
      breaks.push(`${at}: ${key} added or changed`);
    }
  }

  return breaks;
};

let typeBreaks = (at: string, previous: Schema, next: Schema) => {
  let previousTypes = typeList(previous.type) ?? branchTypes(previous);
  let nextTypes = typeList(next.type);
  if (!nextTypes) return [];
  if (!previousTypes) return [`${at}: type added`];

  return previousTypes
    .filter(type => !nextTypes.includes(type))
    .filter(type => !(type === 'integer' && nextTypes.includes('number')))
    .map(type => `${at}: type ${JSON.stringify(type)} removed`);
};

let combinatorBreaks = (at: string, previous: Schema, next: Schema) => {
  let breaks: string[] = [];

  for (let combinator of ['anyOf', 'oneOf'] as const) {
    let previousBranches = previous[combinator];
    let nextBranches = next[combinator];

    if (previousBranches) {
      let candidates = nextBranches ?? next.anyOf ?? [next];
      for (let [index, branch] of previousBranches.entries()) {
        let match = matchBranch(branch, index, candidates);
        let branchAt = `${at}.${combinator}[${index}]`;
        if (match) breaks.push(...schemaBreaks(branchAt, branch, match));
        else breaks.push(`${branchAt}: removed`);
      }
    } else if (nextBranches && !previous.anyOf && !previous.oneOf) {
      let base = { ...next, [combinator]: undefined };
      let keepsPreviousInputs = nextBranches.some(
        branch => !schemaBreaks(at, previous, { ...base, ...branch }).length
      );
      if (!keepsPreviousInputs) breaks.push(`${at}.${combinator}: added`);
    }
  }

  let previousAllOf = previous.allOf ?? [];
  for (let [index, branch] of (next.allOf ?? []).entries()) {
    let match = matchBranch(branch, index, previousAllOf);
    let branchAt = `${at}.allOf[${index}]`;
    if (match) breaks.push(...schemaBreaks(branchAt, match, branch));
    else breaks.push(`${branchAt}: added`);
  }

  return breaks;
};

export let schemaBreaks = (at: string, previous: Schema, next: Schema): string[] => {
  let breaks = [...typeBreaks(at, previous, next), ...constraintBreaks(at, previous, next)];

  if (!previous.enum && next.enum) breaks.push(`${at}: enum added`);
  for (let value of previous.enum ?? []) {
    if (next.enum && !next.enum.includes(value)) {
      breaks.push(`${at}: enum value ${JSON.stringify(value)} removed`);
    }
  }
  if ('const' in next && !same(previous.const, next.const)) {
    breaks.push(`${at}: const changed`);
  }
  for (let field of next.required ?? []) {
    if (!previous.required?.includes(field)) breaks.push(`${at}.${field}: newly required`);
  }
  for (let [field, schema] of Object.entries(previous.properties ?? {})) {
    let nextSchema = next.properties?.[field];
    if (nextSchema) breaks.push(...schemaBreaks(`${at}.${field}`, schema, nextSchema));
    else breaks.push(`${at}.${field}: removed`);
  }
  if (previous.items && next.items) {
    breaks.push(...schemaBreaks(`${at}[]`, previous.items, next.items));
  } else if (next.items && !previous.anyOf && !previous.oneOf) {
    breaks.push(`${at}: items schema added`);
  }
  if (previous.additionalProperties !== false && next.additionalProperties === false) {
    breaks.push(`${at}: additional properties no longer allowed`);
  }
  if (
    typeof previous.additionalProperties === 'object' &&
    typeof next.additionalProperties === 'object'
  ) {
    breaks.push(
      ...schemaBreaks(`${at}{}`, previous.additionalProperties, next.additionalProperties)
    );
  }

  return [...breaks, ...combinatorBreaks(at, previous, next)];
};

let toolBreaks = (previous: ContractTool, next: ContractTool) => {
  let breaks: string[] = [];
  let at = `tool ${previous.key}`;

  if (previous.method !== next.method) breaks.push(`${at}: method changed`);
  if (previous.path !== next.path) breaks.push(`${at}: path changed`);
  if (previous.instanceScoped && !next.instanceScoped) {
    breaks.push(`${at}: no longer instance scoped`);
  }
  for (let [field, param] of Object.entries(previous.params ?? {})) {
    if (!same(param, next.params?.[field])) breaks.push(`${at}: param ${field} changed`);
  }

  return [...breaks, ...schemaBreaks(previous.key, previous.inputSchema, next.inputSchema)];
};

export let contractBreaks = (previous: Contract, next: Contract) => {
  let nextTools = new Map(next.tools.map(tool => [tool.key, tool]));
  let nextCategories = new Set(next.categories.map(category => category.key));
  let breaks = previous.categories
    .filter(category => !nextCategories.has(category.key))
    .map(category => `category ${category.key}: removed`);

  for (let tool of previous.tools) {
    let nextTool = nextTools.get(tool.key);
    if (nextTool) breaks.push(...toolBreaks(tool, nextTool));
    else breaks.push(`tool ${tool.key}: removed`);
  }

  return breaks;
};

export let contractVersionBreaks = (next: Contract, expectedApiVersion: string) => {
  let apiVersion = next.generatedFrom?.apiVersion;
  return apiVersion === expectedApiVersion
    ? []
    : [
        `generatedFrom.apiVersion ${JSON.stringify(apiVersion)} differs from DEFAULT_API_VERSION ${JSON.stringify(expectedApiVersion)}`
      ];
};
