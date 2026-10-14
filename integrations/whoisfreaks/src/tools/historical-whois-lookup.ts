import { SlateTool } from 'slates';
import { z } from 'zod';
import { WhoisFreaksClient } from '../lib/client';
import { spec } from '../spec';

export let historicalWhoisLookup = SlateTool.create(spec, {
  name: 'Historical WHOIS Lookup',
  key: 'historical_whois_lookup',
  description: `Retrieve one page of historical WHOIS records for a domain name, including registration changes, ownership transfers, and registrar updates over time. The response includes pagination metadata.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      domainName: z
        .string()
        .describe('Domain name to look up historical WHOIS records for (e.g. "example.com")'),
      page: z.number().int().min(1).optional().describe('Page number, starting at 1')
    })
  )
  .output(
    z.object({
      historicalRecords: z.any().describe('Array of historical WHOIS records for the domain')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WhoisFreaksClient({ token: ctx.auth.token });
    let result = await client.historicalWhoisLookup(ctx.input.domainName, ctx.input.page);

    return {
      output: { historicalRecords: result },
      message: `Retrieved historical WHOIS records for **${ctx.input.domainName}**.`
    };
  })
  .build();
