import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientFor } from '../lib/client';
import { storeOutput } from '../lib/schemas';
import { spec } from '../spec';

export let manageDataStore = SlateTool.create(spec, {
  name: 'Manage Data Store',
  key: 'manage_data_store',
  description: `Get details, create, update, or delete a data store. Data stores persist structured data between scenario runs and enable data sharing across scenarios.`,
  instructions: [
    'For "create", provide teamId, name, dataStructureId, and maxSizeMB.',
    'For "update", provide dataStoreId and the fields to change.',
    'For "delete", provide dataStoreId and teamId.'
  ]
})
  .input(
    z.object({
      confirmed: z
        .boolean()
        .optional()
        .describe(
          'Explicitly acknowledge the provider confirmation for referenced resources or app installation; omission does not bypass it.'
        ),
      action: z.enum(['get', 'create', 'update', 'delete']).describe('Action to perform'),
      dataStoreId: z
        .number()
        .optional()
        .describe('Data store ID (required for get, update, delete)'),
      teamId: z
        .number()
        .optional()
        .describe(
          'Team ID; call list_teams after list_organizations to discover authorized IDs. (required for create and delete)'
        ),
      name: z.string().optional().describe('Data store name (for create/update)'),
      dataStructureId: z
        .number()
        .optional()
        .describe(
          'Data structure ID from list_data_structures (required for create, optional for update)'
        ),
      maxSizeMB: z.number().optional().describe('Maximum size in MB (for create/update)')
    })
  )
  .output(
    z.object({
      dataStoreId: z.number().optional().describe('Data store ID'),
      name: z.string().optional().describe('Data store name'),
      teamId: z
        .number()
        .optional()
        .describe(
          'Team ID; call list_teams after list_organizations to discover authorized IDs.'
        ),
      records: z.number().optional().describe('Number of records'),
      size: z.number().optional().describe('Current size'),
      exactSize: z.string().optional().describe('Native size text, preserved exactly.'),
      exactMaxSize: z
        .string()
        .optional()
        .describe('Native maximum size text, preserved exactly.'),
      maxSize: z.number().optional().describe('Maximum size'),
      deleted: z.boolean().optional().describe('Whether the data store was deleted')
    })
  )
  .handleInvocation(async ctx => {
    const client = clientFor(ctx);
    const { action } = ctx.input;
    if (action === 'delete') {
      await client.deleteDataStore(
        ctx.input.dataStoreId!,
        ctx.input.teamId!,
        ctx.input.confirmed
      );
      return {
        output: { dataStoreId: ctx.input.dataStoreId, deleted: true },
        message:
          'Make acknowledged exact data store deletion. Stored records are removed; dependent scenarios can fail and prior external effects remain.'
      };
    }
    const result =
      action === 'get'
        ? await client.getDataStore(ctx.input.dataStoreId!)
        : action === 'create'
          ? await client.createDataStore({
              teamId: ctx.input.teamId,
              name: ctx.input.name,
              datastructureId: ctx.input.dataStructureId,
              maxSizeMB: ctx.input.maxSizeMB
            })
          : await client.updateDataStore(ctx.input.dataStoreId!, {
              name: ctx.input.name,
              datastructureId: ctx.input.dataStructureId,
              maxSizeMB: ctx.input.maxSizeMB
            });
    return {
      output: storeOutput(result.dataStore),
      message: `Confirmed the native ${action} receipt for data store ${result.dataStore.id}.`
    };
  })
  .build();
