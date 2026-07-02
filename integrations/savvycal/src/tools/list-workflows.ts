import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listWorkflowsTool = SlateTool.create(spec, {
  name: 'List Workflows',
  key: 'list_workflows',
  description: `List automated workflows configured in SavvyCal. Workflows attach actions (like email reminders, CRM updates) to scheduling links. Supports cursor-based pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Maximum number of workflows to return (1-100, default 20)'),
      cursor: z.string().optional().describe('Pagination cursor for fetching the next page')
    })
  )
  .output(
    z.object({
      workflows: z.array(
        z.object({
          workflowId: z.string().describe('Unique workflow identifier'),
          name: z.string().describe('Workflow name'),
          state: z.string().describe('Workflow state (active, disabled, draft)'),
          createdAt: z.string().describe('Creation timestamp')
        })
      ),
      nextCursor: z.string().nullable().describe('Cursor for the next page'),
      previousCursor: z.string().nullable().describe('Cursor for the previous page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listWorkflows({
      limit: ctx.input.limit,
      after: ctx.input.cursor
    });

    let workflows = result.entries.map((w: any) => ({
      workflowId: w.id,
      name: w.name,
      state: w.state,
      createdAt: w.created_at
    }));

    return {
      output: {
        workflows,
        nextCursor: result.metadata.after,
        previousCursor: result.metadata.before
      },
      message: `Found **${workflows.length}** workflow(s).${result.metadata.after ? ' More available via pagination.' : ''}`
    };
  })
  .build();
