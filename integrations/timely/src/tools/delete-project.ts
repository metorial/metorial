import { SlateTool } from 'slates';
import { z } from 'zod';
import { createTimelyClient } from '../lib/client';
import { accountIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let deleteProject = SlateTool.create(spec, {
  name: 'Delete Project',
  key: 'delete_project',
  description: `Call list_accounts to choose a workspace when needed. Permanently delete a project from Timely. This cannot be undone. Consider archiving (via Update Project with active=false) instead.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      accountId: accountIdSchema,
      projectId: z.string().describe('ID of the project to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = await createTimelyClient(ctx);

    await client.deleteProject(ctx.input.projectId);

    return {
      output: { deleted: true },
      message: `Deleted project **#${ctx.input.projectId}**.`
    };
  })
  .build();
