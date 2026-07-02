import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { provider } from './index';

let tools = provider.actions.filter(action => action.type === 'tool');

describe('DataForSEO tool input schemas', () => {
  it.each(
    tools.map(tool => [tool.key, tool] as const)
  )('%s uses an MCP-compatible top-level object schema', (_key, tool) => {
    let jsonSchema = z.toJSONSchema(tool.inputSchema) as Record<string, unknown>;

    expect(jsonSchema.type).toBe('object');
    expect(jsonSchema).not.toHaveProperty('oneOf');
    expect(jsonSchema).not.toHaveProperty('anyOf');
    expect(jsonSchema).not.toHaveProperty('allOf');
  });
});
