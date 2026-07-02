import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let reportSchema = z.object({
  reportedAt: z.string().describe('Timestamp when the report was submitted'),
  comment: z.string().describe('Description of the abuse'),
  categories: z.array(z.number()).describe('Abuse category IDs'),
  reporterId: z.number().describe('ID of the reporter'),
  reporterCountryCode: z.string().describe('Country code of the reporter'),
  reporterCountryName: z.string().describe('Country name of the reporter')
});

export let checkIp = SlateTool.create(spec, {
  name: 'Check IP Reputation',
  key: 'check_ip',
  description: `Look up the abuse reputation of an IP address (IPv4 or IPv6). Returns the abuse confidence score (0–100), geographic and network information, and optionally individual abuse reports in verbose mode.

Use this to assess whether an IP address has been involved in malicious activity.`,
  instructions: [
    'Set verbose to true to include individual abuse reports in the response.',
    'Use maxAgeInDays to control how far back to look for reports (1–365 days).'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ipAddress: z.string().describe('IPv4 or IPv6 address to check'),
      maxAgeInDays: z
        .number()
        .min(1)
        .max(365)
        .optional()
        .describe('Lookback window in days (1–365, default 30)'),
      verbose: z
        .boolean()
        .optional()
        .describe('Include individual abuse reports in the response')
    })
  )
  .output(
    z.object({
      ipAddress: z.string().describe('The queried IP address'),
      isPublic: z.boolean().describe('Whether the IP is a public address'),
      ipVersion: z.number().describe('IP version (4 or 6)'),
      isWhitelisted: z
        .boolean()
        .nullable()
        .describe('Whether the IP is on the AbuseIPDB whitelist'),
      abuseConfidenceScore: z.number().describe('Abuse confidence score (0–100)'),
      countryCode: z.string().nullable().describe('ISO 3166 alpha-2 country code'),
      countryName: z.string().nullable().describe('Country name'),
      usageType: z
        .string()
        .nullable()
        .describe('Usage type of the IP (e.g., Data Center, ISP, Commercial)'),
      isp: z.string().nullable().describe('Internet Service Provider'),
      domain: z.string().nullable().describe('Domain associated with the IP'),
      hostnames: z.array(z.string()).describe('Hostnames associated with the IP'),
      isTor: z.boolean().nullable().describe('Whether the IP is a known Tor exit node'),
      totalReports: z.number().describe('Total number of abuse reports'),
      numDistinctUsers: z.number().describe('Number of distinct users who reported this IP'),
      lastReportedAt: z.string().nullable().describe('Timestamp of the most recent report'),
      reports: z
        .array(reportSchema)
        .optional()
        .describe('Individual abuse reports (only when verbose is true)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.checkIp({
      ipAddress: ctx.input.ipAddress,
      maxAgeInDays: ctx.input.maxAgeInDays,
      verbose: ctx.input.verbose
    });

    let data = result.data;

    return {
      output: {
        ipAddress: data.ipAddress,
        isPublic: data.isPublic,
        ipVersion: data.ipVersion,
        isWhitelisted: data.isWhitelisted ?? null,
        abuseConfidenceScore: data.abuseConfidenceScore,
        countryCode: data.countryCode ?? null,
        countryName: data.countryName ?? null,
        usageType: data.usageType ?? null,
        isp: data.isp ?? null,
        domain: data.domain ?? null,
        hostnames: data.hostnames ?? [],
        isTor: data.isTor ?? null,
        totalReports: data.totalReports,
        numDistinctUsers: data.numDistinctUsers,
        lastReportedAt: data.lastReportedAt ?? null,
        reports: ctx.input.verbose ? data.reports : undefined
      },
      message: `**${data.ipAddress}** has an abuse confidence score of **${data.abuseConfidenceScore}%** with **${data.totalReports}** reports from **${data.numDistinctUsers}** distinct users.${data.countryCode ? ` Country: ${data.countryName} (${data.countryCode}).` : ''}${data.isp ? ` ISP: ${data.isp}.` : ''}`
    };
  })
  .build();
