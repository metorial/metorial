import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { companySchema } from '../lib/types';
import { spec } from '../spec';

export let companyEnriched = SlateTrigger.create(spec, {
  name: 'Company Enriched',
  key: 'company_enriched',
  description:
    'Triggers when an asynchronous company enrichment lookup completes. Receives webhook notifications from BigPicture when company data becomes available after a 202 (processing) response.'
})
  .input(
    z.object({
      webhookEventId: z
        .string()
        .nullable()
        .optional()
        .describe('Correlation ID from the original webhookId parameter'),
      status: z.number().describe('Result status: 200 (found) or 404 (not found)'),
      resourceType: z.string().describe('Resource type (e.g. "company")'),
      company: companySchema
        .nullable()
        .optional()
        .describe('The enriched company profile, present when status is 200')
    })
  )
  .output(
    z.object({
      webhookEventId: z
        .string()
        .nullable()
        .optional()
        .describe('Correlation ID from the original request'),
      status: z.number().describe('Result status: 200 (found) or 404 (not found)'),
      found: z.boolean().describe('Whether the company was found'),
      companyName: z.string().nullable().optional().describe('Company name'),
      domain: z.string().nullable().optional().describe('Company domain'),
      company: companySchema.nullable().optional().describe('Full company profile data')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let company = data.body ?? null;

      // Normalize 'id' to 'companyId' in company data
      if (company && company.id !== undefined) {
        company.companyId = company.id;
        company.id = undefined;
      }

      return {
        inputs: [
          {
            webhookEventId: data.id ?? null,
            status: data.status,
            resourceType: data.type ?? 'company',
            company
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let found = ctx.input.status === 200;
      let domain = ctx.input.company?.domain ?? 'unknown';
      let eventId = ctx.input.webhookEventId ?? `company-${domain}-${Date.now()}`;

      return {
        type: found ? 'company.enriched' : 'company.not_found',
        id: eventId,
        output: {
          webhookEventId: ctx.input.webhookEventId ?? null,
          status: ctx.input.status,
          found,
          companyName: ctx.input.company?.name ?? null,
          domain: ctx.input.company?.domain ?? null,
          company: found ? (ctx.input.company ?? null) : null
        }
      };
    }
  })
  .build();
