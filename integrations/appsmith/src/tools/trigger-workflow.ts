import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientFor } from '../lib/client';
import { spec } from '../spec';

export let triggerWorkflow = SlateTool.create(spec, {
  name: 'Trigger Workflow',
  key: 'trigger_workflow',
  description: `Trigger an Appsmith workflow by sending a POST request to its webhook URL. The workflow receives the provided JSON payload as input parameters and may return a response. Requires self-hosted Business workflow support. An HTTP acknowledgement does not confirm completion.`,
  instructions: [
    'The webhook URL is unique to each workflow and is generated when the workflow webhook trigger is enabled in Appsmith.',
    'The payload must be a valid JSON object.'
  ]
})
  .input(
    z.object({
      webhookUrl: z
        .string()
        .describe('The full webhook URL of the Appsmith workflow to trigger.'),
      instanceUrl: z
        .string()
        .optional()
        .describe('Appsmith instance origin when no session is connected.'),
      payload: z
        .record(z.string(), z.any())
        .optional()
        .describe('JSON payload to send as the workflow input parameters.')
    })
  )
  .output(
    z.object({
      response: z.any().optional().describe('The response returned by the workflow, if any.'),
      triggered: z
        .boolean()
        .describe(
          'Whether the endpoint acknowledged the POST, without confirming completion.'
        ),
      httpStatus: z.number().optional().describe('Acknowledgement HTTP status.'),
      workflowRunId: z.string().optional().describe('Native run ID when returned.'),
      completionConfirmed: z
        .boolean()
        .optional()
        .describe('False: completion must be checked in native run history.')
    })
  )
  .handleInvocation(async ctx => {
    const result = await clientFor(ctx, ctx.input.instanceUrl).triggerWorkflow(
      ctx.input.webhookUrl,
      ctx.input.payload ?? {}
    );
    return {
      output: result,
      message:
        'Workflow endpoint acknowledged the POST. Check native run history for completion and retained downstream effects.'
    };
  })
  .build();
