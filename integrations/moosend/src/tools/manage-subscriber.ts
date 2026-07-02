import { SlateTool } from 'slates';
import { z } from 'zod';
import { MoosendClient } from '../lib/client';
import { spec } from '../spec';

let subscriberOutputSchema = z.object({
  subscriberId: z.string().describe('Subscriber ID'),
  email: z.string().describe('Subscriber email address'),
  name: z.string().optional().describe('Subscriber name'),
  createdOn: z.string().optional().describe('Subscription date'),
  updatedOn: z.string().optional().describe('Last update date'),
  unsubscribedOn: z.string().optional().describe('Unsubscription date'),
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
  description: `Add, update, unsubscribe, or remove subscribers from a mailing list. Supports adding single or multiple subscribers, unsubscribing (moves to suppression list), and permanently removing subscribers. Can also look up subscriber details by email or ID.`,
  instructions: [
    'Use action "add" to subscribe a new email or update an existing subscriber.',
    'Use action "unsubscribe" to move a subscriber to the suppression list without deleting.',
    'Use action "remove" to permanently delete a subscriber.',
    'Use action "remove_many" to permanently bulk-remove subscribers by email.',
    'Custom fields should be provided as an array of "fieldName=value" strings.'
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
        if (!ctx.input.email) throw new Error('email is required for adding a subscriber');
        let body: Record<string, unknown> = { Email: ctx.input.email };
        if (ctx.input.name) body.Name = ctx.input.name;
        if (ctx.input.customFields) body.CustomFields = ctx.input.customFields;
        if (ctx.input.tags) body.Tags = ctx.input.tags;
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
          throw new Error('subscribers array is required for add_many');
        let subs = ctx.input.subscribers.map(s => {
          let sub: Record<string, unknown> = { Email: s.email };
          if (s.name) sub.Name = s.name;
          if (s.customFields) sub.CustomFields = s.customFields;
          return sub;
        });
        let _result = await client.addMultipleSubscribers(mailingListId, subs);
        return {
          output: {
            action,
            success: true
          },
          message: `Added **${ctx.input.subscribers.length}** subscriber(s) to list ${mailingListId}.`
        };
      }
      case 'update': {
        if (!ctx.input.subscriberId)
          throw new Error('subscriberId is required for updating a subscriber');
        let body: Record<string, unknown> = {};
        if (ctx.input.email) body.Email = ctx.input.email;
        if (ctx.input.name) body.Name = ctx.input.name;
        if (ctx.input.customFields) body.CustomFields = ctx.input.customFields;
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
        if (!ctx.input.email) throw new Error('email is required for unsubscribing');
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
        if (!ctx.input.email) throw new Error('email is required for removing a subscriber');
        await client.removeSubscriber(mailingListId, ctx.input.email);
        return {
          output: {
            action,
            success: true
          },
          message: `Permanently removed **${ctx.input.email}** from list ${mailingListId}.`
        };
      }
      case 'remove_many': {
        if (!ctx.input.emails || ctx.input.emails.length === 0)
          throw new Error('emails array is required for remove_many');
        let result = await client.removeMultipleSubscribers(mailingListId, ctx.input.emails);
        return {
          output: {
            emailsProcessed: result?.EmailsProcessed as number | undefined,
            emailsIgnored: result?.EmailsIgnored as number | undefined,
            action,
            success: true
          },
          message: `Bulk removed **${ctx.input.emails.length}** subscriber(s) from list ${mailingListId}.`
        };
      }
      case 'get_by_email': {
        if (!ctx.input.email) throw new Error('email is required for get_by_email');
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
        if (!ctx.input.subscriberId) throw new Error('subscriberId is required for get_by_id');
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

let mapSubscriber = (s: Record<string, unknown>) => ({
  subscriberId: String(s?.ID ?? ''),
  email: String(s?.Email ?? ''),
  name: s?.Name ? String(s.Name) : undefined,
  createdOn: s?.CreatedOn ? String(s.CreatedOn) : undefined,
  updatedOn: s?.UpdatedOn ? String(s.UpdatedOn) : undefined,
  unsubscribedOn: s?.UnsubscribedOn ? String(s.UnsubscribedOn) : undefined,
  customFields: Array.isArray(s?.CustomFields)
    ? (s.CustomFields as Record<string, unknown>[]).map(cf => ({
        customFieldId: cf?.CustomFieldID ? String(cf.CustomFieldID) : undefined,
        fieldName: cf?.Name ? String(cf.Name) : undefined,
        fieldValue: cf?.Value ? String(cf.Value) : undefined
      }))
    : undefined
});
