import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateSubmission = SlateTool.create(spec, {
  name: 'Update Submission',
  key: 'update_submission',
  description: `Update a submission's status flags. Mark submissions as spam or not spam, read or unread, or move them to trash. Useful for moderating submissions and managing your inbox.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      submissionId: z.number().describe('ID of the submission to update.'),
      spam: z.boolean().optional().describe('Mark as spam (true) or not spam (false).'),
      read: z.boolean().optional().describe('Mark as read (true) or unread (false).'),
      trash: z.boolean().optional().describe('Move to trash (true) or restore (false).')
    })
  )
  .output(
    z.object({
      submissionId: z.number().describe('Submission ID.'),
      spam: z.boolean().describe('Current spam status.'),
      read: z.boolean().describe('Current read status.'),
      trash: z.boolean().describe('Current trash status.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data: { spam?: boolean; read?: boolean; trash?: boolean } = {};
    if (ctx.input.spam !== undefined) data.spam = ctx.input.spam;
    if (ctx.input.read !== undefined) data.read = ctx.input.read;
    if (ctx.input.trash !== undefined) data.trash = ctx.input.trash;

    let s = await client.updateSubmission(ctx.input.submissionId, data);

    return {
      output: {
        submissionId: s.id,
        spam: s.spam ?? false,
        read: s.read ?? false,
        trash: s.trash ?? false
      },
      message: `Updated submission **#${s.id}** — spam: ${s.spam}, read: ${s.read}, trash: ${s.trash}.`
    };
  })
  .build();
