import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listSourcesTool = SlateTool.create(spec, {
  name: 'List Sources',
  key: 'list_sources',
  description: `List configured data source connectors in Airbyte. Returns source names, types, workspace associations, and configurations. Supports filtering by workspace and pagination.`,
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
          'Filter sources by workspace IDs. If empty, returns sources from all accessible workspaces.'
        ),
      includeDeleted: z.boolean().optional().describe('Include deleted sources in results.'),
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Maximum number of sources to return (1-100).'),
      offset: z.number().optional().describe('Offset for pagination.')
    })
  )
  .output(
    z.object({
      sources: z.array(
        z.object({
          sourceId: z.string(),
          name: z.string(),
          sourceType: z.string(),
          workspaceId: z.string(),
          configuration: z.record(z.string(), z.any())
        })
      ),
      hasMore: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result = await client.listSources({
      workspaceIds: ctx.input.workspaceIds,
      includeDeleted: ctx.input.includeDeleted,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    return {
      output: {
        sources: result.data.map(s => ({
          sourceId: s.sourceId,
          name: s.name,
          sourceType: s.sourceType,
          workspaceId: s.workspaceId,
          configuration: s.configuration
        })),
        hasMore: !!result.next
      },
      message: `Found **${result.data.length}** source(s).${result.next ? ' More results available with pagination.' : ''}`
    };
  })
  .build();
