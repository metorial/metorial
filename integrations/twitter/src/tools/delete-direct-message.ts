import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { TwitterClient } from '../lib/client';
import { spec } from '../spec';

export let deleteDirectMessage = SlateTool.create(spec, {
  name: 'Delete Direct Message',
  key: 'delete_direct_message',
  description:
    'Delete a direct message event for the authenticated user. This removes the event from the authenticated user view only.',
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      eventId: z.string().describe('Direct message event ID to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the delete request succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TwitterClient(ctx.auth.token);
    await client.deleteDmEvent(ctx.input.eventId);

    return {
      output: { deleted: true },
      message: `Deleted direct message event ${ctx.input.eventId}.`
    };
  })
  .build();
