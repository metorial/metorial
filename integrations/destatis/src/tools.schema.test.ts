import { readFileSync } from 'node:fs';
import {
  describeMcpCompatibleToolSchemas,
  getMcpCompatibleToolSchemaCases
} from '@slates/test';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { provider } from './index';
import { spec } from './spec';
import { validateYearOrder } from './tools/shared';

type JsonSchemaNode = {
  additionalProperties?: boolean | JsonSchemaNode;
  allOf?: JsonSchemaNode[];
  anyOf?: JsonSchemaNode[];
  const?: unknown;
  default?: unknown;
  description?: string;
  enum?: unknown[];
  exclusiveMinimum?: number;
  items?: JsonSchemaNode;
  maximum?: number;
  maxItems?: number;
  maxLength?: number;
  minimum?: number;
  minItems?: number;
  minLength?: number;
  oneOf?: JsonSchemaNode[];
  pattern?: string;
  properties?: Record<string, JsonSchemaNode>;
  required?: string[];
  type?: string;
};

type FieldContract = Omit<
  JsonSchemaNode,
  'description' | 'items' | 'properties' | 'required'
> & {
  help: RegExp;
  required: boolean;
};
type FieldContracts = Record<string, FieldContract>;

let expectedToolKeys = [
  'search_catalog',
  'get_metadata',
  'list_variable_values',
  'download_table',
  'download_cube'
] as const;
type ToolKey = (typeof expectedToolKeys)[number];
type DownloadToolKey = Extract<ToolKey, 'download_table' | 'download_cube'>;

let actionByKey = new Map(provider.actions.map(action => [action.key, action]));
let actionFor = (toolKey: ToolKey) => {
  let action = actionByKey.get(toolKey);
  if (!action) throw new TypeError(`Missing ${toolKey}.`);
  return action;
};
let schemaFor = (toolKey: ToolKey, kind: 'input' | 'output') => {
  let action = actionFor(toolKey);
  return z.toJSONSchema(
    kind === 'input' ? action.inputSchema : action.outputSchema
  ) as JsonSchemaNode;
};

let collectSchemaDescriptions = (schema: JsonSchemaNode): string[] => {
  let descriptions = schema.description ? [schema.description] : [];
  for (let property of Object.values(schema.properties ?? {})) {
    descriptions.push(...collectSchemaDescriptions(property));
  }
  if (schema.items) descriptions.push(...collectSchemaDescriptions(schema.items));
  for (let branch of [
    ...(schema.oneOf ?? []),
    ...(schema.anyOf ?? []),
    ...(schema.allOf ?? [])
  ]) {
    descriptions.push(...collectSchemaDescriptions(branch));
  }
  return descriptions;
};

let collectPropertyNames = (schema: JsonSchemaNode): string[] => {
  let names: string[] = [];
  for (let [name, property] of Object.entries(schema.properties ?? {})) {
    names.push(name, ...collectPropertyNames(property));
  }
  if (schema.items) names.push(...collectPropertyNames(schema.items));
  for (let branch of [
    ...(schema.oneOf ?? []),
    ...(schema.anyOf ?? []),
    ...(schema.allOf ?? [])
  ]) {
    names.push(...collectPropertyNames(branch));
  }
  return names;
};

type FlattenedField = { required: boolean; schema: JsonSchemaNode };
let flattenFields = (
  objectSchema: JsonSchemaNode,
  prefix = '',
  fields = new Map<string, FlattenedField>()
) => {
  for (let [name, fieldSchema] of Object.entries(objectSchema.properties ?? {})) {
    let path = prefix ? `${prefix}.${name}` : name;
    fields.set(path, {
      required: objectSchema.required?.includes(name) ?? false,
      schema: fieldSchema
    });
    if (fieldSchema.type === 'object') {
      flattenFields(fieldSchema, path, fields);
    } else if (fieldSchema.type === 'array' && fieldSchema.items?.type === 'object') {
      flattenFields(fieldSchema.items, `${path}[]`, fields);
    } else if (fieldSchema.type === 'array' && fieldSchema.items) {
      fields.set(`${path}[]`, { required: true, schema: fieldSchema.items });
    }
  }
  return fields;
};

