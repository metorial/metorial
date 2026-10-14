import { SlateTool } from 'slates';
import { z } from 'zod';
import { AutoboundClient } from '../lib/client';
import { spec } from '../spec';

export let enrichCompany = SlateTool.create(spec, {
  name: 'Enrich Company Signals',
  key: 'enrich_company',
  description: `Retrieve signal data for a company by domain. Returns buying signals including SEC filings, earnings transcripts, news events, hiring trends, tech stack changes, GitHub activity, Reddit mentions, patent filings, Glassdoor reviews, and more.

Use list_signal_types to discover current company signal types and subtypes. Firmographic fields can be empty; use the domain and dated signals for account research.`,
  instructions: [
    'Provide the company domain (e.g., "acme.com") to look up signals.',
    'Optionally filter by signal types to narrow results (e.g., ["news", "earnings-transcripts", "hiring-trends"]).'
  ],
  tags: {
    readOnly: true
  }
})
  .authMethods(['api_key', 'signal_api_key'])
  .input(
    z.object({
      domain: z.string().describe('Company domain to enrich (e.g., "acme.com")'),
      signalTypes: z
        .array(z.string())
        .optional()
        .describe(
          'Filter by specific signal types (e.g., "news", "earnings-transcripts", "sec-8k", "sec-10k"; call list_signal_types for the current catalog)'
        ),
      limit: z
        .number()
        .optional()
        .describe(
          'Maximum number of signals to return: a whole number from 1 to 500, default 20'
        ),
      signalSubtypes: z
        .array(z.string())
        .optional()
        .describe(
          'Filter by up to 25 signal subtypes. Call list_signal_types to discover values.'
        ),
      detectedAfter: z
        .string()
        .optional()
        .describe('Only return signals detected on or after this ISO-8601 timestamp')
    })
  )
  .output(
    z.object({
      domain: z.string().describe('Company domain that was enriched'),
      signals: z
        .array(
          z.object({
            signalType: z.string().optional().describe('Signal category'),
            signalSubtype: z.string().optional().describe('Specific signal subtype'),
            companyName: z.string().optional().describe('Associated company name'),
            detectedAt: z.string().optional().describe('When the signal was detected'),
            variables: z
              .record(z.string(), z.any())
              .optional()
              .describe('Signal-specific structured data')
          })
        )
        .describe('List of signals detected for the company'),
      signalCount: z.number().describe('Total number of signals returned'),
      company: z
        .record(z.string(), z.any())
        .optional()
        .describe('Resolved company profile; firmographic fields may be empty'),
      signalSummary: z
        .record(z.string(), z.number())
        .optional()
        .describe('Returned signal count by type'),
      coverage: z
        .record(z.string(), z.any())
        .optional()
        .describe('Counts before and after filtering and the available date range'),
      warnings: z
        .array(z.string())
        .optional()
        .describe('Provider warnings about filters or parameters'),
      rawResponse: z
        .any()
        .optional()
        .describe('Complete provider response with signal identifiers and source data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AutoboundClient(ctx.auth.token, ctx.auth.signalToken ?? ctx.auth.token);

    ctx.info(`Enriching company signals for ${ctx.input.domain}...`);

    let result = await client.enrichCompany({
      domain: ctx.input.domain,
      signalTypes: ctx.input.signalTypes,
      signalSubtypes: ctx.input.signalSubtypes,
      detectedAfter: ctx.input.detectedAfter,
      limit: ctx.input.limit
    });

    let signals = Array.isArray(result?.signals)
      ? result.signals
      : Array.isArray(result)
        ? result
        : [];

    return {
      output: {
        domain: ctx.input.domain,
        signals: signals.map((s: any) => ({
          signalType: s.signal_type ?? s.signalType,
          signalSubtype: s.signal_subtype ?? s.signalSubtype,
          companyName: s.company_name ?? s.companyName ?? s.company?.name,
          detectedAt: s.detected_at ?? s.detectedAt,
          variables: s.variables ?? s
        })),
        signalCount: signals.length,
        company: result.company,
        signalSummary: result.signal_summary,
        coverage: result.coverage,
        warnings: result.warnings,
        rawResponse: result
      },
      message: `Retrieved **${signals.length}** signal(s) for **${ctx.input.domain}**.`
    };
  })
  .build();
