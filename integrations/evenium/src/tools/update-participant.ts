import { createApiServiceError, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import {
  contactIdSchema,
  eventIdSchema,
  guestFieldSchema,
  participantSchema,
  registrationStatusSchema
} from '../lib/schemas';
import { spec } from '../spec';

export let updateParticipant = SlateTool.create(spec, {
  name: 'Update Participant',
  key: 'update_participant',
  description:
    'Update an event participant’s details, registration status, category, or custom fields. Call list_events and list_participants to discover event and contact IDs.',
  instructions: [
    'Participant contact details may also update the shared contact record. Supply only fields to change.'
  ]
})
  .input(
    z.object({
      eventId: eventIdSchema,
      contactId: contactIdSchema,
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      email: z.string().optional().describe('Email address'),
      company: z.string().optional().describe('Company name'),
      gender: z.enum(['MALE', 'FEMALE']).optional().describe('Gender'),
      customId: z.string().optional().describe('External contact ID'),
      status: registrationStatusSchema.optional().describe('New registration status'),
      categoryId: z
        .string()
        .optional()
        .describe('Existing category ID, available in participant raw data'),
      lastUpdate: z.string().optional().describe('Last update time in RFC 3339 format'),
      fields: z
        .array(guestFieldSchema)
        .optional()
        .describe('Custom fields as provider name/value pairs')
    })
  )
  .output(participantSchema)
  .handleInvocation(async ctx => {
    let { eventId, contactId, categoryId, ...changes } = ctx.input;
    let params = pickDefined({
      ...changes,
      category: categoryId === undefined ? undefined : { id: categoryId }
    });
    if (!Object.keys(params).length)
      throw createApiServiceError('Provide at least one participant field to update.');
    let guest = await new Client(ctx.auth.token).updateGuest(eventId, contactId, params);
    return {
      output: guest,
      message: `Updated participant \`${guest.contactId}\` for event \`${guest.eventId}\`.`
    };
  })
  .build();
