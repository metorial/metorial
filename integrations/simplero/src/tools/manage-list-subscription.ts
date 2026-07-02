import { SlateTool } from 'slates';
import { z } from 'zod';
import { SimpleroClient } from '../lib/client';
import { spec } from '../spec';

export let manageListSubscription = SlateTool.create(spec, {
  name: 'Manage List Subscription',
  key: 'manage_list_subscription',
  description: `Subscribe or unsubscribe contacts from mailing lists, look up existing subscriptions, or list all available mailing lists. Supports single and bulk subscriptions (up to 1,000 at a time).
Bulk subscribe is asynchronous and returns a tracking token.`,
  instructions: [
    'Use action "get_lists" to retrieve all available mailing lists and their IDs.',
    'Bulk subscribe accepts up to 1,000 entries and returns a token for polling status.'
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
          'get_lists',
          'subscribe',
          'bulk_subscribe',
          'unsubscribe',
          'find_subscription',
          'list_subscriptions'
        ])
        .describe('Action to perform'),
      listId: z
        .string()
        .optional()
        .describe('Mailing list ID (required for subscribe/unsubscribe/find actions)'),
      email: z.string().optional().describe('Contact email address'),
      firstName: z.string().optional().describe('First name for subscription'),
      lastName: z.string().optional().describe('Last name for subscription'),
      tags: z.array(z.string()).optional().describe('Tags to add to the subscription'),
      ipAddress: z.string().optional().describe('IP address for the subscription'),
      referrer: z.string().optional().describe('Referrer URL'),
      affiliateRef: z.string().optional().describe('Affiliate reference'),
      landingPageId: z.number().optional().describe('Landing page ID'),
      gdprConsent: z.boolean().optional().describe('GDPR consent flag'),
      subscribers: z
        .array(
          z.object({
            email: z.string().describe('Subscriber email'),
            firstName: z.string().optional().describe('Subscriber first name'),
            lastName: z.string().optional().describe('Subscriber last name')
          })
        )
        .optional()
        .describe('Array of subscribers for bulk subscribe (max 1,000)'),
      page: z.number().optional().describe('Page number for listing subscriptions'),
      perPage: z.number().optional().describe('Results per page'),
      status: z
        .enum(['active', 'unsubscribed', 'suspended'])
        .optional()
        .describe('Filter subscriptions by status')
    })
  )
  .output(
    z.object({
      lists: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Available mailing lists'),
      subscription: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Subscription record'),
      subscriptions: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('List of subscription records'),
      bulkToken: z.string().optional().describe('Token for tracking bulk subscribe progress'),
      success: z.boolean().optional().describe('Whether the unsubscribe was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SimpleroClient({
      token: ctx.auth.token,
      userAgent: ctx.config.userAgent
    });

    if (ctx.input.action === 'get_lists') {
      let lists = await client.getLists();
      return {
        output: { lists },
        message: `Found **${lists.length}** mailing list(s).`
      };
    }

    if (ctx.input.action === 'list_subscriptions') {
      let subscriptions = await client.listSubscriptions({
        page: ctx.input.page,
        perPage: ctx.input.perPage,
        listId: ctx.input.listId,
        status: ctx.input.status
      });
      return {
        output: { subscriptions },
        message: `Found **${subscriptions.length}** subscription(s).`
      };
    }

    if (!ctx.input.listId) {
      throw new Error('listId is required for this action.');
    }

    if (ctx.input.action === 'subscribe') {
      if (!ctx.input.email) {
        throw new Error('email is required for subscribing.');
      }
      let subscription = await client.subscribeToList(ctx.input.listId, {
        email: ctx.input.email,
        firstName: ctx.input.firstName,
        lastName: ctx.input.lastName,
        tags: ctx.input.tags,
        ipAddress: ctx.input.ipAddress,
        referrer: ctx.input.referrer,
        ref: ctx.input.affiliateRef,
        landingPageId: ctx.input.landingPageId,
        gdprConsent: ctx.input.gdprConsent
      });
      return {
        output: { subscription },
        message: `Subscribed **${ctx.input.email}** to list **${ctx.input.listId}**.`
      };
    }

    if (ctx.input.action === 'bulk_subscribe') {
      if (!ctx.input.subscribers || ctx.input.subscribers.length === 0) {
        throw new Error('subscribers array is required for bulk subscribe.');
      }
      let result = await client.bulkSubscribeToList(ctx.input.listId, ctx.input.subscribers);
      return {
        output: { bulkToken: result.token },
        message: `Bulk subscribe initiated for **${ctx.input.subscribers.length}** subscriber(s). Tracking token: **${result.token}**.`
      };
    }

    if (ctx.input.action === 'unsubscribe') {
      if (!ctx.input.email) {
        throw new Error('email is required for unsubscribing.');
      }
      let result = await client.unsubscribeFromList(ctx.input.listId, ctx.input.email);
      return {
        output: { success: result.success as boolean },
        message: `Unsubscribed **${ctx.input.email}** from list **${ctx.input.listId}**.`
      };
    }

    if (ctx.input.action === 'find_subscription') {
      if (!ctx.input.email) {
        throw new Error('email is required for finding subscriptions.');
      }
      let subscriptions = await client.findSubscription(ctx.input.listId, ctx.input.email);
      return {
        output: { subscriptions },
        message: `Found **${subscriptions.length}** subscription(s) for **${ctx.input.email}** on list **${ctx.input.listId}**.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
