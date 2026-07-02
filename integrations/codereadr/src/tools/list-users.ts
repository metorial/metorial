import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `Retrieve app users from your CodeREADr account. App users are authorized personnel who access the mobile scanning app. Returns user details including username, authorized services, and device limits.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z
        .string()
        .optional()
        .describe('Specific user ID to retrieve. Leave empty to retrieve all users.')
    })
  )
  .output(
    z.object({
      users: z
        .array(
          z
            .object({
              userId: z.string().describe('Unique ID of the user'),
              username: z.string().optional().describe('Username'),
              limit: z.string().optional().describe('Maximum devices allowed'),
              createdAt: z.string().optional().describe('Account creation timestamp'),
              services: z
                .array(
                  z.object({
                    serviceId: z.string(),
                    serviceName: z.string()
                  })
                )
                .optional()
                .describe('Services the user is authorized for')
            })
            .passthrough()
        )
        .describe('List of app users')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let users = await client.retrieveUsers(ctx.input.userId);

    return {
      output: { users },
      message: ctx.input.userId
        ? `Retrieved user **${ctx.input.userId}**.`
        : `Retrieved **${users.length}** user(s).`
    };
  })
  .build();
