import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let feedTrigger = SlateTrigger.create(spec, {
  name: 'New Feed Item',
  key: 'new_feed_item',
  description:
    'Triggered when a new RSS feed item is detected. When this webhook is active, new RSS items will not be automatically posted, allowing custom handling of feed content.'
})
  .input(
    z.object({
      action: z.string().describe('Webhook action type'),
      hookId: z.string().optional().describe('Webhook hook ID'),
      feedUrl: z.string().optional().describe('RSS feed URL'),
      title: z.string().optional().describe('Feed item title'),
      link: z.string().optional().describe('Feed item link'),
      description: z.string().optional().describe('Feed item description'),
      refId: z.string().optional().describe('Profile reference ID'),
      created: z.string().optional().describe('Event timestamp')
    })
  )
  .output(
    z.object({
      feedUrl: z.string().optional().describe('RSS feed URL'),
      title: z.string().optional().describe('Feed item title'),
      link: z.string().optional().describe('Feed item link'),
      description: z.string().optional().describe('Feed item description or summary'),
      refId: z.string().optional().describe('Profile reference ID'),
      created: z.string().optional().describe('Event creation timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        profileKey: ctx.config.profileKey
      });

      let result = await client.registerWebhook({
        action: 'feed',
        url: ctx.input.webhookBaseUrl
      });

      return {
        registrationDetails: {
          action: 'feed',
          hookId: result.hookId || result.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        profileKey: ctx.config.profileKey
      });

      await client.unregisterWebhook({
        action: ctx.input.registrationDetails.action || 'feed'
      });
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      return {
        inputs: [
          {
            action: data.action || 'feed',
            hookId: data.hookId,
            feedUrl: data.feedUrl || data.url,
            title: data.title,
            link: data.link,
            description: data.description,
            refId: data.refId,
            created: data.created
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'feed.new_item',
        id: ctx.input.hookId || `feed-${ctx.input.link || Date.now()}`,
        output: {
          feedUrl: ctx.input.feedUrl,
          title: ctx.input.title,
          link: ctx.input.link,
          description: ctx.input.description,
          refId: ctx.input.refId,
          created: ctx.input.created
        }
      };
    }
  })
  .build();
