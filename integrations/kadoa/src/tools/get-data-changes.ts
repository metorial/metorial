import { SlateTool } from 'slates';
import { z } from 'zod';
import { KadoaClient } from '../lib/client';
import { spec } from '../spec';

export let getDataChanges = SlateTool.create(spec, {
  name: 'Get Data Changes',
  key: 'get_data_changes',
  description: `Retrieve detected data changes from monitored workflows. Filter by workflow IDs, date range, and pagination.
Each change includes the affected data, type of change (added, removed, changed), and field-level differences.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workflowIds: z.string().optional().describe('Comma-separated workflow IDs to filter by'),
      changeId: z.string().optional().describe('Specific change ID to retrieve details for'),
      startDate: z.string().optional().describe('Start date filter (ISO 8601)'),
      endDate: z.string().optional().describe('End date filter (ISO 8601)'),
      skip: z.number().optional().describe('Number of records to skip'),
      limit: z.number().optional().describe('Maximum number of changes to return')
    })
  )
  .output(
    z.object({
      changes: z.array(
        z.object({
          changeId: z.string().describe('Change ID'),
          workflowId: z.string().optional().describe('Associated workflow ID'),
          url: z.string().optional().describe('Source URL'),
          summary: z.string().optional().describe('AI-generated change summary'),
          differences: z
            .array(
              z.object({
                type: z.string().describe('Change type: added, removed, or changed'),
                fields: z
                  .array(
                    z.object({
                      key: z.string(),
                      value: z.string().optional(),
                      previousValue: z.string().optional()
                    })
                  )
                  .optional()
              })
            )
            .optional()
            .describe('Field-level differences'),
          createdAt: z.string().optional().describe('When the change was detected')
        })
      ),
      totalCount: z.number().optional().describe('Total number of changes')
    })
  )
  .handleInvocation(async ctx => {
    let client = new KadoaClient({ token: ctx.auth.token });

    // If a specific change is requested
    if (ctx.input.changeId) {
      let change = await client.getDataChange(ctx.input.changeId);
      let mapped = {
        changeId: change.id,
        workflowId: change.workflowId,
        url: change.url,
        summary: change.summary,
        differences: change.differences,
        createdAt: change.createdAt
      };
      return {
        output: {
          changes: [mapped]
        },
        message: `Retrieved change **${change.id}** for workflow **${change.workflowId}**.`
      };
    }

    let result = await client.getDataChanges({
      workflowIds: ctx.input.workflowIds,
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate,
      skip: ctx.input.skip,
      limit: ctx.input.limit
    });

    let changes = (result.changes || []).map((c: any) => ({
      changeId: c.id,
      workflowId: c.workflowId,
      url: c.url,
      summary: c.summary,
      differences: c.differences,
      createdAt: c.createdAt
    }));

    return {
      output: {
        changes,
        totalCount: result.pagination?.totalCount ?? result.changesCount
      },
      message: `Found **${changes.length}** data change(s)${result.pagination?.totalCount ? ` out of ${result.pagination.totalCount} total` : ''}.`
    };
  })
  .build();