let expectFieldContracts = (
  toolKey: ToolKey,
  kind: 'input' | 'output',
  expected: FieldContracts
) => {
  let actual = flattenFields(schemaFor(toolKey, kind));
  expect([...actual.keys()].sort(), `${toolKey}.${kind} field inventory`).toEqual(
    Object.keys(expected).sort()
  );
  for (let [path, contract] of Object.entries(expected)) {
    let field = actual.get(path);
    expect(field, `${toolKey}.${kind}.${path}`).toBeDefined();
    if (!field) continue;
    let { help, required, ...serializedShape } = contract;
    expect(field.required, `${toolKey}.${kind}.${path} required`).toBe(required);
    expect(field.schema, `${toolKey}.${kind}.${path} shape`).toMatchObject(serializedShape);
    expect(field.schema.description, `${toolKey}.${kind}.${path} help`).toMatch(help);
    expect(field.schema.description?.trim().length).toBeGreaterThan(12);
  }
};

let areaContract: FieldContract = {
  required: true,
  type: 'string',
  enum: ['public', 'user', 'all'],
  default: 'public',
  help: /public/i
};
let selectionContracts = (
  path: 'regionalSelection' | 'classifyingSelections[]',
  valueCodeMaximum: number
): FieldContracts => ({
  [`${path}.variableCode`]: {
    required: true,
    type: 'string',
    minLength: 1,
    maxLength: 6,
    help: /variable code.+get_metadata/i
  },
  [`${path}.valueCodes`]: {
    required: true,
    type: 'array',
    minItems: 1,
    help: /value codes.+variable/i
  },
  [`${path}.valueCodes[]`]: {
    required: true,
    type: 'string',
    minLength: 1,
    maxLength: valueCodeMaximum,
    help: /value code.+list_variable_values/i
  }
});
let downloadSharedInputContracts = (
  codeField: 'tableCode' | 'cubeCode',
  maximumClassifyingSelections: number
): FieldContracts => ({
  [codeField]: {
    required: true,
    type: 'string',
    minLength: 1,
    maxLength: 10,
    help: /code.+search_catalog.+get_metadata/i
  },
  area: areaContract,
  contents: {
    required: false,
    type: 'array',
    minItems: 1,
    help: /content codes.+downloaded data/i
  },
  'contents[]': {
    required: true,
    type: 'string',
    minLength: 1,
    maxLength: 6,
    help: /content code.+get_metadata/i
  },
  startYear: {
    required: false,
    type: 'string',
    pattern: '^(\\d{4})(?:\\/(\\d{2}))?$',
    help: /first period.+YYYY/i
  },
  endYear: {
    required: false,
    type: 'string',
    pattern: '^(\\d{4})(?:\\/(\\d{2}))?$',
    help: /last period.+YYYY/i
  },
  timeSlices: {
    required: false,
    type: 'integer',
    exclusiveMinimum: 0,
    maximum: Number.MAX_SAFE_INTEGER,
    help: /positive.+time slices/i
  },
  regionalSelection: {
    required: false,
    type: 'object',
    additionalProperties: false,
    help: /regional.+filter/i
  },
  ...selectionContracts('regionalSelection', 8),
  classifyingSelections: {
    required: false,
    type: 'array',
    minItems: 1,
    maxItems: maximumClassifyingSelections,
    help: new RegExp(`classifying.+at most ${maximumClassifyingSelections}`, 'i')
  },
  ...selectionContracts('classifyingSelections[]', 15),
  updatedAfter: {
    required: false,
    type: 'string',
    help: /real calendar date.+dd\.mm\.yyyy/i
  }
});

