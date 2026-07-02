import { SlateTool } from 'slates';
import { z } from 'zod';
import { ClickSendClient } from '../lib/client';
import { spec } from '../spec';

export let cancelScheduledSmsTool = SlateTool.create(spec, {
  name: 'Cancel Scheduled SMS',
  key: 'cancel_scheduled_sms',
  description: `Cancel one or all scheduled SMS messages that have not yet been sent. Provide a specific message ID to cancel a single message, or cancel all pending scheduled messages at once.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      messageId: z
        .string()
        .optional()
        .describe(
          'ID of a specific scheduled SMS to cancel. If omitted, all scheduled SMS will be cancelled.'
        )
    })
  )
  .output(
    z.object({
      cancelled: z.boolean().describe('Whether the cancellation was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickSendClient({
      username: ctx.auth.username,
      token: ctx.auth.token
    });

    if (ctx.input.messageId) {
      await client.cancelScheduledSms(ctx.input.messageId);
      return {
        output: { cancelled: true },
        message: `Cancelled scheduled SMS **${ctx.input.messageId}**.`
      };
    } else {
      await client.cancelAllScheduledSms();
      return {
        output: { cancelled: true },
        message: `Cancelled **all** scheduled SMS messages.`
      };
    }
  })
  .build();
