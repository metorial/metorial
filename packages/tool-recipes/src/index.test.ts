import { SlateAuth, SlateConfig, SlateSpecification } from 'slates';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { defineToolRecipe, includeTool } from './index';

let createSpec = () =>
  SlateSpecification.create({
    key: 'recipe-test',
    name: 'Recipe Test',
    config: SlateConfig.create(z.object({})),
    auth: SlateAuth.create().output(z.object({ token: z.string() }))
  });

describe('tool recipes', () => {
  it('applies key, name, and description overrides', () => {
    let recipe = defineToolRecipe({
      key: 'base_tool',
      name: 'Base Tool',
      description: 'Base description',
      inputSchema: z.object({ value: z.string() }),
      outputSchema: z.object({ value: z.string() }),
      handleInvocation: async ({ ctx }) => ({
        output: { value: ctx.input.value },
        message: 'ok'
      })
    });

    let tool = includeTool({
      recipe,
      spec: createSpec(),
      dependencies: {},
      key: 'included_tool',
      name: 'Included Tool',
      description: 'Included description'
    });

    expect(tool.key).toBe('included_tool');
    expect(tool.name).toBe('Included Tool');
    expect(tool.description).toBe('Included description');
  });

  it('applies integration-provided scopes', () => {
    let defaultScopes = { AND: [{ OR: ['scope:default'] }] };
    let integrationScopes = { AND: [{ OR: ['scope:integration'] }] };
    let recipe = defineToolRecipe({
      key: 'scoped_tool',
      name: 'Scoped Tool',
      inputSchema: z.object({}),
      outputSchema: z.object({ ok: z.boolean() }),
      defaultScopes,
      handleInvocation: async () => ({
        output: { ok: true },
        message: 'ok'
      })
    });

    let tool = includeTool({
      recipe,
      spec: createSpec(),
      dependencies: {},
      scopes: integrationScopes
    });

    expect(tool.scopes).toEqual(integrationScopes);
  });

  it('invokes the recipe handler with dependency factories', async () => {
    let createClient = vi.fn(() => ({ value: 'from-dependency' }));
    let handleInvocation = vi.fn(async ({ ctx, dependencies }) => ({
      output: {
        value: `${dependencies.createClient().value}:${ctx.input.value}`
      },
      message: 'ok'
    }));
    let recipe = defineToolRecipe({
      key: 'dependency_tool',
      name: 'Dependency Tool',
      inputSchema: z.object({ value: z.string() }),
      outputSchema: z.object({ value: z.string() }),
      handleInvocation
    });
    let tool = includeTool({
      recipe,
      spec: createSpec(),
      dependencies: { createClient }
    });
    let ctx = {
      input: { value: 'from-input' },
      auth: { token: 'token' },
      config: {}
    } as any;

    let result = await tool.handleInvocation(ctx);

    expect(result.output.value).toBe('from-dependency:from-input');
    expect(handleInvocation).toHaveBeenCalledWith({
      ctx,
      dependencies: { createClient }
    });
    expect(createClient).toHaveBeenCalledTimes(1);
  });
});
