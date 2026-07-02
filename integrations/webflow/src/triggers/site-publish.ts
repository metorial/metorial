import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { WebflowClient } from '../lib/client';
import { spec } from '../spec';

export let sitePublishTrigger = SlateTrigger.create(spec, {
  name: 'Site Published',
  key: 'site_publish',
  description:
    'Triggered when a Webflow site is published. Includes the domains published to and the user who triggered the publish.'
})
  .input(
    z.object({
      triggerType: z.string().describe('Webhook trigger type'),
      siteId: z.string().optional().describe('Site that was published'),
      publishedBy: z.any().optional().describe('User who published the site'),
      publishedDomains: z
        .array(z.string())
        .optional()
        .describe('Domains that were published to'),
      publishedOn: z.string().optional().describe('Publish timestamp'),
      eventId: z.string().optional().describe('Unique event identifier'),
      rawPayload: z.any().optional().describe('Complete webhook payload')
    })
  )
  .output(
    z.object({
      siteId: z.string().optional().describe('Site that was published'),
      publishedByUserId: z.string().optional().describe('ID of the user who published'),
      publishedByEmail: z.string().optional().describe('Email of the user who published'),
      publishedDomains: z.array(z.string()).optional().describe('Domains published to'),
      publishedOn: z.string().optional().describe('ISO 8601 publish timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      if (!ctx.config.siteId) {
        throw new Error('siteId is required in config for automatic webhook registration');
      }
      let client = new WebflowClient(ctx.auth.token);
      let webhook = await client.createWebhook(ctx.config.siteId, {
        triggerType: 'site_publish',
        url: ctx.input.webhookBaseUrl
      });

      return {
        registrationDetails: {
          webhookId: webhook.id ?? webhook._id,
          siteId: ctx.config.siteId
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new WebflowClient(ctx.auth.token);
      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let eventId = data._id ?? data.id ?? crypto.randomUUID();
      let publishedDomains = (data.publishedDomains ?? data.domains ?? []).map((d: any) =>
        typeof d === 'string' ? d : (d.url ?? d.name ?? '')
      );

      return {
        inputs: [
          {
            triggerType: data.triggerType ?? 'site_publish',
            siteId: data.siteId ?? data.site,
            publishedBy: data.publishedBy ?? data.user,
            publishedDomains,
            publishedOn: data.publishedOn ?? data.createdOn,
            eventId,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let publishedBy = ctx.input.publishedBy;
      return {
        type: 'site.published',
        id: ctx.input.eventId ?? crypto.randomUUID(),
        output: {
          siteId: ctx.input.siteId,
          publishedByUserId:
            typeof publishedBy === 'object'
              ? (publishedBy?.id ?? publishedBy?._id)
              : undefined,
          publishedByEmail: typeof publishedBy === 'object' ? publishedBy?.email : undefined,
          publishedDomains: ctx.input.publishedDomains,
          publishedOn: ctx.input.publishedOn
        }
      };
    }
  })
  .build();
