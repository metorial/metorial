import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { StoryblokClient } from '../lib/client';
import { spec } from '../spec';

export let releaseEvents = SlateTrigger.create(spec, {
  name: 'Release Events',
  key: 'release_events',
  description: 'Triggers when a release is merged (published) into the current content.'
})
  .input(
    z.object({
      releaseId: z.number().optional().describe('ID of the merged release'),
      spaceId: z.number().optional().describe('Space ID'),
      webhookId: z.string().describe('Unique ID for deduplication')
    })
  )
  .output(
    z.object({
      releaseId: z.number().optional().describe('ID of the merged release'),
      name: z.string().optional().describe('Name of the release'),
      released: z.boolean().optional().describe('Whether the release was merged')
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
        name: 'Slates - Release Events',
        endpoint: ctx.input.webhookBaseUrl,
        actions: ['release.merged'],
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
        release_id?: number;
        space_id?: number;
      };

      if (body.action !== 'release.merged') {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            releaseId: body.release_id,
            spaceId: body.space_id,
            webhookId: `release-${body.release_id}-merged-${Date.now()}`
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let output: Record<string, any> = {
        releaseId: ctx.input.releaseId,
        released: true
      };

      if (ctx.input.releaseId) {
        try {
          let client = new StoryblokClient({
            token: ctx.auth.token,
            region: ctx.auth.region,
            spaceId: ctx.config.spaceId
          });
          let release = await client.getRelease(ctx.input.releaseId.toString());
          output.name = release.name;
        } catch {
          // Release might not be accessible after merge
        }
      }

      return {
        type: 'release.merged',
        id: ctx.input.webhookId,
        output: output as any
      };
    }
  })
  .build();
