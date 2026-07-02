import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let removeUser = SlateTool.create(spec, {
  name: 'Remove User',
  key: 'remove_user',
  description: `Removes a user from the organisation. This is a destructive action and cannot be undone.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      userId: z.number().describe('Lessonspace user ID to remove from the organisation.')
    })
  )
  .output(
    z.object({
      removed: z.boolean().describe('Whether the user was successfully removed.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organisationId: ctx.config.organisationId
    });

    await client.removeUser(ctx.input.userId);

    return {
      output: {
        removed: true
      },
      message: `User **${ctx.input.userId}** has been removed from the organisation.`
    };
  })
  .build();
