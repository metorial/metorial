import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getHostedDomains = SlateTool.create(spec, {
  name: 'Get Hosted Domains',
  key: 'get_hosted_domains',
  description: `Retrieve domains hosted on a given IP address (reverse IP lookup). Returns the total count and a paginated list of domain names, ordered by host.io domain ranking.`,
  constraints: [
    'Available on Enterprise tier only.',
    'Returns up to 1,000 domains per request. Use pagination to retrieve more.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      ip: z.string().describe('IPv4 or IPv6 address to look up hosted domains for'),
      page: z.number().optional().describe('Pagination index starting at 0'),
      limit: z.number().optional().describe('Number of domains per response (max 1000)')
    })
  )
  .output(
    z.object({
      ip: z.string().describe('The queried IP address'),
      total: z.number().describe('Total count of domains hosted on this IP'),
      page: z.number().optional().describe('Current page index'),
      domains: z.array(z.string()).describe('List of domain names hosted on this IP')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let result = await client.getHostedDomains(ctx.input.ip, {
      page: ctx.input.page,
      limit: ctx.input.limit
    });

    return {
      output: {
        ip: result.ip,
        total: result.total,
        page: result.page,
        domains: result.domains
      },
      message: `Found **${result.total}** domain(s) hosted on **${result.ip}**. Returned ${result.domains.length} domain(s)${result.page !== undefined ? ` (page ${result.page})` : ''}.`
    };
  })
  .build();
