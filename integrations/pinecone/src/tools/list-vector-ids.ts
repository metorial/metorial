import { SlateTool } from 'slates';
import { z } from 'zod';
import { PineconeDataPlaneClient } from '../lib/client';
import { spec } from '../spec';

export let listVectorIdsTool = SlateTool.create(spec, {
  name: 'List Vector IDs',
  key: 'list_vector_ids',
  description: `List vector IDs in a Pinecone serverless index with optional namespace and prefix filtering. Returns paginated results. Use this to discover vector IDs before fetching or deleting specific vectors.`,
  constraints: [
    'Only supported for serverless indexes.',
    'Returns up to 100 IDs per page by default.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      indexHost: z.string().describe('Host URL of the index'),
      namespace: z.string().optional().describe('Namespace to list vectors from'),
      prefix: z.string().optional().describe('Filter IDs by this prefix'),
      limit: z
        .number()
        .int()
        .optional()
        .describe('Maximum number of IDs to return (default 100)'),
      paginationToken: z
        .string()
        .optional()
        .describe('Token for fetching the next page of results')
    })
  )
  .output(
    z.object({
      vectorIds: z.array(z.string()).describe('List of vector IDs'),
      nextPaginationToken: z
        .string()
        .optional()
        .describe('Token for retrieving the next page'),
      namespace: z.string().describe('Namespace that was listed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PineconeDataPlaneClient({
      token: ctx.auth.token,
      indexHost: ctx.input.indexHost
    });

    let result = await client.listVectorIds({
      namespace: ctx.input.namespace,
      prefix: ctx.input.prefix,
      limit: ctx.input.limit,
      paginationToken: ctx.input.paginationToken
    });

    let vectorIds = (result.vectors || []).map(v => v.id);

    return {
      output: {
        vectorIds,
        nextPaginationToken: result.pagination?.next,
        namespace: result.namespace || ''
      },
      message: `Found **${vectorIds.length}** vector ID${vectorIds.length === 1 ? '' : 's'}${result.pagination?.next ? ' (more pages available)' : ''}.`
    };
  })
  .build();
