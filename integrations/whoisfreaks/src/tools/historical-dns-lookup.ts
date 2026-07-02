import { SlateTool } from 'slates';
import { z } from 'zod';
import { WhoisFreaksClient } from '../lib/client';
import { spec } from '../spec';

export let historicalDnsLookup = SlateTool.create(spec, {
  name: 'Historical DNS Lookup',
  key: 'historical_dns_lookup',
  description: `Retrieve historical DNS records for a domain. Shows how DNS configurations have changed over time, including past A, MX, NS, CNAME, and other record types. Useful for investigating domain infrastructure changes and tracking DNS modifications.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      domainName: z.string().describe('Domain name to look up historical DNS records for'),
      recordType: z
        .string()
        .default('a')
        .describe(
          'DNS record type: "a", "aaaa", "cname", "mx", "ns", "txt", "spf", "ptr", "soa", or "all"'
        ),
      page: z.number().optional().describe('Page number for paginated results')
    })
  )
  .output(
    z.object({
      historicalDnsRecords: z.any().describe('Historical DNS records for the domain')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WhoisFreaksClient({ token: ctx.auth.token });
    let result = await client.historicalDnsLookup(
      ctx.input.domainName,
      ctx.input.recordType,
      ctx.input.page
    );

    return {
      output: { historicalDnsRecords: result },
      message: `Retrieved historical DNS records (type: **${ctx.input.recordType}**) for **${ctx.input.domainName}**.`
    };
  })
  .build();
