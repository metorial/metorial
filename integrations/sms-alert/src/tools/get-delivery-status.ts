import { SlateTool } from 'slates';
import { z } from 'zod';
import { SmsAlertClient } from '../lib/client';
import { spec } from '../spec';

export let getDeliveryStatus = SlateTool.create(spec, {
  name: 'Get Delivery Status',
  key: 'get_delivery_status',
  description: `Retrieve the delivery status of a sent SMS batch by its batch ID. Returns per-recipient delivery status (e.g., DELIVRD, AWAITED-DLR, FAILED).`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      batchId: z
        .string()
        .describe('Batch ID of the sent SMS campaign (obtained from the send SMS response).')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Status of the API response.'),
      description: z.any().describe('Per-recipient delivery status details.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SmsAlertClient({ token: ctx.auth.token });

    ctx.info(`Fetching delivery status for batch: ${ctx.input.batchId}`);
    let result = await client.getDeliveryReport({ batchId: ctx.input.batchId });

    return {
      output: {
        status: result.status || 'unknown',
        description: result.description || result
      },
      message: `Delivery status retrieved for batch **${ctx.input.batchId}**`
    };
  })
  .build();
