import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createMeetingRequest = SlateTool.create(spec, {
  name: 'Create Meeting Request',
  key: 'create_meeting_request',
  description: `Send a meeting request to one or more contacts. CalendarHero will automatically find the best available time within the specified timeframe based on calendar availability. The contacts will receive an invitation to accept the meeting.`,
  instructions: [
    'Provide a subject and at least one invitee using contacts or contactIds.',
    'The dates define the availability range; the time components define the daily availability start and end.'
  ]
})
  .input(
    z.object({
      contacts: z
        .array(
          z.object({
            email: z.string().describe('Contact email address'),
            name: z.string().optional().describe('Contact display name')
          })
        )
        .min(1)
        .optional()
        .describe('Contacts to invite by email. Provide contacts or contactIds.'),
      contactIds: z
        .array(z.string())
        .optional()
        .describe(
          'Existing contact IDs to invite. Call search_contacts to discover IDs. Provide contacts or contactIds.'
        ),
      subject: z
        .string()
        .optional()
        .describe('Meeting subject line. Required by CalendarHero.'),
      description: z.string().optional().describe('Meeting agenda or description'),
      dateStart: z
        .string()
        .describe(
          'Availability range start date and daily start time (ISO 8601 with timezone)'
        ),
      dateEnd: z
        .string()
        .describe('Availability range end date and daily end time (ISO 8601 with timezone)'),
      meetingLength: z
        .number()
        .optional()
        .describe('Meeting duration in minutes (e.g. 30, 60)'),
      type: z
        .string()
        .optional()
        .describe('Meeting type slug. Call list_meeting_types to discover configured types.'),
      locations: z
        .array(z.string())
        .optional()
        .describe('Preferred meeting locations or video providers'),
      capacity: z
        .number()
        .optional()
        .describe('Seats required for a meeting room. Zero means no room is booked.')
    })
  )
  .output(
    z.object({
      requestId: z.string().optional().describe('Created meeting request ID'),
      subject: z.string().optional().describe('Meeting subject'),
      dateStart: z.string().optional().describe('Availability window start'),
      dateEnd: z.string().optional().describe('Availability window end'),
      status: z.string().optional().describe('Request status'),
      raw: z.any().optional().describe('Full meeting request response')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.input.subject?.trim()) {
      throw createApiServiceError('Provide a non-empty subject for the meeting request.');
    }
    if (!ctx.input.contacts?.length && !ctx.input.contactIds?.length) {
      throw createApiServiceError('Provide at least one invitee in contacts or contactIds.');
    }
    if (
      ctx.input.contacts?.some(contact => !contact.email.trim()) ||
      ctx.input.contactIds?.some(id => !id.trim())
    ) {
      throw createApiServiceError(
        'Invitees must have a non-empty email address or contact ID.'
      );
    }
    let start = Date.parse(ctx.input.dateStart);
    let end = Date.parse(ctx.input.dateEnd);
    if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) {
      throw createApiServiceError(
        'Provide valid dateStart and dateEnd values, with dateEnd after dateStart.'
      );
    }
    if (ctx.input.meetingLength !== undefined && ctx.input.meetingLength <= 0) {
      throw createApiServiceError('meetingLength must be greater than zero.');
    }
    if (ctx.input.capacity !== undefined && ctx.input.capacity < 0) {
      throw createApiServiceError(
        'capacity cannot be negative. Use zero when no meeting room is needed.'
      );
    }
    let client = new Client(ctx.auth.token);
    let result = await client.createMeetingRequest({
      contacts: ctx.input.contactIds?.map(id => ({ id })),
      contactEmails: ctx.input.contacts?.map(contact => contact.email),
      subject: ctx.input.subject,
      description: ctx.input.description,
      dateStart: ctx.input.dateStart,
      dateEnd: ctx.input.dateEnd,
      meetingLength: ctx.input.meetingLength,
      type: ctx.input.type,
      locations: ctx.input.locations?.map(name => ({ name })),
      capacity: ctx.input.capacity
    });

    let contactNames = [
      ...(ctx.input.contacts?.map(c => c.name || c.email) ?? []),
      ...(ctx.input.contactIds ?? [])
    ].join(', ');

    return {
      output: {
        requestId: result?._id || result?.id,
        subject: result?.subject || ctx.input.subject,
        dateStart: result?.dateStart || ctx.input.dateStart,
        dateEnd: result?.dateEnd || ctx.input.dateEnd,
        status: result?.status || result?.state,
        raw: result
      },
      message: `Meeting request created for **${contactNames}** between ${ctx.input.dateStart} and ${ctx.input.dateEnd}.`
    };
  })
  .build();
