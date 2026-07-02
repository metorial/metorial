import { SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let blogEventTypes = [
  'blog_created',
  'blog_updated',
  'blog_moved',
  'blog_trashed',
  'blog_restored',
  'blog_removed',
  'blog_viewed'
] as const;

export let blogEvents = SlateTrigger.create(spec, {
  name: 'Blog Post Events',
  key: 'blog_events',
  description:
    'Triggered when blog posts are created, updated, moved, trashed, restored, removed, or viewed.'
})
  .input(
    z.object({
      eventType: z.string().describe('The type of blog event'),
      blogPostId: z.string().describe('The blog post ID'),
      timestamp: z.string().describe('When the event occurred'),
      userAccountId: z.string().optional().describe('The user who triggered the event'),
      rawPayload: z.any().describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      blogPostId: z.string().describe('The blog post ID'),
      title: z.string().optional().describe('The blog post title'),
      status: z.string().optional().describe('The blog post status'),
      spaceId: z.string().optional().describe('The space ID'),
      versionNumber: z.number().optional().describe('The blog post version number'),
      authorId: z.string().optional().describe('The user who triggered the event'),
      webUrl: z.string().optional().describe('Web URL to view the blog post')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = createClient(ctx.auth, ctx.config);

      let result = await client.registerWebhook({
        name: 'Slates Blog Events',
        url: ctx.input.webhookBaseUrl,
        events: [...blogEventTypes]
      });

      return {
        registrationDetails: { webhookId: String(result.id || result) }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = createClient(ctx.auth, ctx.config);
      await client.unregisterWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let eventType = data.event || data.eventType || 'unknown';
      let blogPostId = data.blog?.id || data.content?.id || data.id || '';
      let timestamp = data.timestamp ? String(data.timestamp) : new Date().toISOString();
      let userAccountId = data.userAccountId || data.user?.accountId;

      return {
        inputs: [
          {
            eventType: String(eventType),
            blogPostId: String(blogPostId),
            timestamp,
            userAccountId,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let output: any = {
        blogPostId: ctx.input.blogPostId,
        authorId: ctx.input.userAccountId
      };

      try {
        let client = createClient(ctx.auth, ctx.config);
        let bp = await client.getBlogPostById(ctx.input.blogPostId);
        output.title = bp.title;
        output.status = bp.status;
        output.spaceId = bp.spaceId;
        output.versionNumber = bp.version?.number;
        output.webUrl = bp._links?.webui;
      } catch {
        output.title =
          ctx.input.rawPayload?.blog?.title || ctx.input.rawPayload?.content?.title;
      }

      return {
        type: `blog.${ctx.input.eventType.replace('blog_', '')}`,
        id: `${ctx.input.blogPostId}-${ctx.input.eventType}-${ctx.input.timestamp}`,
        output
      };
    }
  })
  .build();
