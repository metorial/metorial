import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createProject = SlateTool.create(spec, {
  name: 'Create Project',
  key: 'create_project',
  description: `Create a new project in a workspace. Supports setting name, notes, layout, dates, team, color, and privacy.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      workspaceId: z.string().describe('Workspace GID to create the project in'),
      name: z.string().describe('Name of the project'),
      notes: z.string().optional().describe('Description/notes for the project'),
      color: z
        .string()
        .optional()
        .describe('Color for the project (e.g., "dark-green", "dark-blue")'),
      defaultView: z
        .enum(['list', 'board', 'calendar', 'timeline'])
        .optional()
        .describe('Default view layout'),
      dueOn: z.string().optional().describe('Due date in YYYY-MM-DD format'),
      startOn: z.string().optional().describe('Start date in YYYY-MM-DD format'),
      teamId: z.string().optional().describe('Team GID to share the project with'),
      isPublic: z
        .boolean()
        .optional()
        .describe('Whether the project is visible to the workspace')
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

    let data: Record<string, any> = { name: ctx.input.name };
    if (ctx.input.notes) data.notes = ctx.input.notes;
    if (ctx.input.color) data.color = ctx.input.color;
    if (ctx.input.defaultView) data.default_view = ctx.input.defaultView;
    if (ctx.input.dueOn) data.due_on = ctx.input.dueOn;
    if (ctx.input.startOn) data.start_on = ctx.input.startOn;
    if (ctx.input.teamId) data.team = ctx.input.teamId;
    if (ctx.input.isPublic !== undefined) data.public = ctx.input.isPublic;

    let project = await client.createProject(ctx.input.workspaceId, data);

    return {
      output: {
        projectId: project.gid,
        name: project.name
      },
      message: `Created project **${project.name}** (${project.gid}).`
    };
  })
  .build();
