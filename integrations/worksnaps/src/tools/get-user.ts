import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getUser = SlateTool.create(spec, {
  name: 'Get User',
  key: 'get_user',
  description: `Retrieve details for a specific user account or the currently authenticated user. Returns profile information including name, email, login, and timezone.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z
        .string()
        .optional()
        .describe(
          'The ID of the user to retrieve. Omit to get the currently authenticated user.'
        )
    })
  )
  .output(
    z.object({
      user: z.record(z.string(), z.unknown()).describe('User account details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let user = ctx.input.userId
      ? await client.getUser(ctx.input.userId)
      : await client.getCurrentUser();

    let name = user.firstName || user.login || ctx.input.userId || 'current user';

    return {
      output: { user },
      message: `Retrieved user **${name}**.`
    };
  })
  .build();
