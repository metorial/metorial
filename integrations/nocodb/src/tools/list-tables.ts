import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { optionalString, requireString, responseList } from '../lib/schemas';
import { spec } from '../spec';

export let listTables = SlateTool.create(spec, {
  name: 'List Tables',
  key: 'list_tables',
  description: `List all tables within a NocoDB base. Returns table metadata including IDs and titles. Use this to discover available tables before querying records.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      baseId: z.string().describe('Base ID. Call list_bases to discover accessible bases.'),
      sourceId: z
        .string()
        .optional()
        .describe(
          'Optional data source ID, available from get_base raw.sources; omit for the base default source.'
        )
    })
  )
  .output(
    z.object({
      tables: z
        .array(
          z.object({
            tableId: z.string().describe('Table ID'),
            title: z.string().describe('Table title'),
            type: z.string().optional().describe('Table type'),
            meta: z.any().optional()
          })
        )
        .describe('Array of table objects'),
      raw: z.any().optional().describe('Complete provider response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token });

    let result = await client.listTables(ctx.input.baseId, ctx.input.sourceId);
    let list = responseList(result, 'tables');
    let tables = list.map((t: any) => ({
      tableId: requireString(t.id, 'tableId'),
      title: requireString(t.title, 't.title'),
      type: optionalString(t.type),
      meta: t.meta
    }));

    return {
      output: { tables, raw: result },
      message: `Found **${tables.length}** table(s) in base \`${ctx.input.baseId}\`.`
    };
  })
  .build();
