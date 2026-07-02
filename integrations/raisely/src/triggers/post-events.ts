import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { RaiselyClient } from '../lib/client';
import { spec } from '../spec';

export let postEvents = SlateTrigger.create(spec, {
  name: 'Post Events',
  key: 'post_events',
  description:
    'Triggers when a blog post on a fundraising profile is created, updated, or deleted.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of post event (created, updated, or deleted)'),
      postUuid: z.string().describe('UUID of the post'),
      post: z.record(z.string(), z.any()).describe('Full post object from the webhook payload')
    })
  )
  .output(
    z.object({
      postUuid: z.string().describe('UUID of the post'),
      profileUuid: z.string().optional().describe('UUID of the profile the post belongs to'),
      campaignUuid: z.string().optional().describe('UUID of the campaign'),
      userUuid: z.string().optional().describe('UUID of the post author'),
      title: z.string().optional().describe('Post title'),
      body: z.string().optional().describe('Post body content'),
      photoUrl: z.string().optional().describe('Post image URL'),
      createdAt: z.string().optional().describe('When the post was created')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new RaiselyClient({ token: ctx.auth.token });
      let result = await client.createWebhook({
        url: ctx.input.webhookBaseUrl,
        campaignUuid: ctx.config.campaignUuid
      });
      let webhook = result.data || result;
      return { registrationDetails: { webhookUuid: webhook.uuid } };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new RaiselyClient({ token: ctx.auth.token });
      await client.deleteWebhook(ctx.input.registrationDetails.webhookUuid);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, any>;
      let type = String(data.type || '');
      if (!type.startsWith('post.')) {
        return { inputs: [] };
      }
      let eventType = type.replace('post.', '');
      let post = (data.data || {}) as Record<string, any>;
      return {
        inputs: [
          {
            eventType,
            postUuid: String(post.uuid || data.uuid || ''),
            post
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let p = ctx.input.post as Record<string, any>;
      return {
        type: `post.${ctx.input.eventType}`,
        id: ctx.input.postUuid,
        output: {
          postUuid: String(p.uuid || ctx.input.postUuid),
          profileUuid: p.profileUuid as string | undefined,
          campaignUuid: p.campaignUuid as string | undefined,
          userUuid: p.userUuid as string | undefined,
          title: p.title as string | undefined,
          body: p.body as string | undefined,
          photoUrl: p.photoUrl as string | undefined,
          createdAt: p.createdAt as string | undefined
        }
      };
    }
  })
  .build();
