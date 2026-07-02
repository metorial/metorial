import { SlateTool } from 'slates';
import { z } from 'zod';
import { StudioClient } from '../lib/client';
import { spec } from '../spec';

export let syncUsers = SlateTool.create(spec, {
  name: 'Sync Users',
  key: 'sync_users',
  description: `Trigger a user sync in a Softr application. You can sync all users, or provide specific email addresses to sync only those users.

Requires the **domain** to be configured in the integration settings.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      emails: z
        .array(z.string())
        .optional()
        .describe(
          'Optional list of email addresses to sync. If omitted, all users are synced.'
        )
    })
  )
  .output(
    z.object({
      synced: z.boolean().describe('Whether the sync was triggered successfully'),
      scope: z.string().describe('Whether all users or specific users were synced')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.config.domain) {
      throw new Error(
        'The "domain" config is required for user management. Set it to your Softr app domain (e.g., yourapp.softr.app).'
      );
    }

    let client = new StudioClient({
      token: ctx.auth.token,
      domain: ctx.config.domain
    });

    await client.syncUsers(ctx.input.emails);

    let scope =
      ctx.input.emails && ctx.input.emails.length > 0
        ? `${ctx.input.emails.length} specific user(s)`
        : 'all users';

    return {
      output: {
        synced: true,
        scope
      },
      message: `User sync triggered for ${scope}.`
    };
  })
  .build();
