import { SlateTool } from 'slates';
import { z } from 'zod';
import { AscoraAccountingClient } from '../lib/client';
import { spec } from '../spec';

export let markInvoices = SlateTool.create(spec, {
  name: 'Mark Invoices as Sent',
  key: 'mark_invoices',
  description: `Marks one or more invoices as successfully sent to an external accounting system. Once marked, these invoices will no longer be returned by the Get Invoices tool.

Use this after you have successfully processed and pushed invoices to your accounting package (e.g., Xero, QuickBooks, MYOB).`,
  instructions: [
    'Requires Basic Authentication (Accounting API credentials).',
    'Always call this after successfully processing invoices to avoid duplicate retrieval.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      invoiceIds: z
        .array(z.string())
        .min(1)
        .describe('List of invoice IDs (GUIDs) to mark as sent')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the invoices were successfully marked'),
      markedCount: z.number().describe('Number of invoices marked as sent')
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

    await client.markInvoices(ctx.input.invoiceIds);

    return {
      output: {
        success: true,
        markedCount: ctx.input.invoiceIds.length
      },
      message: `Successfully marked **${ctx.input.invoiceIds.length}** invoice(s) as sent to accounting system.`
    };
  })
  .build();
