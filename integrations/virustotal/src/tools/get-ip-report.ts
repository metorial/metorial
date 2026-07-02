import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getIpReport = SlateTool.create(spec, {
  name: 'Get IP Report',
  key: 'get_ip_report',
  description: `Retrieve the reputation and contextual report for an IP address. Returns detection results, WHOIS data, geolocation, AS owner, SSL certificates, and community reputation.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ipAddress: z.string().describe('The IP address to look up (e.g. "8.8.8.8")')
    })
  )
  .output(
    z.object({
      ipId: z.string().describe('The IP address identifier'),
      reputation: z.number().optional().describe('Community reputation score'),
      asOwner: z.string().optional().describe('Autonomous System owner'),
      asn: z.number().optional().describe('Autonomous System Number'),
      country: z.string().optional().describe('Country code'),
      continent: z.string().optional().describe('Continent code'),
      network: z.string().optional().describe('Network range'),
      totalVotes: z
        .object({
          harmless: z.number().optional(),
          malicious: z.number().optional()
        })
        .optional()
        .describe('Community votes summary'),
      lastAnalysisStats: z
        .object({
          malicious: z.number().optional(),
          suspicious: z.number().optional(),
          undetected: z.number().optional(),
          harmless: z.number().optional(),
          timeout: z.number().optional()
        })
        .optional()
        .describe('Summary of last analysis results'),
      whois: z.string().optional().describe('Raw WHOIS data'),
      tags: z.array(z.string()).optional().describe('Tags assigned to the IP'),
      lastAnalysisDate: z
        .string()
        .optional()
        .describe('Date of last analysis (Unix timestamp)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getIpReport(ctx.input.ipAddress);
    let attrs = result?.attributes ?? {};

    let malicious = attrs.last_analysis_stats?.malicious ?? 0;
    let total = Object.values(attrs.last_analysis_stats ?? {}).reduce(
      (sum: number, v) => sum + (typeof v === 'number' ? v : 0),
      0
    );

    return {
      output: {
        ipId: result?.id ?? '',
        reputation: attrs.reputation,
        asOwner: attrs.as_owner,
        asn: attrs.asn,
        country: attrs.country,
        continent: attrs.continent,
        network: attrs.network,
        totalVotes: attrs.total_votes
          ? {
              harmless: attrs.total_votes.harmless,
              malicious: attrs.total_votes.malicious
            }
          : undefined,
        lastAnalysisStats: attrs.last_analysis_stats
          ? {
              malicious: attrs.last_analysis_stats.malicious,
              suspicious: attrs.last_analysis_stats.suspicious,
              undetected: attrs.last_analysis_stats.undetected,
              harmless: attrs.last_analysis_stats.harmless,
              timeout: attrs.last_analysis_stats.timeout
            }
          : undefined,
        whois: attrs.whois,
        tags: attrs.tags,
        lastAnalysisDate: attrs.last_analysis_date?.toString()
      },
      message: `**IP report for** \`${ctx.input.ipAddress}\`\n- **Detection:** ${malicious}/${total} engines flagged as malicious\n- **AS Owner:** ${attrs.as_owner ?? 'N/A'}\n- **Country:** ${attrs.country ?? 'N/A'}\n- **Reputation:** ${attrs.reputation ?? 'N/A'}`
    };
  })
  .build();
