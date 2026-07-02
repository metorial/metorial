import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let deleteWorkspaceTool = SlateTool.create(spec, {
  name: 'Delete Workspace',
  key: 'delete_workspace',
  description: `Permanently delete an Airbyte workspace. This action cannot be undone and will affect all resources within the workspace.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      workspaceId: z.string().describe('The UUID of the workspace to delete.')
    })
  )
  .output(
    z.object({
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    await client.deleteWorkspace(ctx.input.workspaceId);

    return {
      output: { success: true },
      message: `Deleted workspace ${ctx.input.workspaceId}.`
    };
  })
  .build();
