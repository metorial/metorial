import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createProject = SlateTool.create(spec, {
  name: 'Create Project',
  key: 'create_project',
  description: `Create a new project in Nozbe Teams. Configure the project with a name, description, color, visibility, and other settings. Requires a paid account.`,
  constraints: ['Creating new projects is available for paid accounts only.'],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Project name (1-255 characters)'),
      teamId: z.string().describe('Team ID to create the project in'),
      description: z.string().optional().describe('Project purpose or description'),
      color: z.string().optional().describe('Project color'),
      isOpen: z
        .boolean()
        .optional()
        .describe('Whether the project is open to all space members (default false)'),
      isFavorite: z.boolean().optional().describe('Whether to mark the project as favorite'),
      isTemplate: z.boolean().optional().describe('Whether to create as a template project')
    })
  )
  .output(
    z.object({
      projectId: z.string().describe('ID of the created project'),
      name: z.string().describe('Name of the created project'),
      teamId: z.string().describe('Team ID'),
      description: z.string().nullable().optional().describe('Project description'),
      color: z.string().nullable().optional().describe('Project color'),
      isOpen: z.boolean().optional().describe('Open status'),
      createdAt: z.number().optional().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data: Record<string, unknown> = {
      name: ctx.input.name,
      team_id: ctx.input.teamId
    };
    if (ctx.input.description !== undefined) data.description = ctx.input.description;
    if (ctx.input.color !== undefined) data.color = ctx.input.color;
    if (ctx.input.isOpen !== undefined) data.is_open = ctx.input.isOpen;
    if (ctx.input.isFavorite !== undefined) data.is_favorite = ctx.input.isFavorite;
    if (ctx.input.isTemplate !== undefined) data.is_template = ctx.input.isTemplate;

    let project = await client.createProject(data);

    return {
      output: {
        projectId: project.id,
        name: project.name,
        teamId: project.team_id,
        description: project.description,
        color: project.color,
        isOpen: project.is_open,
        createdAt: project.created_at
      },
      message: `Created project **${project.name}** (ID: ${project.id}).`
    };
  })
  .build();
