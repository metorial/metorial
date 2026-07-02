import { SlateTool } from 'slates';
import { z } from 'zod';
import { KadoaClient } from '../lib/client';
import { spec } from '../spec';

export let getWorkflowData = SlateTool.create(spec, {
  name: 'Get Workflow Data',
  key: 'get_workflow_data',
  description: `Retrieve extracted data from a Kadoa workflow. Supports pagination, sorting, and filtering with operators like EQUALS, CONTAINS, GREATER_THAN, etc.
Can also retrieve data from a specific workflow run by providing a run ID.`,
  instructions: [
    'Use the filters parameter as a JSON string for complex filtering, e.g. \'[{"field":"price","operator":"GREATER_THAN","value":"100"}]\'.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workflowId: z.string().describe('ID of the workflow to retrieve data from'),
      runId: z.string().optional().describe('Specific run ID to retrieve data from'),
      sortBy: z.string().optional().describe('Field name to sort by'),
      order: z.enum(['asc', 'desc']).optional().describe('Sort order'),
      filters: z
        .string()
        .optional()
        .describe(
          'JSON-encoded filter array, e.g. [{"field":"name","operator":"CONTAINS","value":"test"}]'
        ),
      page: z.number().optional().describe('Page number (default 1)'),
      limit: z.number().optional().describe('Results per page (default 25, 0 for all)'),
      includeAnomalies: z.boolean().optional().describe('Include validation anomaly data')
    })
  )
  .output(
    z.object({
      workflowId: z.string().describe('Workflow ID'),
      runId: z.string().optional().describe('Run ID the data came from'),
      executedAt: z.string().optional().describe('When the run was executed'),
      records: z.array(z.record(z.string(), z.any())).describe('Extracted data records'),
      totalCount: z.number().optional().describe('Total number of records'),
      page: z.number().optional().describe('Current page'),
      totalPages: z.number().optional().describe('Total pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new KadoaClient({ token: ctx.auth.token });

    let result = await client.getWorkflowData(ctx.input.workflowId, {
      runId: ctx.input.runId,
      sortBy: ctx.input.sortBy,
      order: ctx.input.order,
      filters: ctx.input.filters,
      page: ctx.input.page,
      limit: ctx.input.limit,
      includeAnomalies: ctx.input.includeAnomalies
    });

    return {
      output: {
        workflowId: result.workflowId || ctx.input.workflowId,
        runId: result.runId,
        executedAt: result.executedAt,
        records: result.data || [],
        totalCount: result.pagination?.totalCount,
        page: result.pagination?.page,
        totalPages: result.pagination?.totalPages
      },
      message: `Retrieved **${(result.data || []).length}** record(s) from workflow **${ctx.input.workflowId}**${result.pagination?.totalCount ? ` (${result.pagination.totalCount} total)` : ''}.`
    };
  })
  .build();
