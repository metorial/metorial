import { SlateTool } from 'slates';
import { z } from 'zod';
import { FlowiseClient } from '../lib/client';
import { spec } from '../spec';

export let updateVariable = SlateTool.create(spec, {
  name: 'Update Variable',
  key: 'update_variable',
  description: `Update an existing runtime variable's name, value, or type.`,
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      variableId: z.string().describe('ID of the variable to update'),
      name: z.string().optional().describe('Updated variable name'),
      value: z.string().optional().describe('Updated variable value'),
      type: z.string().optional().describe('Updated variable type')
    })
  )
  .output(
    z.object({
      variableId: z.string().describe('ID of the updated variable'),
      name: z.string().describe('Updated variable name'),
      value: z.string().optional().nullable().describe('Updated value'),
      type: z.string().optional().describe('Updated type'),
      updatedDate: z.string().optional().describe('ISO 8601 last update date')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FlowiseClient({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    let { variableId, ...updateData } = ctx.input;
    let result = await client.updateVariable(variableId, updateData);

    return {
      output: {
        variableId: result.id,
        name: result.name,
        value: result.value,
        type: result.type,
        updatedDate: result.updatedDate
      },
      message: `Updated variable **${result.name}** (\`${result.id}\`).`
    };
  })
  .build();