let inputFieldContracts: Record<ToolKey, FieldContracts> = {
  search_catalog: {
    term: {
      required: true,
      type: 'string',
      minLength: 1,
      help: /keyword or phrase.+catalogue/i
    },
    category: {
      required: true,
      type: 'string',
      enum: ['all', 'tables', 'statistics', 'cubes', 'variables', 'time_series'],
      default: 'all',
      help: /object.+search.+all/i
    },
    pageLength: {
      required: true,
      type: 'integer',
      minimum: 1,
      maximum: 1000,
      default: 50,
      help: /1 to 1000/i
    }
  },
  get_metadata: {
    objectType: {
      required: true,
      type: 'string',
      enum: ['table', 'cube', 'statistic', 'time_series', 'variable', 'value'],
      help: /statistical object.+metadata/i
    },
    code: {
      required: true,
      type: 'string',
      minLength: 1,
      maxLength: 15,
      help: /code.+search_catalog.+list_variable_values/i
    },
    area: { ...areaContract, help: /catalogue area.+public/i }
  },
  list_variable_values: {
    variableCode: {
      required: true,
      type: 'string',
      minLength: 1,
      maxLength: 15,
      help: /variable code.+search_catalog.+get_metadata/i
    },
    selection: {
      required: true,
      type: 'string',
      minLength: 1,
      maxLength: 15,
      default: '*',
      help: /wildcard.+all values/i
    },
    searchCriterion: {
      required: true,
      type: 'string',
      enum: ['code', 'content'],
      default: 'code',
      help: /codes or titles/i
    },
    sortCriterion: {
      required: true,
      type: 'string',
      enum: ['code', 'content'],
      default: 'code',
      help: /sorted.+code or title/i
    },
    area: { ...areaContract, help: /catalogue area.+public/i },
    pageLength: {
      required: true,
      type: 'integer',
      minimum: 1,
      maximum: 1000,
      default: 100,
      help: /1 to 1000/i
    }
  },
  download_table: {
    ...downloadSharedInputContracts('tableCode', 5),
    format: {
      required: true,
      type: 'string',
      enum: ['csv', 'datencsv', 'ffcsv', 'html', 'genml', 'xlsx'],
      default: 'ffcsv',
      help: /download format.+ZIP/i
    },
    compress: {
      required: true,
      type: 'boolean',
      default: false,
      help: /empty rows and columns.+ZIP/i
    },
    transpose: {
      required: true,
      type: 'boolean',
      default: false,
      help: /rows and columns/i
    }
  },
  download_cube: {
    ...downloadSharedInputContracts('cubeCode', 3),
    includeValues: {
      required: true,
      type: 'boolean',
      default: true,
      help: /CSV.+value labels/i
    },
    includeMetadata: {
      required: true,
      type: 'boolean',
      default: true,
      help: /CSV.+metadata/i
    },
    includeAdditionalMetadata: {
      required: true,
      type: 'boolean',
      default: false,
      help: /additional provider metadata/i
    }
  }
};

let downloadOutputContracts = (
  codeField: 'tableCode' | 'cubeCode',
  cube: boolean
): FieldContracts => ({
  [codeField]: { required: true, type: 'string', help: /downloaded.+code/i },
  format: {
    required: true,
    type: 'string',
    ...(cube
      ? { const: 'csv' }
      : { enum: ['csv', 'datencsv', 'ffcsv', 'html', 'genml', 'xlsx'] }),
    help: /downloaded.+format/i
  },
  fileName: {
    required: true,
    type: 'string',
    help: /provider file name.+fallback/i
  },
  mimeType: { required: true, type: 'string', help: /MIME type.+downloadable/i },
  byteLength: {
    required: true,
    type: 'integer',
    exclusiveMinimum: 0,
    maximum: Number.MAX_SAFE_INTEGER,
    help: /file size in bytes/i
  },
  isArchive: {
    required: true,
    type: 'boolean',
    ...(cube ? { const: false } : {}),
    help: cube ? /not ZIP archives/i : /whether.+ZIP archive/i
  }
});

