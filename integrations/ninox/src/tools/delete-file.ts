import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { spec } from '../spec';

export let deleteFile = SlateTool.create(spec, {
  name: 'Delete File',
  key: 'delete_file',
  description: `Delete a file attached to a record. This action is irreversible.`,
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
      recordId: z.number().describe('Numeric ID of the record'),
      fileName: z.string().describe('Name of the file to delete')
    })
  )
  .output(
    z.object({
      deletedFileName: z.string().describe('Name of the deleted file')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    await client.deleteFile(
      ctx.input.teamId,
      ctx.input.databaseId,
      ctx.input.tableId,
      ctx.input.recordId,
      ctx.input.fileName
    );

    return {
      output: {
        deletedFileName: ctx.input.fileName
      },
      message: `Deleted file **${ctx.input.fileName}** from record **#${ctx.input.recordId}**.`
    };
  })
  .build();
