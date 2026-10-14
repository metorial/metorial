import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { validatePagination } from '../lib/validation';
import { spec } from '../spec';

export let listWorkspaces = SlateTool.create(spec, {
  name: 'List Workspaces',
  key: 'list_workspaces',
  description: `List all workspaces (projects) in the Split organization. Returns workspace IDs, names, and whether they require title/comments for changes. Useful for discovering available workspaces.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      name: z.string().optional().describe('Filter workspaces by name.'),
      offset: z.number().optional().describe('Pagination offset. Defaults to 0.'),
      limit: z
        .number()
        .optional()
        .describe('Max results to return, up to 1000. Defaults to 50.'),
      nameOp: z
        .enum(['IS', 'STARTS_WITH', 'CONTAINS'])
        .optional()
        .describe('Match operator for the name filter. Defaults to IS.'),
      organizationIdentifier: z
        .string()
        .optional()
        .describe('Filter by the Harness organization ID.'),
      projectIdentifier: z.string().optional().describe('Filter by the Harness project ID.')
    })
  )
  .output(
    z.object({
      workspaces: z.array(
        z.object({
          workspaceId: z.string(),
          workspaceName: z.string(),
          requiresTitleAndComments: z.boolean(),
          organizationIdentifier: z.string().optional(),
          projectIdentifier: z.string().optional()
        })
      ),
      totalCount: z.number(),
      offset: z.number().optional(),
      limit: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    validatePagination(ctx.input.offset, ctx.input.limit, 1000);
    let client = new Client(ctx.auth);
    let result = await client.listWorkspaces({
      name: ctx.input.name,
      offset: ctx.input.offset,
      limit: ctx.input.limit,
      nameOp: ctx.input.nameOp,
      organizationIdentifier: ctx.input.organizationIdentifier,
      projectIdentifier: ctx.input.projectIdentifier
    });

    let workspaces = result.objects.map(w => ({
      workspaceId: w.id,
      workspaceName: w.name,
      requiresTitleAndComments: w.requiresTitleAndComments,
      organizationIdentifier: w.organizationIdentifier,
      projectIdentifier: w.projectIdentifier
    }));

    return {
      output: {
        workspaces,
        totalCount: result.totalCount,
        offset: result.offset,
        limit: result.limit
      },
      message: `Found **${result.totalCount}** workspaces.`
    };
  })
  .build();
