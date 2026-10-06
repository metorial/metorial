import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { MoosendClient } from '../lib/client';
import { mapSubscriber, optionalNumber } from '../lib/data';
import { spec } from '../spec';

let subscriberOutputSchema = z.object({
  subscriberId: z.string().describe('Subscriber ID'),
  email: z.string().describe('Subscriber email address'),
  name: z.string().optional().describe('Subscriber name'),
  createdOn: z.string().optional().describe('Subscription date'),
  updatedOn: z.string().optional().describe('Last update date'),
  unsubscribedOn: z.string().optional().describe('Unsubscription date'),
  status: z
    .number()
    .optional()
    .describe('Subscription status: 1 subscribed, 2 unsubscribed, 3 bounced, 4 removed'),
  removedOn: z.string().optional().describe('Removal timestamp when archived'),
  customFields: z
    .array(
      z.object({
        customFieldId: z.string().optional().describe('Custom field ID'),
        fieldName: z.string().optional().describe('Custom field name'),
        fieldValue: z.string().optional().describe('Custom field value')
      })
    )
    .optional()
    .describe('Custom field values for this subscriber')
});

export let manageSubscriber = SlateTool.create(spec, {
  name: 'Manage Subscriber',
  key: 'manage_subscriber',
  description: `Add, update, unsubscribe, or remove subscribers from a mailing list. Supports adding single or multiple subscribers, unsubscribing (updates subscription state according to account settings), and archiving subscribers. Can also look up subscriber details by email or ID.`,
  instructions: [
    'Use action "add" to subscribe a new email or update an existing subscriber.',
    'Use action "unsubscribe" to move a subscriber to the suppression list without deleting.',
    'Use action "remove" to archive a subscriber without adding suppression.',
    'Use action "remove_many" to bulk-archive subscribers by email.',
    'Custom fields use fieldName=value strings. Upserts can resubscribe previously unsubscribed addresses and clear omitted custom-field values. Include all values you intend to preserve.',
    'Unsubscribe settings can affect other lists in the account. Removal archives records and does not guarantee history erasure.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum([
          'add',
          'add_many',
          'update',
          'unsubscribe',
          'remove',
          'remove_many',
          'get_by_email',
          'get_by_id'
        ])
        .describe('Action to perform'),
      mailingListId: z.string().describe('ID of the mailing list'),
      email: z
        .string()
        .optional()
        .describe('Subscriber email (for add, unsubscribe, remove, get_by_email)'),
      subscriberId: z.string().optional().describe('Subscriber ID (for update, get_by_id)'),
      name: z.string().optional().describe('Subscriber name (for add/update)'),
      customFields: z
        .array(z.string())
        .optional()
        .describe('Custom fields as "fieldName=value" pairs (for add/update)'),
      tags: z
        .array(z.string())
        .optional()
        .describe('Tags to assign to the subscriber (for add)'),
      hasExternalDoubleOptIn: z
        .boolean()
        .optional()
        .describe(
          'Record consent already obtained by other means; this does not itself authorize sending'
        ),
      campaignId: z
        .string()
        .optional()
        .describe('Campaign ID (for unsubscribing from a specific campaign)'),
      subscribers: z
        .array(
          z.object({
            email: z.string().describe('Subscriber email'),
            name: z.string().optional().describe('Subscriber name'),
            customFields: z
              .array(z.string())
              .optional()
              .describe('Custom fields as "fieldName=value" pairs')
          })
        )
        .optional()
        .describe('Multiple subscribers (for add_many)'),
      emails: z
        .array(z.string())
        .optional()
        .describe('List of emails to remove (for remove_many)')
    })
  )
  .output(
    z.object({
      subscribers: z
        .array(subscriberOutputSchema)
        .optional()
        .describe('Subscriber data returned'),
      emailsProcessed: z
        .number()
        .optional()
        .describe('Number of emails processed (for bulk operations)'),
      emailsIgnored: z
        .number()
        .optional()
        .describe('Number of emails ignored (for bulk operations)'),
      action: z.string().describe('Action that was performed'),
      success: z.boolean().describe('Whether the action completed successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MoosendClient({ token: ctx.auth.token });
    let { action, mailingListId } = ctx.input;

    switch (action) {
      case 'add': {
        if (!ctx.input.email)
          throw createApiServiceError('email is required for adding a subscriber');
        let body: Record<string, unknown> = { Email: ctx.input.email };
        if (ctx.input.name) body.Name = ctx.input.name;
        if (ctx.input.customFields) body.CustomFields = ctx.input.customFields;
        if (ctx.input.tags) body.Tags = ctx.input.tags;
        if (ctx.input.hasExternalDoubleOptIn !== undefined)
          body.HasExternalDoubleOptIn = ctx.input.hasExternalDoubleOptIn;
        let result = await client.addSubscriber(mailingListId, body);
        return {
          output: {
            subscribers: [mapSubscriber(result)],
            action,
            success: true
          },
          message: `Added/updated subscriber **${ctx.input.email}** to list ${mailingListId}.`
        };
      }
      case 'add_many': {
        if (!ctx.input.subscribers || ctx.input.subscribers.length === 0)
          throw createApiServiceError('subscribers array is required for add_many');
        let subs = ctx.input.subscribers.map(s => {
          let sub: Record<string, unknown> = { Email: s.email };
          if (s.name) sub.Name = s.name;
          if (s.customFields) sub.CustomFields = s.customFields;
          return sub;
        });
        let result = await client.addMultipleSubscribers(
          mailingListId,
          subs,
          ctx.input.hasExternalDoubleOptIn
        );
        return {
          output: {
            subscribers: result.subscribers.map(mapSubscriber),
            emailsProcessed: result.subscribers.length,
            emailsIgnored: Math.max(
              0,
              ctx.input.subscribers.length - result.subscribers.length
            ),
            action,
            success:
              !result.partialFailure &&
              result.subscribers.length === ctx.input.subscribers.length
          },
          message: `Moosend accepted **${result.subscribers.length}** of **${ctx.input.subscribers.length}** subscriber records; inspect partial results before retrying.`
        };
      }
      case 'update': {
        if (!ctx.input.subscriberId)
          throw createApiServiceError('subscriberId is required for updating a subscriber');
        let body: Record<string, unknown> = {};
        if (ctx.input.email) body.Email = ctx.input.email;
        if (ctx.input.name) body.Name = ctx.input.name;
        if (ctx.input.customFields) body.CustomFields = ctx.input.customFields;
        if (ctx.input.hasExternalDoubleOptIn !== undefined)
          body.HasExternalDoubleOptIn = ctx.input.hasExternalDoubleOptIn;
        let result = await client.updateSubscriber(
          mailingListId,
          ctx.input.subscriberId,
          body
        );
        return {
          output: {
            subscribers: [mapSubscriber(result)],
            action,
            success: true
          },
          message: `Updated subscriber **${ctx.input.subscriberId}**.`
        };
      }
      case 'unsubscribe': {
        if (!ctx.input.email)
          throw createApiServiceError('email is required for unsubscribing');
        if (ctx.input.campaignId) {
          await client.unsubscribeFromCampaign(
            mailingListId,
            ctx.input.campaignId,
            ctx.input.email
          );
        } else {
          await client.unsubscribeFromList(mailingListId, ctx.input.email);
        }
        return {
          output: {
            action,
            success: true
          },
          message: `Unsubscribed **${ctx.input.email}** from list ${mailingListId}${ctx.input.campaignId ? ` (campaign ${ctx.input.campaignId})` : ''}.`
        };
      }
      case 'remove': {
        if (!ctx.input.email)
          throw createApiServiceError('email is required for removing a subscriber');
        await client.removeSubscriber(mailingListId, ctx.input.email);
        return {
          output: {
            action,
            success: true
          },
          message: `Archived **${ctx.input.email}** from list ${mailingListId}.`
        };
      }
      case 'remove_many': {
        if (!ctx.input.emails || ctx.input.emails.length === 0)
          throw createApiServiceError('emails array is required for remove_many');
        let result = await client.removeMultipleSubscribers(mailingListId, ctx.input.emails);
        const emailsProcessed = optionalNumber(result.EmailsProcessed),
          emailsIgnored = optionalNumber(result.EmailsIgnored);
        if (
          emailsProcessed === undefined ||
          emailsIgnored === undefined ||
          !Number.isSafeInteger(emailsProcessed) ||
          !Number.isSafeInteger(emailsIgnored) ||
          emailsProcessed < 0 ||
          emailsIgnored < 0
        )
          throw createApiServiceError(
            'Moosend returned an incomplete archive receipt. Verify subscriber state before retrying; the request was not repeated.'
          );
        return {
          output: {
            emailsProcessed,
            emailsIgnored,
            action,
            success: emailsIgnored === 0 && emailsProcessed === ctx.input.emails.length
          },
          message: `Moosend processed **${emailsProcessed}** and ignored **${emailsIgnored}** of **${ctx.input.emails.length}** requested subscriber addresses; inspect partial results before retrying.`
        };
      }
      case 'get_by_email': {
        if (!ctx.input.email)
          throw createApiServiceError('email is required for get_by_email');
        let result = await client.getSubscriberByEmail(mailingListId, ctx.input.email);
        return {
          output: {
            subscribers: [mapSubscriber(result)],
            action,
            success: true
          },
          message: `Retrieved subscriber **${ctx.input.email}**.`
        };
      }
      case 'get_by_id': {
        if (!ctx.input.subscriberId)
          throw createApiServiceError('subscriberId is required for get_by_id');
        let result = await client.getSubscriberById(mailingListId, ctx.input.subscriberId);
        return {
          output: {
            subscribers: [mapSubscriber(result)],
            action,
            success: true
          },
          message: `Retrieved subscriber **${ctx.input.subscriberId}**.`
        };
      }
    }
  })
  .build();
