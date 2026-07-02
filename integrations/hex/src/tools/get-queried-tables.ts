import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getQueriedTables = SlateTool.create(spec, {
  name: 'Get Queried Tables',
  key: 'get_queried_tables',
  description: `Retrieve the list of warehouse tables queried by a Hex project. Useful for observability and understanding data dependencies. Returns connection and table information.`,
  tags: {
    readOnly: true
  },
  constraints: ['Available on the Enterprise plan only.']
})
  .input(
    z.object({
      projectId: z.string().describe('UUID of the project to inspect'),
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Number of results per page (1-100)'),
      after: z.string().optional().describe('Pagination cursor for the next page')
    })
  )
  .output(
    z.object({
      tables: z.array(
        z.object({
          dataConnectionId: z.string(),
          dataConnectionName: z.string(),
          tableName: z.string()
        })
      ),
      nextCursor: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });

    let result = await client.getQueriedTables(ctx.input.projectId, {
      limit: ctx.input.limit,
      after: ctx.input.after
    });

    let tables = result.values ?? [];

    return {
      output: {
        tables,
        nextCursor: result.pagination?.after
      },
      message: `Found **${tables.length}** queried table(s) for project ${ctx.input.projectId}.`
    };
  })
  .build();
