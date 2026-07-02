import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getIpRanges = SlateTool.create(spec, {
  name: 'Get IP Ranges',
  key: 'get_ip_ranges',
  description: `Retrieve all IP address ranges owned or operated by a company, identified by domain name. Returns both IPv4 and IPv6 ranges in CIDR notation.`,
  constraints: ['Available on Enterprise tier only.'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      domain: z
        .string()
        .describe('Domain name of the company to look up IP ranges for (e.g. "google.com")')
    })
  )
  .output(
    z.object({
      domain: z.string().describe('The queried domain'),
      redirectsTo: z
        .string()
        .nullable()
        .optional()
        .describe('Target domain if the input domain redirects'),
      numRanges: z.number().describe('Total count of IP ranges'),
      ranges: z.array(z.string()).describe('List of IP ranges in CIDR notation')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let result = await client.getIpRanges(ctx.input.domain);

    return {
      output: {
        domain: result.domain,
        redirectsTo: result.redirects_to,
        numRanges: result.num_ranges,
        ranges: result.ranges
      },
      message: `Found **${result.num_ranges}** IP range(s) for **${result.domain}**${result.redirects_to ? ` (redirects to ${result.redirects_to})` : ''}.`
    };
  })
  .build();
