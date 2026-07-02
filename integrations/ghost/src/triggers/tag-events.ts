import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { GhostAdminClient } from '../lib/client';
import { spec } from '../spec';

let tagEventTypes = ['tag.added', 'tag.edited', 'tag.deleted'] as const;

export let tagEvents = SlateTrigger.create(spec, {
  name: 'Tag Events',
  key: 'tag_events',
  description: 'Triggered when tags are created, edited, or deleted on your Ghost site.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of tag event'),
      tag: z.any().describe('Tag data from the webhook payload')
    })
  )
  .output(
    z.object({
      tagId: z.string().describe('Tag ID'),
      name: z.string().describe('Tag name'),
      slug: z.string().describe('URL-friendly slug'),
      description: z.string().nullable().describe('Tag description'),
      visibility: z.string().describe('Tag visibility'),
      createdAt: z.string().nullable().describe('Creation timestamp'),
      updatedAt: z.string().nullable().describe('Last update timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new GhostAdminClient({
        domain: ctx.config.adminDomain,
        apiKey: ctx.auth.token
      });

      let webhookIds: string[] = [];
      for (let event of tagEventTypes) {
        let result = await client.createWebhook({
          event,
          targetUrl: `${ctx.input.webhookBaseUrl}/${event}`,
          name: `Slates: ${event}`
        });
        webhookIds.push(result.webhooks[0].id);
      }

      return { registrationDetails: { webhookIds } };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new GhostAdminClient({
        domain: ctx.config.adminDomain,
        apiKey: ctx.auth.token
      });

      let details = ctx.input.registrationDetails as { webhookIds: string[] };
      for (let webhookId of details.webhookIds) {
        try {
          await client.deleteWebhook(webhookId);
        } catch {
          // Webhook may already be deleted
        }
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;
      let url = new URL(ctx.request.url);
      let pathParts = url.pathname.split('/');
      let eventType = pathParts.slice(-2).join('.') || 'tag.edited';

      let tag = data?.tag?.current ?? data?.tag ?? data;

      return {
        inputs: [
          {
            eventType,
            tag
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let tag = ctx.input.tag ?? {};

      return {
        type: ctx.input.eventType,
        id: `${ctx.input.eventType}-${tag.id ?? 'unknown'}-${tag.updated_at ?? Date.now()}`,
        output: {
          tagId: tag.id ?? '',
          name: tag.name ?? '',
          slug: tag.slug ?? '',
          description: tag.description ?? null,
          visibility: tag.visibility ?? 'public',
          createdAt: tag.created_at ?? null,
          updatedAt: tag.updated_at ?? null
        }
      };
    }
  })
  .build();
