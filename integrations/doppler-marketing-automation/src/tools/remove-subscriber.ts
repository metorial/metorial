import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let removeSubscriber = SlateTool.create(spec, {
  name: 'Remove Subscriber',
  key: 'remove_subscriber',
  description: `Remove a subscriber from a specific list or unsubscribe them from the entire account.
When removing from a list, the subscriber is only disassociated from that list. When unsubscribing from the account, the subscriber will no longer receive any communications.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['remove_from_list', 'unsubscribe_from_account'])
        .describe('Whether to remove from a list or unsubscribe from the account entirely'),
      email: z.string().describe('Email address of the subscriber'),
      listId: z
        .number()
        .optional()
        .describe('ID of the list to remove from. Required for remove_from_list action.'),
      unsubscriptionReason: z
        .enum([
          'administrative',
          'subscriberRequestNotInterestingContent',
          'subscriberRequestIsSpam',
          'subscriberRequestTooManyEmails',
          'subscriberRequestOther',
          'subscriberRequestNeverSubscribed'
        ])
        .optional()
        .describe(
          'Reason for unsubscription. Only used with unsubscribe_from_account action.'
        ),
      unsubscriptionComment: z
        .string()
        .optional()
        .describe(
          'Optional comment for unsubscription (max 200 characters). Only used with unsubscribe_from_account action.'
        )
    })
  )
  .output(
    z.object({
      email: z.string().describe('Email address of the removed subscriber'),
      action: z.string().describe('Action that was performed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountEmail: ctx.config.accountEmail
    });

    if (ctx.input.action === 'remove_from_list') {
      if (!ctx.input.listId) {
        throw new Error('listId is required when removing a subscriber from a list');
      }
      await client.removeSubscriberFromList(ctx.input.listId, ctx.input.email);
      return {
        output: {
          email: ctx.input.email,
          action: 'remove_from_list'
        },
        message: `Removed **${ctx.input.email}** from list \`${ctx.input.listId}\`.`
      };
    }

    if (ctx.input.action === 'unsubscribe_from_account') {
      await client.unsubscribeFromAccount(
        ctx.input.email,
        ctx.input.unsubscriptionReason,
        ctx.input.unsubscriptionComment
      );
      return {
        output: {
          email: ctx.input.email,
          action: 'unsubscribe_from_account'
        },
        message: `Unsubscribed **${ctx.input.email}** from the account.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
