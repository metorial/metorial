import { SlateTool } from 'slates';
import { z } from 'zod';
import { ZeplinClient } from '../lib/client';
import { spec } from '../spec';

export let updateProject = SlateTool.create(spec, {
  name: 'Update Project',
  key: 'update_project',
  description: `Update a Zeplin project's name or description.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project to update'),
      name: z.string().optional().describe('New name for the project'),
      description: z.string().optional().describe('New description for the project')
    })
  )
  .output(
    z.object({
      projectId: z.string().describe('Updated project ID'),
      name: z.string().describe('Updated project name'),
      description: z.string().optional().describe('Updated project description')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ZeplinClient(ctx.auth.token);

    let updateData: { name?: string; description?: string } = {};
    if (ctx.input.name !== undefined) updateData.name = ctx.input.name;
    if (ctx.input.description !== undefined) updateData.description = ctx.input.description;

    let result = (await client.updateProject(ctx.input.projectId, updateData)) as any;

    return {
      output: {
        projectId: result.id,
        name: result.name,
        description: result.description
      },
      message: `Updated project **${result.name}**.`
    };
  })
  .build();
