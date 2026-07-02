import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let dnsLookup = SlateTool.create(spec, {
  name: 'DNS Lookup',
  key: 'dns_lookup',
  description: `Look up DNS records for a domain including A, AAAA, MX, NS, SOA, TXT, and CNAME records. Useful for domain verification, email deliverability checks, and infrastructure analysis.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      domain: z
        .string()
        .describe('The domain name to look up (e.g. "example.com", no protocol or subdomains)')
    })
  )
  .output(
    z.object({
      domain: z.string().describe('The queried domain'),
      aRecords: z.array(z.string()).optional().describe('IPv4 address records'),
      aaaaRecords: z.array(z.string()).optional().describe('IPv6 address records'),
      mxRecords: z
        .array(
          z.object({
            exchange: z.string().describe('Mail server hostname'),
            priority: z.number().describe('Priority value')
          })
        )
        .optional()
        .describe('Mail exchange records'),
      nsRecords: z.array(z.string()).optional().describe('Nameserver records'),
      txtRecords: z.array(z.string()).optional().describe('TXT records (SPF, DKIM, etc.)'),
      cnameRecords: z.array(z.string()).optional().describe('CNAME alias records'),
      soaRecord: z
        .object({
          nsname: z.string().describe('Primary nameserver'),
          hostmaster: z.string().describe('Hostmaster email'),
          serial: z.number().describe('Zone serial number'),
          refresh: z.number().describe('Refresh interval in seconds'),
          retry: z.number().describe('Retry interval in seconds'),
          expire: z.number().describe('Expiry time in seconds'),
          minttl: z.number().describe('Minimum TTL in seconds')
        })
        .optional()
        .describe('Start of Authority record')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.dnsLookup(ctx.input.domain);

    if (result.status === 'error' || !result.data) {
      throw new Error(result.error || 'DNS lookup failed');
    }

    let data = result.data;
    let records = data.records;

    let output = {
      domain: data.domain,
      aRecords: records.A,
      aaaaRecords: records.AAAA,
      mxRecords: records.MX,
      nsRecords: records.NS,
      txtRecords: records.TXT,
      cnameRecords: records.CNAME,
      soaRecord: records.SOA
    };

    let recordSummary: string[] = [];
    if (records.A?.length) recordSummary.push(`${records.A.length} A`);
    if (records.MX?.length) recordSummary.push(`${records.MX.length} MX`);
    if (records.NS?.length) recordSummary.push(`${records.NS.length} NS`);
    if (records.TXT?.length) recordSummary.push(`${records.TXT.length} TXT`);

    return {
      output,
      message: `DNS records for **${data.domain}**: ${recordSummary.join(', ') || 'no records found'}.`
    };
  })
  .build();
