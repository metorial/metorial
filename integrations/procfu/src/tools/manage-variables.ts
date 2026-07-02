import { SlateTool } from 'slates';
import { z } from 'zod';
import { ProcFuClient } from '../lib/client';
import { spec } from '../spec';

export let manageVariables = SlateTool.create(spec, {
  name: 'Manage Variables',
  key: 'manage_variables',
  description: `Get, set, list, or increment ProcFu global variables. Variables persist across script executions and can store up to 64KB of data.
- **get**: Retrieve a variable by name.
- **set**: Store a value under a variable name.
- **list**: List all stored variable names.
- **increment**: Atomically increment a numeric variable.`,
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['get', 'set', 'list', 'increment'])
        .describe('The variable operation to perform'),
      variableName: z
        .string()
        .optional()
        .describe('The variable name (required for get, set, increment)'),
      value: z.string().optional().describe('The value to store (required for set)')
    })
  )
  .output(
    z.object({
      variableName: z.string().optional().describe('The variable name'),
      value: z.any().optional().describe('The variable value (for get and set)'),
      variables: z.any().optional().describe('List of all variables (for list)'),
      result: z.any().optional().describe('The operation result')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ProcFuClient({ token: ctx.auth.token });

    if (ctx.input.action === 'get') {
      if (!ctx.input.variableName) {
        throw new Error('variableName is required for get');
      }
      let value = await client.getVariable(ctx.input.variableName);
      return {
        output: { variableName: ctx.input.variableName, value },
        message: `Retrieved variable **${ctx.input.variableName}**.`
      };
    }

    if (ctx.input.action === 'set') {
      if (!ctx.input.variableName || ctx.input.value === undefined) {
        throw new Error('variableName and value are required for set');
      }
      let result = await client.setVariable(ctx.input.variableName, ctx.input.value);
      return {
        output: { variableName: ctx.input.variableName, value: ctx.input.value, result },
        message: `Set variable **${ctx.input.variableName}**.`
      };
    }

    if (ctx.input.action === 'list') {
      let variables = await client.listVariables();
      return {
        output: { variables },
        message: `Listed all stored variables.`
      };
    }

    if (ctx.input.action === 'increment') {
      if (!ctx.input.variableName) {
        throw new Error('variableName is required for increment');
      }
      let result = await client.incrementVariable(ctx.input.variableName);
      return {
        output: { variableName: ctx.input.variableName, result },
        message: `Incremented variable **${ctx.input.variableName}**.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
