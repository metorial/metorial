import { describe, expect, it } from 'vitest';
import { z } from 'zod';

type ToolSchemaTarget = {
  key: string;
  inputSchema: z.ZodType;
};

type ToolSchemaAction = {
  type?: string;
  key?: string;
  inputSchema?: z.ZodType;
  build?: () => unknown;
};

type ToolSchemaSource =
  | readonly unknown[]
  | {
      actions: readonly unknown[];
    };

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

let isToolSchemaTarget = (value: unknown): value is ToolSchemaTarget =>
  isRecord(value) && typeof value.key === 'string' && value.inputSchema !== undefined;

let buildToolSchemaTarget = (action: ToolSchemaAction) => {
  if (typeof action.build !== 'function') {
    return action;
  }

  return action.build();
};

let isToolAction = (action: unknown): action is ToolSchemaAction => {
  if (!isRecord(action)) return false;
  return action.type === 'tool' || action.type === 'action.tool';
};

let getToolSchemaActions = (source: ToolSchemaSource): readonly unknown[] => {
  if (Array.isArray(source)) {
    return source;
  }

  return (source as { actions: readonly unknown[] }).actions;
};

export let getMcpCompatibleToolSchemaCases = (
  source: ToolSchemaSource
): ReadonlyArray<readonly [string, ToolSchemaTarget]> =>
  getToolSchemaActions(source)
    .filter(isToolAction)
    .map(buildToolSchemaTarget)
    .filter(isToolSchemaTarget)
    .map(tool => [tool.key, tool] as const);

export let expectMcpCompatibleToolSchema = (tool: ToolSchemaTarget) => {
  let jsonSchema = z.toJSONSchema(tool.inputSchema) as Record<string, unknown>;

  expect(jsonSchema.type).toBe('object');
  expect(jsonSchema).not.toHaveProperty('oneOf');
  expect(jsonSchema).not.toHaveProperty('anyOf');
  expect(jsonSchema).not.toHaveProperty('allOf');
};

export let describeMcpCompatibleToolSchemas = (name: string, source: ToolSchemaSource) => {
  describe(name, () => {
    for (let [key, tool] of getMcpCompatibleToolSchemaCases(source)) {
      it(`${key} uses an MCP-compatible top-level object schema`, () => {
        expectMcpCompatibleToolSchema(tool);
      });
    }
  });
};
