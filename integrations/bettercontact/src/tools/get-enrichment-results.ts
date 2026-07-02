import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let enrichedContactSchema = z.object({
  enriched: z.boolean().describe('Whether enrichment found data for this contact'),
  emailProvider: z.string().nullable().describe('Data provider that found the email'),
  phoneProvider: z.string().nullable().describe('Data provider that found the phone number'),
  contactFirstName: z.string().describe('First name of the contact'),
  contactLastName: z.string().describe('Last name of the contact'),
  contactEmailAddress: z.string().nullable().describe('Enriched work email address'),
  contactEmailAddressStatus: z
    .string()
    .nullable()
    .describe(
      'Email deliverability status (deliverable, catch_all_safe, catch_all_not_safe, undeliverable)'
    ),
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

export let getEnrichmentResults = SlateTool.create(spec, {
  name: 'Get Enrichment Results',
  key: 'get_enrichment_results',
  description: `Retrieve the results of a previously submitted contact enrichment request. Returns the enrichment status, a summary of results, credit usage, and the enriched contact data including emails, phone numbers, and deliverability statuses.

Poll this endpoint until the status is **"terminated"** to get complete results.`,

  instructions: [
    'Use the requestId returned by the Enrich Contacts tool.',
    'The status field will be "terminated" when enrichment is complete.',
    'You are not charged credits for invalid or not-found data.'
  ],

  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      requestId: z.string().describe('The request ID returned from the Enrich Contacts tool')
    })
  )
  .output(
    z.object({
      requestId: z.string().describe('The enrichment request ID'),
      status: z.string().describe('Processing status (e.g. "terminated" when complete)'),
      creditsConsumed: z.number().describe('Number of credits consumed by this request'),
      creditsLeft: z.number().describe('Remaining credit balance after this request'),
      summary: summarySchema.describe('Aggregate statistics of enrichment results'),
      contacts: z.array(enrichedContactSchema).describe('Array of enriched contact records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getEnrichmentResults(ctx.input.requestId);

    let statusText = result.status === 'terminated' ? 'complete' : result.status;

    return {
      output: result,
      message: `Enrichment **${statusText}**. ${result.summary.total} contacts processed: **${result.summary.valid}** valid, ${result.summary.catchAll} catch-all, ${result.summary.undeliverable} undeliverable, ${result.summary.notFound} not found. Credits consumed: ${result.creditsConsumed}.`
    };
  })
  .build();
