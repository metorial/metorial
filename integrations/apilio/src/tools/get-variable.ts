import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getVariable = SlateTool.create(spec, {
  name: 'Get Variable',
  key: 'get_variable',
  description: `Retrieve the current value and details of a specific variable in Apilio by its ID. Supports boolean, string, and numeric variable types. Useful for checking a variable's current state before updating it or making automation decisions.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      variableId: z.string().describe('ID (UUID) of the variable to retrieve'),
      variableType: z.enum(['boolean', 'string', 'numeric']).describe('Type of the variable')
    })
  )
  .output(
    z.object({
      variableId: z.string().describe('Unique identifier of the variable'),
      name: z.string().describe('Name of the variable'),
      variableType: z.enum(['boolean', 'string', 'numeric']).describe('Type of the variable'),
      value: z
        .union([z.boolean(), z.string(), z.number()])
        .nullable()
        .describe('Current value of the variable'),
      createdAt: z.string().describe('When the variable was created'),
      updatedAt: z.string().describe('When the variable was last updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let variableId: string;
    let name: string;
    let value: boolean | string | number | null;
    let createdAt: string;
    let updatedAt: string;

    if (ctx.input.variableType === 'boolean') {
      let v = await client.getBooleanVariable(ctx.input.variableId);
      variableId = v.id;
      name = v.name;
      value = v.value;
      createdAt = v.created_at;
      updatedAt = v.updated_at;
    } else if (ctx.input.variableType === 'string') {
      let v = await client.getStringVariable(ctx.input.variableId);
      variableId = v.id;
      name = v.name;
      value = v.value;
      createdAt = v.created_at;
      updatedAt = v.updated_at;
    } else {
      let v = await client.getNumericVariable(ctx.input.variableId);
      variableId = v.id;
      name = v.name;
      value = v.value;
      createdAt = v.created_at;
      updatedAt = v.updated_at;
    }

    return {
      output: {
        variableId,
        name,
        variableType: ctx.input.variableType,
        value,
        createdAt,
        updatedAt
      },
      message: `**${ctx.input.variableType}** variable **${name}** = **${value === null ? '(empty)' : String(value)}**.`
    };
  })
  .build();
