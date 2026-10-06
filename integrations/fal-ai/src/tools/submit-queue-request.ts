import { SlateTool } from 'slates';
import { z } from 'zod';
import { FalClient } from '../lib/client';
import { spec } from '../spec';

export let submitQueueRequest = SlateTool.create(spec, {
  name: 'Submit Queue Request',
  key: 'submit_queue_request',
  description: `Submit an asynchronous inference request to Fal.ai's queue system.
This is the recommended approach for long-running model inference. Returns a request ID for polling status or retrieving results later.
Optionally provide a webhook URL to receive results automatically upon completion.`,
  instructions: [
    'Use the Check Queue Status tool to poll for status updates after submitting.',
    'Provide a webhookUrl to be notified when the request completes instead of polling.'
  ],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      fileRetentionSeconds: z
        .number()
        .int()
        .min(60)
        .max(31536000)
        .optional()
        .describe(
          'Generated file lifetime in seconds. Omit to use account defaults; expired files cannot be recovered'
        ),
      modelId: z.string().min(1).describe('Model endpoint ID, e.g. "fal-ai/flux/schnell"'),
      modelInput: z
        .record(z.string(), z.any())
        .describe('Model-specific input parameters (prompt, image_url, etc.)'),
      webhookUrl: z
        .url()
        .regex(/^https?:\/\//)
        .optional()
        .describe('URL to receive a POST notification when the request completes')
    })
  )
  .output(
    z.object({
      requestId: z.string().describe('Unique request identifier for tracking'),
      gatewayRequestId: z.string().optional().describe('Gateway request identifier'),
      responseUrl: z.string().describe('URL to retrieve the result'),
      statusUrl: z.string().describe('URL to check request status'),
      cancelUrl: z.string().describe('URL to cancel the request'),
      queuePosition: z.number().optional().describe('Current position in the queue')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FalClient(ctx.auth.token);

    ctx.progress('Submitting request to queue...');
    let result = await client.submitToQueue(ctx.input.modelId, ctx.input.modelInput, {
      webhookUrl: ctx.input.webhookUrl,
      fileRetentionSeconds: ctx.input.fileRetentionSeconds
    });

    return {
      output: result,
      message: `Submitted request to **${ctx.input.modelId}** queue. Request ID: \`${result.requestId}\`.${result.queuePosition !== undefined ? ` Queue position: ${result.queuePosition}.` : ''}${ctx.input.webhookUrl ? ' Webhook will be notified on completion.' : ''}`
    };
  })
  .build();
