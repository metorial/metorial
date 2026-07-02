import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let scheduledPostTrigger = SlateTrigger.create(spec, {
  name: 'Scheduled Post Published',
  key: 'scheduled_post_published',
  description:
    'Triggered when a scheduled post has been processed and published (or failed). Includes post status, errors, and platform-specific results.'
})
  .input(
    z.object({
      action: z.string().describe('Webhook action type'),
      subAction: z.string().optional().describe('Sub-action (e.g., tikTokPublished)'),
      hookId: z.string().optional().describe('Webhook hook ID'),
      postId: z.string().optional().describe('Ayrshare post ID'),
      status: z.string().optional().describe('Post status'),
      code: z.number().optional().describe('Status code'),
      refId: z.string().optional().describe('Profile reference ID'),
      postIds: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Platform-specific post results'),
      errors: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Errors per platform'),
      created: z.string().optional().describe('Event timestamp')
    })
  )
  .output(
    z.object({
      postId: z.string().optional().describe('Ayrshare post ID'),
      status: z.string().optional().describe('Post status (success, error, etc.)'),
      refId: z.string().optional().describe('Profile reference ID'),
      postIds: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Platform-specific post IDs and statuses'),
      errors: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Any errors per platform'),
      subAction: z.string().optional().describe('Sub-action type (e.g., tikTokPublished)'),
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
        action: 'scheduled',
        url: ctx.input.webhookBaseUrl
      });

      return {
        registrationDetails: {
          action: 'scheduled',
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
        action: ctx.input.registrationDetails.action || 'scheduled'
      });
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      return {
        inputs: [
          {
            action: data.action || 'scheduled',
            subAction: data.subAction,
            hookId: data.hookId,
            postId: data.id,
            status: data.status,
            code: data.code,
            refId: data.refId,
            postIds: data.postIds,
            errors: data.errors,
            created: data.created
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let subAction = ctx.input.subAction;
      let eventType =
        subAction === 'tikTokPublished'
          ? 'post.tiktok_published'
          : ctx.input.status === 'error'
            ? 'post.failed'
            : 'post.published';

      return {
        type: eventType,
        id: ctx.input.hookId || ctx.input.postId || `scheduled-${Date.now()}`,
        output: {
          postId: ctx.input.postId,
          status: ctx.input.status,
          refId: ctx.input.refId,
          postIds: ctx.input.postIds,
          errors: ctx.input.errors,
          subAction: ctx.input.subAction,
          created: ctx.input.created
        }
      };
    }
  })
  .build();
