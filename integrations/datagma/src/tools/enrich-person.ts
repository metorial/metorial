import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let enrichPerson = SlateTool.create(spec, {
  name: 'Enrich Person',
  key: 'enrich_person',
  description: `Enrich a person's profile with 75+ data points including name, job title, role, seniority, education, past experiences, social profiles, and associated company information.
Accepts a **LinkedIn URL**, **email address**, or **full name + company name** as input. LinkedIn URL provides ~100% match rate, full name + company ~90%, and email ~60%.
Optionally retrieve expanded person details (education, experience history), company premium data, financial/Crunchbase data, phone numbers, and website traffic analytics.`,
  instructions: [
    'Provide at least one of: linkedinUrl, email, or fullName (with companyName) to identify the person.',
    'Set personFull to true for expanded education and experience details.',
    'Set companyPremium to true for detailed LinkedIn company data.',
    'Set companyFull to true for financial and Crunchbase company data.',
    'Set phoneFull to true to also search for mobile phone numbers (costs 30 credits).'
  ],
  constraints: [
    'Rate limited to 10 requests per second.',
    'Each enrichment costs 1 credit. Phone search adds 30 credits.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      linkedinUrl: z
        .string()
        .optional()
        .describe('LinkedIn profile URL of the person to enrich'),
      email: z
        .string()
        .optional()
        .describe('Professional email address of the person to enrich'),
      fullName: z
        .string()
        .optional()
        .describe('Full name of the person (use with companyName)'),
      companyName: z
        .string()
        .optional()
        .describe('Company name to help identify the person when using fullName'),
      companyKeyword: z
        .string()
        .optional()
        .describe('Keyword to disambiguate when multiple companies share the same name'),
      countryCode: z
        .string()
        .optional()
        .describe('Country code to narrow the search scope (e.g. "US", "FR")'),
      personFull: z
        .boolean()
        .optional()
        .default(false)
        .describe(
          'Include expanded person profile with education, experience history, certifications'
        ),
      companyPremium: z
        .boolean()
        .optional()
        .default(false)
        .describe(
          'Include detailed LinkedIn company data (employees, specialties, locations)'
        ),
      companyFull: z
        .boolean()
        .optional()
        .default(false)
        .describe('Include financial and Crunchbase company data (funding, revenue, traffic)'),
      companyFrench: z
        .boolean()
        .optional()
        .default(false)
        .describe('Include French SIREN directory data for French companies'),
      phoneFull: z
        .boolean()
        .optional()
        .default(false)
        .describe('Also search for mobile phone numbers (costs 30 additional credits)'),
      deepTraffic: z
        .boolean()
        .optional()
        .default(false)
        .describe('Include website traffic analytics by country and source')
    })
  )
  .output(
    z.object({
      person: z
        .any()
        .optional()
        .describe(
          'Person profile data including name, job title, role, seniority, location, social profiles'
        ),
      company: z
        .any()
        .optional()
        .describe('Company data including name, industry, size, locations'),
      phone: z.array(z.any()).optional().describe('Phone numbers found for the person'),
      email: z.string().optional().describe('Email address with verification status'),
      emailV2: z.any().optional().describe('Enhanced email validation data'),
      creditBurn: z.number().optional().describe('Number of credits consumed by this request')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let data = ctx.input.linkedinUrl || ctx.input.email || ctx.input.companyName;

    let result = await client.enrichFull({
      data,
      firstName: ctx.input.fullName ? undefined : undefined,
      fullName: ctx.input.fullName,
      companyKeyword: ctx.input.companyKeyword,
      countryCode: ctx.input.countryCode,
      companyPremium: ctx.input.companyPremium,
      companyFull: ctx.input.companyFull,
      companyFrench: ctx.input.companyFrench,
      personFull: ctx.input.personFull,
      phoneFull: ctx.input.phoneFull,
      deepTraffic: ctx.input.deepTraffic
    });

    let personName =
      result?.person?.name || result?.person?.fullName || ctx.input.fullName || 'Unknown';
    let companyName = result?.company?.name || ctx.input.companyName || '';

    return {
      output: {
        person: result?.person,
        company: result?.company,
        phone: result?.phone,
        email: result?.email,
        emailV2: result?.emailV2,
        creditBurn: result?.creditBurn
      },
      message: `Enriched person **${personName}**${companyName ? ` at **${companyName}**` : ''}. Credits used: ${result?.creditBurn ?? 'N/A'}.`
    };
  })
  .build();
