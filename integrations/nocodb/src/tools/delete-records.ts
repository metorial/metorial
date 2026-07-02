import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteRecords = SlateTool.create(spec, {
  name: 'Delete Records',
  key: 'delete_records',
  description: `Delete one or more records from a NocoDB table by their row IDs. This action is permanent and cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      tableId: z.string().describe('The table ID (prefixed with m)'),
      recordIds: z.array(z.number()).min(1).describe('Array of row IDs (integers) to delete')
    })
  )
  .output(
    z.object({
      deletedCount: z.number().describe('Number of records deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token });

    let records = ctx.input.recordIds.map(id => ({ Id: id }));
    let result = await client.deleteRecords(ctx.input.tableId, records);
    let deletedCount = Array.isArray(result) ? result.length : 1;

    return {
      output: { deletedCount },
      message: `Deleted **${deletedCount}** record(s) from table \`${ctx.input.tableId}\`.`
    };
  })
  .build();
