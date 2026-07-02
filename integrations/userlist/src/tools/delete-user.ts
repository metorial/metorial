import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteUser = SlateTool.create(spec, {
  name: 'Delete User',
  key: 'delete_user',
  description: `Deletes a user from Userlist. The user is identified by their unique identifier or email address. If the user does not exist, the request is silently ignored.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      identifier: z.string().optional().describe('Unique identifier of the user to delete.'),
      email: z.string().optional().describe('Email address of the user to delete.')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the request was accepted.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.deleteUser({
      identifier: ctx.input.identifier,
      email: ctx.input.email
    });

    let userRef = ctx.input.identifier || ctx.input.email || 'unknown';
    return {
      output: { success: true },
      message: `User **${userRef}** has been deleted.`
    };
  })
  .build();
