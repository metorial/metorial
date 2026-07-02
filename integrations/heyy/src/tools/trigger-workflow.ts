import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listWorkflowsTool = SlateTool.create(spec, {
  name: 'List Workflows',
  key: 'list_workflows',
  description: `List all automation workflows available on a specific channel. Returns workflow IDs and details that can be used to trigger automations or associate with broadcasts.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      channelId: z.string().describe('Channel ID to list workflows for')
    })
  )
  .output(
    z.object({
      workflows: z
        .array(
          z.object({
            workflowId: z.string().describe('Unique identifier of the workflow'),
            name: z.string().optional().describe('Workflow name'),
            status: z.string().optional().describe('Workflow status'),
            createdAt: z.string().optional().describe('When the workflow was created'),
            updatedAt: z.string().optional().describe('When the workflow was last updated')
          })
        )
        .describe('List of workflows')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listWorkflows(ctx.input.channelId);

    let workflows = (Array.isArray(result) ? result : (result?.workflows ?? [])).map(
      (w: any) => ({
        workflowId: w.id,
        name: w.name,
        status: w.status,
        createdAt: w.createdAt,
        updatedAt: w.updatedAt
      })
    );

    return {
      output: { workflows },
      message: `Found **${workflows.length}** workflow(s).`
    };
  })
  .build();

export let triggerWorkflowTool = SlateTool.create(spec, {
  name: 'Trigger Workflow',
  key: 'trigger_workflow',
  description: `Trigger an automation workflow for a specific phone number on a channel. Optionally provide template variables and schedule the execution for a future time.`,
  instructions: ['Use the List Workflows tool to find available workflow IDs.']
})
  .input(
    z.object({
      channelId: z.string().describe('Channel ID to trigger the workflow on'),
      workflowId: z.string().describe('ID of the workflow to trigger'),
      phoneNumber: z.string().describe('Phone number to run the workflow for'),
      variables: z
        .array(
          z.object({
            name: z.string().describe('Variable name'),
            value: z.string().describe('Variable value')
          })
        )
        .optional()
        .describe('Variables to pass to the workflow'),
      scheduledAt: z
        .string()
        .optional()
        .describe('ISO datetime to schedule the workflow execution')
    })
  )
  .output(
    z.object({
      triggered: z.boolean().describe('Whether the workflow was successfully triggered'),
      workflowId: z.string().describe('ID of the triggered workflow'),
      phoneNumber: z.string().describe('Phone number the workflow was triggered for')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.triggerWorkflow(ctx.input.channelId, ctx.input.workflowId, {
      phoneNumber: ctx.input.phoneNumber,
      variables: ctx.input.variables,
      scheduledAt: ctx.input.scheduledAt
    });

    return {
      output: {
        triggered: true,
        workflowId: ctx.input.workflowId,
        phoneNumber: ctx.input.phoneNumber
      },
      message: `Triggered workflow **${ctx.input.workflowId}** for **${ctx.input.phoneNumber}**.`
    };
  })
  .build();
