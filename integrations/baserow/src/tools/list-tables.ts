import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
      databaseId: z.number().describe('The ID of the database to list tables from')
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
    let client = new Client({
      token: ctx.auth.token,
      authType: ctx.auth.authType,
      baseUrl: ctx.config.baseUrl
    });

    let tables = await client.listTables(ctx.input.databaseId);

    return {
      output: {
        tables: tables.map((t: any) => ({
          tableId: t.id,
          name: t.name,
          order: t.order,
          databaseId: t.database_id,
          ...t
        }))
      },
      message: `Found **${tables.length}** table(s) in database ${ctx.input.databaseId}.`
    };
  })
  .build();
