import { SlateTool } from 'slates';
import { z } from 'zod';
import { BackendlessClient } from '../lib/client';
import { spec } from '../spec';

export let getTableSchema = SlateTool.create(spec, {
  name: 'Get Table Schema',
  key: 'get_table_schema',
  description:
    'Retrieves the columns, data types, defaults, requirements, and relation targets for a Backendless database table. Use this before creating records or building queries.',
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      tableName: z.string().min(1).describe('Name of the database table to inspect')
    })
  )
  .output(
    z.object({
      tableName: z.string().describe('Name of the inspected table'),
      properties: z
        .array(z.record(z.string(), z.unknown()))
        .describe(
          'Column definitions returned by Backendless, including name, type, required, and relatedTable'
        ),
      count: z.number().describe('Number of columns returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BackendlessClient({
      applicationId: ctx.auth.applicationId,
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain,
      region: ctx.config.region
    });
    let properties = await client.getTableSchema(ctx.input.tableName);
    return {
      output: { tableName: ctx.input.tableName, properties, count: properties.length },
      message: `Retrieved **${properties.length}** column definitions for **${ctx.input.tableName}**.`
    };
  })
  .build();
