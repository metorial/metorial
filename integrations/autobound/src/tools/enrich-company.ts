import { SlateTool } from 'slates';
import { z } from 'zod';
import { AutoboundClient } from '../lib/client';
import { spec } from '../spec';

export let enrichCompany = SlateTool.create(spec, {
  name: 'Enrich Company Signals',
  key: 'enrich_company',
  description: `Retrieve signal data for a company by domain. Returns buying signals including SEC filings, earnings transcripts, news events, hiring trends, tech stack changes, GitHub activity, Reddit mentions, patent filings, Glassdoor reviews, and more.

Use this to enrich company records with real-time intelligence and buying signals from 25+ signal categories.`,
  instructions: [
    'Provide the company domain (e.g., "acme.com") to look up signals.',
    'Optionally filter by signal types to narrow results (e.g., ["news", "earnings-transcript", "departmental-growth-trends"]).'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      domain: z.string().describe('Company domain to enrich (e.g., "acme.com")'),
      signalTypes: z
        .array(z.string())
        .optional()
        .describe(
          'Filter by specific signal types (e.g., "news", "earnings-transcript", "8k", "10k")'
        ),
      limit: z.number().optional().describe('Maximum number of signals to return')
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
      signalCount: z.number().describe('Total number of signals returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AutoboundClient(ctx.auth.token);

    ctx.info(`Enriching company signals for ${ctx.input.domain}...`);

    let result = await client.enrichCompany({
      domain: ctx.input.domain,
      signalTypes: ctx.input.signalTypes,
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
          companyName: s.company_name ?? s.companyName,
          detectedAt: s.detected_at ?? s.detectedAt,
          variables: s.variables ?? s
        })),
        signalCount: signals.length
      },
      message: `Retrieved **${signals.length}** signal(s) for **${ctx.input.domain}**.`
    };
  })
  .build();
