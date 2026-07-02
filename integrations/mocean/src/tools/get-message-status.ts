import { SlateTool } from 'slates';
import { z } from 'zod';
import { MoceanClient } from '../lib/client';
import { spec } from '../spec';

let messageStatusLabels: Record<number, string> = {
  1: 'Delivered',
  2: 'Failed',
  3: 'Expired',
  4: 'Pending',
  5: 'Not Found'
};

export let getMessageStatus = SlateTool.create(spec, {
  name: 'Get Message Status',
  key: 'get_message_status',
  description: `Query the delivery status of a previously sent SMS message using its message ID. Returns the current delivery status and credits deducted.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      messageId: z.string().describe('Message ID returned from the Send SMS operation')
    })
  )
  .output(
    z.object({
      status: z.number().describe('API response status code (0 = success)'),
      messageStatus: z
        .number()
        .optional()
        .describe('Delivery status: 1=Delivered, 2=Failed, 3=Expired, 4=Pending, 5=Not Found'),
      messageStatusLabel: z.string().optional().describe('Human-readable delivery status'),
      messageId: z.string().optional().describe('The queried message ID'),
      creditDeducted: z.string().optional().describe('Credits deducted for this message'),
      errorMessage: z.string().optional().describe('Error description if request failed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MoceanClient({
      token: ctx.auth.token,
      apiKey: ctx.auth.apiKey,
      apiSecret: ctx.auth.apiSecret
    });

    let result = await client.getMessageStatus(ctx.input.messageId);

    let messageStatus = result.message_status;
    let statusLabel =
      messageStatus !== undefined
        ? messageStatusLabels[messageStatus] || 'Unknown'
        : undefined;

    return {
      output: {
        status: result.status,
        messageStatus,
        messageStatusLabel: statusLabel,
        messageId: result.msgid,
        creditDeducted: result.credit_deducted,
        errorMessage: result.err_msg
      },
      message: `Message **${ctx.input.messageId}** status: **${statusLabel || 'Unknown'}**`
    };
  })
  .build();
