import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { StoryblokClient } from '../lib/client';
import { spec } from '../spec';

export let storyEvents = SlateTrigger.create(spec, {
  name: 'Story Events',
  key: 'story_events',
  description: 'Triggers when stories are published, unpublished, deleted, or moved.'
})
  .input(
    z.object({
      eventType: z
        .enum(['published', 'unpublished', 'deleted', 'moved'])
        .describe('Type of story event'),
      storyId: z.number().optional().describe('ID of the affected story'),
      fullSlug: z.string().optional().describe('Full slug of the story'),
      spaceId: z.number().optional().describe('Space ID'),
      webhookId: z.string().describe('Unique ID for deduplication')
    })
  )
  .output(
    z.object({
      storyId: z.number().optional().describe('ID of the affected story'),
      name: z.string().optional().describe('Name of the story'),
      slug: z.string().optional().describe('Slug of the story'),
      fullSlug: z.string().optional().describe('Full slug path of the story'),
      published: z.boolean().optional().describe('Whether the story is published'),
      publishedAt: z.string().optional().describe('Publication timestamp'),
      content: z
        .record(z.string(), z.any())
        .optional()
        .describe('Story content (if available)')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new StoryblokClient({
        token: ctx.auth.token,
        region: ctx.auth.region,
        spaceId: ctx.config.spaceId
      });

      let webhook = await client.createWebhook({
        name: 'Slates - Story Events',
        endpoint: ctx.input.webhookBaseUrl,
        actions: ['story.published', 'story.unpublished', 'story.deleted', 'story.moved'],
        activated: true
      });

      return {
        registrationDetails: {
          webhookId: webhook.id?.toString()
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new StoryblokClient({
        token: ctx.auth.token,
        region: ctx.auth.region,
        spaceId: ctx.config.spaceId
      });

      let details = ctx.input.registrationDetails as { webhookId?: string };
      if (details.webhookId) {
        await client.deleteWebhook(details.webhookId);
      }
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as {
        action?: string;
        story_id?: number;
        full_slug?: string;
        space_id?: number;
        text?: string;
      };

      let actionParts = (body.action || '').split('.');
      let eventType = actionParts[1] as
        | 'published'
        | 'unpublished'
        | 'deleted'
        | 'moved'
        | undefined;

      if (
        !eventType ||
        !['published', 'unpublished', 'deleted', 'moved'].includes(eventType)
      ) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            eventType: eventType as 'published' | 'unpublished' | 'deleted' | 'moved',
            storyId: body.story_id,
            fullSlug: body.full_slug,
            spaceId: body.space_id,
            webhookId: `story-${body.story_id}-${eventType}-${Date.now()}`
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let output: Record<string, any> = {
        storyId: ctx.input.storyId,
        fullSlug: ctx.input.fullSlug
      };

      // Try to fetch full story details for non-delete events
      if (ctx.input.eventType !== 'deleted' && ctx.input.storyId) {
        try {
          let client = new StoryblokClient({
            token: ctx.auth.token,
            region: ctx.auth.region,
            spaceId: ctx.config.spaceId
          });
          let story = await client.getStory(ctx.input.storyId.toString());
          output.name = story.name;
          output.slug = story.slug;
          output.fullSlug = story.full_slug;
          output.published = story.published;
          output.publishedAt = story.published_at;
          output.content = story.content;
        } catch {
          // Story might not be accessible
        }
      }

      return {
        type: `story.${ctx.input.eventType}`,
        id: ctx.input.webhookId,
        output: output as any
      };
    }
  })
  .build();
