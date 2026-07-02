import { SlateTool } from 'slates';
import { z } from 'zod';
import { MeetClient } from '../lib/client';
import { googleMeetActionScopes } from '../scopes';
import { spec } from '../spec';

export let endActiveConferenceTool = SlateTool.create(spec, {
  name: 'End Active Conference',
  key: 'end_active_conference',
  description: `End the currently active conference in a meeting space, disconnecting all participants. The meeting space itself remains available for future conferences.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .scopes(googleMeetActionScopes.endActiveConference)
  .input(
    z.object({
      spaceName: z
        .string()
        .describe('Space resource name (e.g., "spaces/abc123") or meeting code')
    })
  )
  .output(
    z.object({
      spaceName: z.string().describe('Resource name of the space whose conference was ended')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MeetClient({ token: ctx.auth.token });
    await client.endActiveConference(ctx.input.spaceName);

    return {
      output: {
        spaceName: ctx.input.spaceName
      },
      message: `Ended the active conference in space **${ctx.input.spaceName}**. All participants have been disconnected.`
    };
  })
  .build();
