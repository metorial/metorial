import { SlateTool } from 'slates';
import { z } from 'zod';
import { WhoisFreaksClient } from '../lib/client';
import { spec } from '../spec';

export let historicalWhoisLookup = SlateTool.create(spec, {
  name: 'Historical WHOIS Lookup',
  key: 'historical_whois_lookup',
  description: `Retrieve historical WHOIS records for a domain name. Returns all previously captured WHOIS snapshots including registration changes, ownership transfers, and registrar updates over time. Each record is deduplicated and unique.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      domainName: z
        .string()
        .describe('Domain name to look up historical WHOIS records for (e.g. "example.com")')
    })
  )
  .output(
    z.object({
      historicalRecords: z.any().describe('Array of historical WHOIS records for the domain')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WhoisFreaksClient({ token: ctx.auth.token });
    let result = await client.historicalWhoisLookup(ctx.input.domainName);

    return {
      output: { historicalRecords: result },
      message: `Retrieved historical WHOIS records for **${ctx.input.domainName}**.`
    };
  })
  .build();
