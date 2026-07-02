import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let deltaValueSchema = z.object({
  old: z.any().optional().describe('Previous value'),
  new: z.any().optional().describe('New value')
});

export let brandUpdated = SlateTrigger.create(spec, {
  name: 'Brand Event',
  key: 'brand_event',
  description:
    'Triggered when a brand is updated, claimed, verified, deleted, or has company data changes. Requires Enterprise plan and webhook configuration via the GraphQL API.'
})
  .input(
    z.object({
      eventType: z
        .enum([
          'brand.updated',
          'brand.company.updated',
          'brand.claimed',
          'brand.verified',
          'brand.deleted'
        ])
        .describe('Type of brand event'),
      eventUrn: z.string().describe('Unique event URN for deduplication'),
      timestamp: z.string().describe('ISO 8601 timestamp of the event'),
      brandId: z.string().describe('Brand ID from the event payload'),
      brandDomain: z.string().optional().describe('Brand domain if available'),
      delta: z
        .record(z.string(), deltaValueSchema)
        .optional()
        .describe('Changed fields with old/new values (for update events)'),
      rawPayload: z.any().describe('Full raw event payload')
    })
  )
  .output(
    z.object({
      brandId: z.string().describe('ID of the affected brand'),
      brandDomain: z.string().optional().describe('Domain of the affected brand'),
      eventType: z.string().describe('Type of event that occurred'),
      timestamp: z.string().describe('When the event occurred (ISO 8601)'),
      delta: z
        .record(
          z.string(),
          z.object({
            old: z.any().optional().describe('Previous value'),
            new: z.any().optional().describe('New value')
          })
        )
        .optional()
        .describe('Changed fields with previous and new values')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      let eventType = body.type || 'brand.updated';
      let eventUrn = body.urn || `${eventType}-${Date.now()}`;
      let timestamp = body.timestamp || new Date().toISOString();
      let brandData = body.data?.object || {};
      let delta = body.data?.delta;

      return {
        inputs: [
          {
            eventType,
            eventUrn,
            timestamp,
            brandId: brandData.id || brandData.brandId || '',
            brandDomain: brandData.domain,
            delta,
            rawPayload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: ctx.input.eventType,
        id: ctx.input.eventUrn,
        output: {
          brandId: ctx.input.brandId,
          brandDomain: ctx.input.brandDomain,
          eventType: ctx.input.eventType,
          timestamp: ctx.input.timestamp,
          delta: ctx.input.delta
        }
      };
    }
  })
  .build();
