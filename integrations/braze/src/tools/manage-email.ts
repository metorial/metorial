import { SlateTool } from 'slates';
import { z } from 'zod';
import { BrazeClient } from '../lib/client';
import { requireBrazeArray, requireBrazeString } from '../lib/errors';
import { spec } from '../spec';

export let manageEmailList = SlateTool.create(spec, {
  name: 'Manage Email Blocklist',
  key: 'manage_email_blocklist',
  description: `Query and manage Braze email blocklists. List hard bounced or unsubscribed email addresses, and remove emails from the bounce or spam lists to re-enable delivery.`,
  instructions: [
    'Use action "list_bounces" to view hard bounced emails, "list_unsubscribes" for unsubscribed emails.',
    'Use "remove_bounces" or "remove_spam" to remove addresses from the respective lists.',
    'Use "blocklist" to add addresses to the blocklist, or "set_status" to change one email subscription status.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum([
          'list_bounces',
          'list_unsubscribes',
          'remove_bounces',
          'remove_spam',
          'blocklist',
          'set_status'
        ])
        .describe('Operation to perform'),
      emails: z
        .array(z.string())
        .optional()
        .describe(
          'Email addresses to remove or blocklist (required for remove_bounces, remove_spam, and blocklist)'
        ),
      email: z
        .string()
        .optional()
        .describe('Single email address for filtering or set_status'),
      subscriptionState: z
        .enum(['opted_in', 'subscribed', 'unsubscribed'])
        .optional()
        .describe('Email subscription state for set_status'),
      startDate: z.string().optional().describe('Start date for listing (YYYY-MM-DD format)'),
      endDate: z.string().optional().describe('End date for listing (YYYY-MM-DD format)'),
      limit: z.number().optional().describe('Max results to return (default 100, max 500)'),
      offset: z.number().optional().describe('Offset for pagination'),
      sortDirection: z
        .enum(['asc', 'desc'])
        .optional()
        .describe('Sort direction for list_unsubscribes')
    })
  )
  .output(
    z.object({
      emails: z.array(z.any()).optional().describe('Email addresses returned from the query'),
      message: z.string().describe('Response status from Braze')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BrazeClient({
      token: ctx.auth.token,
      instanceUrl: ctx.config.instanceUrl
    });

    let result: any;

    switch (ctx.input.action) {
      case 'list_bounces': {
        result = await client.listHardBounces({
          startDate: ctx.input.startDate,
          endDate: ctx.input.endDate,
          limit: ctx.input.limit,
          offset: ctx.input.offset,
          email: ctx.input.email
        });
        return {
          output: {
            emails: result.emails ?? [],
            message: result.message
          },
          message: `Found **${(result.emails ?? []).length}** hard bounced email(s).`
        };
      }
      case 'list_unsubscribes': {
        result = await client.listUnsubscribes({
          startDate: ctx.input.startDate,
          endDate: ctx.input.endDate,
          limit: ctx.input.limit,
          offset: ctx.input.offset,
          sortDirection: ctx.input.sortDirection,
          email: ctx.input.email
        });
        return {
          output: {
            emails: result.emails ?? [],
            message: result.message
          },
          message: `Found **${(result.emails ?? []).length}** unsubscribed email(s).`
        };
      }
      case 'remove_bounces': {
        let emails = requireBrazeArray(ctx.input.emails, 'emails', 'remove_bounces');
        result = await client.removeFromBounceList(emails);
        return {
          output: {
            message: result.message
          },
          message: `Removed **${emails.length}** email(s) from the bounce list.`
        };
      }
      case 'remove_spam': {
        let emails = requireBrazeArray(ctx.input.emails, 'emails', 'remove_spam');
        result = await client.removeFromSpamList(emails);
        return {
          output: {
            message: result.message
          },
          message: `Removed **${emails.length}** email(s) from the spam list.`
        };
      }
      case 'blocklist': {
        let emails = requireBrazeArray(ctx.input.emails, 'emails', 'blocklist');
        result = await client.blocklistEmails(emails);
        return {
          output: {
            message: result.message
          },
          message: `Blocklisted **${emails.length}** email(s).`
        };
      }
      case 'set_status': {
        let email = requireBrazeString(ctx.input.email, 'email', 'set_status');
        let subscriptionState = requireBrazeString(
          ctx.input.subscriptionState,
          'subscriptionState',
          'set_status'
        );
        result = await client.setEmailSubscriptionStatus(email, subscriptionState);
        return {
          output: {
            message: result.message
          },
          message: `Set **${email}** email subscription status to **${subscriptionState}**.`
        };
      }
    }
  })
  .build();
