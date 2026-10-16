import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { contactIdSchema, eventIdSchema, participantSchema } from '../lib/schemas';
import { spec } from '../spec';

export let getParticipant = SlateTool.create(spec, {
  name: 'Get Participant',
  key: 'get_participant',
  description:
    'Retrieve one event participant, including registration and custom fields. Call list_events and list_participants to discover event and contact IDs.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      eventId: eventIdSchema,
      contactId: contactIdSchema,
      fields: z
        .array(z.enum(['REGISTRATION', 'PRESENCE', 'SIGNATURE']))
        .optional()
        .describe('Additional registration, attendance, or signature data to include')
    })
  )
  .output(participantSchema)
  .handleInvocation(async ctx => {
    let guest = await new Client(ctx.auth.token).getGuest(
      ctx.input.eventId,
      ctx.input.contactId,
      ctx.input.fields
    );
    return {
      output: guest,
      message: `Retrieved participant \`${guest.contactId}\` for event \`${guest.eventId}\`.`
    };
  })
  .build();
