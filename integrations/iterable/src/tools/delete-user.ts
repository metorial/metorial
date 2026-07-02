import { SlateTool } from 'slates';
import { z } from 'zod';
import { IterableClient } from '../lib/client';
import { requireUserIdentity } from '../lib/validation';
import { spec } from '../spec';

export let deleteUser = SlateTool.create(spec, {
  name: 'Delete User',
  key: 'delete_user',
  description: `Permanently deletes a user profile from the Iterable project. This is a destructive operation and cannot be undone. Use for GDPR compliance or data cleanup.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      email: z.string().optional().describe('Email address of the user to delete'),
      userId: z.string().optional().describe('User ID to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion succeeded'),
      message: z.string().describe('Response message')
    })
  )
  .handleInvocation(async ctx => {
    requireUserIdentity(ctx.input);

    let client = new IterableClient({
      token: ctx.auth.token,
      dataCenter: ctx.config.dataCenter
    });

    let result = await client.deleteUser({
      email: ctx.input.email,
      userId: ctx.input.userId
    });

    return {
      output: {
        success: result.code === 'Success',
        message: result.msg || 'User deleted successfully'
      },
      message: `User **${ctx.input.email || ctx.input.userId}** has been deleted.`
    };
  })
  .build();
