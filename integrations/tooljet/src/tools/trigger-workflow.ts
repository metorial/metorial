import { SlateTool } from 'slates';
import { z } from 'zod';
import { WorkflowClient } from '../lib/workflow-client';
import { spec } from '../spec';

export let triggerWorkflow = SlateTool.create(spec, {
  name: 'Trigger Workflow',
  key: 'trigger_workflow',
  description: `Trigger a ToolJet workflow via its webhook endpoint. Each workflow has its own unique ID and bearer token found in the workflow's Triggers tab. Parameters can be passed via the request body.`,
  instructions: [
    'The workflow must have webhook triggers enabled in its Triggers tab.',
    'The workflow token is separate from the ToolJet API access token — find it in the workflow Triggers tab.',
    'Only parameters pre-configured in the workflow definition will be accepted; others are ignored.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      workflowId: z.string().describe('Unique ID of the workflow to trigger'),
      workflowToken: z
        .string()
        .describe(
          'Bearer token for the workflow webhook (found in the workflow Triggers tab)'
        ),
      parameters: z
        .record(z.string(), z.any())
        .optional()
        .describe('Key-value parameters to pass to the workflow')
    })
  )
  .output(
    z.object({
      response: z.any().describe('Response from the workflow execution')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WorkflowClient({
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.triggerWorkflow(
      ctx.input.workflowId,
      ctx.input.workflowToken,
      ctx.input.parameters
    );

    return {
      output: { response: result },
      message: `Triggered workflow **${ctx.input.workflowId}** successfully.`
    };
  })
  .build();
