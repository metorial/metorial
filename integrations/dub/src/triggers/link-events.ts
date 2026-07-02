import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let linkDataSchema = z.object({
  linkId: z.string().describe('Unique link ID'),
  domain: z.string().describe('Domain of the short link'),
  slug: z.string().describe('Slug/key of the short link'),
  shortLink: z.string().describe('Full short link URL'),
  destinationUrl: z.string().describe('The destination URL'),
  externalId: z.string().nullable().describe('External ID mapping'),
  trackConversion: z.boolean().describe('Whether conversion tracking is enabled'),
  archived: z.boolean().describe('Whether the link is archived'),
  tags: z
    .array(
      z.object({
        tagId: z.string(),
        name: z.string(),
        color: z.string()
      })
    )
    .describe('Tags assigned to the link'),
  createdAt: z.string().describe('Creation timestamp'),
  updatedAt: z.string().describe('Last update timestamp')
});

export let linkEvents = SlateTrigger.create(spec, {
  name: 'Link Events',
  key: 'link_events',
  description:
    'Triggers when a link is created, updated, or deleted in your Dub workspace. Does not fire for bulk operations.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of link event'),
      eventId: z.string().describe('Unique event ID'),
      linkData: z.any().describe('Link data from the webhook payload'),
      timestamp: z.string().describe('Event timestamp')
    })
  )
  .output(linkDataSchema)
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let webhook = await client.createWebhook({
        url: ctx.input.webhookBaseUrl,
        name: 'Slates - Link Events',
        triggers: ['link.created', 'link.updated', 'link.deleted']
      });

      return {
        registrationDetails: {
          webhookId: webhook.id,
          secret: webhook.secret
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let details = ctx.input.registrationDetails as { webhookId: string };
      await client.deleteWebhook(details.webhookId);
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as {
        id: string;
        event: string;
        createdAt: string;
        data: any;
      };

      return {
        inputs: [
          {
            eventType: body.event,
            eventId: body.id,
            linkData: body.data,
            timestamp: body.createdAt
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let data = ctx.input.linkData;

      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          linkId: data.id ?? '',
          domain: data.domain ?? '',
          slug: data.key ?? '',
          shortLink: data.shortLink ?? '',
          destinationUrl: data.url ?? '',
          externalId: data.externalId ?? null,
          trackConversion: data.trackConversion ?? false,
          archived: data.archived ?? false,
          tags: (data.tags ?? []).map((t: any) => ({
            tagId: t.id ?? '',
            name: t.name ?? '',
            color: t.color ?? ''
          })),
          createdAt: data.createdAt ?? ctx.input.timestamp,
          updatedAt: data.updatedAt ?? ctx.input.timestamp
        }
      };
    }
  })
  .build();
