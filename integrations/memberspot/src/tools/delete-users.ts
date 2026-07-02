import { SlateTool } from 'slates';
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
      emails: z.array(z.string()).describe('List of email addresses of users to delete')
    })
  )
  .output(
    z.object({
      result: z.record(z.string(), z.any()).describe('Deletion result from the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.deleteUsers(ctx.input.emails);

    return {
      output: { result },
      message: `Deleted **${ctx.input.emails.length}** user(s): ${ctx.input.emails.join(', ')}.`
    };
  })
  .build();
