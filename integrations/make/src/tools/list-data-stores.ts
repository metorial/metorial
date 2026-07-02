import { SlateTool } from 'slates';
import { z } from 'zod';
import { MakeClient } from '../lib/client';
import { spec } from '../spec';

export let listDataStores = SlateTool.create(spec, {
  name: 'List Data Stores',
  key: 'list_data_stores',
  description: `Retrieve all data stores for a team. Data stores persist structured data across scenario executions and enable data sharing between scenarios.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      teamId: z.number().describe('Team ID to list data stores for'),
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
          teamId: z.number().optional().describe('Team ID'),
          records: z.number().optional().describe('Number of records'),
          size: z.number().optional().describe('Current size in bytes'),
          maxSize: z.number().optional().describe('Maximum size in bytes'),
          dataStructureId: z.number().optional().describe('Associated data structure ID')
        })
      ),
      total: z.number().optional().describe('Total number of data stores')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MakeClient({
      token: ctx.auth.token,
      zoneUrl: ctx.config.zoneUrl
    });

    let result = await client.listDataStores(ctx.input.teamId, {
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      sortBy: ctx.input.sortBy,
      sortDir: ctx.input.sortDir
    });

    let stores = (result.dataStores ?? result ?? []).map((d: any) => ({
      dataStoreId: d.id,
      name: d.name,
      teamId: d.teamId,
      records: d.records,
      size: d.size,
      maxSize: d.maxSize,
      dataStructureId: d.datastructureId
    }));

    return {
      output: {
        dataStores: stores,
        total: result.pg?.total
      },
      message: `Found **${stores.length}** data store(s) in team ${ctx.input.teamId}.`
    };
  })
  .build();
