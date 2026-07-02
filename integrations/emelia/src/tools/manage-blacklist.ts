import { SlateTool } from 'slates';
import { z } from 'zod';
import { EmeliaClient } from '../lib/client';
import { spec } from '../spec';

export let manageBlacklist = SlateTool.create(spec, {
  name: 'Manage Blacklist',
  key: 'manage_blacklist',
  description: `Add or remove email addresses from the account-level blacklist. Blacklisted contacts will not receive emails from any campaign.`
})
  .input(
    z.object({
      action: z.enum(['add', 'remove']).describe('Whether to add or remove from blacklist'),
      email: z.string().describe('Email address to blacklist or unblacklist')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new EmeliaClient(ctx.auth.token);
    let { action, email } = ctx.input;

    if (action === 'add') {
      await client.addToBlacklist(email);
      return {
        output: { success: true },
        message: `Added **${email}** to blacklist.`
      };
    }

    await client.removeFromBlacklist(email);
    return {
      output: { success: true },
      message: `Removed **${email}** from blacklist.`
    };
  })
  .build();
