import { SlateTool } from 'slates';
import { z } from 'zod';
import { FalClient } from '../lib/client';
import { spec } from '../spec';

export let checkQueueStatus = SlateTool.create(spec, {
  name: 'Check Queue Status',
  key: 'check_queue_status',
  description: `Check the status of an asynchronous queue request on Fal.ai and optionally retrieve the result.
Use after submitting a request with the Submit Queue Request tool.
If the request is completed, the result will be included in the response. Also supports canceling queued requests.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      modelId: z.string().describe('Model endpoint ID used when submitting the request'),
      requestId: z.string().describe('Request ID returned from the queue submission'),
      action: z
        .enum(['status', 'result', 'cancel'])
        .optional()
        .describe(
          'Action to perform: "status" to check progress, "result" to fetch completed result, "cancel" to cancel. Defaults to "status".'
        ),
      includeLogs: z
        .boolean()
        .optional()
        .describe('Include runner logs in the status response')
    })
  )
  .output(
    z.object({
      status: z
        .string()
        .optional()
        .describe('Current request status: IN_QUEUE, IN_PROGRESS, or COMPLETED'),
      queuePosition: z
        .number()
        .optional()
        .describe('Current position in the queue (only when IN_QUEUE)'),
      logs: z
        .array(
          z.object({
            message: z.string(),
            timestamp: z.string()
          })
        )
        .optional()
        .describe('Runner logs (if includeLogs was set)'),
      result: z
        .any()
        .optional()
        .describe('Model output (only when action is "result" and request is completed)'),
      cancelled: z
        .boolean()
        .optional()
        .describe('Whether the request was successfully cancelled')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FalClient(ctx.auth.token);
    let action = ctx.input.action || 'status';

    if (action === 'cancel') {
      ctx.progress('Cancelling request...');
      await client.cancelQueueRequest(ctx.input.modelId, ctx.input.requestId);
      return {
        output: {
          cancelled: true
        },
        message: `Cancelled request \`${ctx.input.requestId}\` for **${ctx.input.modelId}**.`
      };
    }

    if (action === 'result') {
      ctx.progress('Fetching result...');
      let result = await client.getQueueResult(ctx.input.modelId, ctx.input.requestId);
      return {
        output: {
          status: 'COMPLETED',
          result
        },
        message: `Retrieved result for request \`${ctx.input.requestId}\` from **${ctx.input.modelId}**.`
      };
    }

    ctx.progress('Checking queue status...');
    let statusResult = await client.getQueueStatus(ctx.input.modelId, ctx.input.requestId, {
      logs: ctx.input.includeLogs
    });

    return {
      output: {
        status: statusResult.status,
        queuePosition: statusResult.queuePosition,
        logs: statusResult.logs
      },
      message: `Request \`${ctx.input.requestId}\` status: **${statusResult.status}**${statusResult.queuePosition !== undefined ? ` (position: ${statusResult.queuePosition})` : ''}.`
    };
  })
  .build();
