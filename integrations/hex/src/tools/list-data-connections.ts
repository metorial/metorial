import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listDataConnections = SlateTool.create(spec, {
  name: 'List Data Connections',
  key: 'list_data_connections',
  description: `List all data connections configured in the Hex workspace. Returns connection names, types, and metadata with pagination support.`,
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
      sortBy: z.enum(['CREATED_AT', 'NAME']).optional().describe('Field to sort by'),
      sortDirection: z.enum(['ASC', 'DESC']).optional().describe('Sort direction')
    })
  )
  .output(
    z.object({
      connections: z.array(
        z.object({
          dataConnectionId: z.string(),
          name: z.string(),
          type: z.string(),
          description: z.string().nullable(),
          createdAt: z.string(),
          updatedAt: z.string()
        })
      ),
      nextCursor: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });

    let result = await client.listDataConnections({
      limit: ctx.input.limit,
      after: ctx.input.after,
      sortBy: ctx.input.sortBy,
      sortDirection: ctx.input.sortDirection
    });

    let connections = result.values ?? [];

    return {
      output: {
        connections,
        nextCursor: result.pagination?.after
      },
      message: `Found **${connections.length}** data connection(s).${result.pagination?.after ? ' More results available.' : ''}`
    };
  })
  .build();