let outputFieldContracts: Record<ToolKey, FieldContracts> = {
  search_catalog: {
    items: { required: true, type: 'array', help: /matching catalogue objects/i },
    'items[].type': {
      required: true,
      type: 'string',
      enum: ['table', 'statistic', 'cube', 'variable', 'time_series'],
      help: /kind.+catalogue object/i
    },
    'items[].code': { required: true, type: 'string', help: /stable provider code/i },
    'items[].title': { required: true, type: 'string', help: /provider title/i },
    'items[].state': { required: false, type: 'string', help: /availability|state/i },
    'items[].timeRange': { required: false, type: 'string', help: /time span/i },
    'items[].lastUpdated': { required: false, type: 'string', help: /last update/i },
    'items[].valueCount': {
      required: false,
      type: 'integer',
      minimum: 0,
      maximum: Number.MAX_SAFE_INTEGER,
      help: /number of values/i
    },
    'items[].hasInformation': {
      required: false,
      type: 'boolean',
      help: /additional information/i
    },
    warning: { required: false, type: 'string', help: /provider warning/i },
    copyright: { required: false, type: 'string', help: /copyright.+attribution/i }
  },
  get_metadata: {
    objectType: {
      required: true,
      type: 'string',
      enum: ['table', 'cube', 'statistic', 'time_series', 'variable', 'value'],
      help: /statistical object type/i
    },
    code: { required: true, type: 'string', help: /stable provider code/i },
    title: { required: false, type: 'string', help: /provider title/i },
    updatedAt: { required: false, type: 'string', help: /last update/i },
    timeRange: { required: false, type: 'string', help: /time span/i },
    dimensions: { required: false, type: 'array', help: /table or cube dimensions/i },
    'dimensions[].code': {
      required: true,
      type: 'string',
      help: /stable provider code/i
    },
    'dimensions[].title': { required: true, type: 'string', help: /provider title/i },
    'dimensions[].type': { required: false, type: 'string', help: /dimension type/i },
    'dimensions[].valueCount': {
      required: false,
      type: 'integer',
      minimum: 0,
      maximum: Number.MAX_SAFE_INTEGER,
      help: /available values/i
    },
    'dimensions[].selectedCount': {
      required: false,
      type: 'integer',
      minimum: 0,
      maximum: Number.MAX_SAFE_INTEGER,
      help: /selected values/i
    },
    metadata: { required: true, type: 'object', help: /provider metadata/i },
    warning: { required: false, type: 'string', help: /provider warning/i },
    copyright: { required: false, type: 'string', help: /copyright.+attribution/i }
  },
  list_variable_values: {
    variableCode: { required: true, type: 'string', help: /variable code/i },
    values: { required: true, type: 'array', help: /provider values/i },
    'values[].code': { required: true, type: 'string', help: /stable provider code/i },
    'values[].title': { required: true, type: 'string', help: /provider title/i },
    'values[].variableCount': {
      required: false,
      type: 'integer',
      minimum: 0,
      maximum: Number.MAX_SAFE_INTEGER,
      help: /related variables/i
    },
    'values[].hasInformation': {
      required: false,
      type: 'boolean',
      help: /additional information/i
    },
    warning: { required: false, type: 'string', help: /provider warning/i },
    copyright: { required: false, type: 'string', help: /copyright.+attribution/i }
  },
  download_table: downloadOutputContracts('tableCode', false),
  download_cube: downloadOutputContracts('cubeCode', true)
};

describeMcpCompatibleToolSchemas('Destatis tool input schemas', provider.actions);

