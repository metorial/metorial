import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { participantSchema } from '../lib/schemas';
import { spec } from '../spec';

export let addParticipant = SlateTool.create(spec, {
  name: 'Add Participant',
  key: 'add_participant',
  description: `Add a participant (guest) to an Evenium event. You can either invite an existing contact by providing their contact ID, or create a new guest by providing their name and email. Optionally set the registration status, company, and gender.`,
  instructions: [
    'To invite an existing contact, provide their contactId.',
    'To add a new guest directly, provide firstName, lastName, and email instead.'
  ]
})
  .input(
    z.object({
      eventId: z.string().describe('Event ID to add the participant to'),
      contactId: z.string().optional().describe('Contact ID of an existing contact to invite'),
      firstName: z
        .string()
        .optional()
        .describe('First name (required if not providing contactId)'),
      lastName: z
        .string()
        .optional()
        .describe('Last name (required if not providing contactId)'),
      email: z
        .string()
        .optional()
        .describe('Email address (required if not providing contactId)'),
      gender: z.enum(['MALE', 'FEMALE']).optional().describe('Gender'),
      company: z.string().optional().describe('Company name'),
      status: z
        .enum([
          'CONFIRMED',
          'UNANSWERED',
          'CANCELED',
          'DECLINED',
          'RESERVED',
          'OVERBOOKED',
          'EXTRA',
          'VALID',
          'PENDING'
        ])
        .optional()
        .describe('Initial registration status')
    })
  )
  .output(participantSchema)
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let params: Record<string, string | undefined> = {};
    if (ctx.input.contactId) {
      params.contactId = ctx.input.contactId;
    } else {
      if (
        !ctx.input.firstName?.trim() ||
        !ctx.input.lastName?.trim() ||
        !ctx.input.email?.trim()
      ) {
        throw createApiServiceError(
          'Provide contactId, or firstName, lastName, and email for a new participant.'
        );
      }
      params.firstName = ctx.input.firstName;
      params.lastName = ctx.input.lastName;
      params.email = ctx.input.email;
    }
    if (ctx.input.gender) params.gender = ctx.input.gender;
    if (ctx.input.company) params.company = ctx.input.company;
    if (ctx.input.status) params.status = ctx.input.status;

    let guest = await client.addGuest(ctx.input.eventId, params);

    return {
      output: {
        contactId: guest.contactId,
        eventId: guest.eventId,
        firstName: guest.firstName,
        lastName: guest.lastName,
        email: guest.email,
        company: guest.company,
        status: guest.status,
        raw: guest.raw
      },
      message: `Added **${guest.firstName ?? ''} ${guest.lastName ?? ''}** to event \`${ctx.input.eventId}\` with status ${guest.status ?? 'UNANSWERED'}.`
    };
  })
  .build();
