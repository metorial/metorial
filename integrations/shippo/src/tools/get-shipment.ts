import { SlateTool } from 'slates';
import { z } from 'zod';
import { ShippoClient } from '../lib/client';
import { spec } from '../spec';

export let getShipment = SlateTool.create(spec, {
  name: 'Get Shipment',
  key: 'get_shipment',
  description: `Retrieve details of a specific shipment by ID, including its addresses, parcels, and status. Also useful for checking if rates are ready for async shipments.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      shipmentId: z.string().describe('Shipment ID to retrieve')
    })
  )
  .output(
    z.object({
      shipmentId: z.string(),
      status: z.string().optional(),
      addressFrom: z.any().optional(),
      addressTo: z.any().optional(),
      parcels: z.array(z.any()).optional(),
      rateCount: z.number().optional().describe('Number of available rates'),
      metadata: z.string().optional(),
      createdAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ShippoClient(ctx.auth.token);

    let result = (await client.getShipment(ctx.input.shipmentId)) as Record<string, any>;

    return {
      output: {
        shipmentId: result.object_id,
        status: result.status,
        addressFrom: result.address_from,
        addressTo: result.address_to,
        parcels: result.parcels,
        rateCount: result.rates?.length,
        metadata: result.metadata,
        createdAt: result.object_created
      },
      message: `Shipment **${result.object_id}** — status: ${result.status}. ${result.rates?.length || 0} rates available.`
    };
  })
  .build();
