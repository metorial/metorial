import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateParticipantStatus = SlateTool.create(spec, {
  name: 'Update Participant Status',
  key: 'update_participant_status',
  description: `Update the registration status of a participant on an Evenium event. Use this to confirm, cancel, decline, or change the status of an attendee's registration.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      eventId: z.string().describe('Event ID containing the participant'),
      contactId: z.string().describe('Contact ID of the participant'),
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
        .describe('New registration status')
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('Contact ID of the participant'),
      eventId: z.string().describe('Event ID'),
      status: z.string().describe('Updated registration status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let result = await client.updateGuestStatus(
      ctx.input.eventId,
      ctx.input.contactId,
      ctx.input.status
    );

    return {
      output: {
        contactId: ctx.input.contactId,
        eventId: ctx.input.eventId,
        status: result.status ?? ctx.input.status
      },
      message: `Updated participant \`${ctx.input.contactId}\` status to **${ctx.input.status}** on event \`${ctx.input.eventId}\`.`
    };
  })
  .build();
