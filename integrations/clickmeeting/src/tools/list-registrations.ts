import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listRegistrations = SlateTool.create(spec, {
  name: 'List Registrations',
  key: 'list_registrations',
  description: `Retrieves registered attendees for a conference room, filtered by status. Optionally filter by a specific session.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      roomId: z.string().describe('ID of the conference room'),
      status: z
        .enum(['active', 'pending'])
        .default('active')
        .describe('Registration status filter'),
      sessionId: z
        .string()
        .optional()
        .describe('Optional session ID to filter registrations for a specific session')
    })
  )
  .output(
    z.object({
      registrations: z
        .array(z.record(z.string(), z.unknown()))
        .describe('List of registered attendees')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result: any;

    if (ctx.input.sessionId) {
      result = await client.getSessionRegistrations(ctx.input.roomId, ctx.input.sessionId);
    } else {
      result = await client.getRegistrations(ctx.input.roomId, ctx.input.status);
    }

    let registrations = Array.isArray(result) ? result : [];

    return {
      output: { registrations },
      message: `Found **${registrations.length}** ${ctx.input.status} registration(s) for room ${ctx.input.roomId}.`
    };
  })
  .build();
