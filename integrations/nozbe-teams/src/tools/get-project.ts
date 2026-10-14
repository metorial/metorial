import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getProject = SlateTool.create(spec, {
  name: 'Get Project',
  key: 'get_project',
  description:
    'Retrieve a Nozbe project by ID, including its space, visibility, and archive state.',
  tags: { readOnly: true }
})
  .input(z.object({ projectId: z.string().describe('Project ID from list_projects') }))
  .output(
    z.object({
      projectId: z.string().describe('Project ID'),
      name: z.string().describe('Project name'),
      teamId: z.string().describe('Space ID'),
      authorId: z.string().optional().describe('Project creator ID'),
      description: z.string().nullable().optional().describe('Project description'),
      color: z.string().nullable().optional().describe('Project color'),
      isOpen: z
        .boolean()
        .optional()
        .describe('Whether all space members can access the project'),
      isFavorite: z.boolean().optional().describe('Whether the project is a favorite'),
      isTemplate: z.boolean().optional().describe('Whether this is a project template'),
      isSingleActions: z
        .boolean()
        .optional()
        .describe('Whether this is the Single Tasks project'),
      createdAt: z.number().optional().describe('Creation timestamp in milliseconds'),
      endedAt: z.number().nullable().optional().describe('Archive timestamp in milliseconds'),
      lastEventAt: z
        .number()
        .optional()
        .describe('Latest project event timestamp in milliseconds')
    })
  )
  .handleInvocation(async ctx => {
    let project = await new Client({ token: ctx.auth.token }).getProject(ctx.input.projectId);
    return {
      output: {
        projectId: project.id,
        name: project.name,
        teamId: project.team_id,
        authorId: project.author_id,
        description: project.description,
        color: project.color,
        isOpen: project.is_open,
        isFavorite: project.is_favorite,
        isTemplate: project.is_template,
        isSingleActions: project.is_single_actions,
        createdAt: project.created_at,
        endedAt: project.ended_at,
        lastEventAt: project.last_event_at
      },
      message: `Retrieved project **${project.name}** (ID: ${project.id}).`
    };
  })
  .build();
