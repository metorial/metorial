import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateProject = SlateTool.create(spec, {
  name: 'Update Project',
  key: 'update_project',
  description: `Update an existing project's name or description. Only the fields provided will be updated; omitted fields remain unchanged.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      projectId: z.string().describe('The ID of the project to update'),
      name: z.string().optional().describe('New name for the project'),
      description: z.string().optional().describe('New description for the project')
    })
  )
  .output(
    z.object({
      project: z.record(z.string(), z.unknown()).describe('The updated project')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let data: Record<string, string> = {};
    if (ctx.input.name !== undefined) data.name = ctx.input.name;
    if (ctx.input.description !== undefined) data.description = ctx.input.description;

    let project = await client.updateProject(ctx.input.projectId, data);

    return {
      output: { project },
      message: `Updated project **${ctx.input.projectId}**.`
    };
  })
  .build();
