import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getSessionRecording = SlateTool.create(spec, {
  name: 'Get Session Recording',
  key: 'get_session_recording',
  description: `Retrieve session replay recording data with timestamped events. Returns rrweb-format events that can be used to replay what happened during the browser session.`,
  instructions: ['The session must have been created with recordSession enabled.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      sessionId: z.string().describe('The session ID to retrieve recording for')
    })
  )
  .output(
    z.object({
      events: z.array(
        z.object({
          sessionId: z.string().describe('Session identifier'),
          timestamp: z.number().describe('Event timestamp in milliseconds since UNIX epoch'),
          type: z.number().describe('rrweb event type indicator'),
          eventData: z.record(z.string(), z.unknown()).describe('rrweb event data')
        })
      ),
      totalCount: z.number().describe('Total number of recording events')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let events = await client.getSessionRecording(ctx.input.sessionId);

    return {
      output: {
        events: events.map(e => ({
          sessionId: e.sessionId,
          timestamp: e.timestamp,
          type: e.type,
          eventData: e.data
        })),
        totalCount: events.length
      },
      message: `Retrieved **${events.length}** recording events for session **${ctx.input.sessionId}**.`
    };
  })
  .build();
