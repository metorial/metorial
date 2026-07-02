import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let endSession = SlateTool.create(spec, {
  name: 'End Session',
  key: 'end_session',
  description: `Terminate one or all active browser sessions. Provide a specific session ID to end a single session, or set endAll to true to terminate all active sessions at once.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      sessionId: z
        .string()
        .optional()
        .describe('ID of the session to terminate. Omit if using endAll.'),
      endAll: z.boolean().optional().describe('Set to true to terminate all active sessions')
    })
  )
  .output(
    z.object({
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.endAll) {
      await client.endAllSessions();
      return {
        output: { success: true },
        message: 'All active sessions have been terminated.'
      };
    }

    if (!ctx.input.sessionId) {
      throw new Error('Either sessionId or endAll must be provided.');
    }

    await client.endSession(ctx.input.sessionId);

    return {
      output: { success: true },
      message: `Session **${ctx.input.sessionId}** has been terminated.`
    };
  })
  .build();
