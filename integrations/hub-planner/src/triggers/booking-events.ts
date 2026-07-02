import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let bookingEvents = SlateTrigger.create(spec, {
  name: 'Booking Events',
  key: 'booking_events',
  description: 'Triggers when a booking is created, updated, or deleted in Hub Planner.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe(
          'The webhook event type (e.g. booking.create, booking.update, booking.delete)'
        ),
      eventId: z.string().describe('Unique event identifier'),
      bookingId: z.string().describe('Booking ID'),
      resourceId: z.string().optional().describe('Resource ID'),
      projectId: z.string().optional().describe('Project ID'),
      resourceName: z.string().optional().describe('Resource name'),
      projectName: z.string().optional().describe('Project name'),
      start: z.string().optional().describe('Booking start date'),
      end: z.string().optional().describe('Booking end date'),
      categoryName: z.string().optional().describe('Booking category name'),
      durationHours: z.number().optional().describe('Duration in hours'),
      durationMinutes: z.number().optional().describe('Duration in minutes')
    })
  )
  .output(
    z.object({
      bookingId: z.string().describe('Booking ID'),
      resourceId: z.string().optional().describe('Resource ID'),
      projectId: z.string().optional().describe('Project ID'),
      resourceName: z.string().optional().describe('Resource name'),
      projectName: z.string().optional().describe('Project name'),
      start: z.string().optional().describe('Start date'),
      end: z.string().optional().describe('End date'),
      categoryName: z.string().optional().describe('Category name'),
      durationHours: z.number().optional().describe('Duration in hours'),
      durationMinutes: z.number().optional().describe('Duration in minutes')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let events = [
        'booking.create',
        'booking.update',
        'booking.delete',
        'booking.delete.multiple'
      ];
      let registrations: Array<{ subscriptionId: string; event: string }> = [];

      for (let event of events) {
        let result = await client.createWebhook({
          event,
          target_url: ctx.input.webhookBaseUrl
        });
        registrations.push({ subscriptionId: result._id, event });
      }

      return { registrationDetails: { subscriptions: registrations } };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let subscriptions = ctx.input.registrationDetails?.subscriptions || [];
      for (let sub of subscriptions) {
        await client.deleteWebhook(sub.subscriptionId);
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;
      let eventType = data.event || '';

      // booking.delete.multiple sends an array of bookings
      if (eventType === 'booking.delete.multiple' && Array.isArray(data)) {
        return {
          inputs: data.map((booking: any) => ({
            eventType: 'booking.delete',
            eventId: `booking.delete-${booking.bookingId || booking._id}-${Date.now()}`,
            bookingId: booking.bookingId || booking._id || '',
            resourceId: booking.resourceId,
            projectId: booking.projectId,
            resourceName: booking.resourceName,
            projectName: booking.projectName,
            start: booking.start,
            end: booking.end,
            categoryName: booking.categoryName,
            durationHours: booking.durationHours,
            durationMinutes: booking.durationMinutes
          }))
        };
      }

      let bookingId = data.bookingId || data._id || '';
      let eventId = `${eventType}-${bookingId}-${data.updatedDate || Date.now()}`;

      return {
        inputs: [
          {
            eventType,
            eventId,
            bookingId,
            resourceId: data.resourceId,
            projectId: data.projectId,
            resourceName: data.resourceName,
            projectName: data.projectName,
            start: data.start,
            end: data.end,
            categoryName: data.categoryName,
            durationHours: data.durationHours,
            durationMinutes: data.durationMinutes
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          bookingId: ctx.input.bookingId,
          resourceId: ctx.input.resourceId,
          projectId: ctx.input.projectId,
          resourceName: ctx.input.resourceName,
          projectName: ctx.input.projectName,
          start: ctx.input.start,
          end: ctx.input.end,
          categoryName: ctx.input.categoryName,
          durationHours: ctx.input.durationHours,
          durationMinutes: ctx.input.durationMinutes
        }
      };
    }
  })
  .build();
