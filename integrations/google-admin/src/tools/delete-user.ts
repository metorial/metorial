import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { googleAdminActionScopes } from '../scopes';
import { spec } from '../spec';

export let deleteUser = SlateTool.create(spec, {
  name: 'Delete User',
  key: 'delete_user',
  description: `Delete a user account from the Google Workspace domain. Deleted users can be restored within 20 days. Also supports restoring (undeleting) a previously deleted user.`,
  constraints: [
    'Deleted users can only be restored within 20 days of deletion.',
    'Deleting a user removes their data and licenses.'
  ],
  tags: {
    readOnly: false,
    destructive: true
  }
})
  .scopes(googleAdminActionScopes.deleteUser)
  .input(
    z.object({
      userKey: z.string().describe('Email address or unique user ID of the user'),
      action: z.enum(['delete', 'undelete']).describe('Whether to delete or restore the user'),
      orgUnitPath: z
        .string()
        .optional()
        .describe(
          'Org unit path to place the restored user in (only used with undelete). Defaults to root (/).'
        )
    })
  )
  .output(
    z.object({
      success: z.boolean(),
      action: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      customerId: ctx.config.customerId,
      domain: ctx.config.domain
    });

    if (ctx.input.action === 'delete') {
      await client.deleteUser(ctx.input.userKey);
    } else {
      await client.undeleteUser(ctx.input.userKey, ctx.input.orgUnitPath);
    }

    return {
      output: {
        success: true,
        action: ctx.input.action
      },
      message:
        ctx.input.action === 'delete'
          ? `Deleted user **${ctx.input.userKey}**. Can be restored within 20 days.`
          : `Restored user **${ctx.input.userKey}**.`
    };
  })
  .build();
