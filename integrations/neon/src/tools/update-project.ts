import { SlateTool } from 'slates';
import { z } from 'zod';
import { NeonClient } from '../lib/client';
import { spec } from '../spec';

export let updateProject = SlateTool.create(spec, {
  name: 'Update Project',
  key: 'update_project',
  description: `Updates an existing Neon project's settings, including its name and default endpoint configuration.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project to update'),
      name: z.string().optional().describe('New name for the project')
    })
  )
  .output(
    z.object({
      projectId: z.string().describe('Unique identifier of the updated project'),
      name: z.string().describe('Updated name of the project'),
      updatedAt: z.string().describe('Timestamp when the project was last updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NeonClient({ token: ctx.auth.token });

    let result = await client.updateProject(ctx.input.projectId, {
      name: ctx.input.name
    });

    let p = result.project;

    return {
      output: {
        projectId: p.id,
        name: p.name,
        updatedAt: p.updated_at
      },
      message: `Updated project **${p.name}** (${p.id}).`
    };
  })
  .build();
