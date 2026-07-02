import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getUsersTool = SlateTool.create(spec, {
  name: 'Get Users',
  key: 'get_users',
  description: `Retrieve users from the AccuLynx account. List all users or get details for a specific user by ID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z
        .string()
        .optional()
        .describe('Specific user ID to retrieve details for. Omit to list all users.')
    })
  )
  .output(
    z.object({
      user: z.record(z.string(), z.any()).optional().describe('Single user details'),
      users: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Array of user objects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.userId) {
      let user = await client.getUser(ctx.input.userId);
      return {
        output: { user },
        message: `Retrieved user **${ctx.input.userId}**.`
      };
    }

    let result = await client.getUsers();
    let users = Array.isArray(result) ? result : (result?.items ?? result?.data ?? [result]);

    return {
      output: { users },
      message: `Retrieved **${users.length}** user(s).`
    };
  })
  .build();
