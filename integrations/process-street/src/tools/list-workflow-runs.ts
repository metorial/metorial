import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let workflowRunSchema = z.object({
  workflowRunId: z.string().describe('ID of the workflow run'),
  name: z.string().optional().describe('Name of the workflow run'),
  status: z.string().describe('Status (Active, Completed, Archived, Deleted)'),
  workflowId: z.string().describe('ID of the parent workflow'),
  shared: z.boolean().describe('Whether the share link is enabled'),
  dueDate: z.string().optional().describe('Due date in ISO 8601 format')
});

export let listWorkflowRuns = SlateTool.create(spec, {
  name: 'List Workflow Runs',
  key: 'list_workflow_runs',
  description: `List workflow runs, optionally filtered by workflow, name, or status. Returns the latest 200 workflow runs sorted by most recently updated.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workflowId: z.string().optional().describe('Filter by parent workflow ID'),
      name: z.string().optional().describe('Filter by workflow run name'),
      status: z
        .enum(['Active', 'Completed', 'Archived'])
        .optional()
        .describe('Filter by status')
    })
  )
  .output(
    z.object({
      workflowRuns: z.array(workflowRunSchema).describe('List of workflow runs')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let data = await client.listWorkflowRuns({
      workflowId: ctx.input.workflowId,
      name: ctx.input.name,
      status: ctx.input.status
    });
    let workflowRuns = (data.workflowRuns || []).map((r: any) => ({
      workflowRunId: r.id,
      name: r.name,
      status: r.status,
      workflowId: r.workflowId,
      shared: r.shared,
      dueDate: r.dueDate
    }));
    return {
      output: { workflowRuns },
      message: `Found **${workflowRuns.length}** workflow run(s).`
    };
  })
  .build();
