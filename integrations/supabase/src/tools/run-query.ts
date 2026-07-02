import { SlateTool } from 'slates';
import { z } from 'zod';
import { ManagementClient } from '../lib/client';
import { requireProjectRef } from '../lib/errors';
import { spec } from '../spec';

export let runQuery = SlateTool.create(spec, {
  name: 'Run SQL Query',
  key: 'run_query',
  description: `Execute a raw SQL query against a Supabase project's PostgreSQL database via the Management API. Returns the query result rows. Use for schema inspection, data manipulation, or any custom SQL operations.`,
  instructions: [
    'Be careful with destructive SQL statements (DROP, DELETE, TRUNCATE).',
    'Use the projectRef from config if not explicitly provided.'
  ],
  constraints: [
    'Queries are executed with the Management API credentials, which have full database access.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      projectRef: z
        .string()
        .optional()
        .describe('Project reference ID (uses config.projectRef if not provided)'),
      query: z.string().describe('SQL query to execute')
    })
  )
  .output(
    z.object({
      rows: z.array(z.record(z.string(), z.any())).describe('Result rows from the query'),
      rowCount: z.number().describe('Number of rows returned')
    })
  )
  .handleInvocation(async ctx => {
    let projectRef = requireProjectRef(ctx.input.projectRef ?? ctx.config.projectRef);

    let client = new ManagementClient(ctx.auth.token);
    let result = await client.runQuery(projectRef, ctx.input.query);

    let rows = Array.isArray(result) ? result : [];

    return {
      output: { rows, rowCount: rows.length },
      message: `Executed query on project **${projectRef}** — returned **${rows.length}** rows.`
    };
  })
  .build();
