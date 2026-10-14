import { SlateTool } from 'slates';
import { z } from 'zod';
import { TogglClient } from '../lib/client';
import { workspaceIdInput } from '../lib/schemas';
import { spec } from '../spec';

export let listProjects = SlateTool.create(spec, {
  name: 'List Projects',
  key: 'list_projects',
  description: `List projects in a Toggl workspace. Supports filtering by active status and searching by name.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workspaceId: workspaceIdInput,
      active: z
        .boolean()
        .optional()
        .describe('Filter by active status. True for active only, false for archived only.'),
      name: z.string().optional().describe('Filter projects by name (partial match)'),
      page: z.number().optional().describe('Page number for pagination'),
      perPage: z
        .number()
        .optional()
        .describe('Number of results per page (provider default 151, max 200)'),
      sortField: z
        .string()
        .optional()
        .describe('Field to sort by (e.g., "name", "created_at")'),
      sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort direction')
    })
  )
  .output(
    z.object({
      projects: z
        .array(
          z.object({
            projectId: z.number().describe('Project ID'),
            name: z.string().describe('Project name'),
            clientId: z.number().nullable().describe('Associated client ID'),
            active: z.boolean().describe('Whether active'),
            isPrivate: z.boolean().describe('Whether private'),
            billable: z.boolean().nullable().describe('Whether billable'),
            color: z.string().nullable().describe('Color hex code'),
            createdAt: z.string().describe('Creation timestamp')
          })
        )
        .describe('List of projects'),
      totalCount: z.number().describe('Number of projects returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TogglClient(ctx.auth.token, ctx.auth.defaultWorkspaceId);
    let wsId = await client.resolveWorkspaceId(ctx.input.workspaceId, ctx.config);

    let raw = await client.listProjects(wsId, {
      active: ctx.input.active,
      name: ctx.input.name,
      page: ctx.input.page,
      perPage: ctx.input.perPage,
      sortField: ctx.input.sortField,
      sortOrder: ctx.input.sortOrder
    });

    let projects = (raw ?? []).map((p: any) => ({
      projectId: p.id,
      name: p.name,
      clientId: p.client_id ?? null,
      active: p.active ?? true,
      isPrivate: p.is_private ?? false,
      billable: p.billable ?? null,
      color: p.color ?? null,
      createdAt: p.created_at ?? p.at
    }));

    return {
      output: { projects, totalCount: projects.length },
      message: `Found **${projects.length}** projects`
    };
  })
  .build();