describe('Destatis public tool contract', () => {
  it('serializes every registered input as one top-level JSON Schema object in order', () => {
    let cases = getMcpCompatibleToolSchemaCases(provider.actions);
    expect(cases.map(([toolKey]) => toolKey)).toEqual(expectedToolKeys);
    expect(new Set(cases.map(([toolKey]) => toolKey)).size).toBe(expectedToolKeys.length);
    for (let toolKey of expectedToolKeys) {
      let schema = schemaFor(toolKey, 'input');
      expect(schema.type, toolKey).toBe('object');
      expect(schema.properties, toolKey).toBeDefined();
      expect(schema.additionalProperties, toolKey).toBe(false);
      expect(schema, toolKey).not.toHaveProperty('oneOf');
      expect(schema, toolKey).not.toHaveProperty('anyOf');
      expect(schema, toolKey).not.toHaveProperty('allOf');
    }
  });

  it('keeps stable production tool IDs below 60 characters', () => {
    expect(provider.actions.map(action => action.key)).toEqual(expectedToolKeys);
    for (let toolKey of expectedToolKeys) {
      expect(`destatis-${toolKey}`.length, toolKey).toBeLessThan(60);
    }
  });

  it('locks every recursive input field, default, enum, bound, pattern, and help text', () => {
    for (let toolKey of expectedToolKeys) {
      expectFieldContracts(toolKey, 'input', inputFieldContracts[toolKey]);
    }
  });

  it('locks every recursive output field and its required or optional status', () => {
    for (let toolKey of expectedToolKeys) {
      expectFieldContracts(toolKey, 'output', outputFieldContracts[toolKey]);
      expect(schemaFor(toolKey, 'output').additionalProperties, toolKey).toBe(false);
    }
  });

  it.each([
    {
      toolKey: 'search_catalog' as const,
      input: { term: ' population ' },
      output: { term: 'population', category: 'all', pageLength: 50 }
    },
    {
      toolKey: 'get_metadata' as const,
      input: { objectType: 'table', code: ' 12411-0001 ' },
      output: { objectType: 'table', code: '12411-0001', area: 'public' }
    },
    {
      toolKey: 'list_variable_values' as const,
      input: { variableCode: ' GES ' },
      output: {
        variableCode: 'GES',
        selection: '*',
        searchCriterion: 'code',
        sortCriterion: 'code',
        area: 'public',
        pageLength: 100
      }
    },
    {
      toolKey: 'download_table' as const,
      input: { tableCode: ' 12411-0001 ' },
      output: {
        tableCode: '12411-0001',
        area: 'public',
        format: 'ffcsv',
        compress: false,
        transpose: false
      }
    },
    {
      toolKey: 'download_cube' as const,
      input: { cubeCode: ' 12411BJ001 ' },
      output: {
        cubeCode: '12411BJ001',
        area: 'public',
        includeValues: true,
        includeMetadata: true,
        includeAdditionalMetadata: false
      }
    }
  ])('applies caller-omittable defaults for $toolKey', ({ toolKey, input, output }) => {
    let parsed = actionFor(toolKey).inputSchema.safeParse(input);
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data).toMatchObject(output);
  });

  it.each([
    ['search_catalog', { term: '   ' }],
    ['get_metadata', { objectType: 'table', code: '   ' }],
    ['list_variable_values', { variableCode: '   ' }],
    ['list_variable_values', { variableCode: 'GES', selection: '1234567890123456' }],
    ['list_variable_values', { variableCode: 'GES', pageLength: 0 }]
  ] as const)('rejects invalid core input for %s', (toolKey, input) => {
    expect(actionFor(toolKey).inputSchema.safeParse(input).success).toBe(false);
  });

  for (let toolKey of ['download_table', 'download_cube'] as const) {
    let codeField = toolKey === 'download_table' ? 'tableCode' : 'cubeCode';
    let baseInput = { [codeField]: ' 12411-0001 ' };
    let maximumClassifyingSelections = toolKey === 'download_table' ? 5 : 3;

    it(`accepts the full refined ${toolKey} input contract`, () => {
      let parsed = actionFor(toolKey).inputSchema.safeParse({
        ...baseInput,
        contents: [' BEV001 ', 'RATE-1'],
        startYear: '1900/01',
        endYear: '2100/99',
        timeSlices: 1,
        regionalSelection: { variableCode: ' DLAND ', valueCodes: [' 01 ', '*'] },
        classifyingSelections: [{ variableCode: ' GES ', valueCodes: [' 1 ', '2'] }],
        updatedAfter: '29.02.2024 23:59'
      });
      expect(parsed.success).toBe(true);
      if (!parsed.success) return;
      expect(parsed.data).toMatchObject({
        [codeField]: '12411-0001',
        contents: ['BEV001', 'RATE-1'],
        regionalSelection: { variableCode: 'DLAND', valueCodes: ['01', '*'] },
        classifyingSelections: [{ variableCode: 'GES', valueCodes: ['1', '2'] }]
      });
      expect(() =>
        validateYearOrder(parsed.data.startYear, parsed.data.endYear)
      ).not.toThrow();
      expect(maximumClassifyingSelections).toBe(
        inputFieldContracts[toolKey].classifyingSelections?.maxItems
      );
    });

    let rejectedRefinements = [
      { label: 'blank code', value: { [codeField]: '   ' } },
      { label: 'overlong code', value: { [codeField]: '12345678901' } },
      { label: 'empty contents', value: { ...baseInput, contents: [] } },
      {
        label: 'duplicate trimmed contents',
        value: { ...baseInput, contents: ['BEV', ' BEV '] }
      },
      { label: 'comma-bearing content', value: { ...baseInput, contents: ['A,B'] } },
      { label: 'control-bearing content', value: { ...baseInput, contents: ['A\u0000B'] } },
      { label: 'out-of-range leading year', value: { ...baseInput, startYear: '1899' } },
      { label: 'invalid year syntax', value: { ...baseInput, endYear: '2024/001' } },
      { label: 'zero time slices', value: { ...baseInput, timeSlices: 0 } },
      { label: 'fractional time slices', value: { ...baseInput, timeSlices: 1.5 } },
      {
        label: 'comma-bearing regional variable',
        value: {
          ...baseInput,
          regionalSelection: { variableCode: 'D,L', valueCodes: ['01'] }
        }
      },
      {
        label: 'duplicate trimmed regional values',
        value: {
          ...baseInput,
          regionalSelection: { variableCode: 'DLAND', valueCodes: ['01', ' 01 '] }
        }
      },
      {
        label: 'blank regional value',
        value: {
          ...baseInput,
          regionalSelection: { variableCode: 'DLAND', valueCodes: ['   '] }
        }
      },
      {
        label: 'comma-bearing regional value',
        value: {
          ...baseInput,
          regionalSelection: { variableCode: 'DLAND', valueCodes: ['01,02'] }
        }
      },
      {
        label: 'control-bearing regional value',
        value: {
          ...baseInput,
          regionalSelection: { variableCode: 'DLAND', valueCodes: ['A\nB'] }
        }
      },
      { label: 'empty classifier list', value: { ...baseInput, classifyingSelections: [] } },
      {
        label: 'duplicate trimmed classifier variables',
        value: {
          ...baseInput,
          classifyingSelections: [
            { variableCode: 'GES', valueCodes: ['1'] },
            { variableCode: ' GES ', valueCodes: ['2'] }
          ]
        }
      },
      {
        label: 'control-bearing classifier variable',
        value: {
          ...baseInput,
          classifyingSelections: [{ variableCode: 'G\nS', valueCodes: ['1'] }]
        }
      },
      {
        label: 'blank classifier value',
        value: {
          ...baseInput,
          classifyingSelections: [{ variableCode: 'GES', valueCodes: ['   '] }]
        }
      },
      {
        label: 'duplicate classifier values',
        value: {
          ...baseInput,
          classifyingSelections: [{ variableCode: 'GES', valueCodes: ['1', ' 1 '] }]
        }
      },
      {
        label: 'comma-bearing classifier value',
        value: {
          ...baseInput,
          classifyingSelections: [{ variableCode: 'GES', valueCodes: ['1,2'] }]
        }
      },
      {
        label: 'too many classifiers',
        value: {
          ...baseInput,
          classifyingSelections: Array.from(
            { length: maximumClassifyingSelections + 1 },
            (_, index) => ({ variableCode: `V${index}`, valueCodes: ['*'] })
          )
        }
      },
      { label: 'impossible date', value: { ...baseInput, updatedAfter: '31.02.2024' } },
      { label: 'non-leap date', value: { ...baseInput, updatedAfter: '29.02.2023' } },
      { label: 'invalid time', value: { ...baseInput, updatedAfter: '01.01.2024 24:00' } }
    ];

    it.each(rejectedRefinements)(`rejects $label in the ${toolKey} Zod contract`, ({
      value
    }) => {
      expect(actionFor(toolKey).inputSchema.safeParse(value).success).toBe(false);
    });

    it(`applies the ${toolKey} cross-field year ordering check after safeParse`, () => {
      let parsed = actionFor(toolKey).inputSchema.safeParse({
        ...baseInput,
        startYear: '2025',
        endYear: '2024'
      });
      expect(parsed.success).toBe(true);
      if (!parsed.success) return;
      expect(() => validateYearOrder(parsed.data.startYear, parsed.data.endYear)).toThrow(
        /startYear must not be later than endYear/i
      );
    });
  }

  it('keeps provider job mode and cube format out of public inputs', () => {
    let tableInput = schemaFor('download_table', 'input');
    let cubeInput = schemaFor('download_cube', 'input');
    expect(tableInput.properties).not.toHaveProperty('job');
    expect(cubeInput.properties).not.toHaveProperty('job');
    expect(cubeInput.properties).not.toHaveProperty('format');
    let tableParsed = actionFor('download_table').inputSchema.safeParse({
      tableCode: '12411-0001',
      job: true
    });
    let cubeParsed = actionFor('download_cube').inputSchema.safeParse({
      cubeCode: '12411BJ001',
      job: true,
      format: 'xlsx'
    });
    expect(tableParsed.success).toBe(true);
    expect(cubeParsed.success).toBe(true);
    if (tableParsed.success) expect(tableParsed.data).not.toHaveProperty('job');
    if (cubeParsed.success) {
      expect(cubeParsed.data).not.toHaveProperty('job');
      expect(cubeParsed.data).not.toHaveProperty('format');
    }
    let clientSource = readFileSync(new URL('./lib/client.ts', import.meta.url), 'utf8');
    expect(clientSource).toContain("append(form, 'job', false);");
    expect(clientSource).toContain("append(form, 'format', 'csv');");
    expect(schemaFor('download_cube', 'output').properties?.format).toMatchObject({
      const: 'csv'
    });
  });

  it('publishes every table and cube download safety constraint', () => {
    let expectedPatterns: Record<DownloadToolKey, RegExp[][]> = {
      download_table: [
        [/provider/i, /40,000 values/i, /narrow/i],
        [/response/i, /64 MiB/i, /narrow/i],
        [/ZIP.+XLSX/i, /32 MiB/i, /4,096/i, /200 times/i, /1 MiB/i],
        [/GENML\/XML/i, /32 MiB/i, /64 elements/i, /100,000 elements/i],
        [/CSV.+data CSV.+flat CSV/i, /ZIP files/i],
        [/English responses/i, /not been translated/i],
        [/token-authenticated/i, /cannot enqueue asynchronous jobs/i]
      ],
      download_cube: [
        [/narrow/i, /large direct download/i],
        [/response/i, /64 MiB/i, /narrow/i],
        [/English responses/i, /not been translated/i],
        [/direct cube export/i, /does not enqueue asynchronous jobs/i]
      ]
    };
    for (let toolKey of ['download_table', 'download_cube'] as const) {
      let constraints = actionFor(toolKey).constraints ?? [];
      expect(constraints, `${toolKey} constraint count`).toHaveLength(
        expectedPatterns[toolKey].length
      );
      for (let [index, patterns] of expectedPatterns[toolKey].entries()) {
        for (let pattern of patterns) {
          expect(constraints[index], `${toolKey} constraint ${index}`).toMatch(pattern);
        }
      }
    }
  });

  it('documents structured outputs without inline file contents', () => {
    expect(Object.keys(schemaFor('download_table', 'output').properties ?? {})).toEqual([
      'tableCode',
      'format',
      'fileName',
      'mimeType',
      'byteLength',
      'isArchive'
    ]);
    expect(Object.keys(schemaFor('download_cube', 'output').properties ?? {})).toEqual([
      'cubeCode',
      'format',
      'fileName',
      'mimeType',
      'byteLength',
      'isArchive'
    ]);
    let forbiddenOutputName =
      /^(?:base64|binary|body|content|contentBase64|csvData|fileContent)$/i;
    for (let action of provider.actions) {
      let outputSchema = z.toJSONSchema(action.outputSchema) as JsonSchemaNode;
      expect(outputSchema.additionalProperties, action.key).toBe(false);
      expect(
        collectPropertyNames(outputSchema).filter(name => forbiddenOutputName.test(name)),
        action.key
      ).toEqual([]);
    }
  });

  it('keeps descriptions, workflow guidance, and read-only tags useful', () => {
    for (let action of provider.actions) {
      expect(action.name.trim().length, action.key).toBeGreaterThan(5);
      expect(action.description?.trim().length, action.key).toBeGreaterThan(70);
      expect(action.instructions?.length, action.key).toBeGreaterThan(0);
      expect(action.tags, action.key).toMatchObject({ readOnly: true, destructive: false });
    }
  });

  it('keeps all public tool copy and invocation messages provider-facing', () => {
    let publicText = [spec.name, spec.description];
    for (let action of provider.actions) {
      publicText.push(
        action.name,
        action.description,
        ...(action.instructions ?? []),
        ...(action.constraints ?? []),
        ...collectSchemaDescriptions(z.toJSONSchema(action.inputSchema) as JsonSchemaNode),
        ...collectSchemaDescriptions(z.toJSONSchema(action.outputSchema) as JsonSchemaNode)
      );
    }
    let toolSourceFiles = [
      'search-catalog.ts',
      'get-metadata.ts',
      'list-variable-values.ts',
      'download-table.ts',
      'download-cube.ts'
    ];
    let messageExpression = /\bmessage:\s*(`(?:\\.|[^`])*`|'(?:\\.|[^'])*'|"(?:\\.|[^"])*")/gs;
    let messageLiterals = toolSourceFiles.flatMap(fileName => {
      let source = readFileSync(new URL(`./tools/${fileName}`, import.meta.url), 'utf8');
      return [...source.matchAll(messageExpression)].map(match => match[1] ?? '');
    });
    expect(messageLiterals).toHaveLength(expectedToolKeys.length);
    publicText.push(...messageLiterals);
    let forbiddenPatterns = [
      /\bslates?\b/i,
      /\battachments?\b/i,
      /\b(?:createBase64Attachment|createTextAttachment)\b/i,
      /\binternal (?:file[- ]delivery|delivery|transport|mechanism)\b/i,
      /\bbase64\b/i,
      /\bbinary (?:content|data|payload)\b/i,
      /\b(?:contentBase64|fileContent|csvData)\b/i
    ];
    for (let [index, text] of publicText.entries()) {
      for (let pattern of forbiddenPatterns) {
        expect(text, `public text ${index} matched ${pattern}`).not.toMatch(pattern);
      }
    }
  });
});

describe('Destatis marketplace metadata', () => {
  it('uses the canonical marketplace shape and official branding', () => {
    let metadata = JSON.parse(
      readFileSync(new URL('../slate.json', import.meta.url), 'utf8')
    ) as Record<string, unknown>;
    expect(metadata).toMatchObject({
      name: '@metorial/destatis',
      categories: ['data-and-analytics', 'government'],
      logoUrl:
        'https://www.destatis.de/SiteGlobals/Frontend/Images/logo.svg?__blob=normal&v=11'
    });
    expect(typeof metadata.description).toBe('string');
    expect(String(metadata.description)).toMatch(/five read-only tools/i);
    expect(String(metadata.description)).toMatch(/personal API token/i);
    expect(metadata.skills).toEqual([
      'find official German statistics',
      'inspect GENESIS-Online table and cube dimensions',
      'discover regional and statistical value codes',
      'download flat CSV table data',
      'download presentation tables as XLSX',
      'download linearized cube data'
    ]);
  });
});
