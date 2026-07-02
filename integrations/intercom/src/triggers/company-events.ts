import { SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { spec } from '../spec';

export let companyEvents = SlateTrigger.create(spec, {
  name: 'Company Events',
  key: 'company_events',
  description:
    'Triggers when companies are created, updated, deleted, or when contacts are attached to or detached from companies.'
})
  .input(
    z.object({
      topic: z.string().describe('Webhook topic'),
      eventId: z.string().describe('Unique event identifier'),
      company: z.any().describe('Company data from webhook payload')
    })
  )
  .output(
    z.object({
      intercomCompanyId: z.string().describe('Intercom company ID'),
      companyId: z.string().optional().describe('External company ID'),
      name: z.string().optional().describe('Company name'),
      plan: z.string().optional().describe('Company plan'),
      size: z.number().optional().describe('Company size'),
      website: z.string().optional().describe('Company website'),
      industry: z.string().optional().describe('Company industry'),
      monthlySpend: z.number().optional().describe('Monthly spend'),
      userCount: z.number().optional().describe('Number of users'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last update timestamp'),
      customAttributes: z.record(z.string(), z.any()).optional().describe('Custom attributes')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;
      let topic = data.topic || '';
      let companyTopics = [
        'company.created',
        'company.updated',
        'company.deleted',
        'company.contact.attached',
        'company.contact.detached'
      ];

      if (!companyTopics.includes(topic)) {
        return { inputs: [] };
      }

      let eventId =
        data.id || `${topic}-${data.data?.item?.id || ''}-${data.created_at || Date.now()}`;

      return {
        inputs: [
          {
            topic,
            eventId,
            company: data.data?.item
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let company = ctx.input.company || {};

      return {
        type: ctx.input.topic,
        id: ctx.input.eventId,
        output: {
          intercomCompanyId: company.id || '',
          companyId: company.company_id,
          name: company.name,
          plan: company.plan?.name,
          size: company.size,
          website: company.website,
          industry: company.industry,
          monthlySpend: company.monthly_spend,
          userCount: company.user_count,
          createdAt: company.created_at ? String(company.created_at) : undefined,
          updatedAt: company.updated_at ? String(company.updated_at) : undefined,
          customAttributes: company.custom_attributes
        }
      };
    }
  })
  .build();
