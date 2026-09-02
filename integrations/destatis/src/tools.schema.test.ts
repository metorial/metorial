import { readFileSync } from 'node:fs';
import {
  describeMcpCompatibleToolSchemas,
  getMcpCompatibleToolSchemaCases
} from '@slates/test';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { provider } from './index';
import { spec } from './spec';

type JsonSchemaNode = {
  allOf?: JsonSchemaNode[];
  anyOf?: JsonSchemaNode[];
  default?: unknown;
  description?: string;
  items?: JsonSchemaNode;
  oneOf?: JsonSchemaNode[];
  properties?: Record<string, JsonSchemaNode>;
  type?: string;
};

let expectedToolKeys = [
  'search_catalog',
  'get_metadata',
  'list_variable_values',
  'download_table',
  'download_cube'
] as const;

let actionByKey = new Map(provider.actions.map(action => [action.key, action]));

let schemaFor = (toolKey: (typeof expectedToolKeys)[number], kind: 'input' | 'output') => {
  let action = actionByKey.get(toolKey);
  if (!action) throw new TypeError(`Missing ${toolKey}.`);
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

  it('documents every schema property and preserves workflow defaults and bounds', () => {
    for (let toolKey of expectedToolKeys) {
      for (let kind of ['input', 'output'] as const) {
        let schema = schemaFor(toolKey, kind);
        for (let [propertyName, property] of Object.entries(schema.properties ?? {})) {
          expect(
            property.description?.trim().length,
            `${toolKey}.${kind}.${propertyName}`
          ).toBeGreaterThan(12);
        }
      }
    }

    expect(schemaFor('search_catalog', 'input').properties).toMatchObject({
      category: { default: 'all' },
      pageLength: { default: 50, minimum: 1, maximum: 1000 }
    });
    expect(schemaFor('get_metadata', 'input').properties).toMatchObject({
      area: { default: 'public' }
    });
    expect(schemaFor('list_variable_values', 'input').properties).toMatchObject({
      selection: { default: '*' },
      searchCriterion: { default: 'code' },
      sortCriterion: { default: 'code' },
      area: { default: 'public' },
      pageLength: { default: 100, minimum: 1, maximum: 1000 }
    });
    expect(schemaFor('download_table', 'input').properties).toMatchObject({
      area: { default: 'public' },
      format: { default: 'ffcsv' },
      compress: { default: false },
      transpose: { default: false },
      classifyingSelections: { maxItems: 5 }
    });
    expect(schemaFor('download_cube', 'input').properties).toMatchObject({
      area: { default: 'public' },
      includeValues: { default: true },
      includeMetadata: { default: true },
      includeAdditionalMetadata: { default: false },
      classifyingSelections: { maxItems: 3 }
    });
  });

  it('keeps descriptions, workflow guidance, and download constraints useful', () => {
    for (let action of provider.actions) {
      expect(action.name.trim().length, action.key).toBeGreaterThan(5);
      expect(action.description?.trim().length, action.key).toBeGreaterThan(70);
      expect(action.instructions?.length, action.key).toBeGreaterThan(0);
    }

    let tableConstraints = actionByKey.get('download_table')?.constraints?.join(' ') ?? '';
    expect(tableConstraints).toMatch(/40,000 values/i);
    expect(tableConstraints).toMatch(/64 MiB/i);
    expect(tableConstraints).toMatch(/32 MiB/i);
    expect(tableConstraints).toMatch(/CSV.+ZIP/i);
    expect(tableConstraints).toMatch(/token.+asynchronous jobs/i);

    let cubeConstraints = actionByKey.get('download_cube')?.constraints?.join(' ') ?? '';
    expect(cubeConstraints).toMatch(/64 MiB/i);
    expect(cubeConstraints).toMatch(/direct cube export/i);
    expect(cubeConstraints).toMatch(/asynchronous jobs/i);
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
      expect(
        collectPropertyNames(z.toJSONSchema(action.outputSchema) as JsonSchemaNode).filter(
          name => forbiddenOutputName.test(name)
        ),
        action.key
      ).toEqual([]);
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
