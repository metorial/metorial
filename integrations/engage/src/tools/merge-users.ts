import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let mergeUsers = SlateTool.create(spec, {
  name: 'Merge Users',
  key: 'merge_users',
  description: `Merges two user profiles into one. The source user's data is combined into the destination user's profile. The source user is removed after merging.`,
  instructions: [
    'The source user will be merged into the destination user.',
    'After merging, the source user profile will no longer exist.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      sourceUid: z.string().describe('UID of the user to merge from (will be removed)'),
      destinationUid: z.string().describe('UID of the user to merge into (will be kept)')
    })
  )
  .output(
    z.object({
      merged: z.boolean().describe('Whether the merge was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      secret: ctx.auth.secret
    });

    await client.mergeUsers(ctx.input.sourceUid, ctx.input.destinationUid);

    return {
      output: {
        merged: true
      },
      message: `Merged user **${ctx.input.sourceUid}** into **${ctx.input.destinationUid}**.`
    };
  })
  .build();
