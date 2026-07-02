import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let completeSession = SlateTool.create(spec, {
  name: 'Complete Session',
  key: 'complete_session',
  description: `End a running browser session by requesting its release. The session will transition to COMPLETED status and free up resources.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      sessionId: z.string().describe('The session ID to complete')
    })
  )
  .output(
    z.object({
      sessionId: z.string().describe('Session identifier'),
      status: z.string().describe('Updated session status'),
      endedAt: z.string().nullable().describe('Session end timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let session = await client.completeSession(ctx.input.sessionId, ctx.config.projectId);

    return {
      output: {
        sessionId: session.sessionId,
        status: session.status,
        endedAt: session.endedAt
      },
      message: `Session **${session.sessionId}** has been released with status **${session.status}**.`
    };
  })
  .build();
