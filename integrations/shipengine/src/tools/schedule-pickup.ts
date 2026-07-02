import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let schedulePickup = SlateTool.create(spec, {
  name: 'Schedule Pickup',
  key: 'schedule_pickup',
  description: `Schedule a carrier pickup for one or more shipment labels. Provide label IDs, contact details, and a pickup time window. The carrier will arrange to pick up the packages at the specified location.`,
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      labelIds: z
        .array(z.string())
        .min(1)
        .describe('Label IDs for the packages to be picked up'),
      contactName: z.string().describe('Contact person name'),
      contactPhone: z.string().describe('Contact phone number'),
      contactEmail: z.string().optional().describe('Contact email address'),
      pickupNotes: z.string().optional().describe('Special instructions for the pickup'),
      pickupWindowStart: z.string().describe('Pickup window start time (ISO 8601)'),
      pickupWindowEnd: z.string().describe('Pickup window end time (ISO 8601)')
    })
  )
  .output(
    z.object({
      pickupId: z.string().describe('Pickup ID'),
      confirmationNumber: z.string().describe('Carrier confirmation number'),
      carrierId: z.string().describe('Carrier ID'),
      createdAt: z.string().describe('Creation timestamp'),
      pickupWindowStart: z.string().describe('Pickup window start'),
      pickupWindowEnd: z.string().describe('Pickup window end')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.schedulePickup({
      label_ids: ctx.input.labelIds,
      contact_details: {
        name: ctx.input.contactName,
        phone: ctx.input.contactPhone,
        email: ctx.input.contactEmail
      },
      pickup_notes: ctx.input.pickupNotes,
      pickup_window: {
        start_at: ctx.input.pickupWindowStart,
        end_at: ctx.input.pickupWindowEnd
      }
    });

    return {
      output: {
        pickupId: result.pickup_id,
        confirmationNumber: result.confirmation_number,
        carrierId: result.carrier_id,
        createdAt: result.created_at,
        pickupWindowStart: result.pickup_window.start_at,
        pickupWindowEnd: result.pickup_window.end_at
      },
      message: `Scheduled pickup **${result.pickup_id}** (confirmation: ${result.confirmation_number}) for ${ctx.input.labelIds.length} label(s).`
    };
  })
  .build();

export let cancelPickup = SlateTool.create(spec, {
  name: 'Cancel Pickup',
  key: 'cancel_pickup',
  description: `Cancel a previously scheduled carrier pickup.`,
  tags: {
    readOnly: false,
    destructive: true
  }
})
  .input(
    z.object({
      pickupId: z.string().describe('ID of the pickup to cancel')
    })
  )
  .output(
    z.object({
      cancelled: z.boolean().describe('Whether the pickup was cancelled')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    await client.deletePickup(ctx.input.pickupId);

    return {
      output: { cancelled: true },
      message: `Cancelled pickup **${ctx.input.pickupId}**.`
    };
  })
  .build();
