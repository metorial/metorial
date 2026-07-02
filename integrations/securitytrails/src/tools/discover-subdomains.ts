import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let discoverSubdomains = SlateTool.create(spec, {
  name: 'Discover Subdomains',
  key: 'discover_subdomains',
  description: `Enumerate subdomains for a given domain. Useful for attack surface mapping, reconnaissance, and discovering hidden or forgotten infrastructure.`,
  constraints: ['Results are limited to 2,000 subdomains per domain.'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      hostname: z.string().describe('Domain to discover subdomains for (e.g., "example.com")'),
      childrenOnly: z.boolean().optional().describe('Only return direct children subdomains'),
      includeInactive: z
        .boolean()
        .optional()
        .describe('Include inactive subdomains in results')
    })
  )
  .output(
    z
      .object({
        hostname: z.string().describe('The queried domain'),
        subdomains: z.array(z.string()).describe('List of discovered subdomain prefixes'),
        subdomainCount: z.number().describe('Total number of subdomains found')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getSubdomains(ctx.input.hostname, {
      childrenOnly: ctx.input.childrenOnly,
      includeInactive: ctx.input.includeInactive
    });

    let subdomains = result.subdomains ?? [];

    return {
      output: {
        hostname: ctx.input.hostname,
        subdomains,
        subdomainCount: result.subdomain_count ?? subdomains.length,
        ...result
      },
      message: `Discovered **${subdomains.length}** subdomains for **${ctx.input.hostname}**.`
    };
  })
  .build();
