import { SlateTool } from 'slates';
import { z } from 'zod';
import { getClient } from '../lib/client';
import { spec } from '../spec';

export let listTables = SlateTool.create(spec, {
  name: 'List Tables',
  key: 'list_tables',
  description: `List all tables in a Baserow database. Returns table IDs, names, and metadata. Requires JWT authentication.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      databaseId: z
        .number()
        .describe(
          'The database ID. Call list_databases to discover database IDs with a JWT connection.'
        )
    })
  )
  .output(
    z.object({
      tables: z
        .array(
          z
            .object({
              tableId: z.number().describe('Table ID'),
              name: z.string().describe('Table name'),
              order: z.number().describe('Display order'),
              databaseId: z.number().describe('Parent database ID')
            })
            .catchall(z.any())
        )
        .describe('Array of table objects')
    })
  )
  .handleInvocation(async ctx => {
    let client = getClient(ctx);

    let tables = await client.listTables(ctx.input.databaseId);

    return {
      output: {
        tables: tables.map((t: any) => ({
          ...t,
          tableId: t.id,
          name: t.name,
          order: t.order,
          databaseId: t.database_id
        }))
      },
      message: `Found **${tables.length}** table(s) in database ${ctx.input.databaseId}.`
    };
  })
  .build();
