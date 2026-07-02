import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let markNoShow = SlateTool.create(spec, {
  name: 'Mark Invitee No-Show',
  key: 'mark_invitee_no_show',
  description: `Mark or unmark an invitee as a no-show for a scheduled event. Use this to track attendance after a meeting time has passed.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      inviteeUri: z.string().describe('URI of the invitee to mark as no-show'),
      unmark: z
        .boolean()
        .optional()
        .describe(
          'Set to true to remove the no-show marking. Requires the no-show URI instead of invitee URI.'
        )
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation was successful'),
      noShowUri: z.string().optional().describe('URI of the no-show record (when marking)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.unmark) {
      await client.unmarkInviteeNoShow(ctx.input.inviteeUri);
      return {
        output: { success: true },
        message: 'No-show marking removed successfully.'
      };
    } else {
      let result = await client.markInviteeNoShow(ctx.input.inviteeUri);
      return {
        output: {
          success: true,
          noShowUri: result.uri as string
        },
        message: 'Invitee marked as no-show.'
      };
    }
  })
  .build();
