import { SlateTool } from 'slates';
import { z } from 'zod';
import { BugherdClient } from '../lib/client';
import { spec } from '../spec';

export let deleteProject = SlateTool.create(spec, {
  name: 'Delete Project',
  key: 'delete_project',
  description: `Permanently delete a BugHerd project and all its associated data (tasks, comments, attachments). This action cannot be undone.`,
  constraints: [
    'This action is irreversible. All project data including tasks, comments, and attachments will be permanently removed.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      projectId: z.number().describe('ID of the project to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the project was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BugherdClient(ctx.auth.token);
    await client.deleteProject(ctx.input.projectId);

    return {
      output: { deleted: true },
      message: `Permanently deleted project ID: ${ctx.input.projectId}.`
    };
  })
  .build();
