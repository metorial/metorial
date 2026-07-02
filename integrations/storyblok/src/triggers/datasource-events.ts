import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { StoryblokClient } from '../lib/client';
import { spec } from '../spec';

export let datasourceEvents = SlateTrigger.create(spec, {
  name: 'Datasource Events',
  key: 'datasource_events',
  description: 'Triggers when datasource entries are saved or added.'
})
  .input(
    z.object({
      datasourceId: z.number().optional().describe('ID of the affected datasource'),
      spaceId: z.number().optional().describe('Space ID'),
      webhookId: z.string().describe('Unique ID for deduplication')
    })
  )
  .output(
    z.object({
      datasourceId: z.number().optional().describe('ID of the affected datasource'),
      spaceId: z.number().optional().describe('Space ID')
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
        name: 'Slates - Datasource Events',
        endpoint: ctx.input.webhookBaseUrl,
        actions: ['datasource.entries_updated'],
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
        datasource_id?: number;
        space_id?: number;
      };

      if (body.action !== 'datasource.entries_updated') {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            datasourceId: body.datasource_id,
            spaceId: body.space_id,
            webhookId: `datasource-${body.datasource_id}-entries-updated-${Date.now()}`
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'datasource.entries_updated',
        id: ctx.input.webhookId,
        output: {
          datasourceId: ctx.input.datasourceId,
          spaceId: ctx.input.spaceId
        }
      };
    }
  })
  .build();
