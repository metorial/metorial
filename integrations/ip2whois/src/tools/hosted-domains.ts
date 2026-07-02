import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let hostedDomains = SlateTool.create(spec, {
  name: 'Hosted Domains Lookup',
  key: 'hosted_domains',
  description: `Get the list of domain names hosted on a given IP address in real time. Supports both IPv4 and IPv6 addresses. Useful for discovering domains sharing the same server or identifying virtual hosts.`,
  constraints: [
    'Results are paginated. The number of domains returned per page depends on your plan tier.',
    'Free plan returns up to 1 domain per query, with a limit of 50 queries per month.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ipAddress: z.string().describe('IPv4 or IPv6 address to look up (e.g. "8.8.8.8")'),
      page: z.number().optional().describe('Page number for paginated results (defaults to 1)')
    })
  )
  .output(
    z.object({
      ip: z.string().describe('The queried IP address'),
      totalDomains: z.number().describe('Total number of hosted domains found'),
      page: z.number().describe('Current page number'),
      perPage: z.number().describe('Number of domains returned per page'),
      totalPages: z.number().describe('Total number of pages available'),
      domains: z.array(z.string()).describe('List of domain names hosted on this IP')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.lookupHostedDomains(ctx.input.ipAddress, ctx.input.page);

    return {
      output: result,
      message: `Found **${result.totalDomains}** domain(s) hosted on **${result.ip}** (page ${result.page}/${result.totalPages}). Returned ${result.domains.length} domain(s) on this page.`
    };
  })
  .build();
