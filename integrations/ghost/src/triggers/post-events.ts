import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { GhostAdminClient } from '../lib/client';
import { spec } from '../spec';

let postEventTypes = [
  'post.added',
  'post.edited',
  'post.deleted',
  'post.published',
  'post.published.edited',
  'post.unpublished',
  'post.scheduled',
  'post.unscheduled',
  'post.rescheduled',
  'post.tag.attached',
  'post.tag.detached'
] as const;

export let postEvents = SlateTrigger.create(spec, {
  name: 'Post Events',
  key: 'post_events',
  description:
    'Triggered when posts are created, edited, deleted, published, unpublished, scheduled, or when tags are attached/detached from posts.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of post event'),
      post: z.any().describe('Post data from the webhook payload')
    })
  )
  .output(
    z.object({
      postId: z.string().describe('Post ID'),
      title: z.string().describe('Post title'),
      slug: z.string().describe('URL-friendly slug'),
      status: z.string().describe('Post status'),
      visibility: z.string().describe('Post visibility'),
      featured: z.boolean().describe('Whether the post is featured'),
      featureImage: z.string().nullable().describe('Feature image URL'),
      excerpt: z.string().nullable().describe('Post excerpt'),
      publishedAt: z.string().nullable().describe('Publication timestamp'),
      createdAt: z.string().nullable().describe('Creation timestamp'),
      updatedAt: z.string().nullable().describe('Last update timestamp'),
      url: z.string().describe('Full post URL')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new GhostAdminClient({
        domain: ctx.config.adminDomain,
        apiKey: ctx.auth.token
      });

      let webhookIds: string[] = [];
      for (let event of postEventTypes) {
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
      let eventType = pathParts.slice(-2).join('.') || 'post.edited';

      // Ghost webhook payloads contain the resource in a top-level "post" key
      let post = data?.post?.current ?? data?.post ?? data;

      return {
        inputs: [
          {
            eventType,
            post
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let post = ctx.input.post ?? {};

      return {
        type: ctx.input.eventType,
        id: `${ctx.input.eventType}-${post.id ?? 'unknown'}-${post.updated_at ?? Date.now()}`,
        output: {
          postId: post.id ?? '',
          title: post.title ?? '',
          slug: post.slug ?? '',
          status: post.status ?? '',
          visibility: post.visibility ?? 'public',
          featured: post.featured ?? false,
          featureImage: post.feature_image ?? null,
          excerpt: post.excerpt ?? post.custom_excerpt ?? null,
          publishedAt: post.published_at ?? null,
          createdAt: post.created_at ?? null,
          updatedAt: post.updated_at ?? null,
          url: post.url ?? ''
        }
      };
    }
  })
  .build();
