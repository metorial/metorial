import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteUser = SlateTool.create(spec, {
  name: 'Delete User',
  key: 'delete_user',
  description: `Permanently delete a user and all their associated data (progress, quiz answers, etc.) from MemberVault. This action is **irreversible**.`,
  constraints: [
    'This action permanently deletes the user and all their data. It cannot be undone.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      email: z.string().describe('Email address of the user to permanently delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the user was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });

    await client.deleteUser({
      email: ctx.input.email
    });

    return {
      output: { success: true },
      message: `Permanently deleted user **${ctx.input.email}** and all their data.`
    };
  })
  .build();
