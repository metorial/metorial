import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { mapVariable } from '../lib/mappers';
import { spec } from '../spec';

export let updateVariableTool = SlateTool.create(spec, {
  name: 'Update Variable',
  key: 'update_variable',
  description: `Update an existing variable's key, value, description, HCL setting, or sensitivity. Only provided fields will be updated.`
})
  .input(
    z.object({
      workspaceId: z.string().describe('The workspace ID containing the variable'),
      variableId: z.string().describe('The variable ID to update'),
      key: z.string().optional().describe('New variable key/name'),
      value: z.string().optional().describe('New variable value'),
      description: z.string().optional().describe('New variable description'),
      hcl: z.boolean().optional().describe('Whether the value is HCL-formatted'),
      sensitive: z.boolean().optional().describe('Whether the variable is sensitive')
    })
  )
  .output(
    z.object({
      variableId: z.string(),
      key: z.string(),
      value: z.string(),
      description: z.string(),
      category: z.string(),
      hcl: z.boolean(),
      sensitive: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { workspaceId, variableId, ...updates } = ctx.input;
    let response = await client.updateVariable(workspaceId, variableId, updates);
    let variable = mapVariable(response.data);

    return {
      output: variable,
      message: `Updated variable **${variable.key}** (${variable.variableId}).`
    };
  })
  .build();
