import { SlateTool } from 'slates';
import { z } from 'zod';
import { ShippoClient } from '../lib/client';
import { spec } from '../spec';

export let getTransaction = SlateTool.create(spec, {
  name: 'Get Transaction',
  key: 'get_transaction',
  description: `Retrieve details of a specific transaction (label purchase) by ID. Returns label URL, tracking number, and current status. Useful for checking async label generation or retrieving label URLs.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      transactionId: z.string().describe('Transaction ID to retrieve')
    })
  )
  .output(
    z.object({
      transactionId: z.string(),
      status: z
        .string()
        .optional()
        .describe('Transaction status (SUCCESS, ERROR, QUEUED, WAITING)'),
      trackingNumber: z.string().optional(),
      labelUrl: z.string().optional(),
      commercialInvoiceUrl: z.string().optional(),
      rate: z.string().optional(),
      messages: z.array(z.any()).optional(),
      createdAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ShippoClient(ctx.auth.token);

    let result = (await client.getTransaction(ctx.input.transactionId)) as Record<string, any>;

    return {
      output: {
        transactionId: result.object_id,
        status: result.status,
        trackingNumber: result.tracking_number,
        labelUrl: result.label_url,
        commercialInvoiceUrl: result.commercial_invoice_url,
        rate: result.rate,
        messages: result.messages,
        createdAt: result.object_created
      },
      message: `Transaction **${result.object_id}** — status: ${result.status}.${result.tracking_number ? ` Tracking: ${result.tracking_number}.` : ''}${result.label_url ? ` [Label](${result.label_url})` : ''}`
    };
  })
  .build();
