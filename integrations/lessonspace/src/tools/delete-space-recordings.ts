import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteSpaceRecordings = SlateTool.create(spec, {
  key: 'delete_space_recordings',
  name: 'Delete Space Recordings',
  description:
    'Permanently deletes audio/video, recorded events, and transcripts for every session in a space. The space and basic session metadata remain available. Find the space UUID with list_spaces.',
  constraints: [
    'This deletion cannot be undone and affects every session in the selected space.',
    'Recordings in a customer-owned storage bucket are protected unless forceDeleteCustomBuckets is true.'
  ],
  tags: { destructive: true, readOnly: false }
})
  .input(
    z.object({
      spaceUuid: z
        .string()
        .min(1)
        .describe(
          'Space UUID. Call list_spaces to find the space whose recordings should be deleted.'
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
      spaceUuid: z.string().describe('Space UUID whose recordings were deleted.'),
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
    let result = await client.deleteSpaceRecordings(
      ctx.input.spaceUuid,
      ctx.input.forceDeleteCustomBuckets
    );
    return {
      output: { spaceUuid: ctx.input.spaceUuid, deleted: true, status: result?.status },
      message: `Recordings deleted for space ${ctx.input.spaceUuid}. The space and session metadata are retained.`
    };
  })
  .build();
