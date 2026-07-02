import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let hostedDomains = SlateTool.create(spec, {
  name: 'Hosted Domain Lookup',
  key: 'hosted_domain_lookup',
  description: `Retrieve the list of domain names hosted on a given IP address (reverse IP lookup). Useful for discovering which domains share a server or IP address.

Results are paginated - specify a page number to navigate through large result sets.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ipAddress: z.string().describe('IPv4 or IPv6 address to look up hosted domains for'),
      page: z
        .number()
        .optional()
        .default(1)
        .describe('Page number for paginated results (default: 1)')
    })
  )
  .output(
    z.object({
      ip: z.string().describe('Queried IP address'),
      totalDomains: z.number().describe('Total number of hosted domains found'),
      currentPage: z.number().describe('Current page number'),
      perPage: z.number().describe('Number of domains per page'),
      totalPages: z.number().describe('Total number of pages available'),
      domains: z.array(z.string()).describe('List of domain names hosted on the IP address')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getHostedDomains(ctx.input.ipAddress, ctx.input.page);

    let output = {
      ip: result.ip || ctx.input.ipAddress,
      totalDomains: result.total || 0,
      currentPage: result.page || 1,
      perPage: result.per_page || 0,
      totalPages: result.total_pages || 0,
      domains: result.domains || []
    };

    let paginationStr =
      output.totalPages > 1 ? ` (page ${output.currentPage} of ${output.totalPages})` : '';

    return {
      output,
      message: `Found **${output.totalDomains}** domains hosted on **${output.ip}**${paginationStr}. Showing ${output.domains.length} domains: ${output.domains.slice(0, 10).join(', ')}${output.domains.length > 10 ? '...' : ''}`
    };
  })
  .build();
