import { SlateTool } from 'slates';
import { DatabaseClient } from '../lib/client';
import { collection, dbId, mappedTable, nativeTable, tableOutput } from '../lib/schemas';
import { connection, z } from '../lib/validation';
import { spec } from '../spec';
export const listTables = SlateTool.create(spec, {
  name: 'List Tables',
  key: 'list_tables',
  description:
    'Discover table IDs and field definitions in a database from list_databases. No paging parameter is specified on the detailed native table-list route.',
  tags: { readOnly: true }
})
  .input(z.object({ databaseId: dbId }))
  .output(z.object({ tables: z.array(tableOutput) }))
  .handleInvocation(async ctx => ({
    output: {
      tables: collection(
        nativeTable,
        await new DatabaseClient(connection(ctx.auth, ctx.config)).listTables(
          ctx.input.databaseId
        )
      ).map(mappedTable)
    },
    message: 'Returned tables and their readable schema.'
  }))
  .build();
