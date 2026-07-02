import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { SimpleroClient } from '../lib/client';
import { spec } from '../spec';

export let taggingEvents = SlateTrigger.create(spec, {
  name: 'Tag Events',
  key: 'tagging_events',
  description: 'Triggers when a tag is added to or removed from a contact.'
})
  .input(
    z.object({
      eventType: z.enum(['new_tagging', 'delete_tagging']).describe('Type of tagging event'),
      contactId: z.string().describe('Contact ID'),
      email: z.string().describe('Contact email'),
      name: z.string().describe('Contact name'),
      tagNames: z.string().describe('Comma-separated tag names')
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('Contact ID'),
      email: z.string().describe('Contact email address'),
      name: z.string().describe('Contact full name'),
      tagNames: z.string().describe('Current comma-separated tag names')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new SimpleroClient({
        token: ctx.auth.token,
        userAgent: ctx.config.userAgent
      });

      let newResult = await client.createZapierSubscription({
        event: 'new_tagging',
        targetUrl: `${ctx.input.webhookBaseUrl}/new_tagging`
      });

      let delResult = await client.createZapierSubscription({
        event: 'delete_tagging',
        targetUrl: `${ctx.input.webhookBaseUrl}/delete_tagging`
      });

      return {
        registrationDetails: {
          newTaggingId: String(newResult.id),
          deleteTaggingId: String(delResult.id)
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new SimpleroClient({
        token: ctx.auth.token,
        userAgent: ctx.config.userAgent
      });

      let details = ctx.input.registrationDetails as Record<string, string>;
      if (details.newTaggingId) {
        await client.destroyZapierSubscription(details.newTaggingId);
      }
      if (details.deleteTaggingId) {
        await client.destroyZapierSubscription(details.deleteTaggingId);
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, unknown>;
      let url = ctx.request.url;
      let eventType: 'new_tagging' | 'delete_tagging' = 'new_tagging';
      if (url.includes('/delete_tagging')) {
        eventType = 'delete_tagging';
      }

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
          tagNames: String(item.tag_names || '')
        }))
      };
    },

    handleEvent: async ctx => {
      return {
        type: `tag.${ctx.input.eventType === 'new_tagging' ? 'added' : 'removed'}`,
        id: `${ctx.input.eventType}-${ctx.input.contactId}-${Date.now()}`,
        output: {
          contactId: ctx.input.contactId,
          email: ctx.input.email,
          name: ctx.input.name,
          tagNames: ctx.input.tagNames
        }
      };
    }
  })
  .build();
