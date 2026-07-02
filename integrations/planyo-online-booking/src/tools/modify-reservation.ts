import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlanyoClient } from '../lib/client';
import { spec } from '../spec';

export let modifyReservation = SlateTool.create(spec, {
  name: 'Modify Reservation',
  key: 'modify_reservation',
  description: `Modifies an existing reservation. Can change the resource, time period, quantity, assigned user, and custom form fields. By default, the price is recalculated after modifications.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      reservationId: z.string().describe('ID of the reservation to modify'),
      resourceId: z.string().optional().describe('New resource ID'),
      startTime: z.string().optional().describe('New start time'),
      endTime: z.string().optional().describe('New end time'),
      quantity: z.number().optional().describe('New quantity'),
      userId: z.string().optional().describe('Reassign to a different user'),
      adminMode: z.boolean().optional().describe('Bypass booking constraints'),
      sendNotifications: z
        .boolean()
        .optional()
        .describe('Send email notifications (default: true)'),
      recalculatePrice: z
        .boolean()
        .optional()
        .describe('Recalculate pricing after modification (default: true)'),
      comments: z.string().optional().describe('Modification notes'),
      customFields: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom reservation form fields to update')
    })
  )
  .output(
    z.object({
      status: z.string().optional().describe('Updated reservation status'),
      warningText: z.string().optional().describe('Constraint warnings when using admin mode')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PlanyoClient(ctx.auth, ctx.config);

    let result = await client.modifyReservation({
      reservationId: ctx.input.reservationId,
      resourceId: ctx.input.resourceId,
      startTime: ctx.input.startTime,
      endTime: ctx.input.endTime,
      quantity: ctx.input.quantity,
      userId: ctx.input.userId,
      adminMode: ctx.input.adminMode,
      sendNotifications: ctx.input.sendNotifications,
      recalculatePrice: ctx.input.recalculatePrice,
      comments: ctx.input.comments,
      customFields: ctx.input.customFields
    });

    return {
      output: {
        status: result?.status ? String(result.status) : undefined,
        warningText: result?.warning_text
      },
      message: `Reservation **#${ctx.input.reservationId}** modified successfully.`
    };
  })
  .build();
