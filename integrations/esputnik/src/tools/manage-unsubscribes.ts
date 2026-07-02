import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageUnsubscribes = SlateTool.create(spec, {
  name: 'Manage Unsubscribes',
  key: 'manage_unsubscribes',
  description: `Add or remove email addresses from the unsubscribed list. Unsubscribing an email prevents email delivery to that address; other channels (SMS, Viber, etc.) remain active.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['unsubscribe', 'resubscribe'])
        .describe('Whether to add emails to or remove them from the unsubscribe list'),
      emails: z
        .array(z.string())
        .min(1)
        .describe('Email addresses to unsubscribe or resubscribe')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation completed successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'unsubscribe') {
      await client.addUnsubscribedEmails(ctx.input.emails);
    } else {
      await client.removeUnsubscribedEmails(ctx.input.emails);
    }

    let actionWord = ctx.input.action === 'unsubscribe' ? 'unsubscribed' : 'resubscribed';

    return {
      output: { success: true },
      message: `**${ctx.input.emails.length}** email(s) ${actionWord} successfully.`
    };
  })
  .build();
