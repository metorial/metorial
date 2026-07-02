import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let registerAttendee = SlateTool.create(spec, {
  name: 'Register Attendee',
  key: 'register_attendee',
  description: `Registers a new attendee for a conference room. The room must have registration enabled. Use the Update Conference tool to enable registration if needed.`,
  instructions: [
    'Registration must be enabled on the conference room before registering attendees.'
  ]
})
  .input(
    z.object({
      roomId: z.string().describe('ID of the conference room'),
      firstName: z.string().describe('First name of the attendee'),
      lastName: z.string().describe('Last name of the attendee'),
      email: z.string().describe('Email address of the attendee')
    })
  )
  .output(
    z.object({
      registration: z
        .record(z.string(), z.unknown())
        .describe('Registration confirmation details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.registerAttendee(ctx.input.roomId, {
      firstName: ctx.input.firstName,
      lastName: ctx.input.lastName,
      email: ctx.input.email
    });

    return {
      output: { registration: result },
      message: `Registered **${ctx.input.firstName} ${ctx.input.lastName}** (${ctx.input.email}) for room ${ctx.input.roomId}.`
    };
  })
  .build();
