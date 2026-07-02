import { SlateTool } from 'slates';
import { z } from 'zod';
import { PowerBIClient } from '../lib/client';
import { spec } from '../spec';

export let executeDaxQuery = SlateTool.create(spec, {
  name: 'Execute DAX Query',
  key: 'execute_dax_query',
  description: `Execute a DAX (Data Analysis Expressions) query against a Power BI dataset and return the results. Only DAX queries are supported.`,
  constraints: [
    'The authenticated user must have dataset read and build permissions.',
    'Only DAX queries are supported — MDX or SQL queries will fail.'
  ]
})
  .input(
    z.object({
      datasetId: z.string().describe('ID of the dataset to query'),
      workspaceId: z.string().optional().describe('Workspace ID containing the dataset'),
      query: z.string().describe("DAX query to execute (e.g., EVALUATE TOPN(10, 'Sales'))")
    })
  )
  .output(
    z.object({
      tables: z
        .array(
          z.object({
            rows: z.array(z.record(z.string(), z.any())).describe('Result rows'),
            columns: z
              .array(
                z.object({
                  name: z.string(),
                  dataType: z.string().optional()
                })
              )
              .optional()
              .describe('Column definitions')
          })
        )
        .describe('Query result tables')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PowerBIClient({ token: ctx.auth.token });
    let result = await client.executeDaxQuery(
      ctx.input.datasetId,
      ctx.input.query,
      ctx.input.workspaceId
    );

    let tables = (result.results || []).map((r: any) => ({
      rows: r.tables?.[0]?.rows || [],
      columns: r.tables?.[0]?.columns
    }));

    let totalRows = tables.reduce((sum: number, t: any) => sum + t.rows.length, 0);

    return {
      output: { tables },
      message: `Query returned **${totalRows}** row(s) across **${tables.length}** result table(s).`
    };
  })
  .build();
