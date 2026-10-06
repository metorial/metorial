import { SlateTool } from 'slates';
import { z } from 'zod';
import { VonageRestClient } from '../lib/client';
import { protect } from '../lib/validation';
import { spec } from '../spec';

export let numberInsight = SlateTool.create(spec, {
  name: 'Number Insight',
  key: 'number_insight',
  description: `Look up intelligence about a phone number using the Vonage Number Insight API. Returns information about number validity, format, carrier, type, reachability, and roaming status.
Three tiers are available:
- **Basic**: Country, international/national format
- **Standard**: Adds carrier name, type (mobile/landline/VoIP), ported status
- **Advanced**: Adds reachability, roaming status and validity flags. Statuses 43–45 are partial results.`,
  constraints: [
    'Advanced insight may take longer as it queries live network data.',
    'Pricing varies by insight level.',
    'Number Insight is scheduled to sunset February 4, 2027. Migrate to Identity Insights before that date.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      number: z
        .string()
        .describe('Phone number to look up in E.164 format (e.g., "14155550100")'),
      level: z
        .enum(['basic', 'standard', 'advanced'])
        .describe('Insight level: basic, standard, or advanced'),
      country: z
        .string()
        .optional()
        .describe('Two-letter country code (ISO 3166-1 alpha-2) to help with number parsing')
    })
  )
  .output(
    z.object({
      status: z.number().optional().describe('Response status code (0 = success)'),
      statusMessage: z.string().optional().describe('Status description'),
      requestId: z.string().optional().describe('Request ID'),
      internationalFormatNumber: z
        .string()
        .optional()
        .describe('Number in international format'),
      nationalFormatNumber: z.string().optional().describe('Number in national format'),
      countryCode: z.string().optional().describe('Two-letter country code'),
      countryCodeIso3: z.string().optional().describe('Three-letter country code'),
      countryName: z.string().optional().describe('Country name'),
      countryPrefix: z.string().optional().describe('Country dialing prefix'),
      currentCarrier: z.unknown().optional().describe('Current carrier information'),
      originalCarrier: z.unknown().optional().describe('Original carrier information'),
      ported: z
        .string()
        .optional()
        .describe('Ported status (assumed_not_ported, assumed_ported, unknown)'),
      roaming: z.unknown().optional().describe('Roaming information (advanced only)'),
      callerIdentity: z.unknown().optional().describe('Caller identity information'),
      callerType: z.string().optional().describe('Number type (consumer, business, unknown)'),
      validNumber: z
        .string()
        .optional()
        .describe('Number validity (valid, not_valid, unknown)'),
      reachable: z
        .string()
        .optional()
        .describe(
          'Reachability status (reachable, undeliverable, absent, bad_number, blacklisted, unknown)'
        ),
      lookupOutcome: z.number().optional().describe('Advanced lookup outcome code'),
      lookupOutcomeMessage: z
        .string()
        .optional()
        .describe('Advanced lookup outcome description')
    })
  )
  .handleInvocation(async ctx => {
    protect(ctx.input, [ctx.auth.apiSecret, ctx.auth.privateKey ?? '']);
    let client = new VonageRestClient({
      apiKey: ctx.auth.apiKey,
      apiSecret: ctx.auth.apiSecret
    });

    let result = await client.numberInsight(
      ctx.input.level,
      ctx.input.number,
      ctx.input.country
    );

    let output = {
      status: result.status,
      statusMessage: result.status_message,
      requestId: result.request_id,
      internationalFormatNumber: result.international_format_number,
      nationalFormatNumber: result.national_format_number,
      countryCode: result.country_code,
      countryCodeIso3: result.country_code_iso3,
      countryName: result.country_name,
      countryPrefix: result.country_prefix
    };

    return {
      output: {
        ...output,
        currentCarrier: ctx.input.level !== 'basic' ? result.current_carrier : undefined,
        originalCarrier: ctx.input.level !== 'basic' ? result.original_carrier : undefined,
        ported:
          ctx.input.level !== 'basic' && typeof result.ported === 'string'
            ? result.ported
            : undefined,
        callerType:
          ctx.input.level !== 'basic' && typeof result.caller_type === 'string'
            ? result.caller_type
            : undefined,
        callerIdentity: ctx.input.level !== 'basic' ? result.caller_identity : undefined,
        roaming: ctx.input.level === 'advanced' ? result.roaming : undefined,
        validNumber:
          ctx.input.level === 'advanced' && typeof result.valid_number === 'string'
            ? result.valid_number
            : undefined,
        reachable:
          ctx.input.level === 'advanced' && typeof result.reachable === 'string'
            ? result.reachable
            : undefined,
        lookupOutcome:
          ctx.input.level === 'advanced' && typeof result.lookup_outcome === 'number'
            ? result.lookup_outcome
            : undefined,
        lookupOutcomeMessage:
          ctx.input.level === 'advanced' && typeof result.lookup_outcome_message === 'string'
            ? result.lookup_outcome_message
            : undefined
      },
      message: `**${ctx.input.level}** insight for **${result.international_format_number || ctx.input.number}**: ${result.country_name || 'Unknown country'}; native status ${result.status}, fields may be incomplete`
    };
  })
  .build();
