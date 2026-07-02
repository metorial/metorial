import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { SimpleroClient } from '../lib/client';
import { spec } from '../spec';

export let subscriptionEvents = SlateTrigger.create(spec, {
  name: 'Subscription Events',
  key: 'subscription_events',
  description: 'Triggers when a contact subscribes to or unsubscribes from a mailing list.'
})
  .input(
    z.object({
      eventType: z
        .enum(['new_subscription', 'delete_subscription'])
        .describe('Type of subscription event'),
      contactId: z.string().describe('Contact ID'),
      email: z.string().describe('Contact email'),
      name: z.string().describe('Contact name'),
      tagNames: z.string().describe('Comma-separated tag names'),
      listId: z.string().optional().describe('Mailing list ID')
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('Contact ID'),
      email: z.string().describe('Contact email address'),
      name: z.string().describe('Contact full name'),
      tagNames: z.string().describe('Comma-separated tag names'),
      listId: z.string().optional().describe('Mailing list ID')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new SimpleroClient({
        token: ctx.auth.token,
        userAgent: ctx.config.userAgent
      });

      let newSubResult = await client.createZapierSubscription({
        event: 'new_subscription',
        targetUrl: `${ctx.input.webhookBaseUrl}/new_subscription`
      });

      let delSubResult = await client.createZapierSubscription({
        event: 'delete_subscription',
        targetUrl: `${ctx.input.webhookBaseUrl}/delete_subscription`
      });

      return {
        registrationDetails: {
          newSubscriptionId: String(newSubResult.id),
          deleteSubscriptionId: String(delSubResult.id)
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new SimpleroClient({
        token: ctx.auth.token,
        userAgent: ctx.config.userAgent
      });

      let details = ctx.input.registrationDetails as Record<string, string>;
      if (details.newSubscriptionId) {
        await client.destroyZapierSubscription(details.newSubscriptionId);
      }
      if (details.deleteSubscriptionId) {
        await client.destroyZapierSubscription(details.deleteSubscriptionId);
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, unknown>;
      let url = ctx.request.url;
      let eventType: 'new_subscription' | 'delete_subscription' = 'new_subscription';
      if (url.includes('/delete_subscription')) {
        eventType = 'delete_subscription';
      }

      // Simplero sends either single object or results array
      let items: Record<string, unknown>[] = [];
      if (Array.isArray(data.results)) {
        items = data.results as Record<string, unknown>[];
      } else if (data.id || data.email) {
        items = [data];
      }

      return {
        inputs: items.map(item => ({
          eventType,
          contactId: String(item.id || ''),
          email: String(item.email || ''),
          name: String(item.name || ''),
          tagNames: String(item.tag_names || ''),
          listId: item.list_id ? String(item.list_id) : undefined
        }))
      };
    },

    handleEvent: async ctx => {
      return {
        type: `subscription.${ctx.input.eventType === 'new_subscription' ? 'created' : 'deleted'}`,
        id: `${ctx.input.eventType}-${ctx.input.contactId}-${Date.now()}`,
        output: {
          contactId: ctx.input.contactId,
          email: ctx.input.email,
          name: ctx.input.name,
          tagNames: ctx.input.tagNames,
          listId: ctx.input.listId
        }
      };
    }
  })
  .build();
