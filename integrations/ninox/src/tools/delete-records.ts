import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { spec } from '../spec';

export let deleteRecords = SlateTool.create(spec, {
  name: 'Delete Records',
  key: 'delete_records',
  description: `Delete one or more records from a table by their IDs. This action is irreversible.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      teamId: z.string().describe('Team ID. Use list_teams to discover accessible teams.'),
      databaseId: z
        .string()
        .describe('Database ID. Use list_databases to discover databases.'),
      tableId: z
        .string()
        .describe('Table ID (e.g. "A", "B"). Use get_table_schema to discover tables.'),
      recordIds: z.array(z.number()).min(1).describe('Array of numeric record IDs to delete')
    })
  )
  .output(
    z.object({
      deletedRecordIds: z.array(z.number()).describe('IDs of the deleted records'),
      count: z.number().describe('Number of records deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    if (ctx.input.recordIds.length === 1) {
      await client.deleteRecord(
        ctx.input.teamId,
        ctx.input.databaseId,
        ctx.input.tableId,
        ctx.input.recordIds[0]!
      );
    } else {
      await client.deleteRecords(
        ctx.input.teamId,
        ctx.input.databaseId,
        ctx.input.tableId,
        ctx.input.recordIds
      );
    }

    return {
      output: {
        deletedRecordIds: ctx.input.recordIds,
        count: ctx.input.recordIds.length
      },
      message: `Deleted **${ctx.input.recordIds.length}** record(s) from table **${ctx.input.tableId}**.`
    };
  })
  .build();
