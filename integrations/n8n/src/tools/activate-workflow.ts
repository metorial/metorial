import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let activateWorkflow = SlateTool.create(spec, {
  name: 'Activate Workflow',
  key: 'activate_workflow',
  description: `Activate (publish) or deactivate a workflow. Activating makes the workflow live and able to receive trigger events. Optionally activate a specific historical version by providing a version ID.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      workflowId: z.string().describe('ID of the workflow to activate or deactivate'),
      active: z.boolean().describe('Set to true to activate, false to deactivate'),
      versionId: z
        .string()
        .optional()
        .describe('Specific version ID to activate. Only applicable when activating.')
    })
  )
  .output(
    z.object({
      workflowId: z.string().describe('Workflow ID'),
      name: z.string().describe('Workflow name'),
      active: z.boolean().describe('Current active status after the operation')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    let workflow: any;
    if (ctx.input.active) {
      workflow = await client.activateWorkflow(ctx.input.workflowId, {
        versionId: ctx.input.versionId
      });
    } else {
      workflow = await client.deactivateWorkflow(ctx.input.workflowId);
    }

    return {
      output: {
        workflowId: String(workflow.id),
        name: workflow.name || '',
        active: workflow.active ?? false
      },
      message: `Workflow **"${workflow.name}"** (ID: ${workflow.id}) has been **${workflow.active ? 'activated' : 'deactivated'}**.`
    };
  })
  .build();
