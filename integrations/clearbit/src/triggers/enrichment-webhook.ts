import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let enrichmentWebhook = SlateTrigger.create(spec, {
  name: 'Enrichment Webhook',
  key: 'enrichment_webhook',
  description:
    'Receives enrichment results when asynchronous person or company lookups complete. Configure the webhook URL in your Clearbit dashboard settings.'
})
  .input(
    z.object({
      webhookId: z.string().describe('Unique identifier for this webhook delivery'),
      type: z
        .enum(['person', 'company', 'person_company'])
        .describe('Type of enrichment result'),
      body: z.any().describe('Raw enrichment payload from Clearbit')
    })
  )
  .output(
    z.object({
      enrichmentType: z
        .string()
        .describe('Type of enrichment: person, company, or person_company'),
      personId: z.string().nullable().describe('Clearbit person identifier'),
      personEmail: z.string().nullable().describe('Person email address'),
      personFullName: z.string().nullable().describe('Person full name'),
      personTitle: z.string().nullable().describe('Person job title'),
      personCompanyName: z.string().nullable().describe('Person employer name'),
      companyId: z.string().nullable().describe('Clearbit company identifier'),
      companyName: z.string().nullable().describe('Company name'),
      companyDomain: z.string().nullable().describe('Company domain'),
      companyIndustry: z.string().nullable().describe('Company industry'),
      companyEmployeesRange: z.string().nullable().describe('Employee count range')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, any>;

      // Clearbit enrichment webhooks can contain person, company, or combined data
      // The webhook type is determined by what's present in the payload
      let type: 'person' | 'company' | 'person_company' = 'company';
      if (data.person && data.company) {
        type = 'person_company';
      } else if (data.person) {
        type = 'person';
      }

      // Generate a unique ID for dedup - use the person/company ID or a combination
      let webhookId =
        data.id || data.person?.id || data.company?.id || `enrichment-${Date.now()}`;

      return {
        inputs: [
          {
            webhookId: String(webhookId),
            type,
            body: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let data = ctx.input.body;

      let person = ctx.input.type === 'person' ? data : data.person;
      let company = ctx.input.type === 'company' ? data : data.company;

      return {
        type: `enrichment.${ctx.input.type}`,
        id: ctx.input.webhookId,
        output: {
          enrichmentType: ctx.input.type,
          personId: person?.id ?? null,
          personEmail: person?.email ?? null,
          personFullName: person?.name?.fullName ?? null,
          personTitle: person?.employment?.title ?? null,
          personCompanyName: person?.employment?.name ?? null,
          companyId: company?.id ?? null,
          companyName: company?.name ?? null,
          companyDomain: company?.domain ?? null,
          companyIndustry: company?.category?.industry ?? null,
          companyEmployeesRange: company?.metrics?.employeesRange ?? null
        }
      };
    }
  })
  .build();
