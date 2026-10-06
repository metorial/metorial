import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { safeJson } from '../lib/contracts';
import { spec } from '../spec';

export let getUrlReport = SlateTool.create(spec, {
  name: 'Get URL Report',
  key: 'get_url_report',
  description: `Retrieve the analysis report for a URL. Accepts a raw URL, its native SHA-256 identifier, or its base64url identifier without padding. Returns detection results from available URL scanners, final destination, category, and community reputation data.`,
  instructions: [
    'Provide the raw URL, its returned SHA-256 ID, or its unpadded base64url identifier.',
    'If providing a raw URL, it will be automatically base64url-encoded.'
  ],
  constraints: [
    'Use non-sensitive public indicators; submitted or queried indicators may be scanned and included in the community dataset.'
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
          'The URL to look up, its native SHA-256 ID, or its base64url identifier without padding'
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
    safeJson(ctx.input, [ctx.auth.token]);
    let client = new Client(ctx.auth);

    let result = await client.getUrlReport(ctx.input.url);
    let attrs = result?.attributes ?? {};

    return {
      output: {
        urlId: result.id,
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
      message:
        'Retrieved the available VirusTotal report. Missing analysis statistics are not a zero-detection result.'
    };
  })
  .build();
