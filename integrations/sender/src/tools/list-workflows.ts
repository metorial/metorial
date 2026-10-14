import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listWorkflows = SlateTool.create(spec, {
  name: 'List Workflows',
  key: 'list_workflows',
  description:
    'Lists automation workflows and their statuses. Use workflowId with start_workflow to enroll a subscriber in an active workflow.',
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      page: z.number().int().min(1).optional().default(1).describe('Page number'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe('Results per page, from 1 to 100'),
      status: z
        .enum(['DRAFT', 'ACTIVE', 'PAUSED'])
        .optional()
        .describe('Filter by workflow status'),
      title: z
        .string()
        .optional()
        .describe('Filter workflows whose title starts with this value')
    })
  )
  .output(
    z.object({
      workflows: z.array(
        z.object({
          workflowId: z.string(),
          title: z.string(),
          status: z.string(),
          description: z.string().nullable().optional(),
          emailsSent: z.number().optional(),
          createdAt: z.string(),
          modifiedAt: z.string().nullable()
        })
      ),
      currentPage: z.number(),
      lastPage: z.number(),
      total: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client({ token: ctx.auth.token }).listWorkflows(ctx.input);
    return {
      output: {
        workflows: result.data.map(workflow => ({
          workflowId: workflow.id,
          title: workflow.title,
          status: workflow.status,
          description: workflow.description,
          emailsSent: workflow.emails_sent,
          createdAt: workflow.created,
          modifiedAt: workflow.modified
        })),
        currentPage: result.meta.current_page,
        lastPage: result.meta.last_page,
        total: result.meta.total
      },
      message: `Found **${result.meta.total}** workflow(s).`
    };
  })
  .build();
