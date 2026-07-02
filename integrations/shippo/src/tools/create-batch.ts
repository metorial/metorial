import { SlateTool } from 'slates';
import { z } from 'zod';
import { ShippoClient } from '../lib/client';
import { spec } from '../spec';

export let createBatch = SlateTool.create(spec, {
  name: 'Create Batch Labels',
  key: 'create_batch',
  description: `Create a batch of shipping labels for multiple shipments at once. Provide a default carrier account and service level, along with the batch shipments. After creation, purchase the batch to generate all labels.`,
  tags: {
    destructive: false,
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
            shipmentId: z.string().describe('Existing shipment ID to include in the batch')
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
    let client = new ShippoClient(ctx.auth.token);

    let batchShipments = ctx.input.batchShipments.map(s => ({
      shipment: s.shipmentId
    }));

    let result = (await client.createBatch({
      default_carrier_account: ctx.input.defaultCarrierAccount,
      default_servicelevel_token: ctx.input.defaultServicelevelToken,
      label_filetype: ctx.input.labelFiletype,
      metadata: ctx.input.metadata,
      batch_shipments: batchShipments
    })) as Record<string, any>;

    return {
      output: {
        batchId: result.object_id,
        status: result.status,
        shipmentCount: result.batch_shipments?.count,
        createdAt: result.object_created
      },
      message: `Batch created (${result.object_id}) with status: ${result.status}. ${result.batch_shipments?.count || 0} shipments.`
    };
  })
  .build();

export let purchaseBatch = SlateTool.create(spec, {
  name: 'Purchase Batch Labels',
  key: 'purchase_batch',
  description: `Purchase all labels in an existing batch. The batch must be in VALID status. After purchasing, labels and tracking numbers will be generated for all shipments in the batch.`,
  tags: {
    destructive: false,
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
    let client = new ShippoClient(ctx.auth.token);

    let result = (await client.purchaseBatch(ctx.input.batchId)) as Record<string, any>;

    return {
      output: {
        batchId: result.object_id,
        status: result.status
      },
      message: `Batch **${result.object_id}** purchase initiated. Status: ${result.status}.`
    };
  })
  .build();
