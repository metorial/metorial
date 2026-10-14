import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { cursorSchema, getNextCursor, nextCursorSchema } from '../lib/pagination';
import { spec } from '../spec';

export let listWorkflowRunsPage = SlateTool.create(spec, {
  name: 'List Workflow Runs Page',
  key: 'list_workflow_runs_page',
  description:
    'List a page of accessible workflow runs sorted by creation date, newest first. Includes all non-deleted statuses by default. Follow nextCursor to discover runs beyond the 200-result search limit.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      workflowId: z
        .string()
        .optional()
        .describe('Workflow ID from list_workflows to filter runs'),
      status: z
        .enum(['Active', 'Completed', 'Archived'])
        .optional()
        .describe('Filter by run status; omit to include every non-deleted status'),
      cursor: cursorSchema
    })
  )
  .output(
    z.object({
      workflowRuns: z.array(
        z.object({
          workflowRunId: z.string().describe('ID of the workflow run'),
          workflowId: z.string().describe('ID of the parent workflow'),
          name: z.string().optional().describe('Name of the workflow run'),
          status: z.string().describe('Workflow run status'),
          shared: z.boolean().describe('Whether the share link is enabled'),
          dueDate: z.string().optional().describe('Due date in ISO 8601 format'),
          createdDate: z.string().optional().describe('Creation date in ISO 8601 format'),
          updatedDate: z.string().optional().describe('Last update date in ISO 8601 format')
        })
      ),
      nextCursor: nextCursorSchema
    })
  )
  .handleInvocation(async ctx => {
    let data = await new Client({ token: ctx.auth.token }).listWorkflowRunsPage(ctx.input);
    let workflowRuns = (data.data || []).map((run: any) => ({
      workflowRunId: run.id,
      workflowId: run.workflowId,
      name: run.name,
      status: run.status,
      shared: run.shared,
      dueDate: run.dueDate,
      createdDate: run.audit?.createdDate,
      updatedDate: run.audit?.updatedDate
    }));
    return {
      output: { workflowRuns, nextCursor: getNextCursor(data) },
      message: `Found **${workflowRuns.length}** workflow run(s) on this page.`
    };
  })
  .build();
