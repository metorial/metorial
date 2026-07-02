import { SlateTool } from 'slates';
import { z } from 'zod';
import { ClearoutClient } from '../lib/client';
import { spec } from '../spec';

export let domainLookup = SlateTool.create(spec, {
  name: 'Domain Lookup',
  key: 'domain_lookup',
  description: `Look up domain information using MX records or Whois data.
- **MX Lookup** resolves mail server (MX) records for a domain, useful for understanding email routing.
- **Whois Lookup** retrieves domain registration information in JSON format, including registrar, creation date, expiration, and name servers.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      lookupType: z
        .enum(['mx', 'whois'])
        .describe(
          'Type of domain lookup: mx for MX records, whois for domain registration info'
        ),
      domain: z.string().describe('Domain name to look up (e.g., "gmail.com")')
    })
  )
  .output(
    z.object({
      status: z.string().optional().describe('API response status'),
      domain: z.string().optional().describe('The domain that was looked up'),
      records: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Lookup result data (MX records or Whois information)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClearoutClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result: Record<string, unknown>;

    if (ctx.input.lookupType === 'mx') {
      result = await client.mxLookup(ctx.input.domain);
    } else {
      result = await client.whoisLookup(ctx.input.domain);
    }

    let data = (result.data ?? result) as Record<string, unknown>;

    return {
      output: {
        status: result.status as string | undefined,
        domain: ctx.input.domain,
        records: data
      },
      message: `**${ctx.input.lookupType.toUpperCase()} Lookup** for **${ctx.input.domain}** completed.`
    };
  })
  .build();
