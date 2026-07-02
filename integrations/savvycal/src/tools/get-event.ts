import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let attendeeSchema = z.object({
  attendeeId: z.string().describe('Unique attendee identifier'),
  displayName: z.string().describe('Display name'),
  email: z.string().describe('Email address'),
  firstName: z.string().describe('First name'),
  lastName: z.string().describe('Last name'),
  isOrganizer: z.boolean().describe('Whether this attendee is the organizer'),
  responseStatus: z.string().describe('Response status'),
  timeZone: z.string().describe('Time zone'),
  phoneNumber: z.string().nullable().optional().describe('Phone number'),
  marketingOptIn: z.boolean().optional().describe('Marketing opt-in status'),
  fields: z
    .array(
      z.object({
        fieldId: z.string(),
        label: z.string(),
        type: z.string(),
        value: z.string()
      })
    )
    .optional()
    .describe('Custom field values')
});

export let getEventTool = SlateTool.create(spec, {
  name: 'Get Event',
  key: 'get_event',
  description: `Fetch detailed information about a specific SavvyCal event by its ID. Returns full event details including attendees, conferencing, scheduling link info, payment details, and reschedule/cancellation history.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      eventId: z.string().describe('The unique ID of the event to retrieve')
    })
  )
  .output(
    z.object({
      eventId: z.string().describe('Unique event identifier'),
      summary: z.string().describe('Event title'),
      description: z.string().nullable().optional().describe('Event description'),
      additionalInfo: z.string().nullable().optional().describe('Additional info'),
      startAt: z.string().describe('Start time (ISO 8601)'),
      endAt: z.string().describe('End time (ISO 8601)'),
      duration: z.number().describe('Duration in minutes'),
      state: z.string().describe('Event state'),
      url: z.string().describe('Public event URL'),
      createdAt: z.string().describe('Creation timestamp'),
      attendees: z.array(attendeeSchema).describe('All attendees'),
      organizer: attendeeSchema.nullable().optional().describe('Organizer details'),
      scheduler: attendeeSchema.nullable().optional().describe('Scheduler details'),
      conferencing: z
        .object({
          type: z.string().nullable().optional(),
          joinUrl: z.string().nullable().optional(),
          meetingId: z.string().nullable().optional(),
          instructions: z.string().nullable().optional()
        })
        .nullable()
        .optional()
        .describe('Conferencing info'),
      location: z.string().nullable().optional().describe('Location'),
      linkId: z.string().nullable().optional().describe('Associated scheduling link ID'),
      linkName: z.string().nullable().optional().describe('Associated scheduling link name'),
      metadata: z.record(z.string(), z.any()).optional().describe('Custom metadata'),
      isGroupSession: z.boolean().optional().describe('Whether this is a group session'),
      maximumGroupSize: z.number().optional().describe('Maximum group size'),
      bufferBefore: z.number().optional().describe('Buffer before in minutes'),
      bufferAfter: z.number().optional().describe('Buffer after in minutes'),
      payment: z
        .object({
          amountTotal: z.number().optional(),
          state: z.string().optional(),
          url: z.string().nullable().optional()
        })
        .nullable()
        .optional()
        .describe('Payment details'),
      originalStartAt: z
        .string()
        .nullable()
        .optional()
        .describe('Original start time if rescheduled'),
      originalEndAt: z
        .string()
        .nullable()
        .optional()
        .describe('Original end time if rescheduled'),
      rescheduledAt: z.string().nullable().optional().describe('Reschedule timestamp'),
      rescheduleReason: z.string().nullable().optional().describe('Reschedule reason'),
      canceledAt: z.string().nullable().optional().describe('Cancellation timestamp'),
      cancelReason: z.string().nullable().optional().describe('Cancellation reason')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let e = await client.getEvent(ctx.input.eventId);

    let mapAttendee = (a: any) =>
      a
        ? {
            attendeeId: a.id,
            displayName: a.display_name,
            email: a.email,
            firstName: a.first_name,
            lastName: a.last_name,
            isOrganizer: a.is_organizer,
            responseStatus: a.response_status,
            timeZone: a.time_zone,
            phoneNumber: a.phone_number,
            marketingOptIn: a.marketing_opt_in,
            fields: a.fields?.map((f: any) => ({
              fieldId: f.id,
              label: f.label,
              type: f.type,
              value: f.value
            }))
          }
        : null;

    return {
      output: {
        eventId: e.id,
        summary: e.summary,
        description: e.description,
        additionalInfo: e.additional_info,
        startAt: e.start_at,
        endAt: e.end_at,
        duration: e.duration,
        state: e.state,
        url: e.url,
        createdAt: e.created_at,
        attendees: (e.attendees ?? []).map(mapAttendee),
        organizer: mapAttendee(e.organizer),
        scheduler: mapAttendee(e.scheduler),
        conferencing: e.conferencing
          ? {
              type: e.conferencing.type,
              joinUrl: e.conferencing.join_url,
              meetingId: e.conferencing.meeting_id,
              instructions: e.conferencing.instructions
            }
          : null,
        location: e.location,
        linkId: e.link?.id,
        linkName: e.link?.name,
        metadata: e.metadata,
        isGroupSession: e.is_group_session,
        maximumGroupSize: e.maximum_group_size,
        bufferBefore: e.buffer_before,
        bufferAfter: e.buffer_after,
        payment: e.payment
          ? {
              amountTotal: e.payment.amount_total,
              state: e.payment.state,
              url: e.payment.url
            }
          : null,
        originalStartAt: e.original_start_at,
        originalEndAt: e.original_end_at,
        rescheduledAt: e.rescheduled_at,
        rescheduleReason: e.reschedule_reason,
        canceledAt: e.canceled_at,
        cancelReason: e.cancel_reason
      },
      message: `Retrieved event **"${e.summary}"** (${e.state}) scheduled for ${e.start_at}.`
    };
  })
  .build();
