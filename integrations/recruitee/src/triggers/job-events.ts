import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { RecruiteeClient } from '../lib/client';
import { spec } from '../spec';

export let jobEvents = SlateTrigger.create(spec, {
  name: 'Job Events',
  key: 'job_events',
  description:
    'Fires when a job offer is published, unpublished, or updated (including status changes and tag changes).'
})
  .input(
    z.object({
      eventType: z.string().describe('Event type identifier'),
      eventSubtype: z
        .string()
        .nullable()
        .describe('Event subtype (offer_changed, status_changed, tags_changed)'),
      webhookEventId: z.number().describe('Unique webhook event ID'),
      offer: z.any().describe('Raw offer data from webhook'),
      companyId: z.number().nullable().describe('Company ID')
    })
  )
  .output(
    z.object({
      offerId: z.number().describe('Job offer ID'),
      title: z.string().describe('Job title'),
      kind: z.string().describe('Type: job or talent_pool'),
      status: z.string().nullable().describe('Current status'),
      slug: z.string().nullable().describe('URL slug'),
      department: z.string().nullable().describe('Department name'),
      locations: z
        .array(
          z.object({
            locationId: z.number().describe('Location ID'),
            fullAddress: z.string().describe('Full address')
          })
        )
        .describe('Office locations'),
      tags: z.array(z.string()).describe('Tags'),
      eventSubtype: z
        .string()
        .nullable()
        .describe('Specific change type: offer_changed, status_changed, tags_changed'),
      createdAt: z.string().describe('Offer creation timestamp'),
      updatedAt: z.string().describe('Offer last update timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new RecruiteeClient({
        token: ctx.auth.token,
        companyId: ctx.config.companyId
      });

      let result = await client.createWebhook(ctx.input.webhookBaseUrl, [
        'offer_published',
        'offer_unpublished',
        'offer_updated'
      ]);

      return {
        registrationDetails: {
          webhookId: result.webhook?.id || result.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new RecruiteeClient({
        token: ctx.auth.token,
        companyId: ctx.config.companyId
      });

      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      return {
        inputs: [
          {
            eventType: data.event_type,
            eventSubtype: data.event_subtype || null,
            webhookEventId: data.id,
            offer: data.payload?.offer || null,
            companyId: data.payload?.company?.id || null
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let input = ctx.input;
      let offerData = input.offer || {};

      let type = 'job.unknown';
      if (input.eventType === 'offer_published') {
        type = 'job.published';
      } else if (input.eventType === 'offer_unpublished') {
        type = 'job.unpublished';
      } else if (input.eventType === 'offer_updated') {
        if (input.eventSubtype === 'status_changed') {
          type = 'job.status_changed';
        } else if (input.eventSubtype === 'tags_changed') {
          type = 'job.tags_changed';
        } else {
          type = 'job.updated';
        }
      }

      let locations = (offerData.locations || []).map((l: any) => ({
        locationId: l.id,
        fullAddress: l.full_address || ''
      }));

      let tags = (offerData.tags || []).map((t: any) =>
        typeof t === 'string' ? t : t.name || String(t)
      );

      return {
        type,
        id: String(input.webhookEventId),
        output: {
          offerId: offerData.id,
          title: offerData.title || '',
          kind: offerData.kind || 'job',
          status: offerData.status || null,
          slug: offerData.slug || null,
          department: offerData.department?.name || null,
          locations,
          tags,
          eventSubtype: input.eventSubtype,
          createdAt: offerData.created_at || '',
          updatedAt: offerData.updated_at || ''
        }
      };
    }
  })
  .build();
