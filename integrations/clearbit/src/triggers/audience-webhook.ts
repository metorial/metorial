import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let audienceWebhook = SlateTrigger.create(spec, {
  name: 'Audience Webhook',
  key: 'audience_webhook',
  description:
    'Receives notifications when companies or people enter, exit, or view a page in a Clearbit audience/segment. Configure the webhook destination in your Clearbit Audiences settings.'
})
  .input(
    z.object({
      eventId: z.string().describe('Unique event identifier'),
      triggerType: z.string().describe('Trigger type: entered, exited, or page_view'),
      body: z.any().describe('Raw audience webhook payload from Clearbit')
    })
  )
  .output(
    z.object({
      triggerType: z
        .string()
        .describe('What triggered the webhook: entered, exited, or page_view'),
      segmentName: z.string().nullable().describe('Name of the audience/segment'),
      companyName: z.string().nullable().describe('Company name'),
      companyDomain: z.string().nullable().describe('Company domain'),
      companyIndustry: z.string().nullable().describe('Company industry'),
      companyEmployeesRange: z.string().nullable().describe('Employee count range'),
      personEmail: z.string().nullable().describe('Person email (if available)'),
      personFullName: z.string().nullable().describe('Person full name (if available)'),
      ip: z.string().nullable().describe('Visitor IP address (if available)'),
      pageUrl: z.string().nullable().describe('Page URL visited (if page_view trigger)')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, any>;

      let triggerType = data.type || data.trigger_type || 'unknown';
      let eventId = data.id || `audience-${Date.now()}`;

      return {
        inputs: [
          {
            eventId: String(eventId),
            triggerType: String(triggerType),
            body: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let data = ctx.input.body;
      let company = data.company || {};
      let person = data.person || {};

      return {
        type: `audience.${ctx.input.triggerType}`,
        id: ctx.input.eventId,
        output: {
          triggerType: ctx.input.triggerType,
          segmentName: data.segment?.name ?? data.destination?.name ?? null,
          companyName: company.name ?? null,
          companyDomain: company.domain ?? null,
          companyIndustry: company.category?.industry ?? null,
          companyEmployeesRange: company.metrics?.employeesRange ?? null,
          personEmail: person.email ?? null,
          personFullName: person.name?.fullName ?? null,
          ip: data.ip ?? null,
          pageUrl: data.page?.url ?? data.url ?? null
        }
      };
    }
  })
  .build();
