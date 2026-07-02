import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listLookupTables = SlateTool.create(spec, {
  name: 'List Lookup Tables',
  key: 'list_lookup_tables',
  description: `Retrieve lookup tables (fixtures) in a CommCare project. Lookup tables store reference data used across forms and workflows, such as health facility names, geographic locations, or standardized options.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .optional()
        .describe('Maximum number of results to return (default: 20)'),
      offset: z.number().optional().describe('Number of results to skip for pagination')
    })
  )
  .output(
    z.object({
      tables: z.array(
        z.object({
          tableId: z.string(),
          fixtureType: z.string(),
          fields: z.array(z.any())
        })
      ),
      totalCount: z.number(),
      hasMore: z.boolean(),
      limit: z.number(),
      offset: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      domain: ctx.config.domain,
      username: ctx.auth.username,
      token: ctx.auth.token
    });

    let result = await client.listLookupTables({
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let tables = result.objects.map(t => ({
      tableId: t.id,
      fixtureType: t.fixture_type,
      fields: t.fields
    }));

    return {
      output: {
        tables,
        totalCount: result.meta.total_count,
        hasMore: result.meta.next !== null,
        limit: result.meta.limit,
        offset: result.meta.offset
      },
      message: `Found **${result.meta.total_count}** lookup tables. Returned ${tables.length} results.`
    };
  })
  .build();
