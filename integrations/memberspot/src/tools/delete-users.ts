import { isApiErrorRecord, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteUsersTool = SlateTool.create(spec, {
  name: 'Delete Users',
  key: 'delete_users',
  description: `Permanently delete one or more members from your Memberspot platform by their email addresses. This action is irreversible and removes all user data.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      emails: z
        .array(z.string())
        .describe(
          'Between 1 and 10 email addresses of users to delete; unknown users are ignored'
        )
    })
  )
  .output(
    z.object({
      result: z
        .record(z.string(), z.any())
        .describe('Deletion response; a scalar response is preserved under status'),
      raw: z.any().optional().describe('Unmodified provider response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let raw = await client.deleteUsers(ctx.input.emails);
    let result = isApiErrorRecord(raw) ? raw : { status: raw };

    return {
      output: { result, raw },
      message: `Processed deletion for **${ctx.input.emails.length}** email address(es); unknown users are ignored: ${ctx.input.emails.join(', ')}.`
    };
  })
  .build();
