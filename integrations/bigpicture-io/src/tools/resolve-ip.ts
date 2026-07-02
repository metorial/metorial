import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { asnSchema, companySchema, ipGeoSchema, whoisSchema } from '../lib/types';
import { spec } from '../spec';

export let resolveIp = SlateTool.create(spec, {
  name: 'Resolve IP to Company',
  key: 'resolve_ip',
  description: `Identify the company behind an IP address. Useful for de-anonymizing website visitors for sales intelligence, marketing personalization, and analytics.

Returns the matched company profile along with a confidence score, match type (business/ISP/hosting), IP geolocation, WHOIS data, and ASN information.`,
  instructions: [
    'Provide a valid IPv4 or IPv6 address.',
    'Check the confidence score and fuzzy flag to assess match quality — higher confidence and non-fuzzy matches are more reliable.',
    'Results with type "isp" or "hosting" indicate the IP belongs to an internet service provider or hosting company rather than the end user.'
  ],
  constraints: ['Rate limited to 600 requests per minute.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ip: z.string().describe('IPv4 or IPv6 address to resolve (e.g. "204.4.143.118")')
    })
  )
  .output(
    z.object({
      found: z.boolean().describe('Whether a match was found for the IP'),
      ip: z.string().nullable().optional().describe('The queried IP address'),
      matchType: z
        .string()
        .nullable()
        .optional()
        .describe('Result classification: "business", "isp", or "hosting"'),
      fuzzy: z.boolean().nullable().optional().describe('Whether the match is approximate'),
      confidence: z
        .number()
        .nullable()
        .optional()
        .describe('Match confidence score from 0 to 1'),
      geo: ipGeoSchema.nullable().optional().describe('IP geolocation data'),
      company: companySchema.nullable().optional().describe('Matched company profile'),
      whois: whoisSchema.nullable().optional().describe('WHOIS registration data'),
      asn: asnSchema.nullable().optional().describe('Autonomous System Number data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.findCompanyByIp(ctx.input.ip);

    if (!result) {
      return {
        output: {
          found: false,
          ip: ctx.input.ip,
          matchType: null,
          fuzzy: null,
          confidence: null,
          geo: null,
          company: null,
          whois: null,
          asn: null
        },
        message: `No company found for IP **${ctx.input.ip}**.`
      };
    }

    let companyName = result.company?.name ?? 'Unknown';
    let confidencePercent =
      result.confidence != null ? `${Math.round(result.confidence * 100)}%` : 'N/A';

    return {
      output: {
        found: true,
        ip: result.ip,
        matchType: result.type ?? null,
        fuzzy: result.fuzzy ?? null,
        confidence: result.confidence ?? null,
        geo: result.geo ?? null,
        company: result.company ?? null,
        whois: result.whois ?? null,
        asn: result.asn ?? null
      },
      message: `Resolved IP **${ctx.input.ip}** → **${companyName}** (${result.type ?? 'unknown'}, confidence: ${confidencePercent}${result.fuzzy ? ', fuzzy match' : ''})`
    };
  })
  .build();
