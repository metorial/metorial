import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { spec } from '../spec';

export let schedulePickup = SlateTool.create(spec, {
  name: 'Schedule Pickup',
  key: 'schedule_pickup',
  description: `Schedule a carrier pickup for one or more shipment labels. Provide label IDs, contact details, and a pickup time window. Production pickups can incur carrier fees. The carrier will arrange to pick up the packages at the specified location.`,
  tags: {
    readOnly: false,
    destructive: true
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
      confirmationNumber: z.string().optional().describe('Carrier confirmation number'),
      carrierId: z.string().describe('Carrier ID'),
      createdAt: z.string().describe('Creation timestamp'),
      pickupWindowStart: z.string().optional().describe('First provider pickup window start'),
      pickupWindowEnd: z.string().optional().describe('First provider pickup window end'),
      pickupWindows: z
        .array(z.object({ startAt: z.string(), endAt: z.string() }))
        .describe('All carrier pickup windows')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    if (
      !ctx.input.contactEmail ||
      !z.string().email().safeParse(ctx.input.contactEmail).success
    )
      throw createApiServiceError(
        'Provide a valid contactEmail required by the carrier pickup API.'
      );
    if (
      !Number.isFinite(Date.parse(ctx.input.pickupWindowStart)) ||
      !Number.isFinite(Date.parse(ctx.input.pickupWindowEnd)) ||
      Date.parse(ctx.input.pickupWindowStart) >= Date.parse(ctx.input.pickupWindowEnd)
    )
      throw createApiServiceError('Provide a valid pickup window with start before end.');
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

    const windows =
      result.pickup_windows ??
      (Array.isArray(result.pickup_window)
        ? result.pickup_window
        : result.pickup_window
          ? [result.pickup_window]
          : []);
    return {
      output: {
        pickupId: result.pickup_id,
        confirmationNumber: result.confirmation_number,
        carrierId: result.carrier_id,
        createdAt: result.created_at,
        pickupWindowStart: windows[0]?.start_at,
        pickupWindowEnd: windows[0]?.end_at,
        pickupWindows: windows.map(w => ({ startAt: w.start_at, endAt: w.end_at }))
      },
      message: `Scheduled pickup **${result.pickup_id}** (confirmation: ${result.confirmation_number}) for ${ctx.input.labelIds.length} label(s).`
    };
  })
  .build();

export let cancelPickup = SlateTool.create(spec, {
  name: 'Cancel Pickup',
  key: 'cancel_pickup',
  description: `Cancel a previously scheduled carrier pickup. The pickup history remains available; carrier cancellation limits apply.`,
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
    let client = createClient(ctx);

    await client.deletePickup(ctx.input.pickupId);

    return {
      output: { cancelled: true },
      message: `Cancelled pickup **${ctx.input.pickupId}**.`
    };
  })
  .build();
