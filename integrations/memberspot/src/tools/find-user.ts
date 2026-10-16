import { createApiServiceError, isApiErrorRecord, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let findUserTool = SlateTool.create(spec, {
  name: 'Find User by Email',
  key: 'find_user',
  description: `Look up a Memberspot member by their email address. Returns the user profile and custom properties. Returns an error if the user is not found.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      email: z.string().describe('Email address of the user to find')
    })
  )
  .output(
    z.object({
      user: z.record(z.string(), z.any()).describe('User profile object')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let user = await client.findUserByEmail(ctx.input.email);
    if (user === null) {
      throw createApiServiceError(
        'No Memberspot user was found for the supplied email address.'
      );
    }
    if (!isApiErrorRecord(user)) {
      throw createApiServiceError('Memberspot returned an invalid user response.');
    }

    return {
      output: { user },
      message: `Found user with email **${ctx.input.email}**.`
    };
  })
  .build();
