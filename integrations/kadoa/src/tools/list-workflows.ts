import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { KadoaClient } from '../lib/client';
import { validateKadoaInteger } from '../lib/validation';
import { spec } from '../spec';

export let listWorkflows = SlateTool.create(spec, {
  name: 'List Workflows',
  key: 'list_workflows',
  description: `Search and retrieve Kadoa extraction workflows. Filter by state, run status, tags, or free-text search.
Returns workflow summaries including name, URL, state, schedule, and record counts.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      search: z.string().optional().describe('Search by workflow name, URL, or ID'),
      state: z
        .enum(['ACTIVE', 'PAUSED', 'PREVIEW', 'QUEUED', 'SETUP', 'ERROR', 'DELETED'])
        .optional()
        .describe('Filter by workflow state'),
      runState: z
        .enum(['FAILED', 'FINISHED', 'RUNNING'])
        .optional()
        .describe('Filter by latest run state'),
      tags: z.array(z.string()).optional().describe('Filter by tags'),
      monitoring: z.boolean().optional().describe('Filter by monitoring enabled/disabled'),
      skip: z.number().optional().describe('Number of records to skip for pagination'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of workflows to return (default 25)')
    })
  )
  .output(
    z.object({
      workflows: z.array(
        z.object({
          workflowId: z.string().describe('Workflow ID'),
          name: z.string().optional().describe('Workflow name'),
          description: z.string().optional().describe('Workflow description'),
          state: z.string().optional().describe('Workflow state (ACTIVE, PAUSED, etc.)'),
          displayState: z.string().optional().describe('Human-readable display state'),
          url: z.string().optional().describe('Primary target URL'),
          urls: z.array(z.string()).optional().describe('All target URLs'),
          totalRecords: z.number().optional().describe('Total extracted records'),
          runState: z.string().optional().describe('Latest run state'),
          tags: z.array(z.string()).optional().describe('Workflow tags'),
          monitoring: z.boolean().optional().describe('Whether monitoring is enabled'),
          createdAt: z.string().optional().describe('Creation timestamp')
        })
      ),
      totalCount: z.number().optional().describe('Total number of matching workflows'),
      totalPages: z.number().optional().describe('Total number of pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new KadoaClient({ token: ctx.auth.token });
    validateKadoaInteger(ctx.input.skip, 'skip', 0);
    validateKadoaInteger(ctx.input.limit, 'limit', 1);

    let result = await client.listWorkflows({
      search: ctx.input.search,
      state: ctx.input.state,
      runState: ctx.input.runState,
      tags: ctx.input.tags,
      monitoring: ctx.input.monitoring,
      skip: ctx.input.skip,
      limit: ctx.input.limit
    });

    let rows = result.workflows ?? result;
    if (!Array.isArray(rows)) {
      throw createApiServiceError(
        'Kadoa returned an invalid workflow list. Try listing workflows again.'
      );
    }
    let workflows = rows.map((w: any) => ({
      workflowId: w.id,
      name: w.name ?? undefined,
      description: w.description ?? undefined,
      state: w.state ?? undefined,
      displayState: w.displayState ?? undefined,
      url: w.url ?? undefined,
      urls: w.urls ?? undefined,
      totalRecords: w.totalRecords ?? undefined,
      runState: w.runState ?? undefined,
      tags: w.tags ?? undefined,
      monitoring: w.monitoring ?? undefined,
      createdAt: w.createdAt
    }));

    return {
      output: {
        workflows,
        totalCount: result.pagination?.totalCount,
        totalPages: result.pagination?.totalPages
      },
      message: `Found **${workflows.length}** workflow(s)${result.pagination?.totalCount ? ` out of ${result.pagination.totalCount} total` : ''}.`
    };
  })
  .build();
