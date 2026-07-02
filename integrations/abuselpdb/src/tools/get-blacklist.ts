import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let blacklistEntrySchema = z.object({
  ipAddress: z.string().describe('Blacklisted IP address'),
  abuseConfidenceScore: z.number().describe('Abuse confidence score (0–100)'),
  lastReportedAt: z.string().optional().describe('Timestamp of the most recent report')
});

export let getBlacklist = SlateTool.create(spec, {
  name: 'Get Blacklist',
  key: 'get_blacklist',
  description: `Download a list of the most reported IP addresses, ordered by abuse confidence score. Can be filtered by minimum confidence score, country, and IP version.

Use this to populate firewall blocklists or analyze global threat trends.`,
  instructions: [
    'The confidenceMinimum parameter is a paid feature; free accounts default to 100.',
    'Use onlyCountries or exceptCountries to filter by ISO 3166 alpha-2 country codes (comma-separated).'
  ],
  constraints: [
    'Free tier: up to 10,000 IPs',
    'Basic tier: up to 100,000 IPs',
    'Premium tier: up to 500,000 IPs'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      confidenceMinimum: z
        .number()
        .min(25)
        .max(100)
        .optional()
        .describe('Minimum abuse confidence score threshold (25–100, default 100)'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of IPs to return (depends on plan tier)'),
      onlyCountries: z
        .string()
        .optional()
        .describe('Comma-separated ISO 3166 alpha-2 country codes to include'),
      exceptCountries: z
        .string()
        .optional()
        .describe('Comma-separated ISO 3166 alpha-2 country codes to exclude'),
      ipVersion: z
        .union([z.literal(4), z.literal(6)])
        .optional()
        .describe('Filter by IP version: 4 (IPv4) or 6 (IPv6)')
    })
  )
  .output(
    z.object({
      generatedAt: z.string().describe('Timestamp when the blacklist was generated'),
      entries: z.array(blacklistEntrySchema).describe('List of blacklisted IP addresses')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getBlacklist({
      confidenceMinimum: ctx.input.confidenceMinimum,
      limit: ctx.input.limit,
      onlyCountries: ctx.input.onlyCountries,
      exceptCountries: ctx.input.exceptCountries,
      ipVersion: ctx.input.ipVersion
    });

    let meta = result.meta;
    let data = result.data ?? [];

    return {
      output: {
        generatedAt: meta?.generatedAt ?? new Date().toISOString(),
        entries: data
      },
      message: `Retrieved **${data.length}** blacklisted IPs with confidence score ≥ ${ctx.input.confidenceMinimum ?? 100}%.`
    };
  })
  .build();
