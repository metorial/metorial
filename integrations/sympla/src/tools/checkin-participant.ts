import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let checkinParticipantTool = SlateTool.create(spec, {
  name: 'Check In Participant',
  key: 'checkin_participant',
  description: `Perform check-in for a participant at an event. Look up the participant by either their ticket ID or ticket number.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      eventId: z.number().describe('Event ID for the check-in'),
      ticketId: z
        .number()
        .optional()
        .describe('Participant ticket ID (use this or ticketNumber)'),
      ticketNumber: z
        .string()
        .optional()
        .describe('Ticket number printed on the ticket (use this or ticketId)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the check-in was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    if (!ctx.input.ticketId && !ctx.input.ticketNumber) {
      throw new Error('Either ticketId or ticketNumber must be provided.');
    }

    if (ctx.input.ticketId) {
      await client.checkinByTicketId(ctx.input.eventId, ctx.input.ticketId);
    } else {
      await client.checkinByTicketNumber(ctx.input.eventId, ctx.input.ticketNumber!);
    }

    let identifier = ctx.input.ticketId
      ? `ticket ID ${ctx.input.ticketId}`
      : `ticket number ${ctx.input.ticketNumber}`;
    return {
      output: {
        success: true
      },
      message: `Successfully checked in participant with ${identifier} for event ${ctx.input.eventId}.`
    };
  })
  .build();
