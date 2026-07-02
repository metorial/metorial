import { SlateTool } from 'slates';
import { z } from 'zod';
import { XForceClient } from '../lib/client';
import { spec } from '../spec';

let categoryEntrySchema = z.object({
  name: z.string().describe('Category name (e.g., Spam, Malware, Bots)'),
  percentage: z.number().optional().describe('Confidence percentage for this category')
});

let historyEntrySchema = z.object({
  created: z.string().optional().describe('When this reputation record was created'),
  reason: z.string().optional().describe('Reason for the reputation entry'),
  score: z.number().optional().describe('Risk score at this point in time'),
  cats: z.record(z.string(), z.number()).optional().describe('Category scores at this point'),
  geo: z.record(z.string(), z.number()).optional().describe('Geolocation data at this point')
});

export let lookupIpReputation = SlateTool.create(spec, {
  name: 'Lookup IP Reputation',
  key: 'lookup_ip_reputation',
  description: `Look up the threat reputation of an IP address. Returns risk score, geolocation, content categories, and reputation history. Optionally includes associated malware information.
Supports IPv4 and IPv6 addresses. Categories include Spam, Malware, Bots, Scanning IPs, Anonymisation Services, and more.`,
  instructions: [
    'Provide a single IP address (IPv4 or IPv6).',
    'Set includeMalware to true to also retrieve malware associated with the IP.',
    'Set includeHistory to true to see how the reputation has changed over time.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ip: z.string().describe('IP address to look up (IPv4 or IPv6)'),
      includeMalware: z
        .boolean()
        .optional()
        .describe('Also retrieve malware associated with this IP'),
      includeHistory: z
        .boolean()
        .optional()
        .describe('Also retrieve reputation history for this IP')
    })
  )
  .output(
    z.object({
      ip: z.string().describe('The queried IP address'),
      score: z
        .number()
        .optional()
        .describe('Overall risk score (1-10, where 10 is highest risk)'),
      reasonDescription: z
        .string()
        .optional()
        .describe('Human-readable reason for the risk score'),
      categories: z
        .array(categoryEntrySchema)
        .optional()
        .describe('Threat categories associated with this IP'),
      geo: z
        .record(z.string(), z.any())
        .optional()
        .describe('Geolocation information for the IP'),
      subnet: z.string().optional().describe('The subnet this IP belongs to'),
      asn: z.number().optional().describe('Autonomous System Number'),
      asnDescription: z.string().optional().describe('AS description/owner'),
      history: z
        .array(historyEntrySchema)
        .optional()
        .describe('Reputation history entries (if requested)'),
      malwareCount: z
        .number()
        .optional()
        .describe('Number of associated malware samples (if requested)'),
      malwareSamples: z
        .array(
          z.object({
            hash: z.string().optional().describe('Malware file hash'),
            type: z.string().optional().describe('Hash type (MD5, SHA1, SHA256)'),
            family: z.array(z.string()).optional().describe('Malware family names'),
            firstSeen: z
              .string()
              .optional()
              .describe('When the malware was first seen from this IP'),
            lastSeen: z
              .string()
              .optional()
              .describe('When the malware was last seen from this IP')
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

    ctx.progress('Looking up IP reputation...');
    let report = await client.getIpReport(ctx.input.ip);

    let categories = report.cats
      ? Object.entries(report.cats).map(([name, percentage]) => ({
          name,
          percentage: typeof percentage === 'number' ? percentage : undefined
        }))
      : undefined;

    let result: any = {
      ip: ctx.input.ip,
      score: report.score,
      reasonDescription: report.reasonDescription || report.reason,
      categories,
      geo: report.geo,
      subnet: report.subnet,
      asn: report.asns
        ? Object.keys(report.asns)[0]
          ? Number(Object.keys(report.asns)[0])
          : undefined
        : undefined,
      asnDescription: report.asns ? Object.values(report.asns)[0] : undefined
    };

    if (ctx.input.includeHistory) {
      ctx.progress('Fetching reputation history...');
      let historyData = await client.getIpHistory(ctx.input.ip);
      result.history = historyData.history || [];
    }

    if (ctx.input.includeMalware) {
      ctx.progress('Fetching associated malware...');
      let malwareData = await client.getIpMalware(ctx.input.ip);
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
      result.score !== undefined ? ` with risk score **${result.score}/10**` : '';
    let categoryNames = categories?.map(c => c.name).join(', ');
    let categoryDisplay = categoryNames ? ` | Categories: ${categoryNames}` : '';

    return {
      output: result,
      message: `IP **${ctx.input.ip}**${scoreDisplay}${categoryDisplay}`
    };
  })
  .build();
