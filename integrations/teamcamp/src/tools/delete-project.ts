import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteProject = SlateTool.create(spec, {
  name: 'Delete Project',
  key: 'delete_project',
  description: `Permanently delete a project from the workspace. This action is irreversible and will remove the project and all its associated data.`,
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
      deleted: z.boolean().describe('Whether the project was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteProject(ctx.input.projectId);

    return {
      output: { deleted: true },
      message: `Deleted project **${ctx.input.projectId}**.`
    };
  })
  .build();
