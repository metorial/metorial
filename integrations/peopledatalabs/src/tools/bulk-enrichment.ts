import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client, record } from '../lib/client';
import { companyParams, personParams } from '../lib/params';
import { spec } from '../spec';
import {
  companyEnrichmentInputSchema,
  companyOutputSchema,
  mapCompanyData
} from './enrich-company';
import {
  mapPersonData,
  personEnrichmentInputSchema,
  personOutputSchema
} from './enrich-person';

const countResponse = (results: Record<string, any>[], expected: number) => {
  if (
    results.length !== expected ||
    results.some(
      result => !Number.isInteger(result.status) || result.status < 100 || result.status > 599
    )
  )
    throw createApiServiceError(
      'The batch response did not contain one ordered status per request. Do not repeat it automatically; successful matches may already have consumed credits.',
      { reason: 'invalid_response' }
    );
};
const failure = (status: number) =>
  status === 200
    ? null
    : status === 404
      ? 'No matching record.'
      : status === 402
        ? 'Product credits exhausted.'
        : status === 429
          ? 'Rate limit reached.'
          : `Enrichment failed with status ${status}. Review the input and product access before retrying this entry.`;
const totals = (results: Record<string, any>[], sandbox: boolean) => {
  const successfulMatches = results.filter(result => result.status === 200).length;
  return {
    successfulMatches,
    failedRequests: results.length - successfulMatches,
    creditsExpected: sandbox ? 0 : successfulMatches
  };
};
const totalSchema = {
  creditsReported: z
    .number()
    .nullable()
    .describe('Credits reported by the provider response header, or null when unavailable'),
  successfulMatches: z.number(),
  failedRequests: z.number(),
  creditsExpected: z
    .number()
    .describe(
      'Expected enrichment credits from successful statuses; zero in sandbox. Confirm actual billing in the provider dashboard.'
    )
};
export const bulkEnrichPerson = SlateTool.create(spec, {
  name: 'Enrich People in Bulk',
  key: 'bulk_enrich_person',
  description:
    'Enrich 1–100 known people in one request. Returns ordered results and an individual success or failure status for every input.',
  instructions: [
    'Each entry must contain enough identifying data for person enrichment.',
    'Retry only individual failed entries after checking their status; a batch can partially succeed.'
  ],
  constraints: [
    'Each successful production match consumes one Person Enrichment credit. Sandbox matches consume no credits.',
    'A timeout can leave billing uncertain; do not automatically repeat the batch.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      people: z
        .array(personEnrichmentInputSchema)
        .min(1)
        .max(100)
        .describe('People to enrich, in response order')
    })
  )
  .output(
    z.object({
      ...totalSchema,
      results: z.array(
        z.object({
          index: z.number(),
          status: z.number(),
          likelihood: z.number().nullable(),
          person: personOutputSchema.nullable(),
          errorMessage: z.string().nullable()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    const client = new Client({ token: ctx.auth.token, sandbox: ctx.config.sandbox });
    const results = await client.bulkEnrichPerson(
      ctx.input.people.map(person => ({ params: personParams(person) }))
    );
    countResponse(results, ctx.input.people.length);
    const summary = totals(results, ctx.config.sandbox);
    return {
      output: {
        ...summary,
        creditsReported: client.creditsReported,
        results: results.map((result, index) => ({
          index,
          status: result.status,
          likelihood: result.likelihood ?? null,
          person: result.status === 200 ? mapPersonData(record(result.data)) : null,
          errorMessage: failure(result.status)
        }))
      },
      message: `Enriched **${summary.successfulMatches}** people; **${summary.failedRequests}** requests did not match or failed. Expected enrichment credits: **${summary.creditsExpected}**. Check individual statuses before retrying.`
    };
  })
  .build();

export const bulkEnrichCompany = SlateTool.create(spec, {
  name: 'Enrich Companies in Bulk',
  key: 'bulk_enrich_company',
  description:
    'Enrich 1–100 known companies in one request. Returns ordered results and an individual success or failure status for every input.',
  instructions: [
    'Each entry requires a company name, website, LinkedIn URL, or ticker.',
    'Retry only individual failed entries after checking their status; a batch can partially succeed.'
  ],
  constraints: [
    'Each successful match consumes one Company Enrichment credit.',
    'There is no documented company bulk sandbox endpoint. A timeout can leave billing uncertain.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      companies: z
        .array(companyEnrichmentInputSchema)
        .min(1)
        .max(100)
        .describe('Companies to enrich, in response order')
    })
  )
  .output(
    z.object({
      ...totalSchema,
      results: z.array(
        z.object({
          index: z.number(),
          status: z.number(),
          likelihood: z.number().nullable(),
          company: companyOutputSchema.nullable(),
          errorMessage: z.string().nullable()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    const client = new Client({ token: ctx.auth.token, sandbox: ctx.config.sandbox });
    const results = await client.bulkEnrichCompany(
      ctx.input.companies.map(company => ({ params: companyParams(company) }))
    );
    countResponse(results, ctx.input.companies.length);
    const summary = totals(results, ctx.config.sandbox);
    return {
      output: {
        ...summary,
        creditsReported: client.creditsReported,
        results: results.map((result, index) => ({
          index,
          status: result.status,
          likelihood: result.likelihood ?? null,
          company:
            result.status === 200 ? mapCompanyData(record(result.data ?? result)) : null,
          errorMessage: failure(result.status)
        }))
      },
      message: `Enriched **${summary.successfulMatches}** companies; **${summary.failedRequests}** requests did not match or failed. Expected enrichment credits: **${summary.creditsExpected}**. Check individual statuses before retrying.`
    };
  })
  .build();
