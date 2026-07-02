import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let importData = SlateTool.create(spec, {
  name: 'Import Data',
  key: 'import_data',
  description: `Import records into a ServiceNow staging table using the Import Set API. Records are loaded into the staging table and automatically transformed into the target table using configured transform maps. Useful for bulk data synchronization from external systems.`,
  instructions: [
    'The staging table must exist and have a transform map configured in ServiceNow.',
    'Each record in the array is imported individually.'
  ],
  constraints: ['Large imports should be batched to avoid timeouts.']
})
  .input(
    z.object({
      stagingTable: z.string().describe('Name of the staging (import set) table'),
      records: z
        .array(z.record(z.string(), z.any()))
        .describe(
          'Array of records to import. Each record is a key-value map of field names to values.'
        )
    })
  )
  .output(
    z.object({
      importResults: z
        .array(z.record(z.string(), z.any()))
        .describe('Array of import results including transform status'),
      importedCount: z.number().describe('Number of records imported')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);

    let results = await client.createImportSet(ctx.input.stagingTable, ctx.input.records);

    return {
      output: {
        importResults: results,
        importedCount: results.length
      },
      message: `Imported **${results.length}** records into staging table \`${ctx.input.stagingTable}\`.`
    };
  })
  .build();
