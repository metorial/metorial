import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { mapEnrichedContact } from '../lib/client';
import { spec } from '../spec';

let enrichedContactSchema = z.object({
  enriched: z.boolean().describe('Whether enrichment found data for this contact'),
  emailProvider: z.string().nullable().describe('Data provider that found the email'),
  phoneProvider: z.string().nullable().describe('Data provider that found the phone number'),
  contactFirstName: z.string().describe('First name of the contact'),
  contactLastName: z.string().describe('Last name of the contact'),
  contactEmailAddress: z.string().nullable().describe('Enriched work email address'),
  contactEmailAddressStatus: z.string().nullable().describe('Email deliverability status'),
  contactPhoneNumber: z.string().nullable().describe('Enriched mobile phone number'),
  contactGender: z.string().nullable().describe('Detected gender of the contact'),
  contactJobTitle: z.string().nullable().describe('Job title of the contact'),
  customFields: z
    .record(z.string(), z.string())
    .nullable()
    .describe('Custom fields passed during enrichment submission')
});

let summarySchema = z.object({
  total: z.number().describe('Total number of contacts processed'),
  valid: z.number().describe('Number of valid results found'),
  catchAll: z.number().describe('Number of catch-all email results'),
  catchAllSafe: z.number().describe('Number of safe catch-all email results'),
  catchAllNotSafe: z.number().describe('Number of unsafe catch-all email results'),
  undeliverable: z.number().describe('Number of undeliverable results'),
  notFound: z.number().describe('Number of contacts where no data was found')
});

export let enrichmentCompleted = SlateTrigger.create(spec, {
  name: 'Enrichment Completed',
  key: 'enrichment_completed',
  description:
    'Triggers when a contact enrichment request finishes processing and results are pushed to the webhook URL. Configure the webhook URL when submitting enrichment requests via the Enrich Contacts tool.',
  instructions: [
    'Use the provided webhook URL as the webhookUrl parameter when calling the Enrich Contacts tool.'
  ]
})
  .input(
    z.object({
      requestId: z.string().describe('The enrichment request ID'),
      status: z.string().describe('Processing status'),
      creditsConsumed: z.number().describe('Credits consumed by this request'),
      creditsLeft: z.number().describe('Remaining credit balance'),
      summary: summarySchema.describe('Aggregate statistics of enrichment results'),
      contacts: z.array(enrichedContactSchema).describe('Array of enriched contact records')
    })
  )
  .output(
    z.object({
      requestId: z.string().describe('The enrichment request ID'),
      status: z.string().describe('Processing status'),
      creditsConsumed: z.number().describe('Credits consumed by this request'),
      creditsLeft: z.number().describe('Remaining credit balance'),
      summary: summarySchema.describe('Aggregate statistics of enrichment results'),
      contacts: z.array(enrichedContactSchema).describe('Array of enriched contact records')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, any>;

      let contacts = ((data.data ?? []) as Record<string, unknown>[]).map(mapEnrichedContact);

      return {
        inputs: [
          {
            requestId: data.id ?? '',
            status: data.status ?? 'terminated',
            creditsConsumed: data.credits_consumed ?? 0,
            creditsLeft: data.credits_left ?? 0,
            summary: {
              total: data.summary?.total ?? 0,
              valid: data.summary?.valid ?? 0,
              catchAll: data.summary?.catch_all ?? 0,
              catchAllSafe: data.summary?.catch_all_safe ?? 0,
              catchAllNotSafe: data.summary?.catch_all_not_safe ?? 0,
              undeliverable: data.summary?.undeliverable ?? 0,
              notFound: data.summary?.not_found ?? 0
            },
            contacts
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'enrichment.completed',
        id: ctx.input.requestId,
        output: {
          requestId: ctx.input.requestId,
          status: ctx.input.status,
          creditsConsumed: ctx.input.creditsConsumed,
          creditsLeft: ctx.input.creditsLeft,
          summary: ctx.input.summary,
          contacts: ctx.input.contacts
        }
      };
    }
  })
  .build();
