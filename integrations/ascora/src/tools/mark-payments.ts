import { SlateTool } from 'slates';
import { z } from 'zod';
import { AscoraAccountingClient } from '../lib/client';
import { spec } from '../spec';

export let markPayments = SlateTool.create(spec, {
  name: 'Mark Payments as Sent',
  key: 'mark_payments',
  description: `Marks one or more payments as successfully sent to an external accounting system. Once marked, these payments will no longer be returned by the Get Payments tool.

Use this after you have successfully processed and pushed payments to your accounting package (e.g., Xero, QuickBooks, MYOB).`,
  instructions: [
    'Requires Basic Authentication (Accounting API credentials).',
    'Always call this after successfully processing payments to avoid duplicate retrieval.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      paymentIds: z
        .array(z.string())
        .min(1)
        .describe('List of payment IDs (GUIDs) to mark as sent')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the payments were successfully marked'),
      markedCount: z.number().describe('Number of payments marked as sent')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.auth.username || !ctx.auth.password) {
      throw new Error(
        'Basic Authentication credentials (username and password) are required for the Accounting API. Please use the Basic Authentication method.'
      );
    }

    let client = new AscoraAccountingClient({
      username: ctx.auth.username,
      password: ctx.auth.password
    });

    await client.markPayments(ctx.input.paymentIds);

    return {
      output: {
        success: true,
        markedCount: ctx.input.paymentIds.length
      },
      message: `Successfully marked **${ctx.input.paymentIds.length}** payment(s) as sent to accounting system.`
    };
  })
  .build();
