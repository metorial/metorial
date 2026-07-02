import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createMeetingRequest = SlateTool.create(spec, {
  name: 'Create Meeting Request',
  key: 'create_meeting_request',
  description: `Send a meeting request to one or more contacts. CalendarHero will automatically find the best available time within the specified timeframe based on calendar availability. The contacts will receive an invitation to accept the meeting.`,
  instructions: [
    'Provide at least one contact with an email address.',
    'The dateStart and dateEnd define the window in which CalendarHero should find availability, not the exact meeting time.'
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
        .describe('Contacts to invite to the meeting'),
      subject: z.string().optional().describe('Meeting subject line'),
      dateStart: z.string().describe('Start of availability window (ISO 8601 date string)'),
      dateEnd: z.string().describe('End of availability window (ISO 8601 date string)'),
      meetingLength: z
        .number()
        .optional()
        .describe('Meeting duration in minutes (e.g. 30, 60)'),
      type: z.string().optional().describe('Meeting type slug to use for this request'),
      locations: z
        .array(z.string())
        .optional()
        .describe('Preferred meeting locations or video providers'),
      capacity: z.number().optional().describe('Maximum number of attendees')
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
    let client = new Client(ctx.auth.token);
    let result = await client.createMeetingRequest({
      contacts: ctx.input.contacts,
      subject: ctx.input.subject,
      dateStart: ctx.input.dateStart,
      dateEnd: ctx.input.dateEnd,
      meetingLength: ctx.input.meetingLength,
      type: ctx.input.type,
      locations: ctx.input.locations,
      capacity: ctx.input.capacity
    });

    let contactNames = ctx.input.contacts.map(c => c.name || c.email).join(', ');

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
