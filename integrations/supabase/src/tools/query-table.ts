import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { ManagementClient } from '../lib/client';
import { requireProjectRef } from '../lib/errors';
import { ProjectClient } from '../lib/project-client';
import { spec } from '../spec';

export let queryTable = SlateTool.create(spec, {
  name: 'Query Table',
  key: 'query_table',
  description: `Query rows from a Supabase table using the auto-generated REST API (PostgREST). Supports column selection, filtering with PostgREST operators (eq, neq, gt, lt, gte, lte, like, ilike, in, is), ordering, and pagination.`,
  instructions: [
    'Filters use PostgREST syntax: key is the column name, value is "operator.value", e.g. {"age": "gt.18", "status": "eq.active"}.',
    'For column selection, use a comma-separated list of column names.',
    'Requires a service_role key for bypassing RLS, or anon key for RLS-protected queries.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectRef: z
        .string()
        .optional()
        .describe('Project reference ID (uses config.projectRef if not provided)'),
      table: z.string().describe('Table name to query'),
      select: z
        .string()
        .optional()
        .describe(
          'Columns to select (comma-separated, supports nested via "table(col1,col2)")'
        ),
      filters: z
        .record(z.string(), z.string())
        .optional()
        .describe(
          'PostgREST filters as key-value pairs, e.g. {"status": "eq.active", "age": "gt.18"}'
        ),
      order: z
        .string()
        .optional()
        .describe('Order results, e.g. "created_at.desc" or "name.asc"'),
      limit: z.number().optional().describe('Maximum number of rows to return'),
      offset: z.number().optional().describe('Number of rows to skip'),
      schema: z.string().optional().describe('Database schema (defaults to public)')
    })
  )
  .output(
    z.object({
      rows: z.array(z.record(z.string(), z.any())).describe('Returned rows'),
      rowCount: z.number().describe('Number of rows returned')
    })
  )
  .handleInvocation(async ctx => {
    let projectRef = requireProjectRef(ctx.input.projectRef ?? ctx.config.projectRef);

    let mgmt = new ManagementClient(ctx.auth.token);
    let keys = await mgmt.getProjectApiKeys(projectRef);
    let serviceKey = (Array.isArray(keys) ? keys : []).find(
      (k: any) => k.name === 'service_role'
    );
    let anonKey = (Array.isArray(keys) ? keys : []).find((k: any) => k.name === 'anon');
    let apiKey = serviceKey?.api_key ?? anonKey?.api_key;

    if (!apiKey) {
      throw createApiServiceError('Could not retrieve API keys for the project');
    }

    let projectClient = new ProjectClient(projectRef, apiKey);
    let rows = await projectClient.selectRows(ctx.input.table, {
      select: ctx.input.select,
      filters: ctx.input.filters,
      order: ctx.input.order,
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      schema: ctx.input.schema
    });

    let resultRows = Array.isArray(rows) ? rows : [];

    return {
      output: { rows: resultRows, rowCount: resultRows.length },
      message: `Queried **${ctx.input.table}** on project **${projectRef}** — returned **${resultRows.length}** rows.`
    };
  })
  .build();
