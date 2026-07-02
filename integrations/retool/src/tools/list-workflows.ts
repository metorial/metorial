import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listWorkflows = SlateTool.create(spec, {
  name: 'List Workflows',
  key: 'list_workflows',
  description: `List all workflows in the Retool organization. Workflows automate processes and can be triggered by schedules, webhooks, or other events.`,
  constraints: ['Available on Enterprise Premium plan only.'],
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
        .describe('Maximum number of workflows to return (1-100)'),
      nextToken: z.string().optional().describe('Pagination token from a previous response')
    })
  )
  .output(
    z.object({
      workflows: z.array(
        z.object({
          workflowId: z.string(),
          workflowName: z.string(),
          folderId: z.string().nullable().optional(),
          isEnabled: z.boolean().optional(),
          createdAt: z.string().optional(),
          updatedAt: z.string().optional()
        })
      ),
      totalCount: z.number(),
      hasMore: z.boolean(),
      nextToken: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });

    let result = await client.listWorkflows({
      limit: ctx.input.limit,
      nextToken: ctx.input.nextToken
    });

    let workflows = result.data.map(w => ({
      workflowId: w.id,
      workflowName: w.name,
      folderId: w.folder_id,
      isEnabled: w.is_enabled,
      createdAt: w.created_at,
      updatedAt: w.updated_at
    }));

    return {
      output: {
        workflows,
        totalCount: result.total_count,
        hasMore: result.has_more,
        nextToken: result.next_token
      },
      message: `Found **${result.total_count}** workflows. Returned **${workflows.length}** workflows${result.has_more ? ' (more available)' : ''}.`
    };
  })
  .build();
