import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateProject = SlateTool.create(spec, {
  name: 'Update Project',
  key: 'update_project',
  description: `Update an existing project's name, notes, dates, color, layout, archived status, or privacy setting.`
})
  .input(
    z.object({
      projectId: z.string().describe('Project GID to update'),
      name: z.string().optional().describe('New project name'),
      notes: z.string().optional().describe('New project notes/description'),
      color: z.string().optional().describe('New project color'),
      defaultView: z
        .enum(['list', 'board', 'calendar', 'timeline'])
        .optional()
        .describe('New default view'),
      dueOn: z
        .string()
        .nullable()
        .optional()
        .describe('New due date (YYYY-MM-DD) or null to clear'),
      startOn: z
        .string()
        .nullable()
        .optional()
        .describe('New start date (YYYY-MM-DD) or null to clear'),
      archived: z.boolean().optional().describe('Set archived status'),
      isPublic: z.boolean().optional().describe('Set visibility')
    })
  )
  .output(
    z.object({
      projectId: z.string(),
      name: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data: Record<string, any> = {};
    if (ctx.input.name !== undefined) data.name = ctx.input.name;
    if (ctx.input.notes !== undefined) data.notes = ctx.input.notes;
    if (ctx.input.color !== undefined) data.color = ctx.input.color;
    if (ctx.input.defaultView !== undefined) data.default_view = ctx.input.defaultView;
    if (ctx.input.dueOn !== undefined) data.due_on = ctx.input.dueOn;
    if (ctx.input.startOn !== undefined) data.start_on = ctx.input.startOn;
    if (ctx.input.archived !== undefined) data.archived = ctx.input.archived;
    if (ctx.input.isPublic !== undefined) data.public = ctx.input.isPublic;

    let project = await client.updateProject(ctx.input.projectId, data);

    return {
      output: {
        projectId: project.gid,
        name: project.name
      },
      message: `Updated project **${project.name}** (${project.gid}).`
    };
  })
  .build();
