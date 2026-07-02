import { SlateTool } from 'slates';
import { z } from 'zod';
import { ShippoClient } from '../lib/client';
import { spec } from '../spec';

export let purchaseLabel = SlateTool.create(spec, {
  name: 'Purchase Shipping Label',
  key: 'purchase_label',
  description: `Purchase a shipping label. You can either select a rate from an existing shipment, or create a label in a single call by providing full shipment details along with carrier and service level. Returns the label URL and tracking number.`,
  instructions: [
    'Use **rateId** when you already have rates from a shipment and want to purchase one.',
    'Use the **single-call** approach (shipment + carrierAccount + servicelevelToken) to create a label without rate shopping.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      rateId: z.string().optional().describe('Rate ID from a shipment to purchase'),
      shipment: z
        .object({
          addressFrom: z.any().describe('Sender address (object ID or inline object)'),
          addressTo: z.any().describe('Recipient address (object ID or inline object)'),
          parcels: z.array(z.any()).describe('Parcels for the shipment'),
          customsDeclaration: z.string().optional().describe('Customs declaration ID')
        })
        .optional()
        .describe('Inline shipment details for single-call label creation'),
      carrierAccount: z
        .string()
        .optional()
        .describe('Carrier account ID (required for single-call)'),
      servicelevelToken: z
        .string()
        .optional()
        .describe('Service level token (e.g. usps_priority, fedex_ground)'),
      labelFileType: z
        .enum(['PDF', 'PDF_4x6', 'PDF_4x8', 'PNG', 'ZPLII'])
        .optional()
        .describe('Label file format'),
      metadata: z.string().optional().describe('Custom metadata'),
      async: z.boolean().optional().describe('Set to true for async label generation')
    })
  )
  .output(
    z.object({
      transactionId: z.string().describe('Unique transaction (label) identifier'),
      status: z
        .string()
        .optional()
        .describe('Transaction status (SUCCESS, ERROR, QUEUED, WAITING)'),
      trackingNumber: z.string().optional().describe('Carrier tracking number'),
      labelUrl: z.string().optional().describe('URL to download the shipping label'),
      commercialInvoiceUrl: z
        .string()
        .optional()
        .describe('URL for commercial invoice (international)'),
      rate: z.string().optional().describe('Rate ID used for this label'),
      messages: z.array(z.any()).optional().describe('Status or error messages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ShippoClient(ctx.auth.token);

    let payload: Record<string, unknown> = {};

    if (ctx.input.rateId) {
      payload.rate = ctx.input.rateId;
    } else if (ctx.input.shipment) {
      payload.shipment = {
        address_from: ctx.input.shipment.addressFrom,
        address_to: ctx.input.shipment.addressTo,
        parcels: ctx.input.shipment.parcels,
        customs_declaration: ctx.input.shipment.customsDeclaration
      };
      payload.carrier_account = ctx.input.carrierAccount;
      payload.servicelevel_token = ctx.input.servicelevelToken;
    }

    if (ctx.input.labelFileType) payload.label_file_type = ctx.input.labelFileType;
    if (ctx.input.metadata) payload.metadata = ctx.input.metadata;
    if (ctx.input.async !== undefined) payload.async = ctx.input.async;

    let result = (await client.createTransaction(payload)) as Record<string, any>;

    return {
      output: {
        transactionId: result.object_id,
        status: result.status,
        trackingNumber: result.tracking_number,
        labelUrl: result.label_url,
        commercialInvoiceUrl: result.commercial_invoice_url,
        rate: result.rate,
        messages: result.messages
      },
      message: `Label ${result.status === 'SUCCESS' ? '✅ created' : `status: ${result.status}`}. ${result.tracking_number ? `Tracking: **${result.tracking_number}**` : ''} ${result.label_url ? `[Download label](${result.label_url})` : ''}`
    };
  })
  .build();
