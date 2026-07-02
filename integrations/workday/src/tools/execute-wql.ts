import { SlateTool } from 'slates';
import { z } from 'zod';
import { WorkdayClient } from '../lib/client';
import { spec } from '../spec';

export let executeWql = SlateTool.create(spec, {
  name: 'Execute WQL Query',
  key: 'execute_wql',
  description: `Execute a Workday Query Language (WQL) query against Workday data. WQL is a SQL-like language for high-performance querying of Workday data across functional areas. Supports **SELECT**, **FROM**, **WHERE**, **LIMIT**, and **OFFSET** clauses.`,
  instructions: [
    'Use standard SQL-like syntax: SELECT field1, field2 FROM dataSource WHERE condition',
    'Use LIMIT and OFFSET in the query itself for pagination of large result sets',
    'Requires the System (WQL) scope to be granted to the API client'
  ],
  constraints: [
    'WQL is read-only — you cannot modify data with WQL queries',
    'Available data sources depend on the security permissions of the authenticated user'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .string()
        .describe('WQL query to execute (e.g., "SELECT workdayID, fullName FROM allWorkers")'),
      limit: z.number().optional().describe('Maximum number of rows to return'),
      offset: z.number().optional().describe('Number of rows to skip for pagination')
    })
  )
  .output(
    z.object({
      rows: z.array(z.record(z.string(), z.any())).describe('Query result rows'),
      total: z.number().optional().describe('Total number of matching rows (if available)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WorkdayClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl,
      tenant: ctx.config.tenant
    });

    let result = await client.executeWql(ctx.input.query, {
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    return {
      output: {
        rows: result.data,
        total: result.total
      },
      message: `WQL query returned **${result.data.length}** rows${result.total !== undefined ? ` (${result.total} total)` : ''}.`
    };
  })
  .build();
