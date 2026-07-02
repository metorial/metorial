import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTables = SlateTool.create(spec, {
  name: 'List Tables',
  key: 'list_tables',
  description: `List all tables within a NocoDB base. Returns table metadata including IDs, titles, and column counts. Use this to discover available tables before querying records.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      baseId: z.string().describe('The base ID (prefixed with p)')
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
        .describe('Array of table objects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token });

    let result = await client.listTables(ctx.input.baseId);
    let list = result?.list ?? result ?? [];
    let tables = (Array.isArray(list) ? list : []).map((t: any) => ({
      tableId: t.id,
      title: t.title ?? '',
      type: t.type,
      meta: t.meta
    }));

    return {
      output: { tables },
      message: `Found **${tables.length}** table(s) in base \`${ctx.input.baseId}\`.`
    };
  })
  .build();
