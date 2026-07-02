import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listProjects = SlateTool.create(spec, {
  name: 'List Projects',
  key: 'list_projects',
  description: `List Hex projects in the workspace. Supports filtering by status, category, creator, owner, or collection. Returns paginated results sorted by most recently created first.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Number of results per page (1-100)'),
      after: z.string().optional().describe('Pagination cursor for the next page'),
      sortBy: z.string().optional().describe('Field to sort by'),
      sortDirection: z.enum(['ASC', 'DESC']).optional().describe('Sort direction'),
      statuses: z.array(z.string()).optional().describe('Filter by project statuses'),
      categories: z.array(z.string()).optional().describe('Filter by project categories'),
      creatorEmail: z.string().optional().describe('Filter by creator email address'),
      ownerEmail: z.string().optional().describe('Filter by owner email address'),
      collectionId: z.string().optional().describe('Filter by collection ID'),
      includeArchived: z.boolean().optional().describe('Include archived projects'),
      includeTrashed: z.boolean().optional().describe('Include trashed projects'),
      includeSharing: z
        .boolean()
        .optional()
        .describe('Include sharing details in the response')
    })
  )
  .output(
    z.object({
      projects: z.array(
        z.object({
          projectId: z.string(),
          title: z.string(),
          description: z.string().nullable(),
          status: z.string().nullable(),
          categories: z.array(z.string()),
          creator: z
            .object({ userId: z.string(), email: z.string(), name: z.string() })
            .nullable(),
          owner: z
            .object({ userId: z.string(), email: z.string(), name: z.string() })
            .nullable(),
          createdAt: z.string(),
          updatedAt: z.string(),
          publishedAt: z.string().nullable()
        })
      ),
      nextCursor: z
        .string()
        .optional()
        .describe('Cursor for fetching the next page of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });

    let result = await client.listProjects({
      limit: ctx.input.limit,
      after: ctx.input.after,
      sortBy: ctx.input.sortBy,
      sortDirection: ctx.input.sortDirection,
      statuses: ctx.input.statuses,
      categories: ctx.input.categories,
      creatorEmail: ctx.input.creatorEmail,
      ownerEmail: ctx.input.ownerEmail,
      collectionId: ctx.input.collectionId,
      includeArchived: ctx.input.includeArchived,
      includeTrashed: ctx.input.includeTrashed,
      includeSharing: ctx.input.includeSharing
    });

    let projects = result.values ?? [];

    return {
      output: {
        projects,
        nextCursor: result.pagination?.after
      },
      message: `Found **${projects.length}** project(s).${result.pagination?.after ? ' More results available.' : ''}`
    };
  })
  .build();
