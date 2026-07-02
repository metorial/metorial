import { SlateTool } from 'slates';
import { z } from 'zod';
import { XForceClient } from '../lib/client';
import { spec } from '../spec';

export let lookupUrlReputation = SlateTool.create(spec, {
  name: 'Lookup URL Reputation',
  key: 'lookup_url_reputation',
  description: `Look up the threat reputation and content categorization of a URL or domain. Returns risk score, content categories, and associated malware.
Use this to check if a URL is associated with phishing, malware distribution, or other malicious activity.`,
  instructions: [
    'Provide a URL or domain name to check.',
    'Set includeMalware to true to also retrieve malware associated with the URL.',
    'Set includeHistory to true to see categorization changes over time.'
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
          'URL or domain to look up (e.g., "example.com" or "https://example.com/path")'
        ),
      includeMalware: z
        .boolean()
        .optional()
        .describe('Also retrieve malware associated with this URL'),
      includeHistory: z.boolean().optional().describe('Also retrieve categorization history')
    })
  )
  .output(
    z.object({
      url: z.string().describe('The queried URL'),
      score: z
        .number()
        .optional()
        .describe('Overall risk score (1-10, where 10 is highest risk)'),
      categories: z
        .record(z.string(), z.any())
        .optional()
        .describe('Content categories and their confidence values'),
      categoryDescriptions: z
        .record(z.string(), z.string())
        .optional()
        .describe('Human-readable category descriptions'),
      application: z
        .record(z.string(), z.any())
        .optional()
        .describe('Associated application profile'),
      history: z
        .array(
          z.object({
            url: z.string().optional().describe('URL for this history entry'),
            categories: z
              .record(z.string(), z.any())
              .optional()
              .describe('Categories at this point in time'),
            score: z.number().optional().describe('Risk score at this point'),
            created: z.string().optional().describe('When this record was created')
          })
        )
        .optional()
        .describe('Categorization history (if requested)'),
      malwareCount: z
        .number()
        .optional()
        .describe('Number of associated malware samples (if requested)'),
      malwareSamples: z
        .array(
          z.object({
            hash: z.string().optional().describe('Malware file hash'),
            type: z.string().optional().describe('Hash type'),
            family: z.array(z.string()).optional().describe('Malware family names'),
            firstSeen: z.string().optional().describe('First seen date'),
            lastSeen: z.string().optional().describe('Last seen date')
          })
        )
        .optional()
        .describe('Associated malware samples (if requested)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new XForceClient({
      token: ctx.auth.token,
      password: ctx.auth.password
    });

    ctx.progress('Looking up URL reputation...');
    let report = await client.getUrlReport(ctx.input.url);

    let result: any = {
      url: ctx.input.url,
      score: report.result?.score,
      categories: report.result?.cats,
      categoryDescriptions: report.result?.categoryDescriptions,
      application: report.result?.application
    };

    if (ctx.input.includeHistory) {
      ctx.progress('Fetching categorization history...');
      let historyData = await client.getUrlHistory(ctx.input.url);
      result.history = (historyData.result || []).map((h: any) => ({
        url: h.url,
        categories: h.cats,
        score: h.score,
        created: h.created
      }));
    }

    if (ctx.input.includeMalware) {
      ctx.progress('Fetching associated malware...');
      let malwareData = await client.getUrlMalware(ctx.input.url);
      let malware = malwareData.malware || [];
      result.malwareCount = malware.length;
      result.malwareSamples = malware.slice(0, 20).map((m: any) => ({
        hash: m.md5 || m.sha256,
        type: m.md5 ? 'MD5' : 'SHA256',
        family: m.family,
        firstSeen: m.firstseen,
        lastSeen: m.lastseen
      }));
    }

    let scoreDisplay =
      result.score !== undefined ? ` — risk score **${result.score}/10**` : '';
    let catNames = result.categories ? Object.keys(result.categories).join(', ') : 'none';

    return {
      output: result,
      message: `URL **${ctx.input.url}**${scoreDisplay} | Categories: ${catNames}`
    };
  })
  .build();
