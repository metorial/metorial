import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getSessionEvents = SlateTool.create(spec, {
  name: 'Get Session Events',
  key: 'get_session_events',
  description:
    'Retrieve the raw captured events for a FullStory session. This is useful for inspecting the exact timeline behind a replay or downstream activation workflow.',
  constraints: ['Part of FullStory Anywhere: Activation.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      sessionId: z
        .string()
        .describe('Canonical FullStory session ID, usually formatted as userId:sessionId'),
      enableEventCache: z.boolean().optional().describe('Deprecated FullStory cache flag')
    })
  )
  .output(
    z.object({
      events: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Raw FullStory session events'),
      rawResponse: z.record(z.string(), z.any()).describe('Complete FullStory response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getSessionEvents(ctx.input.sessionId, {
      enableEventCache: ctx.input.enableEventCache
    });
    let events = Array.isArray(result.events) ? result.events : undefined;

    return {
      output: {
        events,
        rawResponse: result
      },
      message: `Retrieved **${events?.length ?? 0}** events for session \`${ctx.input.sessionId}\`.`
    };
  })
  .build();
