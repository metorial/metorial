import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
Provide at least one of: (firstName + lastName + company), (fullName + company), a LinkedIn URL, or an email address per contact.
Supports up to 250 contacts per request. Returns a request ID for retrieving results — enrichment is asynchronous and typically takes up to 60 seconds.
Use **Get Enrichment Results** to retrieve the enriched data once processing completes.`,
  instructions: [
    'Each contact must include at minimum: (firstName + lastName + company), (fullName + company), a linkedinUrl, or an email.',
    'Enable sirenEnrichment to get French company registration data (SIREN, SIRET, NAF, VAT).',
    'Results are processed asynchronously. Use the returned requestId with the Get Enrichment Results tool.'
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
        )
    })
  )
  .output(
    z.object({
      requestId: z.string().describe('Request ID for retrieving enrichment results'),
      creditsLeft: z.number().describe('Remaining credits after this request'),
      success: z.boolean().describe('Whether the enrichment request was accepted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data = ctx.input.contacts.map(contact => {
      let mapped: Record<string, any> = {};
      if (contact.email) mapped.email = contact.email;
      if (contact.firstName) mapped.first_name = contact.firstName;
      if (contact.lastName) mapped.last_name = contact.lastName;
      if (contact.fullName) mapped.full_name = contact.fullName;
      if (contact.phone) mapped.phone = contact.phone;
      if (contact.company) mapped.company = contact.company;
      if (contact.website) mapped.website = contact.website;
      if (contact.linkedinUrl) mapped.linkedin = contact.linkedinUrl;
      if (contact.companyLinkedinUrl) mapped.company_linkedin = contact.companyLinkedinUrl;
      if (contact.jobTitle) mapped.job = contact.jobTitle;
      if (contact.siren) mapped.num_siren = contact.siren;
      if (contact.siret) mapped.siret = contact.siret;
      if (contact.country) mapped.country = contact.country;
      if (contact.customFields) mapped.custom_fields = contact.customFields;
      return mapped;
    });

    let response = await client.enrichContacts({
      data,
      siren: ctx.input.sirenEnrichment,
      language: ctx.config.language
    });

    return {
      output: {
        requestId: response.request_id,
        creditsLeft: response.credits_left,
        success: response.success
      },
      message: `Enrichment request submitted for **${ctx.input.contacts.length}** contact(s). Request ID: \`${response.request_id}\`. Credits remaining: **${response.credits_left}**.`
    };
  })
  .build();
