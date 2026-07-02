import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteProject = SlateTool.create(spec, {
  name: 'Delete or Archive Project',
  key: 'delete_project',
  description: `Deletes or archives a project in Rocketlane. Archiving is reversible and preserves the project data, while deletion is permanent.`,
  instructions: [
    'Use archive mode when you want to preserve the project data but remove it from active view.',
    'Use delete mode for permanent removal. This action cannot be undone.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      projectId: z.number().describe('ID of the project'),
      action: z
        .enum(['delete', 'archive'])
        .describe('Whether to permanently delete or archive the project')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation succeeded'),
      action: z.string().describe('The action that was performed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'archive') {
      await client.archiveProject(ctx.input.projectId);
    } else {
      await client.deleteProject(ctx.input.projectId);
    }

    return {
      output: {
        success: true,
        action: ctx.input.action
      },
      message: `Project ${ctx.input.projectId} has been **${ctx.input.action === 'archive' ? 'archived' : 'deleted'}**.`
    };
  })
  .build();
