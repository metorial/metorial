import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let contactSchema = z.object({
  firstName: z.string().describe('First name of the contact'),
  lastName: z.string().describe('Last name of the contact'),
  company: z
    .string()
    .optional()
    .describe('Company name. Required if companyDomain is not provided'),
  companyDomain: z
    .string()
    .optional()
    .describe('Company domain (e.g. "tesla.com"). Required if company is not provided'),
  linkedinUrl: z
    .string()
    .optional()
    .describe('Public LinkedIn profile URL. Recommended for phone number enrichment'),
  customFields: z
    .record(z.string(), z.string())
    .optional()
    .describe(
      'Custom key-value pairs for tracking (e.g. CRM IDs). Returned with the enrichment results'
    )
});

export let enrichContacts = SlateTool.create(spec, {
  name: 'Enrich Contacts',
  key: 'enrich_contacts',
  description: `Submit one or more contacts for asynchronous enrichment to find their work email addresses and/or mobile phone numbers. Uses waterfall enrichment across 20+ data sources with AI-driven provider ordering.

Returns a request ID to retrieve results later using the **Get Enrichment Results** tool. Optionally specify a webhook URL to receive results automatically when enrichment completes.`,

  instructions: [
    'Either company or companyDomain must be provided for each contact.',
    'Include linkedinUrl when enriching phone numbers for better accuracy.',
    'Maximum 100 contacts per request.',
    'Use the returned requestId with the Get Enrichment Results tool to retrieve enriched data.'
  ],

  constraints: ['Maximum 100 contacts per batch.', 'Rate limited to 60 requests per minute.'],

  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      contacts: z
        .array(contactSchema)
        .min(1)
        .max(100)
        .describe('Array of contacts to enrich (1-100)'),
      enrichEmailAddress: z.boolean().describe('Whether to enrich work email addresses'),
      enrichPhoneNumber: z.boolean().describe('Whether to enrich mobile phone numbers'),
      webhookUrl: z
        .string()
        .optional()
        .describe('URL to receive results via webhook when enrichment completes'),
      processFlow: z
        .string()
        .optional()
        .describe('Process flow ID for subscribed add-on users')
    })
  )
  .output(
    z.object({
      success: z
        .boolean()
        .describe('Whether the enrichment request was successfully submitted'),
      requestId: z.string().describe('Unique identifier to retrieve enrichment results'),
      message: z.string().describe('Status message from the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.submitEnrichment({
      contacts: ctx.input.contacts,
      enrichEmailAddress: ctx.input.enrichEmailAddress,
      enrichPhoneNumber: ctx.input.enrichPhoneNumber,
      webhook: ctx.input.webhookUrl,
      processFlow: ctx.input.processFlow
    });

    let enrichTypes: any[] = [];
    if (ctx.input.enrichEmailAddress) enrichTypes.push('emails');
    if (ctx.input.enrichPhoneNumber) enrichTypes.push('phone numbers');

    return {
      output: {
        success: result.success,
        requestId: result.requestId,
        message: result.message
      },
      message: `Submitted **${ctx.input.contacts.length}** contact(s) for ${enrichTypes.join(' and ')} enrichment. Request ID: \`${result.requestId}\`. Use this ID to retrieve results.`
    };
  })
  .build();
