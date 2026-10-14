import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteSessionRecordings = SlateTool.create(spec, {
  key: 'delete_session_recordings',
  name: 'Delete Session Recordings',
  description:
    'Permanently deletes a session’s audio/video, recorded events, and transcript. Basic session metadata remains available. Find the session UUID with list_sessions.',
  constraints: [
    'This deletion cannot be undone.',
    'Recordings in a customer-owned storage bucket are protected unless forceDeleteCustomBuckets is true.'
  ],
  tags: { destructive: true, readOnly: false }
})
  .input(
    z.object({
      sessionUuid: z
        .string()
        .min(1)
        .describe(
          'Session UUID. Call list_sessions to find the session to delete recordings from.'
        ),
      forceDeleteCustomBuckets: z
        .boolean()
        .optional()
        .describe(
          'Also delete recordings stored in a customer-owned bucket. Defaults to false.'
        )
    })
  )
  .output(
    z.object({
      sessionUuid: z.string().describe('Session UUID whose recordings were deleted.'),
      deleted: z
        .boolean()
        .describe(
          'Whether the provider confirmed deletion, including when there were no recordings left.'
        ),
      status: z.string().optional().describe('Provider status message when returned.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.deleteSessionRecordings(
      ctx.input.sessionUuid,
      ctx.input.forceDeleteCustomBuckets
    );
    return {
      output: { sessionUuid: ctx.input.sessionUuid, deleted: true, status: result?.status },
      message: `Recordings deleted for session ${ctx.input.sessionUuid}. Session metadata is retained.`
    };
  })
  .build();
