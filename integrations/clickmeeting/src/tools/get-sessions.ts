import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getSessions = SlateTool.create(spec, {
  name: 'Get Sessions',
  key: 'get_sessions',
  description: `Retrieves session history for a conference room. Returns all sessions or details of a specific session, including attendee-level data useful for analytics and follow-up.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      roomId: z.string().describe('ID of the conference room'),
      sessionId: z
        .string()
        .optional()
        .describe('Optional session ID to get details for a specific session')
    })
  )
  .output(
    z.object({
      sessions: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('List of sessions (when no sessionId provided)'),
      session: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Session details (when sessionId provided)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.sessionId) {
      let session = await client.getSession(ctx.input.roomId, ctx.input.sessionId);
      return {
        output: { session },
        message: `Retrieved details for session **${ctx.input.sessionId}** of room ${ctx.input.roomId}.`
      };
    }

    let result = await client.getSessions(ctx.input.roomId);
    let sessions = Array.isArray(result) ? result : [];

    return {
      output: { sessions },
      message: `Found **${sessions.length}** session(s) for room ${ctx.input.roomId}.`
    };
  })
  .build();
