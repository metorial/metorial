import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageBooking = SlateTool.create(spec, {
  name: 'Manage Booking',
  key: 'manage_booking',
  description: `Create, update, or delete a resource booking in Hub Planner. Bookings schedule resources onto projects for specific date ranges.
When creating, **resourceId**, **projectId**, **start**, and **end** are required. Supports percentage-based and minute-based allocation, repeating bookings, and approval workflows.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'delete', 'delete_bulk'])
        .describe('Operation to perform'),
      bookingId: z
        .string()
        .optional()
        .describe('Booking ID, required for update and single delete'),
      bookingIds: z
        .array(z.string())
        .optional()
        .describe('Array of booking IDs for bulk delete'),
      resourceId: z
        .string()
        .optional()
        .describe('Resource ID to schedule, required for create'),
      projectId: z
        .string()
        .optional()
        .describe('Project ID to schedule on, required for create'),
      start: z.string().optional().describe('Booking start date (YYYY-MM-DD)'),
      end: z.string().optional().describe('Booking end date (YYYY-MM-DD)'),
      title: z.string().optional().describe('Booking title'),
      note: z.string().optional().describe('Booking note'),
      state: z
        .enum(['STATE_DAY_MINUTE', 'STATE_PERCENTAGE', 'STATE_TOTAL_MINUTE'])
        .optional()
        .describe('Booking state type'),
      stateValue: z
        .number()
        .optional()
        .describe('Value for the state (percentage or minutes)'),
      allDay: z.boolean().optional().describe('Whether the booking is all day'),
      type: z
        .enum(['SCHEDULED', 'WAITING_FOR_APPROVAL'])
        .optional()
        .describe('Booking type. Use WAITING_FOR_APPROVAL for booking requests.'),
      allowOverschedule: z.boolean().optional().describe('Allow overscheduling the resource'),
      metadata: z.string().optional().describe('Custom metadata')
    })
  )
  .output(
    z.object({
      bookingId: z.string().optional().describe('Booking ID'),
      resourceId: z.string().optional().describe('Resource ID'),
      projectId: z.string().optional().describe('Project ID'),
      start: z.string().optional().describe('Start date'),
      end: z.string().optional().describe('End date'),
      title: z.string().optional().describe('Booking title'),
      state: z.string().optional().describe('Booking state type'),
      type: z.string().optional().describe('Booking type'),
      createdDate: z.string().optional().describe('Creation timestamp'),
      updatedDate: z.string().optional().describe('Last update timestamp'),
      deletedCount: z.number().optional().describe('Number of bookings deleted (bulk delete)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let {
      action,
      bookingId,
      bookingIds,
      resourceId,
      projectId,
      allowOverschedule,
      ...fields
    } = ctx.input;

    if (action === 'create') {
      let body: Record<string, any> = { ...fields, resource: resourceId, project: projectId };
      if (allowOverschedule) body.allowOverschedule = true;
      let result = await client.createBooking(body);
      return {
        output: {
          bookingId: result._id,
          resourceId: result.resource,
          projectId: result.project,
          start: result.start,
          end: result.end,
          title: result.title,
          state: result.state,
          type: result.type,
          createdDate: result.createdDate,
          updatedDate: result.updatedDate
        },
        message: `Created booking (ID: \`${result._id}\`) for resource \`${result.resource}\` on project \`${result.project}\`.`
      };
    }

    if (action === 'update') {
      if (!bookingId) throw new Error('bookingId is required for update');
      let body: Record<string, any> = { ...fields };
      if (resourceId) body.resource = resourceId;
      if (projectId) body.project = projectId;
      if (allowOverschedule) body.allowOverschedule = true;
      let result = await client.updateBooking(bookingId, body);
      return {
        output: {
          bookingId: result._id,
          resourceId: result.resource,
          projectId: result.project,
          start: result.start,
          end: result.end,
          title: result.title,
          state: result.state,
          type: result.type,
          createdDate: result.createdDate,
          updatedDate: result.updatedDate
        },
        message: `Updated booking \`${result._id}\`.`
      };
    }

    if (action === 'delete_bulk') {
      if (!bookingIds || bookingIds.length === 0)
        throw new Error('bookingIds is required for bulk delete');
      await client.deleteBookingsBulk(bookingIds);
      return {
        output: { deletedCount: bookingIds.length },
        message: `Deleted **${bookingIds.length}** bookings.`
      };
    }

    if (!bookingId) throw new Error('bookingId is required for delete');
    await client.deleteBooking(bookingId);
    return {
      output: { bookingId },
      message: `Deleted booking \`${bookingId}\`.`
    };
  })
  .build();
