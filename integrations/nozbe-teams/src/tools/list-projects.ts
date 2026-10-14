import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, type ListParams } from '../lib/client';
import { teamIdSchema } from '../lib/schemas';
import { spec } from '../spec';

let projectSchema = z.object({
  projectId: z.string().describe('Unique project identifier'),
  name: z.string().describe('Project name'),
  teamId: z.string().optional().describe('Team the project belongs to'),
  description: z.string().nullable().optional().describe('Project purpose/description'),
  color: z.string().nullable().optional().describe('Project color'),
  isOpen: z.boolean().optional().describe('Whether the project is open to all space members'),
  isFavorite: z.boolean().optional().describe('Whether the project is favorited'),
  isTemplate: z.boolean().optional().describe('Whether the project is a template'),
  isSingleActions: z.boolean().optional().describe('Whether this is a single actions project'),
  createdAt: z.number().optional().describe('Creation timestamp in milliseconds'),
  endedAt: z.number().nullable().optional().describe('Ended timestamp in milliseconds'),
  lastEventAt: z.number().optional().describe('Last event timestamp in milliseconds')
});

export let listProjects = SlateTool.create(spec, {
  name: 'List Projects',
  key: 'list_projects',
  description: `Retrieve projects from Nozbe Teams. Supports filtering by team, favorite status, and single actions projects. Results can be sorted and paginated.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      teamId: teamIdSchema.optional(),
      isFavorite: z.boolean().optional().describe('Filter to favorite projects only'),
      isSingleActions: z.boolean().optional().describe('Filter for single action projects'),
      sortBy: z
        .string()
        .optional()
        .describe(
          'Sort fields, comma-separated. Prefix with - for descending, e.g. "-created_at,name"'
        ),
      limit: z
        .number()
        .refine(Number.isSafeInteger, 'Must be a whole number')
        .min(1)
        .max(10000)
        .optional()
        .describe('Maximum number of projects to return (1-10000, default 100)'),
      offset: z
        .number()
        .refine(Number.isSafeInteger, 'Must be a whole number')
        .min(0)
        .optional()
        .describe('Number of projects to skip for pagination')
    })
  )
  .output(
    z.object({
      projects: z.array(projectSchema).describe('List of projects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let params: ListParams = {};
    if (ctx.input.teamId) params.team_id = ctx.input.teamId;
    if (ctx.input.isFavorite !== undefined) params.is_favorite = ctx.input.isFavorite;
    if (ctx.input.isSingleActions !== undefined)
      params.is_single_actions = ctx.input.isSingleActions;
    if (ctx.input.sortBy) params.sortBy = ctx.input.sortBy;
    if (ctx.input.limit !== undefined) params.limit = ctx.input.limit;
    if (ctx.input.offset !== undefined) params.offset = ctx.input.offset;

    let projects = await client.listProjects(params);

    let mapped = projects.map((p: any) => ({
      projectId: p.id,
      name: p.name,
      teamId: p.team_id,
      description: p.description,
      color: p.color,
      isOpen: p.is_open,
      isFavorite: p.is_favorite,
      isTemplate: p.is_template,
      isSingleActions: p.is_single_actions,
      createdAt: p.created_at,
      endedAt: p.ended_at,
      lastEventAt: p.last_event_at
    }));

    return {
      output: { projects: mapped },
      message: `Found **${mapped.length}** project(s).`
    };
  })
  .build();
