import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientFor } from '../lib/client';
import { paging, storeOutput } from '../lib/schemas';
import { spec } from '../spec';

export let listDataStores = SlateTool.create(spec, {
  name: 'List Data Stores',
  key: 'list_data_stores',
  description: `Retrieve a bounded page of data stores for a team. Data stores persist structured data across scenario executions and enable data sharing between scenarios.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      teamId: z
        .number()
        .describe(
          'Team ID; call list_teams after list_organizations to discover authorized IDs. to list data stores for'
        ),
      limit: z.number().optional().describe('Maximum number of data stores to return'),
      offset: z.number().optional().describe('Number to skip for pagination'),
      sortBy: z.enum(['name']).optional().describe('Sort field'),
      sortDir: z.enum(['asc', 'desc']).optional().describe('Sort direction')
    })
  )
  .output(
    z.object({
      dataStores: z.array(
        z.object({
          dataStoreId: z.number().describe('Data store ID'),
          name: z.string().describe('Data store name'),
          teamId: z
            .number()
            .optional()
            .describe(
              'Team ID; call list_teams after list_organizations to discover authorized IDs.'
            ),
          records: z.number().optional().describe('Number of records'),
          size: z.number().optional().describe('Current size in bytes'),
          exactSize: z.string().optional().describe('Native size text, preserved exactly.'),
          exactMaxSize: z
            .string()
            .optional()
            .describe('Native maximum size text, preserved exactly.'),
          maxSize: z.number().optional().describe('Maximum size in bytes'),
          dataStructureId: z.number().optional().describe('Associated data structure ID')
        })
      ),
      page: paging.optional(),
      total: z.number().optional().describe('Total number of data stores')
    })
  )
  .handleInvocation(async ctx => {
    const client = clientFor(ctx);
    const result = await client.listDataStores(ctx.input.teamId, ctx.input);
    const dataStores = result.dataStores.map(storeOutput);
    return {
      output: { dataStores, page: result.pg },
      message: `Returned ${dataStores.length} data stores in this page.`
    };
  })
  .build();
