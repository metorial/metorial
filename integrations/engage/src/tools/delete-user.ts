import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteUser = SlateTool.create(spec, {
  name: 'Archive or Delete User',
  key: 'archive_or_delete_user',
  description: `Archives or permanently deletes a user from Engage. Archiving preserves the user data but deactivates the user. Deleting permanently removes the user.`,
  instructions: [
    'Use "archive" to soft-delete a user while preserving their data.',
    'Use "delete" to permanently remove the user. This action cannot be undone.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      uid: z.string().describe('The unique user identifier'),
      action: z
        .enum(['archive', 'delete'])
        .describe('Whether to archive (soft-delete) or permanently delete the user')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Operation status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      secret: ctx.auth.secret
    });

    let result: any;
    if (ctx.input.action === 'archive') {
      result = await client.archiveUser(ctx.input.uid);
    } else {
      result = await client.deleteUser(ctx.input.uid);
    }

    return {
      output: {
        status: result.status
      },
      message:
        ctx.input.action === 'archive'
          ? `Archived user **${ctx.input.uid}** successfully.`
          : `Permanently deleted user **${ctx.input.uid}**.`
    };
  })
  .build();
