import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteProject = SlateTool.create(spec, {
  name: 'Delete Project',
  key: 'delete_project',
  description: `Permanently delete a project from Nozbe Teams. This action cannot be undone and will remove all tasks, comments, and other data within the project.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project to delete')
    })
  )
  .output(
    z.object({
      projectId: z.string().describe('ID of the deleted project'),
      deleted: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.deleteProject(ctx.input.projectId);

    return {
      output: {
        projectId: ctx.input.projectId,
        deleted: true
      },
      message: `Deleted project **${ctx.input.projectId}**.`
    };
  })
  .build();
