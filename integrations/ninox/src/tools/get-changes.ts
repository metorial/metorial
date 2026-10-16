import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { spec } from '../spec';

export let getChanges = SlateTool.create(spec, {
  name: 'Get Changes',
  key: 'get_changes',
  description:
    'Retrieve database or table changes after a sequence number, including updates, removed record IDs, and file or view changes. Save the returned seq value for the next request.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      teamId: z.string().describe('Team ID. Use list_teams to discover accessible teams.'),
      databaseId: z
        .string()
        .describe('Database ID. Use list_databases to discover databases.'),
      tableId: z
        .string()
        .optional()
        .describe('Optional table ID from get_table_schema. Omit for database-wide changes.'),
      sinceSq: z
        .number()
        .describe('Non-negative whole sequence number to retrieve changes after')
    })
  )
  .output(
    z.object({
      changes: z
        .record(z.string(), z.any())
        .describe('Unmodified Ninox change response, including seq')
    })
  )
  .handleInvocation(async ctx => {
    if (!Number.isSafeInteger(ctx.input.sinceSq) || ctx.input.sinceSq < 0) {
      throw createApiServiceError('sinceSq must be a non-negative whole sequence number.');
    }
    let client = createClient(ctx);
    let { teamId, databaseId, tableId, sinceSq } = ctx.input;
    let changes =
      tableId === undefined
        ? await client.getDatabaseChanges(teamId, databaseId, sinceSq)
        : await client.getTableChanges(teamId, databaseId, tableId, sinceSq);

    return {
      output: { changes },
      message: 'Retrieved Ninox changes.'
    };
  })
  .build();
