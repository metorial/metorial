import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { mapProject, projectOutputSchema } from '../lib/schemas';
import { spec } from '../spec';

export let createProject = SlateTool.create(spec, {
  name: 'Create Project',
  key: 'create_project',
  description: `Create a new project (task list) in TickTick. Projects can be configured with a color, view mode (list, kanban, or timeline), and kind (TASK or NOTE).`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Project name'),
      color: z.string().optional().describe('Hex color code, e.g. "#F18181"'),
      viewMode: z
        .enum(['list', 'kanban', 'timeline'])
        .optional()
        .describe('Project view mode'),
      kind: z.enum(['TASK', 'NOTE']).optional().describe('Project kind'),
      sortOrder: z.number().optional().describe('Sort order for display')
    })
  )
  .output(projectOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let project = await client.createProject({
      name: ctx.input.name,
      color: ctx.input.color,
      viewMode: ctx.input.viewMode,
      kind: ctx.input.kind,
      sortOrder: ctx.input.sortOrder
    });

    return {
      output: mapProject(project),
      message: `Created project **${project.name}**.`
    };
  })
  .build();
