import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listWorkspacesTool = SlateTool.create(spec, {
  name: 'List Workspaces',
  key: 'list_workspaces',
  description: `List Airbyte workspaces. Workspaces are organizational units that group sources, destinations, and connections. Supports filtering and pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workspaceIds: z
        .array(z.string())
        .optional()
        .describe(
          'Filter by specific workspace IDs. If empty, returns all accessible workspaces.'
        ),
      includeDeleted: z
        .boolean()
        .optional()
        .describe('Include deleted workspaces in results.'),
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Maximum number of workspaces to return (1-100).'),
      offset: z.number().optional().describe('Offset for pagination.')
    })
  )
  .output(
    z.object({
      workspaces: z.array(
        z.object({
          workspaceId: z.string(),
          name: z.string(),
          dataResidency: z.string()
        })
      ),
      hasMore: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result = await client.listWorkspaces({
      workspaceIds: ctx.input.workspaceIds,
      includeDeleted: ctx.input.includeDeleted,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    return {
      output: {
        workspaces: result.data.map(w => ({
          workspaceId: w.workspaceId,
          name: w.name,
          dataResidency: w.dataResidency
        })),
        hasMore: !!result.next
      },
      message: `Found **${result.data.length}** workspace(s).`
    };
  })
  .build();
