import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getIpDetails = SlateTool.create(spec, {
  name: 'Get IP Details',
  key: 'get_ip_details',
  description: `Retrieve comprehensive details for an IP address including WHOIS information, neighboring IPs, and user agents observed in the last 30 days. Specify which data to include using the boolean flags.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      ipAddress: z.string().describe('IPv4 address to look up (e.g., "1.2.3.4")'),
      includeWhois: z.boolean().optional().default(true).describe('Include WHOIS data'),
      includeNeighbors: z
        .boolean()
        .optional()
        .default(false)
        .describe('Include neighboring IP addresses'),
      includeUserAgents: z
        .boolean()
        .optional()
        .default(false)
        .describe('Include user agents observed for this IP in the last 30 days')
    })
  )
  .output(
    z
      .object({
        ipAddress: z.string().describe('The queried IP address'),
        whois: z.any().optional().describe('IP WHOIS registration data'),
        neighbors: z.any().optional().describe('Neighboring IP addresses'),
        userAgents: z
          .any()
          .optional()
          .describe('User agents seen for this IP in the last 30 days')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let whois: any;
    let neighbors: any;
    let userAgents: any;
    let sections: string[] = [];

    if (ctx.input.includeWhois) {
      whois = await client.getIpWhois(ctx.input.ipAddress);
      sections.push('WHOIS');
    }

    if (ctx.input.includeNeighbors) {
      neighbors = await client.getIpNeighbors(ctx.input.ipAddress);
      sections.push('neighbors');
    }

    if (ctx.input.includeUserAgents) {
      userAgents = await client.getIpUserAgents(ctx.input.ipAddress);
      sections.push('user agents');
    }

    return {
      output: {
        ipAddress: ctx.input.ipAddress,
        whois,
        neighbors,
        userAgents
      },
      message: `Retrieved ${sections.join(', ')} for IP **${ctx.input.ipAddress}**.`
    };
  })
  .build();
