import { SlateTool } from 'slates';
import { z } from 'zod';
import { AutoboundClient } from '../lib/client';
import { spec } from '../spec';

export let enrichContact = SlateTool.create(spec, {
  name: 'Enrich Contact Signals',
  key: 'enrich_contact',
  description:
    'Retrieve buying signals for a person identified by email or LinkedIn URL, together with their resolved profile and employer. Contact signal coverage can be sparse; use enrich_company with the employer domain for company signals.',
  instructions: [
    'Provide contactEmail or contactLinkedinUrl.',
    'Call list_signal_types to discover contact signal types and subtypes.',
    'Use a Signal API key from https://signalapi.autobound.ai; the Content API key is separate.'
  ],
  tags: { readOnly: true }
})
  .authMethods(['api_key', 'signal_api_key'])
  .input(
    z.object({
      contactEmail: z.string().optional().describe('Email address of the person to enrich'),
      contactLinkedinUrl: z
        .string()
        .optional()
        .describe('LinkedIn profile URL of the person to enrich'),
      signalTypes: z
        .array(z.string())
        .optional()
        .describe('Signal types from list_signal_types'),
      signalSubtypes: z
        .array(z.string())
        .optional()
        .describe('Up to 25 signal subtypes from list_signal_types'),
      detectedAfter: z
        .string()
        .optional()
        .describe('Only return signals detected on or after this ISO-8601 timestamp'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(500)
        .optional()
        .describe('Maximum returned signals, from 1 to 500; default 20')
    })
  )
  .output(
    z.object({
      contact: z
        .record(z.string(), z.any())
        .nullable()
        .optional()
        .describe('Resolved contact profile'),
      company: z
        .record(z.string(), z.any())
        .nullable()
        .optional()
        .describe('Resolved employer profile'),
      contactSignals: z
        .array(z.record(z.string(), z.any()))
        .describe('Contact signals with identifiers, dates, and source data'),
      signalCount: z.number().describe('Number of returned contact signals'),
      total: z.number().optional().describe('Provider-reported total'),
      signalSummary: z
        .record(z.string(), z.number())
        .optional()
        .describe('Returned signal count by type'),
      coverage: z
        .record(z.string(), z.any())
        .optional()
        .describe('Signal coverage and date range'),
      warnings: z
        .array(z.string())
        .optional()
        .describe('Provider warnings about filters or parameters'),
      rawResponse: z.record(z.string(), z.any()).describe('Complete provider response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AutoboundClient(ctx.auth.token, ctx.auth.signalToken ?? ctx.auth.token);
    let result = await client.enrichContact(ctx.input);
    let signals = result.contact_signals ?? [];
    return {
      output: {
        contact: result.contact,
        company: result.company,
        contactSignals: signals,
        signalCount: signals.length,
        total: result.total,
        signalSummary: result.signal_summary,
        coverage: result.coverage,
        warnings: result.warnings,
        rawResponse: result
      },
      message: `Retrieved **${signals.length}** contact signal(s).`
    };
  })
  .build();
