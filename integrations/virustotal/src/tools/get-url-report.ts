import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getUrlReport = SlateTool.create(spec, {
  name: 'Get URL Report',
  key: 'get_url_report',
  description: `Retrieve the analysis report for a URL. Accepts either a URL identifier (base64-encoded URL without padding) or a raw URL. Returns detection results from 70+ URL scanners, final destination, category, and community reputation data.`,
  instructions: [
    'Provide either the raw URL or its base64url-encoded (no padding) identifier.',
    'If providing a raw URL, it will be automatically base64url-encoded.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      url: z
        .string()
        .describe(
          'The URL to look up, or its VirusTotal URL identifier (base64url without padding)'
        )
    })
  )
  .output(
    z.object({
      urlId: z.string().describe('VirusTotal URL identifier'),
      url: z.string().optional().describe('The original URL'),
      finalUrl: z.string().optional().describe('Final URL after redirects'),
      title: z.string().optional().describe('Title of the page'),
      reputation: z.number().optional().describe('Community reputation score'),
      totalVotes: z
        .object({
          harmless: z.number().optional(),
          malicious: z.number().optional()
        })
        .optional()
        .describe('Community votes summary'),
      lastAnalysisDate: z
        .string()
        .optional()
        .describe('Date of last analysis (Unix timestamp)'),
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
        .describe('URL categories from different engines'),
      tags: z.array(z.string()).optional().describe('Tags assigned to the URL')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    // If input looks like a raw URL, convert to base64url identifier
    let urlId = ctx.input.url;
    if (urlId.startsWith('http://') || urlId.startsWith('https://')) {
      urlId = Buffer.from(urlId).toString('base64url').replace(/=/g, '');
    }

    let result = await client.getUrlReport(urlId);
    let attrs = result?.attributes ?? {};

    let malicious = attrs.last_analysis_stats?.malicious ?? 0;
    let total = Object.values(attrs.last_analysis_stats ?? {}).reduce(
      (sum: number, v) => sum + (typeof v === 'number' ? v : 0),
      0
    );

    return {
      output: {
        urlId: result?.id ?? '',
        url: attrs.url,
        finalUrl: attrs.last_final_url,
        title: attrs.title,
        reputation: attrs.reputation,
        totalVotes: attrs.total_votes
          ? {
              harmless: attrs.total_votes.harmless,
              malicious: attrs.total_votes.malicious
            }
          : undefined,
        lastAnalysisDate: attrs.last_analysis_date?.toString(),
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
        tags: attrs.tags
      },
      message: `**URL report for** \`${attrs.url ?? ctx.input.url}\`\n- **Detection:** ${malicious}/${total} engines flagged as malicious\n- **Title:** ${attrs.title ?? 'N/A'}\n- **Reputation:** ${attrs.reputation ?? 'N/A'}`
    };
  })
  .build();
