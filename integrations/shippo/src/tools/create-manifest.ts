import { SlateTool } from 'slates';
import { z } from 'zod';
import { ShippoClient } from '../lib/client';
import { spec } from '../spec';

export let createManifest = SlateTool.create(spec, {
  name: 'Create Manifest',
  key: 'create_manifest',
  description: `Create a manifest (SCAN form) to close out shipping labels for a given day. A manifest is a single-page document with a barcode that carriers can scan to accept all packages at once. Some carriers require daily manifests.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      carrierAccount: z.string().describe('Carrier account ID to create manifest for'),
      shipmentDate: z.string().describe('Date of the shipment in YYYY-MM-DD format'),
      addressFrom: z.any().describe('Sender address (object ID or inline address object)'),
      transactions: z
        .array(z.string())
        .optional()
        .describe(
          'Specific transaction IDs to include (if omitted, all eligible transactions are included)'
        )
    })
  )
  .output(
    z.object({
      manifestId: z.string().describe('Unique manifest identifier'),
      status: z.string().optional().describe('Manifest status (QUEUED, SUCCESS, ERROR)'),
      carrierAccount: z.string().optional(),
      shipmentDate: z.string().optional(),
      documentsUrl: z.string().optional().describe('URL to download the manifest document'),
      errors: z.array(z.any()).optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ShippoClient(ctx.auth.token);

    let result = (await client.createManifest({
      carrier_account: ctx.input.carrierAccount,
      shipment_date: ctx.input.shipmentDate,
      address_from: ctx.input.addressFrom,
      transactions: ctx.input.transactions
    })) as Record<string, any>;

    return {
      output: {
        manifestId: result.object_id,
        status: result.status,
        carrierAccount: result.carrier_account,
        shipmentDate: result.shipment_date,
        documentsUrl: result.documents?.[0],
        errors: result.errors
      },
      message: `Manifest ${result.status === 'SUCCESS' ? '✅ created' : `status: ${result.status}`} (${result.object_id}) for ${ctx.input.shipmentDate}.`
    };
  })
  .build();
