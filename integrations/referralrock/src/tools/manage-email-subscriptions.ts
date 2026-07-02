import { SlateTool } from 'slates';
import { z } from 'zod';
import { ReferralRockClient } from '../lib/client';
import { spec } from '../spec';

export let manageEmailSubscriptions = SlateTool.create(spec, {
  name: 'Manage Email Subscriptions',
  key: 'manage_email_subscriptions',
  description: `Manage the email unsubscribe list. Add or remove emails from the unsubscribe list, or query currently unsubscribed emails. Use to control which emails receive referral communications.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['unsubscribe', 'resubscribe', 'list'])
        .describe(
          'Action to perform: unsubscribe an email, resubscribe (remove from unsubscribe list), or list unsubscribed emails'
        ),
      email: z
        .string()
        .optional()
        .describe(
          'Email address (required for unsubscribe and resubscribe actions, optional filter for list)'
        )
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the action succeeded'),
      unsubscribedEmails: z
        .array(z.string())
        .optional()
        .describe('List of unsubscribed email addresses (for list action)'),
      message: z.string().optional().describe('Response message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ReferralRockClient({ token: ctx.auth.token });

    if (ctx.input.action === 'unsubscribe') {
      if (!ctx.input.email) throw new Error('Email is required for unsubscribe action');
      await client.unsubscribeEmail(ctx.input.email);
      return {
        output: { success: true, message: `Email ${ctx.input.email} has been unsubscribed.` },
        message: `Unsubscribed **${ctx.input.email}** from emails.`
      };
    }

    if (ctx.input.action === 'resubscribe') {
      if (!ctx.input.email) throw new Error('Email is required for resubscribe action');
      await client.removeUnsubscribe(ctx.input.email);
      return {
        output: { success: true, message: `Email ${ctx.input.email} has been resubscribed.` },
        message: `Resubscribed **${ctx.input.email}** to emails.`
      };
    }

    // list
    let result = await client.getUnsubscribedEmails(ctx.input.email);
    let emails = (result as unknown as string[]) || [];

    return {
      output: {
        success: true,
        unsubscribedEmails: Array.isArray(emails) ? emails : []
      },
      message: `Retrieved **${Array.isArray(emails) ? emails.length : 0}** unsubscribed email(s).`
    };
  })
  .build();
