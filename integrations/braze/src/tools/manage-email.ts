import { SlateTool } from 'slates';
import { z } from 'zod';
import { BrazeClient } from '../lib/client';
import { spec } from '../spec';

export let manageEmailList = SlateTool.create(spec, {
  name: 'Manage Email Blocklist',
  key: 'manage_email_blocklist',
  description: `Query and manage Braze email blocklists. List hard bounced or unsubscribed email addresses, and remove emails from the bounce or spam lists to re-enable delivery.`,
  instructions: [
    'Use action "list_bounces" to view hard bounced emails, "list_unsubscribes" for unsubscribed emails.',
    'Use "remove_bounces" or "remove_spam" to remove addresses from the respective lists.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list_bounces', 'list_unsubscribes', 'remove_bounces', 'remove_spam'])
        .describe('Operation to perform'),
      emails: z
        .array(z.string())
        .optional()
        .describe('Email addresses to remove (required for remove_bounces and remove_spam)'),
      startDate: z.string().optional().describe('Start date for listing (YYYY-MM-DD format)'),
      endDate: z.string().optional().describe('End date for listing (YYYY-MM-DD format)'),
      limit: z.number().optional().describe('Max results to return (default 100, max 500)'),
      offset: z.number().optional().describe('Offset for pagination')
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
          offset: ctx.input.offset
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
          offset: ctx.input.offset
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
        result = await client.removeFromBounceList(ctx.input.emails ?? []);
        return {
          output: {
            message: result.message
          },
          message: `Removed **${(ctx.input.emails ?? []).length}** email(s) from the bounce list.`
        };
      }
      case 'remove_spam': {
        result = await client.removeFromSpamList(ctx.input.emails ?? []);
        return {
          output: {
            message: result.message
          },
          message: `Removed **${(ctx.input.emails ?? []).length}** email(s) from the spam list.`
        };
      }
    }
  })
  .build();
