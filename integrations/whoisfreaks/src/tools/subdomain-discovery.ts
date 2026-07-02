import { SlateTool } from 'slates';
import { z } from 'zod';
import { WhoisFreaksClient } from '../lib/client';
import { spec } from '../spec';

export let subdomainDiscovery = SlateTool.create(spec, {
  name: 'Subdomain Discovery',
  key: 'subdomain_discovery',
  description: `Discover all known subdomains for a given domain. Returns each subdomain with details such as first seen date, last seen date, and current status (active/inactive). Useful for security audits, attack surface mapping, and infrastructure analysis.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      domainName: z
        .string()
        .describe('Domain name to discover subdomains for (e.g. "example.com")'),
      page: z.number().optional().describe('Page number for paginated results')
    })
  )
  .output(
    z.object({
      subdomains: z.any().describe('List of discovered subdomains with metadata')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WhoisFreaksClient({ token: ctx.auth.token });
    let result = await client.subdomainLookup(ctx.input.domainName, ctx.input.page);

    return {
      output: { subdomains: result },
      message: `Discovered subdomains for **${ctx.input.domainName}**.`
    };
  })
  .build();
