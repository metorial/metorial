import { SlateTool } from 'slates';
import { z } from 'zod';
import { FlowiseClient } from '../lib/client';
import { spec } from '../spec';

export let createVariable = SlateTool.create(spec, {
  name: 'Create Variable',
  key: 'create_variable',
  description: `Create a new runtime variable in Flowise. Variables can be used throughout workflows and passed via overrideConfig at prediction time.`,
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name for the variable'),
      value: z.string().optional().describe('Value for the variable'),
      type: z.string().optional().describe('Type of variable (e.g. string, number, secret)')
    })
  )
  .output(
    z.object({
      variableId: z.string().describe('ID of the newly created variable'),
      name: z.string().describe('Variable name'),
      value: z.string().optional().nullable().describe('Variable value'),
      type: z.string().optional().describe('Variable type'),
      createdDate: z.string().optional().describe('ISO 8601 creation date')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FlowiseClient({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    let result = await client.createVariable(ctx.input);

    return {
      output: {
        variableId: result.id,
        name: result.name,
        value: result.value,
        type: result.type,
        createdDate: result.createdDate
      },
      message: `Created variable **${result.name}** (\`${result.id}\`).`
    };
  })
  .build();
