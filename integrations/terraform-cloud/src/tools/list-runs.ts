import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { mapPagination, mapRun } from '../lib/mappers';
import { spec } from '../spec';

export let listRunsTool = SlateTool.create(spec, {
  name: 'List Runs',
  key: 'list_runs',
  description: `List Terraform runs for a workspace. Filter by status to find pending, planning, applying, or completed runs. Returns run details including status, changes, and timing information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workspaceId: z.string().describe('The workspace ID to list runs for'),
      status: z
        .string()
        .optional()
        .describe(
          'Filter by run status (e.g., "pending", "planning", "planned", "applying", "applied", "errored", "canceled", "discarded")'
        ),
      pageNumber: z.number().optional().describe('Page number for pagination'),
      pageSize: z.number().optional().describe('Number of results per page')
    })
  )
  .output(
    z.object({
      runs: z.array(
        z.object({
          runId: z.string(),
          status: z.string(),
          message: z.string(),
          source: z.string(),
          isDestroy: z.boolean(),
          createdAt: z.string(),
          hasChanges: z.boolean(),
          autoApply: z.boolean(),
          planOnly: z.boolean(),
          statusTimestamps: z.object({
            plannedAt: z.string(),
            appliedAt: z.string(),
            erroredAt: z.string()
          }),
          workspaceId: z.string(),
          planId: z.string(),
          applyId: z.string()
        })
      ),
      pagination: z.object({
        currentPage: z.number(),
        totalPages: z.number(),
        totalCount: z.number(),
        pageSize: z.number()
      })
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let response = await client.listRuns(ctx.input.workspaceId, {
      status: ctx.input.status,
      pageNumber: ctx.input.pageNumber,
      pageSize: ctx.input.pageSize
    });

    let runs = (response.data || []).map(mapRun);
    let pagination = mapPagination(response.meta);

    return {
      output: { runs, pagination },
      message: `Found **${pagination.totalCount}** run(s) for workspace ${ctx.input.workspaceId} (page ${pagination.currentPage}/${pagination.totalPages}).`
    };
  })
  .build();
