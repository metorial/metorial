import { SlateTool } from 'slates';
import { z } from 'zod';
import { PushoverClient } from '../lib/client';
import { spec } from '../spec';

export let cancelEmergency = SlateTool.create(spec, {
  name: 'Cancel Emergency Retries',
  key: 'cancel_emergency',
  description: `Cancel retries for an emergency-priority notification. You can cancel by a specific receipt ID or by a tag that was assigned when the notification was sent. Canceling by tag will stop all emergency notifications matching that tag.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      receiptId: z
        .string()
        .optional()
        .describe('Receipt ID of the emergency notification to cancel'),
      tag: z
        .string()
        .optional()
        .describe('Tag to cancel all emergency notifications matching this tag')
    })
  )
  .output(
    z.object({
      requestId: z.string().describe('Unique request identifier')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PushoverClient({
      token: ctx.auth.token,
      userKey: ctx.auth.userKey
    });

    if (!ctx.input.receiptId && !ctx.input.tag) {
      throw new Error('Either receiptId or tag must be provided');
    }

    let result: { status: number; request: string };

    if (ctx.input.receiptId) {
      result = await client.cancelReceipt(ctx.input.receiptId);
    } else {
      result = await client.cancelReceiptByTag(ctx.input.tag!);
    }

    let message = ctx.input.receiptId
      ? `Canceled emergency retries for receipt \`${ctx.input.receiptId}\`.`
      : `Canceled emergency retries for all notifications with tag \`${ctx.input.tag}\`.`;

    return {
      output: {
        requestId: result.request
      },
      message
    };
  })
  .build();
