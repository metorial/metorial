import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteProject = SlateTool.create(spec, {
  name: 'Delete Project',
  key: 'delete_project',
  description: `Permanently delete a project from Worksnaps. This removes the project and all associated data including tasks, time entries, and assignments.`,
  constraints: ['This action is irreversible. All project data will be permanently deleted.'],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      projectId: z.string().describe('The ID of the project to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the project was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    await client.deleteProject(ctx.input.projectId);

    return {
      output: { deleted: true },
      message: `Deleted project **${ctx.input.projectId}**.`
    };
  })
  .build();
