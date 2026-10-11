import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listProjectsTool = SlateTool.create(spec, {
  name: 'List Projects',
  key: 'list_projects',
  description: `List all Railway projects accessible to the authenticated user. Optionally filter by workspace (discover workspace IDs with Get Current User). Returns project names, descriptions, and timestamps, with cursor pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workspaceId: z
        .string()
        .optional()
        .describe(
          'Filter projects by workspace ID. Call get_current_user to discover workspace IDs. Omit to list all accessible projects.'
        ),
      limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe('Maximum number of projects to return per page'),
      cursor: z
        .string()
        .optional()
        .describe('Pagination cursor from a previous response nextCursor')
    })
  )
  .output(
    z.object({
      projects: z.array(
        z.object({
          projectId: z.string().describe('Unique project identifier'),
          name: z.string().describe('Project name'),
          description: z.string().nullable().describe('Project description'),
          workspaceId: z.string().nullable().describe('Workspace that owns the project'),
          createdAt: z.string().describe('Creation timestamp'),
          updatedAt: z.string().describe('Last update timestamp')
        })
      ),
      nextCursor: z
        .string()
        .nullable()
        .describe('Cursor for the next page, or null when there are no more projects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, tokenHeader: ctx.auth.tokenHeader });
    let { projects, nextCursor } = await client.listProjects({
      workspaceId: ctx.input.workspaceId,
      first: ctx.input.limit,
      after: ctx.input.cursor
    });

    let mapped = projects.map((p: any) => ({
      projectId: p.id,
      name: p.name,
      description: p.description ?? null,
      workspaceId: p.workspaceId ?? null,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt
    }));

    return {
      output: { projects: mapped, nextCursor },
      message: `Found **${mapped.length}** project(s).`
    };
  })
  .build();
