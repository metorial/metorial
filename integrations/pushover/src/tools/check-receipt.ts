import { SlateTool } from 'slates';
import { z } from 'zod';
import { PushoverClient } from '../lib/client';
import { spec } from '../spec';

export let checkReceipt = SlateTool.create(spec, {
  name: 'Check Emergency Receipt',
  key: 'check_receipt',
  description: `Check the acknowledgement status of an emergency-priority notification by its receipt ID. Returns whether the notification has been acknowledged, by whom, from which device, delivery status, and expiration info.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      receiptId: z
        .string()
        .describe('The receipt ID returned when sending an emergency-priority notification')
    })
  )
  .output(
    z.object({
      acknowledged: z.boolean().describe('Whether the notification has been acknowledged'),
      acknowledgedAt: z.number().optional().describe('Unix timestamp when acknowledged'),
      acknowledgedBy: z
        .string()
        .optional()
        .describe('User key of the person who acknowledged'),
      acknowledgedByDevice: z
        .string()
        .optional()
        .describe('Device name from which it was acknowledged'),
      lastDeliveredAt: z.number().describe('Unix timestamp of the last delivery attempt'),
      expired: z
        .boolean()
        .describe('Whether the notification has expired (retry period ended)'),
      expiresAt: z.number().describe('Unix timestamp when the notification will/did expire'),
      calledBack: z.boolean().describe('Whether the callback URL has been called'),
      calledBackAt: z.number().optional().describe('Unix timestamp when the callback was made')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PushoverClient({
      token: ctx.auth.token,
      userKey: ctx.auth.userKey
    });

    let result = await client.getReceiptStatus(ctx.input.receiptId);

    let acknowledged = result.acknowledged === 1;
    let expired = result.expired === 1;
    let calledBack = result.calledBack === 1;

    let message = `Receipt \`${ctx.input.receiptId}\`: `;
    if (acknowledged) {
      message += `**Acknowledged** by \`${result.acknowledgedBy}\` on device \`${result.acknowledgedByDevice}\`.`;
    } else if (expired) {
      message += `**Expired** without acknowledgement.`;
    } else {
      message += `**Pending** — not yet acknowledged.`;
    }

    return {
      output: {
        acknowledged,
        acknowledgedAt: acknowledged ? result.acknowledgedAt : undefined,
        acknowledgedBy: acknowledged ? result.acknowledgedBy : undefined,
        acknowledgedByDevice: acknowledged ? result.acknowledgedByDevice : undefined,
        lastDeliveredAt: result.lastDeliveredAt,
        expired,
        expiresAt: result.expiresAt,
        calledBack,
        calledBackAt: calledBack ? result.calledBackAt : undefined
      },
      message
    };
  })
  .build();
