import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { companySchema } from '../lib/types';
import { spec } from '../spec';

export let enrichCompany = SlateTool.create(spec, {
  name: 'Enrich Company',
  key: 'enrich_company',
  description: `Look up a company by its domain name and retrieve a comprehensive company profile including firmographics, industry classification, technology stack, financial metrics, social profiles, and location data.

Uses the streaming endpoint to wait for results if the company data is not yet cached (up to ~200 seconds). Returns \`null\` for the company if no match is found.`,
  instructions: [
    'Provide the full root domain (e.g. "stripe.com" not "www.stripe.com" or "https://stripe.com").',
    'For asynchronous result delivery, set stream to false and provide webhookUrl. webhookId can correlate the resulting POST with your request.'
  ],
  constraints: [
    'Rate limited to 600 requests per minute (standard) or 5 requests per minute (streaming).',
    'If the company is not in the database and no cached data exists, the streaming endpoint will hold the connection open while data is collected.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      domain: z.string().describe('Domain name to look up (e.g. "stripe.com")'),
      stream: z
        .boolean()
        .optional()
        .default(true)
        .describe(
          'Use streaming endpoint to wait for results if data is not yet cached. Defaults to true.'
        ),
      webhookUrl: z
        .string()
        .optional()
        .describe('HTTP or HTTPS URL to receive a POST when company enrichment completes'),
      webhookId: z
        .string()
        .optional()
        .describe('Optional correlation identifier included in the webhook POST')
    })
  )
  .output(
    z.object({
      found: z.boolean().describe('Whether a company match was found'),
      pending: z
        .boolean()
        .describe('Whether the lookup is still processing (only when stream is false)'),
      company: companySchema
        .nullable()
        .describe('The enriched company profile, or null if not found'),
      rawResponse: z
        .unknown()
        .optional()
        .describe('Original response returned by BigPicture.io')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.findCompanyByDomain({
      domain: ctx.input.domain,
      stream: ctx.input.stream,
      webhookUrl: ctx.input.webhookUrl,
      webhookId: ctx.input.webhookId
    });

    let found = result.status === 200 && result.company !== null;
    let pending = result.status === 202;

    if (pending) {
      ctx.info(
        'Company data is being processed. Try again in a few minutes or use stream mode.'
      );
    }

    return {
      output: {
        found,
        pending,
        company: result.company ?? null,
        rawResponse: result.rawResponse
      },
      message: pending
        ? `Company data for **${ctx.input.domain}** is being processed (202 Accepted). The data is not yet available — retry later or enable streaming.`
        : found
          ? `Found company **${result.company?.name ?? ctx.input.domain}**${result.company?.description ? ` — ${result.company.description.slice(0, 120)}...` : ''}`
          : `No company found for domain **${ctx.input.domain}**.`
    };
  })
  .build();
