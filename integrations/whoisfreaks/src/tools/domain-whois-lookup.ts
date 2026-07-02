import { SlateTool } from 'slates';
import { z } from 'zod';
import { WhoisFreaksClient } from '../lib/client';
import { spec } from '../spec';

export let domainWhoisLookup = SlateTool.create(spec, {
  name: 'Domain WHOIS Lookup',
  key: 'domain_whois_lookup',
  description: `Retrieve live WHOIS registration data for one or more domain names. Returns structured ownership, registrar, contact, nameserver, and date information fetched in real-time from WHOIS servers. Supports bulk lookups of up to 100 domains per request.`,
  constraints: ['Bulk lookups support up to 100 domains per request.'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      domainName: z
        .string()
        .optional()
        .describe('Single domain name to look up (e.g. "example.com")'),
      domainNames: z
        .array(z.string())
        .optional()
        .describe('Array of domain names for bulk lookup (max 100)')
    })
  )
  .output(
    z.object({
      whoisData: z.any().describe('WHOIS registration data for the queried domain(s)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WhoisFreaksClient({ token: ctx.auth.token });

    if (ctx.input.domainNames && ctx.input.domainNames.length > 0) {
      let result = await client.bulkWhoisLookup(ctx.input.domainNames);
      return {
        output: { whoisData: result },
        message: `Retrieved bulk WHOIS data for **${ctx.input.domainNames.length}** domains.`
      };
    }

    if (ctx.input.domainName) {
      let result = await client.liveWhoisLookup(ctx.input.domainName);
      return {
        output: { whoisData: result },
        message: `Retrieved live WHOIS data for **${ctx.input.domainName}**.`
      };
    }

    throw new Error('Either domainName or domainNames must be provided.');
  })
  .build();
