import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateEventType = SlateTool.create(spec, {
  name: 'Update Event Type',
  key: 'update_event_type',
  description: `Update an existing event type's configuration. Only the owner can update an event type. Any provided fields will be updated; omitted fields remain unchanged.`
})
  .input(
    z.object({
      eventTypeId: z.number().describe('ID of the event type to update'),
      title: z.string().optional().describe('Updated title'),
      slug: z.string().optional().describe('Updated URL slug'),
      lengthInMinutes: z.number().optional().describe('Updated duration in minutes'),
      description: z.string().optional().describe('Updated description'),
      locations: z.array(z.any()).optional().describe('Updated locations array'),
      scheduleId: z.number().optional().describe('Schedule ID to assign'),
      slotInterval: z.number().optional().describe('Updated slot interval in minutes'),
      bookingFields: z.array(z.any()).optional().describe('Updated booking form fields'),
      disableGuests: z.boolean().optional().describe('Whether to disable guest additions'),
      minimumBookingNotice: z.number().optional().describe('Minimum notice in minutes'),
      beforeEventBuffer: z.number().optional().describe('Buffer before event in minutes'),
      afterEventBuffer: z.number().optional().describe('Buffer after event in minutes'),
      requiresBookerAuthentication: z.boolean().optional().describe('Require authentication'),
      hideCalendarNotes: z.boolean().optional().describe('Hide calendar notes'),
      metadata: z.record(z.string(), z.any()).optional().describe('Custom metadata')
    })
  )
  .output(
    z.object({
      eventType: z.any().describe('Updated event type details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let { eventTypeId, ...updates } = ctx.input;

    // Remove undefined values
    let body: Record<string, any> = {};
    for (let [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        body[key] = value;
      }
    }

    let eventType = await client.updateEventType(eventTypeId, body);

    return {
      output: { eventType },
      message: `Event type **${eventTypeId}** updated.`
    };
  })
  .build();
