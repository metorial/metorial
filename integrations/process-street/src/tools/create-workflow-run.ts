import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createWorkflowRun = SlateTool.create(spec, {
  name: 'Create Workflow Run',
  key: 'create_workflow_run',
  description: `Create a new workflow run from an existing workflow. A workflow run is an active instance of a workflow that can be worked through by completing tasks, filling form fields, and going through approvals.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      workflowId: z.string().describe('ID of the workflow to create a run from'),
      name: z
        .string()
        .optional()
        .describe('Name for the new workflow run (max 1024 characters)'),
      dueDate: z
        .string()
        .optional()
        .describe('Due date for the workflow run in ISO 8601 format'),
      shared: z.boolean().optional().describe('Whether to enable the share link for this run')
    })
  )
  .output(
    z.object({
      workflowRunId: z.string().describe('ID of the created workflow run')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.createWorkflowRun({
      workflowId: ctx.input.workflowId,
      name: ctx.input.name,
      dueDate: ctx.input.dueDate,
      shared: ctx.input.shared
    });
    return {
      output: { workflowRunId: result.id },
      message: `Created workflow run **${ctx.input.name || result.id}**.`
    };
  })
  .build();
