import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let trackingSchema = z
  .object({
    utmSource: z.string().optional(),
    utmMedium: z.string().optional(),
    utmCampaign: z.string().optional(),
    utmContent: z.string().optional(),
    utmTerm: z.string().optional(),
    salesforceUuid: z.string().optional()
  })
  .optional();

let mapTracking = (tracking: z.infer<typeof trackingSchema>) => {
  if (!tracking) return undefined;

  return {
    ...(tracking.utmSource ? { utm_source: tracking.utmSource } : {}),
    ...(tracking.utmMedium ? { utm_medium: tracking.utmMedium } : {}),
    ...(tracking.utmCampaign ? { utm_campaign: tracking.utmCampaign } : {}),
    ...(tracking.utmContent ? { utm_content: tracking.utmContent } : {}),
    ...(tracking.utmTerm ? { utm_term: tracking.utmTerm } : {}),
    ...(tracking.salesforceUuid ? { salesforce_uuid: tracking.salesforceUuid } : {})
  };
};

export let createEventInvitee = SlateTool.create(spec, {
  name: 'Create Event Invitee',
  key: 'create_event_invitee',
  description: `Book a Calendly meeting by creating an invitee for an event type at an available start time. Use check_availability first and pass one of the returned start times.`,
  instructions: [
    'startTime must be a valid available slot for the event type in UTC ISO 8601 format.',
    'location is required only when the event type requires invitee-selected location details.',
    'Calendly requires a paid plan for Scheduling API bookings.'
  ],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      eventTypeUri: z.string().describe('URI of the event type to book'),
      startTime: z.string().describe('Available slot start time in UTC ISO 8601 format'),
      inviteeName: z.string().describe('Invitee full name'),
      inviteeEmail: z.string().email().describe('Invitee email address'),
      timezone: z.string().describe('Invitee IANA timezone, e.g. America/New_York'),
      firstName: z.string().optional().describe('Invitee first name'),
      lastName: z.string().optional().describe('Invitee last name'),
      textReminderNumber: z
        .string()
        .optional()
        .describe('Invitee E.164 SMS reminder number, when the event type supports it'),
      location: z
        .record(z.string(), z.any())
        .optional()
        .describe('Calendly location object, for example { "kind": "zoom_conference" }'),
      eventGuests: z
        .array(z.string().email())
        .optional()
        .describe('Additional guest email addresses to include on the event'),
      questionsAndAnswers: z
        .array(
          z.object({
            question: z.string(),
            answer: z.string(),
            position: z.number().optional()
          })
        )
        .optional()
        .describe('Answers to event type custom questions'),
      tracking: trackingSchema.describe('Optional UTM or Salesforce tracking metadata')
    })
  )
  .output(
    z.object({
      inviteeUri: z.string().describe('Unique URI of the created invitee'),
      eventUri: z.string().describe('URI of the scheduled event'),
      name: z.string().describe('Invitee full name'),
      email: z.string().describe('Invitee email address'),
      status: z.string().describe('Invitee status'),
      timezone: z.string().nullable().describe('Invitee timezone'),
      cancelUrl: z.string().describe('URL for the invitee to cancel'),
      rescheduleUrl: z.string().describe('URL for the invitee to reschedule'),
      questionsAndAnswers: z.array(z.any()).describe('Returned question responses'),
      tracking: z.any().optional().describe('Returned tracking metadata'),
      createdAt: z.string(),
      updatedAt: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let invitee = await client.createEventInvitee({
      eventTypeUri: ctx.input.eventTypeUri,
      startTime: ctx.input.startTime,
      invitee: {
        name: ctx.input.inviteeName,
        email: ctx.input.inviteeEmail,
        timezone: ctx.input.timezone,
        firstName: ctx.input.firstName,
        lastName: ctx.input.lastName,
        textReminderNumber: ctx.input.textReminderNumber
      },
      location: ctx.input.location,
      eventGuests: ctx.input.eventGuests,
      questionsAndAnswers: ctx.input.questionsAndAnswers,
      tracking: mapTracking(ctx.input.tracking)
    });

    return {
      output: {
        inviteeUri: invitee.uri,
        eventUri: invitee.event,
        name: invitee.name,
        email: invitee.email,
        status: invitee.status,
        timezone: invitee.timezone,
        cancelUrl: invitee.cancelUrl,
        rescheduleUrl: invitee.rescheduleUrl,
        questionsAndAnswers: invitee.questionsAndAnswers || [],
        tracking: invitee.tracking,
        createdAt: invitee.createdAt,
        updatedAt: invitee.updatedAt
      },
      message: `Booked Calendly event for **${invitee.name}** (${invitee.email}).`
    };
  })
  .build();
