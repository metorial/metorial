import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { provider } from './index';
import { triggerSkillWebhook } from './tools/trigger-skill-webhook';

describeMcpCompatibleToolSchemas('Item tool input schemas', provider.actions);

describe('Item webhook input schema', () => {
  it('serializes signPayload as truly optional and skillId as a UUID', () => {
    let schema = z.toJSONSchema(triggerSkillWebhook.inputSchema) as {
      required?: string[];
      properties?: Record<string, { format?: string }>;
    };

    expect(schema.required).toEqual(['skillId', 'payload']);
    expect(schema.required).not.toContain('signPayload');
    expect(schema.properties?.skillId?.format).toBe('uuid');
  });
});
