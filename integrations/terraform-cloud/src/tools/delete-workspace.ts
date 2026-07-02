import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let deleteWorkspaceTool = SlateTool.create(spec, {
  name: 'Delete Workspace',
  key: 'delete_workspace',
  description: `Permanently delete a workspace and all of its content (state versions, runs, variables). This action cannot be undone.`,
  tags: {
    destructive: true
  },
  constraints: [
    'The workspace must not be locked. Unlock it first if needed.',
    'This permanently deletes the workspace and all associated data.'
  ]
})
  .input(
    z.object({
      workspaceId: z.string().describe('The ID of the workspace to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    await client.deleteWorkspace(ctx.input.workspaceId);

    return {
      output: { deleted: true },
      message: `Workspace ${ctx.input.workspaceId} has been permanently deleted.`
    };
  })
  .build();
