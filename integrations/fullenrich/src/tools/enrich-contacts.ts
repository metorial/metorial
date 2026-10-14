import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let contactSchema = z.object({
  firstname: z.string().optional().describe('First name of the contact'),
  lastname: z.string().optional().describe('Last name of the contact'),
  domain: z.string().optional().describe('Company domain (e.g. "google.com")'),
  companyName: z.string().optional().describe('Company name, used if domain is not provided'),
  linkedinUrl: z
    .string()
    .optional()
    .describe('LinkedIn profile URL, increases probability of finding results'),
  enrichFields: z
    .array(z.enum(['contact.emails', 'contact.phones']))
    .optional()
    .describe('Which fields to enrich. Defaults to both emails and phones if not specified.'),
  custom: z
    .record(z.string(), z.string())
    .optional()
    .describe(
      'Custom key-value pairs for tracking (max 10 keys, 100 chars per value). Returned in results for correlation.'
    )
});

export let enrichContacts = SlateTool.create(spec, {
  name: 'Enrich Contacts',
  key: 'enrich_contacts',
  description: `Start an asynchronous enrichment to find verified work emails, personal emails, and mobile phone numbers for business contacts. Submit up to 100 contacts per request. Each contact requires either a LinkedIn URL or a first name, last name, and company domain or company name. Providing all known identifiers improves matching.

Returns an enrichment ID to track the batch. Use **Get Enrichment Result** to retrieve results, or provide a webhook URL for automatic delivery.

Credits are only consumed when contact data is found (1 credit per email, 3 per personal email, 10 per phone).`,
  instructions: [
    'Each contact needs linkedinUrl, or firstname + lastname + domain or companyName.',
    'Providing a linkedinUrl significantly increases the chance of finding results.',
    'Use the enrichFields parameter to control whether to search for emails, phones, or both.'
  ],
  constraints: [
    'Maximum 100 contacts per request.',
    'Rate limit: 60 requests per minute.',
    'Custom field values must be strings, max 10 keys, max 100 chars per value.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z
        .string()
        .describe('A readable name for this enrichment batch (visible in dashboard)'),
      contacts: z.array(contactSchema).min(1).max(100).describe('Contacts to enrich'),
      webhookUrl: z
        .string()
        .optional()
        .describe('URL to receive POST when enrichment completes'),
      contactFinishedWebhookUrl: z
        .string()
        .optional()
        .describe(
          'URL to receive POST for each individual contact as it completes (real-time)'
        )
    })
  )
  .output(
    z.object({
      enrichmentId: z.string().describe('Unique ID to track this enrichment batch')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    for (let [index, contact] of ctx.input.contacts.entries()) {
      if (
        !contact.linkedinUrl?.trim() &&
        !(
          contact.firstname?.trim() &&
          contact.lastname?.trim() &&
          (contact.domain?.trim() || contact.companyName?.trim())
        )
      ) {
        throw createApiServiceError(
          `Contact ${index + 1} needs linkedinUrl, or firstname, lastname, and domain or companyName.`
        );
      }
      if (contact.enrichFields?.length === 0) {
        throw createApiServiceError(
          `Contact ${index + 1} must request at least one enrichFields value.`
        );
      }
      if (
        contact.custom &&
        (Object.keys(contact.custom).length > 10 ||
          Object.values(contact.custom).some(value => value.length > 100))
      ) {
        throw createApiServiceError(
          `Contact ${index + 1} custom fields allow at most 10 keys and 100 characters per value.`
        );
      }
    }

    let datas = ctx.input.contacts.map(contact => ({
      firstname: contact.firstname,
      lastname: contact.lastname,
      domain: contact.domain,
      company_name: contact.companyName,
      linkedin_url: contact.linkedinUrl,
      enrich_fields: contact.enrichFields ?? ['contact.emails', 'contact.phones'],
      custom: contact.custom
    }));

    let webhookEvents: { contact_finished?: string } | undefined;
    if (ctx.input.contactFinishedWebhookUrl) {
      webhookEvents = { contact_finished: ctx.input.contactFinishedWebhookUrl };
    }

    let result = await client.startEnrichment({
      name: ctx.input.name,
      webhook_url: ctx.input.webhookUrl,
      webhook_events: webhookEvents,
      datas
    });

    return {
      output: {
        enrichmentId: result.enrichmentId
      },
      message: `Enrichment batch **"${ctx.input.name}"** started with ${ctx.input.contacts.length} contact(s). Enrichment ID: \`${result.enrichmentId}\``
    };
  })
  .build();
