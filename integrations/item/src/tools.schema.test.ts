import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { provider } from './index';
import { batchUpsertObjects } from './tools/batch-upsert-objects';
import { getObject } from './tools/get-object';
import { triggerSkillWebhook } from './tools/trigger-skill-webhook';

type JsonSchemaNode = {
  [key: string]: unknown;
  anyOf?: JsonSchemaNode[];
  default?: unknown;
  items?: JsonSchemaNode;
  properties?: Record<string, JsonSchemaNode>;
  required?: string[];
  type?: string;
};

describeMcpCompatibleToolSchemas('Item tool input schemas', provider.actions);

describe('Item tool documentation references', () => {
  it('points every tool at its own item API reference page', () => {
    let undocumented = provider.actions
      .filter(
        action =>
          !(action.docs ?? []).some(entry =>
            entry.url.startsWith('https://docs.item.app/api-reference/')
          )
      )
      .map(action => action.key);

    expect(undocumented).toEqual([]);
  });
});

describe('Item webhook input schema', () => {
  it('serializes signPayload as truly optional and skillId as a UUID', () => {
    let schema = z.toJSONSchema(triggerSkillWebhook.inputSchema) as JsonSchemaNode;

    expect(schema.required).toEqual(['skillId', 'payload']);
    expect(schema.required).not.toContain('signPayload');
    expect(schema.properties?.skillId?.format).toBe('uuid');
  });
});

describe('Item object input schemas', () => {
  it('keeps get-object expansion flags optional without schema defaults', () => {
    let schema = z.toJSONSchema(getObject.inputSchema) as JsonSchemaNode;

    expect(schema.required).toEqual(['objectType']);
    expect(schema.properties?.includeAllFields?.default).toBeUndefined();
    expect(schema.properties?.includeSummary?.default).toBeUndefined();
  });

  it('accepts only integer numeric batch match values', () => {
    let schema = z.toJSONSchema(batchUpsertObjects.inputSchema) as JsonSchemaNode;
    let matchValue = schema.properties?.objects?.items?.properties?.matchValue;

    expect(matchValue?.anyOf).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: 'integer' })])
    );
    expect(matchValue?.anyOf).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ type: 'number' })])
    );
  });
});
