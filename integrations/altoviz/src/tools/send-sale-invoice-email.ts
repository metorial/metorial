import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendSaleInvoiceEmail = SlateTool.create(spec, {
  name: 'Send Sale Invoice by Email',
  key: 'send_sale_invoice_email',
  description: `Send a sales invoice to the customer by email through the Altoviz platform.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      invoiceId: z.number().describe('Altoviz invoice ID to send')
    })
  )
  .output(
    z.object({
      sent: z.boolean(),
      invoiceId: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.sendSaleInvoiceByEmail(ctx.input.invoiceId);

    return {
      output: {
        sent: true,
        invoiceId: ctx.input.invoiceId
      },
      message: `Invoice **${ctx.input.invoiceId}** sent by email.`
    };
  })
  .build();
