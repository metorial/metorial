import { SlateTool } from 'slates';
import { z } from 'zod';
import { GleapClient } from '../lib/client';
import { spec } from '../spec';

export let getSession = SlateTool.create(spec, {
  name: 'Get Session',
  key: 'get_session',
  description: `Retrieve a session (contact/user) by session ID or by user ID. Returns user identity, custom data, and associated information.`,
  instructions: [
    'Provide either sessionId or userId, not both. If both are provided, sessionId takes precedence.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      sessionId: z.string().optional().describe('The Gleap session ID'),
      userId: z.string().optional().describe('The external user ID to look up')
    })
  )
  .output(
    z.object({
      session: z.record(z.string(), z.any()).describe('The session object')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GleapClient({
      token: ctx.auth.token,
      projectId: ctx.auth.projectId
    });

    let session: any;
    if (ctx.input.sessionId) {
      session = await client.getSession(ctx.input.sessionId);
    } else if (ctx.input.userId) {
      session = await client.getSessionByUserId(ctx.input.userId);
    } else {
      throw new Error('Either sessionId or userId must be provided');
    }

    return {
      output: { session },
      message: `Retrieved session **${session.name || session.email || session._id || 'contact'}**.`
    };
  })
  .build();
