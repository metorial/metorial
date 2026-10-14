import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteProject = SlateTool.create(spec, {
  name: 'Delete Project',
  key: 'delete_project',
  description: `Archive a project in Worksnaps, making it inactive. Call list_projects to discover the project ID.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      projectId: z
        .string()
        .describe('Project ID to archive. Call list_projects to discover available projects.')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the project was successfully archived')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    await client.deleteProject(ctx.input.projectId);

    return {
      output: { deleted: true },
      message: `Archived project **${ctx.input.projectId}**.`
    };
  })
  .build();
