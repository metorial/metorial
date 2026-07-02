import { SlateTool } from 'slates';
import { z } from 'zod';
import { TimelyClient } from '../lib/client';
import { spec } from '../spec';

export let deleteProject = SlateTool.create(spec, {
  name: 'Delete Project',
  key: 'delete_project',
  description: `Permanently delete a project from Timely. This cannot be undone. Consider archiving (via Update Project with active=false) instead.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TimelyClient({
      accountId: ctx.config.accountId,
      token: ctx.auth.token
    });

    await client.deleteProject(ctx.input.projectId);

    return {
      output: { deleted: true },
      message: `Deleted project **#${ctx.input.projectId}**.`
    };
  })
  .build();
