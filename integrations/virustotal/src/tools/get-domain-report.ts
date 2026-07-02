import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getDomainReport = SlateTool.create(spec, {
  name: 'Get Domain Report',
  key: 'get_domain_report',
  description: `Retrieve the reputation and contextual report for a domain. Returns WHOIS data, DNS records, SSL certificate info, detection results, community reputation, and popularity rankings.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      domain: z.string().describe('The domain to look up (e.g. "example.com")')
    })
  )
  .output(
    z.object({
      domainId: z.string().describe('The domain identifier'),
      reputation: z.number().optional().describe('Community reputation score'),
      registrar: z.string().optional().describe('Domain registrar'),
      creationDate: z.string().optional().describe('Domain creation date (Unix timestamp)'),
      lastUpdateDate: z
        .string()
        .optional()
        .describe('Domain last update date (Unix timestamp)'),
      lastDnsRecords: z
        .array(
          z.object({
            type: z.string().optional(),
            value: z.string().optional(),
            ttl: z.number().optional()
          })
        )
        .optional()
        .describe('Latest DNS records'),
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
      categories: z
        .record(z.string(), z.string())
        .optional()
        .describe('Domain categories from different engines'),
      whois: z.string().optional().describe('Raw WHOIS data'),
      tags: z.array(z.string()).optional().describe('Tags assigned to the domain'),
      popularityRanks: z
        .record(
          z.string(),
          z.object({
            rank: z.number().optional(),
            timestamp: z.number().optional()
          })
        )
        .optional()
        .describe('Popularity rankings from different providers')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getDomainReport(ctx.input.domain);
    let attrs = result?.attributes ?? {};

    let malicious = attrs.last_analysis_stats?.malicious ?? 0;
    let total = Object.values(attrs.last_analysis_stats ?? {}).reduce(
      (sum: number, v) => sum + (typeof v === 'number' ? v : 0),
      0
    );

    return {
      output: {
        domainId: result?.id ?? '',
        reputation: attrs.reputation,
        registrar: attrs.registrar,
        creationDate: attrs.creation_date?.toString(),
        lastUpdateDate: attrs.last_update_date?.toString(),
        lastDnsRecords: attrs.last_dns_records?.map((r: any) => ({
          type: r.type,
          value: r.value,
          ttl: r.ttl
        })),
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
        categories: attrs.categories,
        whois: attrs.whois,
        tags: attrs.tags,
        popularityRanks: attrs.popularity_ranks
      },
      message: `**Domain report for** \`${ctx.input.domain}\`\n- **Detection:** ${malicious}/${total} engines flagged as malicious\n- **Registrar:** ${attrs.registrar ?? 'N/A'}\n- **Reputation:** ${attrs.reputation ?? 'N/A'}`
    };
  })
  .build();
