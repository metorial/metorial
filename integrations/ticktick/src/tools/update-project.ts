import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { mapProject, projectOutputSchema } from '../lib/schemas';
import { spec } from '../spec';

export let updateProject = SlateTool.create(spec, {
  name: 'Update Project',
  key: 'update_project',
  description: `Update an existing project's properties in TickTick. Modify the name, color, view mode, or kind.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project to update'),
      name: z.string().optional().describe('New project name'),
      color: z.string().optional().describe('New hex color code, e.g. "#F18181"'),
      viewMode: z.enum(['list', 'kanban', 'timeline']).optional().describe('New view mode'),
      kind: z.enum(['TASK', 'NOTE']).optional().describe('New project kind'),
      sortOrder: z.number().optional().describe('New sort order')
    })
  )
  .output(projectOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let project = await client.updateProject(ctx.input.projectId, {
      name: ctx.input.name,
      color: ctx.input.color,
      viewMode: ctx.input.viewMode,
      kind: ctx.input.kind,
      sortOrder: ctx.input.sortOrder
    });

    return {
      output: mapProject(project),
      message: `Updated project **${project.name}**.`
    };
  })
  .build();
