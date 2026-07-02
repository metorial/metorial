import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createManifest = SlateTool.create(spec, {
  name: 'Create Manifest',
  key: 'create_manifest',
  description: `Create an end-of-day manifest (scan form) for a carrier. A manifest is a document that lists all shipments being tendered to the carrier for pickup. Some carriers require manifests for scheduled pickups.`,
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      carrierId: z.string().describe('Carrier ID to create the manifest for'),
      warehouseId: z
        .string()
        .optional()
        .describe('Warehouse ID (uses default if not specified)'),
      shipDate: z.string().optional().describe('Ship date in YYYY-MM-DD format'),
      labelIds: z.array(z.string()).optional().describe('Specific label IDs to include'),
      excludedLabelIds: z
        .array(z.string())
        .optional()
        .describe('Label IDs to exclude from the manifest')
    })
  )
  .output(
    z.object({
      manifestId: z.string().describe('Manifest ID'),
      formId: z.string().describe('Form ID'),
      carrierId: z.string().describe('Carrier ID'),
      shipDate: z.string().describe('Ship date'),
      shipments: z.number().describe('Number of shipments included'),
      manifestDownloadUrl: z.string().describe('URL to download the manifest document'),
      createdAt: z.string().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.createManifest({
      carrier_id: ctx.input.carrierId,
      warehouse_id: ctx.input.warehouseId,
      ship_date: ctx.input.shipDate,
      label_ids: ctx.input.labelIds,
      excluded_label_ids: ctx.input.excludedLabelIds
    });

    return {
      output: {
        manifestId: result.manifest_id,
        formId: result.form_id,
        carrierId: result.carrier_id,
        shipDate: result.ship_date,
        shipments: result.shipments,
        manifestDownloadUrl: result.manifest_download?.href ?? '',
        createdAt: result.created_at
      },
      message: `Created manifest **${result.manifest_id}** for carrier ${result.carrier_id} with **${result.shipments}** shipment(s).`
    };
  })
  .build();
