import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let emailResultSchema = z.object({
  email: z.string().describe('The email address'),
  qualification: z
    .string()
    .describe('Email qualification (e.g. "nominative@pro", "catch_all@pro")')
});

let enrichedContactSchema = z.object({
  civility: z.string().optional().describe('Civility (e.g. Mr, Mrs)'),
  firstName: z.string().optional().describe('First name'),
  lastName: z.string().optional().describe('Last name'),
  fullName: z.string().optional().describe('Full name'),
  emails: z.array(emailResultSchema).optional().describe('Qualified email addresses'),
  inputEmail: z
    .string()
    .optional()
    .describe(
      'Original email when the provider returns unchanged input instead of qualified emails'
    ),
  phone: z.string().optional().describe('Phone number'),
  mobilePhone: z.string().optional().describe('Mobile phone number'),
  company: z.string().optional().describe('Company name'),
  website: z.string().optional().describe('Company website'),
  linkedinUrl: z.string().optional().describe('Personal LinkedIn URL'),
  companyLinkedinUrl: z.string().optional().describe('Company LinkedIn URL'),
  siren: z.string().optional().describe('SIREN number'),
  siret: z.string().optional().describe('SIRET number'),
  siretAddress: z.string().optional().describe('SIRET registered address'),
  siretZip: z.string().optional().describe('SIRET zip code'),
  siretCity: z.string().optional().describe('SIRET city'),
  vat: z.string().optional().describe('VAT number'),
  nbEmployees: z.string().optional().describe('Number of employees'),
  employeeCount: z
    .string()
    .optional()
    .describe('Employee count when available for the account plan'),
  industry: z
    .string()
    .optional()
    .describe('Company industry when available for the account plan'),
  errors: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('Provider validation errors for this contact'),
  warnings: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('Provider validation warnings for this contact'),
  naf5Code: z.string().optional().describe('NAF code'),
  naf5Description: z.string().optional().describe('NAF code description'),
  country: z.string().optional().describe('Country'),
  companyTurnover: z.string().optional().describe('Company turnover'),
  companyResults: z.string().optional().describe('Company results'),
  jobTitle: z.string().optional().describe('Job title'),
  jobLevel: z.string().optional().describe('Job level'),
  jobFunction: z.string().optional().describe('Job function'),
  customFields: z
    .record(z.string(), z.string())
    .optional()
    .describe('Custom fields from the original request')
});

export let getEnrichmentResults = SlateTool.create(spec, {
  name: 'Get Enrichment Results',
  key: 'get_enrichment_results',
  description: `Retrieve the results of a previously submitted enrichment request using its request ID.
Enrichment is asynchronous — if processing is not yet complete, the response will indicate the request is not ready.
Use **forceResults** to retrieve partial results before all contacts are fully processed.`,
  instructions: [
    'Use the requestId returned by the Enrich Contacts tool.',
    'If results are not ready, wait ~30 seconds and try again.',
    'Enable forceResults to get partial results. Unprocessed contacts may contain unchanged input. Forced retrieval can affect credit refunds.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      requestId: z.string().describe('The request ID returned by the Enrich Contacts tool'),
      forceResults: z
        .boolean()
        .optional()
        .describe('Set to true to retrieve partial results before all contacts are processed')
    })
  )
  .output(
    z.object({
      ready: z
        .boolean()
        .describe(
          'Whether a successful result was retrieved without forcing potentially partial results'
        ),
      mayBePartial: z
        .boolean()
        .optional()
        .describe('Whether forceResults was used, so some contacts may still be unprocessed'),
      creditsLeft: z
        .number()
        .optional()
        .describe('Remaining enrichment credits when returned by the provider'),
      reason: z.string().optional().describe('Reason if results are not ready yet'),
      contacts: z
        .array(enrichedContactSchema)
        .optional()
        .describe('Array of enriched contact data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.getEnrichmentResults(
      ctx.input.requestId,
      ctx.input.forceResults
    );

    if (!response.success && !response.data?.length) {
      return {
        output: {
          ready: false,
          reason: response.reason,
          mayBePartial: Boolean(ctx.input.forceResults),
          creditsLeft: response.credits_left
        },
        message: `Results not ready yet: ${response.reason ?? 'Try again in 30 seconds.'}`
      };
    }

    let contacts = (response.data || []).map(c => ({
      civility: c.civility,
      firstName: c.first_name,
      lastName: c.last_name,
      fullName: c.full_name,
      emails: Array.isArray(c.email) ? c.email : undefined,
      inputEmail: typeof c.email === 'string' ? c.email : undefined,
      phone: c.phone,
      mobilePhone: c.mobile_phone,
      company: c.company,
      website: c.website,
      linkedinUrl: c.linkedin,
      companyLinkedinUrl: c.company_linkedin,
      siren: c.siren ?? c.num_siren,
      siret: c.siret,
      siretAddress: c.siret_address,
      siretZip: c.siret_zip,
      siretCity: c.siret_city,
      vat: c.vat,
      nbEmployees: c.nb_employees,
      employeeCount: c.employee_count,
      industry: c.industry,
      errors: c.errors,
      warnings: c.warnings,
      naf5Code: c.naf5_code,
      naf5Description: c.naf5_des,
      country: c.country,
      companyTurnover: c.company_turnover,
      companyResults: c.company_results,
      jobTitle: c.job,
      jobLevel: c.job_level,
      jobFunction: c.job_function,
      customFields: c.custom_fields
    }));

    let emailCount = contacts.reduce((sum, c) => sum + (c.emails?.length || 0), 0);

    return {
      output: {
        ready: response.success && !ctx.input.forceResults,
        reason: response.reason,
        mayBePartial: Boolean(ctx.input.forceResults),
        creditsLeft: response.credits_left,
        contacts
      },
      message: `${ctx.input.forceResults ? 'Retrieved potentially partial results' : 'Enrichment complete'} for **${contacts.length}** contact(s). Found **${emailCount}** email address(es).`
    };
  })
  .build();
