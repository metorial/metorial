import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let lookupNetworkTool = SlateTool.create(spec, {
  name: 'Lookup Network by IP',
  key: 'lookup_network',
  description: `Retrieve detailed information about the active network an IP address belongs to, including the Autonomous Systems that announce and serve that network. Useful for network engineering, abuse investigation, and infrastructure analysis.
If no IP is provided, the caller's own IP network is returned.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ip: z
        .string()
        .optional()
        .describe("IPv4 or IPv6 address to look up. If omitted, the caller's IP is used.")
    })
  )
  .output(
    z
      .object({
        ip: z.string().optional().describe('The queried IP address'),
        network: z.string().optional().describe('Network CIDR notation'),
        networkSize: z.number().optional().describe('Number of IP addresses in the network'),
        isBogon: z
          .boolean()
          .optional()
          .describe('Whether the IP is a bogon (reserved/unallocated)'),
        carriers: z
          .array(
            z
              .object({
                asn: z.string().optional().describe('Autonomous System Number'),
                asnNumeric: z.number().optional(),
                organisation: z.string().optional().describe('Organisation name'),
                name: z.string().optional(),
                registeredCountry: z.string().optional(),
                registeredCountryName: z.string().optional(),
                totalIpv4Addresses: z.number().optional()
              })
              .passthrough()
          )
          .optional()
          .describe('Autonomous Systems serving this network')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      localityLanguage: ctx.config.localityLanguage
    });

    let result = await client.networkByIp({ ip: ctx.input.ip });

    let ipAddr = result.ip || ctx.input.ip || 'caller IP';
    let network = result.network || 'unknown';
    let carriers = result.carriers || [];
    let carrierNames = carriers
      .slice(0, 3)
      .map(
        (c: { organisation?: string; name?: string }) => c.organisation || c.name || 'unknown'
      )
      .join(', ');

    return {
      output: result,
      message: `**${ipAddr}** belongs to network **${network}**. Carriers: ${carrierNames || 'none detected'}.`
    };
  })
  .build();
