import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { WhoisFreaksClient } from '../lib/client';
import { spec } from '../spec';

export let dnsLookup = SlateTool.create(spec, {
  name: 'DNS Lookup',
  key: 'dns_lookup',
  description: `Perform real-time DNS lookups for one or more domains. Supports all major DNS record types including A, AAAA, CNAME, MX, NS, TXT, SPF, PTR, and SOA. Use "all" to retrieve every record type at once. Supports bulk lookups of up to 100 domains.`,
  constraints: ['Bulk DNS lookups support up to 100 domains per request.'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      domainName: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe('Single domain name to look up DNS records for'),
      domainNames: z
        .array(z.string().trim().min(1))
        .min(1)
        .max(100)
        .optional()
        .describe('Array of domain names for bulk DNS lookup (max 100)'),
      ipAddress: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe('IP address for a single live PTR lookup; may accompany domainName'),
      recordType: z
        .string()
        .default('all')
        .describe(
          'DNS record type(s): "a", "aaaa", "cname", "mx", "ns", "txt", "spf", "ptr", "soa", "all", or comma-separated like "a,mx,ns"'
        )
    })
  )
  .output(
    z.object({
      dnsRecords: z.any().describe('DNS records for the queried domain(s)')
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.domainName !== undefined && ctx.input.domainNames !== undefined) {
      throw createApiServiceError('Provide either domainName or domainNames, not both.');
    }

    let client = new WhoisFreaksClient({ token: ctx.auth.token });

    if (ctx.input.domainNames && ctx.input.domainNames.length > 0) {
      if (ctx.input.ipAddress !== undefined) {
        throw createApiServiceError('Use ipAddress with a single lookup, not domainNames.');
      }
      let result = await client.bulkDnsLookup(ctx.input.domainNames, ctx.input.recordType);
      return {
        output: { dnsRecords: result },
        message: `Retrieved bulk DNS records (type: **${ctx.input.recordType}**) for **${ctx.input.domainNames.length}** domains.`
      };
    }

    if (ctx.input.domainName || ctx.input.ipAddress) {
      let result = await client.liveDnsLookup(
        ctx.input.domainName,
        ctx.input.recordType,
        ctx.input.ipAddress
      );
      return {
        output: { dnsRecords: result },
        message: `Retrieved DNS records (type: **${ctx.input.recordType}**) for **${ctx.input.domainName ?? ctx.input.ipAddress}**.`
      };
    }

    throw createApiServiceError('Provide domainName, domainNames, or ipAddress.');
  })
  .build();
