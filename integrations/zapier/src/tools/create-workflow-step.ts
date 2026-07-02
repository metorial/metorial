import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createWorkflowStep = SlateTool.create(spec, {
  name: 'Create Workflow Step',
  key: 'create_workflow_step',
  description: `Create a standalone Workflow Step that returns a webhook URL for on-demand invocation. The webhook can be called with a POST request containing JSON data to execute the step and get a response.
Field values can be hardcoded or use mapped values in double curly braces (e.g., \`{{email}}\`) which become parameters of the webhook.`,
  instructions: [
    'Use double curly braces for dynamic values: {{field_name}}. These become required parameters when invoking the webhook.',
    'The returned webhook URL accepts POST requests with a JSON body containing the mapped field values.'
  ],
  constraints: [
    'Requires the zap:write scope.',
    'If authentication expires, the webhook will time out until the user re-authenticates.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      actionId: z.string().describe('Action ID from the /v2/actions endpoint'),
      authenticationId: z
        .string()
        .nullable()
        .describe('Authentication ID from /v2/authentications'),
      inputs: z
        .record(z.string(), z.any())
        .describe('Input field values. Use {{field_name}} for mapped/dynamic values.')
    })
  )
  .output(
    z.object({
      workflowStep: z
        .any()
        .describe('Created workflow step details including the webhook URL for invocation')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.createWorkflowStep({
      step: {
        action: ctx.input.actionId,
        inputs: ctx.input.inputs,
        authentication: ctx.input.authenticationId
      }
    });

    return {
      output: {
        workflowStep: response
      },
      message: `Created workflow step for action \`${ctx.input.actionId}\`. Use the returned webhook URL to invoke it.`
    };
  })
  .build();
