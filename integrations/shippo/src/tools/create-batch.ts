import { SlateTool } from 'slates';
import { z } from 'zod';
import { ShippoClient } from '../lib/client';
import { addDocument } from '../lib/files';
import { spec } from '../spec';

export let createBatch = SlateTool.create(spec, {
  name: 'Create Batch Labels',
  key: 'create_batch',
  description: `Create a batch by copying the details of existing shipments into new batch shipments. Provide a default carrier account and service level, along with the batch shipments. After creation, purchase the batch to generate all labels.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      defaultCarrierAccount: z
        .string()
        .describe('Default carrier account ID for all shipments in the batch'),
      defaultServicelevelToken: z
        .string()
        .describe('Default service level token (e.g. usps_priority)'),
      labelFiletype: z
        .enum(['PDF', 'PDF_4x6', 'PDF_4x8', 'PNG', 'ZPLII'])
        .optional()
        .describe('Label file format'),
      metadata: z.string().optional(),
      batchShipments: z
        .array(
          z.object({
            shipmentId: z
              .string()
              .describe(
                'Existing shipment ID whose supported details will be copied into a new batch shipment'
              )
          })
        )
        .describe('Shipments to include in the batch')
    })
  )
  .output(
    z.object({
      batchId: z.string().describe('Unique batch identifier'),
      status: z
        .string()
        .optional()
        .describe('Batch status (VALIDATING, VALID, INVALID, PURCHASING, PURCHASED)'),
      shipmentCount: z.number().optional(),
      createdAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ShippoClient(ctx.auth);

    let batchShipments = ctx.input.batchShipments.map(s => ({
      shipment: s.shipmentId
    }));

    let result = await client.createBatch({
      default_carrier_account: ctx.input.defaultCarrierAccount,
      default_servicelevel_token: ctx.input.defaultServicelevelToken,
      label_filetype: ctx.input.labelFiletype,
      metadata: ctx.input.metadata,
      batch_shipments: batchShipments
    });

    return {
      output: {
        batchId: result.object_id,
        status: result.status,
        shipmentCount: result.batch_shipments?.count,
        createdAt: result.object_created
      },
      message: `Batch created (${result.object_id}) with status: ${result.status}. ${ctx.input.batchShipments.length} shipment copies submitted.`
    };
  })
  .build();

export let purchaseBatch = SlateTool.create(spec, {
  name: 'Purchase Batch Labels',
  key: 'purchase_batch',
  description: `Purchase all labels in an existing batch. The batch must be in VALID status. After purchasing, labels and tracking numbers will be generated for all shipments in the batch.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      batchId: z.string().describe('Batch ID to purchase')
    })
  )
  .output(
    z.object({
      batchId: z.string(),
      status: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ShippoClient(ctx.auth);

    let result = await client.purchaseBatch(ctx.input.batchId);

    if (result.status === 'PURCHASED' && Array.isArray(result.label_url))
      for (let documentIndex = 0; documentIndex < result.label_url.length; documentIndex++)
        await addDocument(
          ctx,
          result,
          {
            kind: 'batch',
            resourceId: result.object_id,
            documentType: 'batch_labels',
            documentIndex
          },
          true
        );

    return {
      output: {
        batchId: result.object_id,
        status: result.status
      },
      message: `Batch **${result.object_id}** purchase initiated. Status: ${result.status}.`
    };
  })
  .build();
