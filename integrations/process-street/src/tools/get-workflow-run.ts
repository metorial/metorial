import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getWorkflowRun = SlateTool.create(spec, {
  name: 'Get Workflow Run',
  key: 'get_workflow_run',
  description: `Retrieve details of a specific workflow run including its name, status, due date, and associated workflow. Use this to check the current state of a running workflow.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workflowRunId: z.string().describe('ID of the workflow run to retrieve')
    })
  )
  .output(
    z.object({
      workflowRunId: z.string().describe('ID of the workflow run'),
      name: z.string().optional().describe('Name of the workflow run'),
      status: z
        .string()
        .describe('Status of the workflow run (Active, Completed, Archived, Deleted)'),
      workflowId: z.string().describe('ID of the parent workflow'),
      shared: z.boolean().describe('Whether the share link is enabled'),
      dueDate: z
        .string()
        .optional()
        .describe('Due date of the workflow run in ISO 8601 format'),
      createdDate: z.string().optional().describe('Date the workflow run was created'),
      updatedDate: z.string().optional().describe('Date the workflow run was last updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let run = await client.getWorkflowRun(ctx.input.workflowRunId);
    return {
      output: {
        workflowRunId: run.id,
        name: run.name,
        status: run.status,
        workflowId: run.workflowId,
        shared: run.shared,
        dueDate: run.dueDate,
        createdDate: run.audit?.createdDate,
        updatedDate: run.audit?.updatedDate
      },
      message: `Workflow run **${run.name || run.id}** is **${run.status}**.`
    };
  })
  .build();
