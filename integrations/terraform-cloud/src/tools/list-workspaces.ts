import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { mapPagination, mapWorkspace } from '../lib/mappers';
import { spec } from '../spec';

export let listWorkspacesTool = SlateTool.create(spec, {
  name: 'List Workspaces',
  key: 'list_workspaces',
  description: `List workspaces in the organization. Supports searching by name and filtering by project. Returns workspace configuration including execution mode, Terraform version, lock status, and VCS connection.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      search: z.string().optional().describe('Search workspaces by name (partial match)'),
      projectId: z.string().optional().describe('Filter workspaces by project ID'),
      pageNumber: z.number().optional().describe('Page number for pagination (default: 1)'),
      pageSize: z
        .number()
        .optional()
        .describe('Number of results per page (default: 20, max: 100)')
    })
  )
  .output(
    z.object({
      workspaces: z.array(
        z.object({
          workspaceId: z.string(),
          name: z.string(),
          description: z.string(),
          autoApply: z.boolean(),
          executionMode: z.string(),
          terraformVersion: z.string(),
          workingDirectory: z.string(),
          locked: z.boolean(),
          createdAt: z.string(),
          updatedAt: z.string(),
          resourceCount: z.number(),
          vcsRepoIdentifier: z.string(),
          projectId: z.string()
        })
      ),
      pagination: z.object({
        currentPage: z.number(),
        totalPages: z.number(),
        totalCount: z.number(),
        pageSize: z.number()
      })
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let response = await client.listWorkspaces({
      search: ctx.input.search,
      projectId: ctx.input.projectId,
      pageNumber: ctx.input.pageNumber,
      pageSize: ctx.input.pageSize
    });

    let workspaces = (response.data || []).map(mapWorkspace);
    let pagination = mapPagination(response.meta);

    return {
      output: { workspaces, pagination },
      message: `Found **${pagination.totalCount}** workspace(s) (page ${pagination.currentPage}/${pagination.totalPages}).`
    };
  })
  .build();
