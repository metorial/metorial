import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let deleteVariableTool = SlateTool.create(spec, {
  name: 'Delete Variable',
  key: 'delete_variable',
  description: `Permanently delete a variable from a workspace. This removes the variable from both the workspace and any future runs.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      workspaceId: z.string().describe('The workspace ID containing the variable'),
      variableId: z.string().describe('The variable ID to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    await client.deleteVariable(ctx.input.workspaceId, ctx.input.variableId);

    return {
      output: { deleted: true },
      message: `Variable ${ctx.input.variableId} has been deleted from workspace ${ctx.input.workspaceId}.`
    };
  })
  .build();
