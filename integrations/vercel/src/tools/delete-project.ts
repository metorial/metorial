import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteProjectTool = SlateTool.create(spec, {
  name: 'Delete Project',
  key: 'delete_project',
  description: `Permanently delete a Vercel project and all its deployments. This action cannot be undone.`,
  tags: {
    destructive: true
  },
  constraints: [
    'This action is irreversible. All deployments and settings will be permanently removed.'
  ]
})
  .input(
    z.object({
      projectIdOrName: z.string().describe('Project ID or name to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the project was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      teamId: ctx.config.teamId
    });

    await client.deleteProject(ctx.input.projectIdOrName);

    return {
      output: { deleted: true },
      message: `Deleted project **${ctx.input.projectIdOrName}**.`
    };
  })
  .build();
