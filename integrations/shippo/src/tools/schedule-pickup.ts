import { SlateTool } from 'slates';
import { z } from 'zod';
import { ShippoClient } from '../lib/client';
import { spec } from '../spec';

export let schedulePickup = SlateTool.create(spec, {
  name: 'Schedule Pickup',
  key: 'schedule_pickup',
  description: `Schedule a carrier pickup for eligible shipments. Currently supported for USPS and DHL Express. Specify the pickup location, time window, and the transactions (labels) to be picked up.`,
  constraints: ['Only supported for USPS and DHL Express carriers.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      carrierAccount: z.string().describe('Carrier account ID for pickup'),
      location: z
        .object({
          buildingLocationType: z
            .enum([
              'Front Door',
              'Back Door',
              'Side Door',
              'Knock on Door',
              'Ring Bell',
              'Mail Room',
              'Office',
              'Reception',
              'In/At Mailbox',
              'Other'
            ])
            .optional()
            .describe('Where the package is located'),
          buildingType: z
            .enum(['apartment', 'building', 'department', 'floor', 'room', 'suite'])
            .optional(),
          instructions: z.string().optional().describe('Special instructions for the carrier'),
          address: z.any().describe('Pickup address (object ID or inline address)')
        })
        .describe('Pickup location details'),
      requestedStartTime: z.string().describe('Earliest pickup time (ISO 8601 datetime)'),
      requestedEndTime: z.string().describe('Latest pickup time (ISO 8601 datetime)'),
      transactions: z.array(z.string()).describe('Transaction IDs (labels) to be picked up'),
      isTest: z.boolean().optional().describe('Set to true for test pickups')
    })
  )
  .output(
    z.object({
      pickupId: z.string().optional().describe('Pickup confirmation ID'),
      status: z.string().optional().describe('Pickup status'),
      confirmationCode: z.string().optional().describe('Carrier confirmation code'),
      messages: z.array(z.any()).optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ShippoClient(ctx.auth.token);

    let result = (await client.createPickup({
      carrier_account: ctx.input.carrierAccount,
      location: {
        building_location_type: ctx.input.location.buildingLocationType,
        building_type: ctx.input.location.buildingType,
        instructions: ctx.input.location.instructions,
        address: ctx.input.location.address
      },
      requested_start_time: ctx.input.requestedStartTime,
      requested_end_time: ctx.input.requestedEndTime,
      transactions: ctx.input.transactions,
      is_test: ctx.input.isTest
    })) as Record<string, any>;

    return {
      output: {
        pickupId: result.object_id,
        status: result.status,
        confirmationCode: result.confirmation_code,
        messages: result.messages
      },
      message: `Pickup ${result.status === 'CONFIRMED' ? '✅ confirmed' : `status: ${result.status}`}.${result.confirmation_code ? ` Confirmation: ${result.confirmation_code}` : ''}`
    };
  })
  .build();
