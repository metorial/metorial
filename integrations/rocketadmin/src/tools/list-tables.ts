import { SlateTool } from 'slates';
import { z } from 'zod';
import { RocketadminClient } from '../lib/client';
import { spec } from '../spec';

export let listTables = SlateTool.create(spec, {
  name: 'List Tables',
  key: 'list_tables',
  description: `List all tables in a database connection and optionally get the structure (columns, types, constraints) of a specific table.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      connectionId: z.string().describe('ID of the database connection'),
      tableName: z
        .string()
        .optional()
        .describe('If provided, returns the structure of this specific table')
    })
  )
  .output(
    z.object({
      tables: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('List of tables in the connection'),
      structure: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Table structure details including columns and types')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RocketadminClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    if (ctx.input.tableName) {
      let structure = await client.getTableStructure(
        ctx.input.connectionId,
        ctx.input.tableName
      );
      return {
        output: { structure },
        message: `Retrieved structure for table **${ctx.input.tableName}**.`
      };
    }

    let tables = await client.listTables(ctx.input.connectionId);
    return {
      output: { tables },
      message: `Found **${tables.length}** table(s) in connection **${ctx.input.connectionId}**.`
    };
  })
  .build();
