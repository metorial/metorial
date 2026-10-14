import { createApiServiceError, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { Client, type ContactInput } from '../lib/client';
import { spec } from '../spec';

let contactInputSchema = z.object({
  email: z.string().optional().describe('Email address to verify and qualify'),
  firstName: z.string().optional().describe('First name of the contact'),
  lastName: z.string().optional().describe('Last name of the contact'),
  fullName: z
    .string()
    .optional()
    .describe('Full name of the contact (alternative to firstName + lastName)'),
  phone: z.string().optional().describe('Phone number of the contact'),
  company: z.string().optional().describe('Company name'),
  website: z.string().optional().describe('Company website URL'),
  linkedinUrl: z.string().optional().describe('LinkedIn profile URL of the contact'),
  companyLinkedinUrl: z.string().optional().describe('LinkedIn URL of the company'),
  jobTitle: z.string().optional().describe('Job title of the contact'),
  siren: z.string().optional().describe('French SIREN number'),
  siret: z.string().optional().describe('French SIRET number'),
  country: z.string().optional().describe('Two-letter country code (e.g. "FR", "US")'),
  customFields: z
    .record(z.string(), z.string())
    .optional()
    .describe('Custom key-value pairs preserved in the response')
});

export let enrichContacts = SlateTool.create(spec, {
  name: 'Enrich Contacts',
  key: 'enrich_contacts',
  description: `Submit B2B contacts for enrichment to find verified professional email addresses and enrich contact and company data.
Provide an email address, or contact identifiers with company context such as company, website, companyLinkedinUrl, siren, or siret.
Supports up to 250 contacts per request. Returns a request ID for retrieving results — enrichment is asynchronous and typically takes up to 60 seconds.
Use **Get Enrichment Results** to retrieve the enriched data once processing completes.`,
  instructions: [
    'For contact enrichment, provide an email or a name or LinkedIn URL with company context. Organization-only inputs may enrich a French legal representative.',
    'Enable sirenEnrichment to get French company registration data (SIREN, SIRET, NAF, VAT).',
    'Results are processed asynchronously. Use the returned requestId with the Get Enrichment Results tool.',
    'customCallbackUrl overrides the default webhook URL for this request.'
  ],
  constraints: [
    'Maximum 250 contacts per request.',
    'Each contact must be under 15 KB.',
    'Rate limit: 60 requests per second.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      contacts: z
        .array(contactInputSchema)
        .min(1)
        .max(250)
        .describe('Array of contacts to enrich (1 to 250)'),
      sirenEnrichment: z
        .boolean()
        .optional()
        .describe(
          'Set to true to receive French company registration data (SIREN, SIRET, NAF, VAT)'
        ),
      language: z
        .enum(['en', 'fr'])
        .optional()
        .describe('Override the connection language for this request'),
      customCallbackUrl: z
        .string()
        .optional()
        .describe(
          'HTTP or HTTPS URL for receiving results for this request; overrides the default callback URL'
        )
    })
  )
  .output(
    z.object({
      requestId: z.string().describe('Request ID for retrieving enrichment results'),
      creditsLeft: z.number().describe('Remaining credits after this request'),
      success: z.boolean().describe('Whether the enrichment request was accepted'),
      diagnostics: z
        .array(
          z.object({
            index: z
              .number()
              .optional()
              .describe('Zero-based contact index in the submitted batch'),
            errors: z.record(z.string(), z.unknown()).optional(),
            warnings: z.record(z.string(), z.unknown()).optional()
          })
        )
        .optional()
        .describe('Provider validation errors and warnings for individual contacts')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (
      ctx.input.customCallbackUrl !== undefined &&
      (!URL.canParse(ctx.input.customCallbackUrl) ||
        !['http:', 'https:'].includes(new URL(ctx.input.customCallbackUrl).protocol))
    ) {
      throw createApiServiceError('customCallbackUrl must be an HTTP or HTTPS URL.');
    }

    let data: ContactInput[] = ctx.input.contacts.map(contact =>
      pickDefined({
        email: contact.email,
        first_name: contact.firstName,
        last_name: contact.lastName,
        full_name: contact.fullName,
        phone: contact.phone,
        company: contact.company,
        website: contact.website,
        linkedin: contact.linkedinUrl,
        company_linkedin: contact.companyLinkedinUrl,
        job: contact.jobTitle,
        num_siren: contact.siren,
        siret: contact.siret,
        country: contact.country,
        custom_fields: contact.customFields
      })
    );

    let response = await client.enrichContacts({
      data,
      siren: ctx.input.sirenEnrichment,
      language: ctx.input.language ?? ctx.config.language,
      custom_callback_url: ctx.input.customCallbackUrl
    });

    return {
      output: {
        requestId: response.request_id,
        creditsLeft: response.credits_left,
        success: response.success,
        diagnostics: response.data?.map(contact => ({
          index: contact.index,
          errors: contact.errors,
          warnings: contact.warnings
        }))
      },
      message: `Enrichment request submitted for **${ctx.input.contacts.length}** contact(s). Request ID: \`${response.request_id}\`. Credits remaining: **${response.credits_left}**.`
    };
  })
  .build();
