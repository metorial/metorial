import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlisioClient } from '../lib/client';
import { optionalValue, readRecord, validateOutput } from '../lib/response';
import { spec } from '../spec';

let outputSchema = z.object({
  invoice: z
    .record(z.string(), z.unknown())
    .describe(
      'Invoice details, with amounts and timestamps in their original provider representation'
    ),
  activeInvoiceId: z
    .string()
    .optional()
    .describe('Invoice ID for the most recently selected cryptocurrency'),
  shop: z.record(z.string(), z.unknown()).optional().describe('Merchant details'),
  paysys: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('Selected cryptocurrency details'),
  allowedCryptocurrencies: z
    .array(z.record(z.string(), z.unknown()))
    .optional()
    .describe('Cryptocurrencies available for this invoice'),
  raw: z
    .record(z.string(), z.unknown())
    .describe('Original invoice response with credentials removed')
});

export let getInvoice = SlateTool.create(spec, {
  name: 'Get Invoice',
  key: 'get_invoice',
  description:
    'Retrieve an existing invoice, the active invoice ID after a customer changes currency, merchant information, and the allowed payment currencies.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      invoiceId: z.string().describe('Invoice transaction ID returned by create_invoice')
    })
  )
  .output(outputSchema)
  .handleInvocation(async ctx => {
    let client = new PlisioClient({ token: ctx.auth.token });
    let result = readRecord(await client.getInvoice(ctx.input.invoiceId));
    return {
      output: validateOutput(outputSchema, {
        invoice: readRecord(result.invoice),
        activeInvoiceId: optionalValue(result.active_invoice_id),
        shop: optionalValue(result.shop),
        paysys: optionalValue(result.paysys),
        allowedCryptocurrencies: optionalValue(result.allowed_psys_cids),
        raw: result
      }),
      message: 'Retrieved invoice details.'
    };
  })
  .build();
