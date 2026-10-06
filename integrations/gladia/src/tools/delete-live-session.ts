import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteLiveSession = SlateTool.create(spec, {
  name: 'Delete Live Session',
  key: 'delete_live_session',
  description:
    'Permanently delete a live transcription and its recorded audio. End the streaming connection before deleting the session.',
  tags: { destructive: true, readOnly: false }
})
  .input(
    z.object({
      sessionId: z
        .string()
        .min(1)
        .describe(
          'Live session ID from initiate_live_session or list_transcriptions with kind=live.'
        )
    })
  )
  .output(z.object({ sessionId: z.string(), deleted: z.boolean() }))
  .handleInvocation(async ctx => {
    await new Client({ token: ctx.auth.token }).deleteLiveSession(ctx.input.sessionId);
    return {
      output: { sessionId: ctx.input.sessionId, deleted: true },
      message: `Live session ${ctx.input.sessionId} was deleted.`
    };
  })
  .build();
