import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageSubscription = SlateTool.create(spec, {
  name: 'Manage List Subscription',
  key: 'manage_subscription',
  description: `Manages a user's subscription to an Engage list. Can subscribe a new user, update subscription status (subscribe/unsubscribe), or remove a user entirely from a list. You can also add or remove a user from multiple lists at once using the bulk action.`,
  instructions: [
    'Use "subscribe" to add a new subscriber to a list. Provide user details if the user does not exist yet.',
    'Use "update_status" to subscribe or unsubscribe an existing user. Unsubscribing preserves the user in the list but stops engagements.',
    'Use "remove" to completely remove a user from a list.',
    'Use "add_to_lists" or "remove_from_lists" to manage a user\'s membership in multiple lists at once.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['subscribe', 'update_status', 'remove', 'add_to_lists', 'remove_from_lists'])
        .describe('Operation to perform'),
      listId: z
        .string()
        .optional()
        .describe('List ID (required for subscribe, update_status, remove)'),
      uid: z
        .string()
        .optional()
        .describe(
          'User UID (required for update_status, remove, add_to_lists, remove_from_lists)'
        ),
      subscribed: z
        .boolean()
        .optional()
        .describe(
          'Subscription status (for update_status: true=subscribe, false=unsubscribe)'
        ),
      listIds: z
        .array(z.string())
        .optional()
        .describe('List IDs for bulk add/remove operations'),
      subscriberFirstName: z.string().optional().describe('First name of new subscriber'),
      subscriberLastName: z.string().optional().describe('Last name of new subscriber'),
      subscriberEmail: z.string().optional().describe('Email of new subscriber'),
      subscriberPhone: z.string().optional().describe('Phone number of new subscriber')
    })
  )
  .output(
    z.object({
      uid: z.string().optional().describe('User UID'),
      subscribed: z.boolean().optional().describe('Current subscription status'),
      status: z.string().optional().describe('Operation status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      secret: ctx.auth.secret
    });

    let { action, listId, uid, subscribed, listIds } = ctx.input;

    if (action === 'subscribe') {
      if (!listId) throw new Error('listId is required for subscribe action');
      let result = await client.subscribeToList(listId, {
        first_name: ctx.input.subscriberFirstName,
        last_name: ctx.input.subscriberLastName,
        email: ctx.input.subscriberEmail,
        number: ctx.input.subscriberPhone
      });
      return {
        output: { uid: result.uid, subscribed: true },
        message: `Subscribed user **${result.uid}** to list **${listId}**.`
      };
    }

    if (action === 'update_status') {
      if (!listId) throw new Error('listId is required for update_status action');
      if (!uid) throw new Error('uid is required for update_status action');
      if (subscribed === undefined)
        throw new Error('subscribed is required for update_status action');
      let result = await client.updateSubscription(listId, uid, subscribed);
      return {
        output: { uid, subscribed: result.subscribed },
        message: subscribed
          ? `Subscribed user **${uid}** to list **${listId}**.`
          : `Unsubscribed user **${uid}** from list **${listId}**.`
      };
    }

    if (action === 'remove') {
      if (!listId) throw new Error('listId is required for remove action');
      if (!uid) throw new Error('uid is required for remove action');
      let result = await client.removeSubscriber(listId, uid);
      return {
        output: { uid, status: result.status },
        message: `Removed user **${uid}** from list **${listId}**.`
      };
    }

    if (action === 'add_to_lists') {
      if (!uid) throw new Error('uid is required for add_to_lists action');
      if (!listIds || listIds.length === 0)
        throw new Error('listIds is required for add_to_lists action');
      await client.addUserToLists(uid, listIds);
      return {
        output: { uid, status: 'ok' },
        message: `Added user **${uid}** to **${listIds.length}** list(s).`
      };
    }

    // remove_from_lists
    if (!uid) throw new Error('uid is required for remove_from_lists action');
    if (!listIds || listIds.length === 0)
      throw new Error('listIds is required for remove_from_lists action');
    await client.removeUserFromLists(uid, listIds);
    return {
      output: { uid, status: 'ok' },
      message: `Removed user **${uid}** from **${listIds.length}** list(s).`
    };
  })
  .build();
