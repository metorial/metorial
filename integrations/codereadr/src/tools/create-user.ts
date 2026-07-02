import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createUser = SlateTool.create(spec, {
  name: 'Create User',
  key: 'create_user',
  description: `Create a new app user in CodeREADr. App users can log into the mobile scanning app and access authorized services. If the username is an email address, an invitation email will be sent and password is optional.`
})
  .input(
    z.object({
      username: z.string().describe('Username for the new user. Can be an email address.'),
      password: z
        .string()
        .optional()
        .describe('Password for the user. Required unless username is an email address.'),
      limit: z
        .string()
        .optional()
        .describe(
          'Maximum number of devices the user can use per billing period. Unlimited by default.'
        )
    })
  )
  .output(
    z.object({
      userId: z.string().describe('ID of the newly created user')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let userId = await client.createUser({
      username: ctx.input.username,
      password: ctx.input.password,
      limit: ctx.input.limit
    });

    return {
      output: { userId },
      message: `Created user **${ctx.input.username}** (ID: ${userId}).`
    };
  })
  .build();
