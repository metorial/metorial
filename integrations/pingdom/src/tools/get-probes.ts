import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getProbes = SlateTool.create(spec, {
  name: 'List Probe Servers',
  key: 'list_probes',
  description: `Lists all Pingdom probe servers used for uptime and transaction checks. Each probe includes its geographic location, IP addresses, and active status. Useful for understanding where checks originate and for configuring firewall rules.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      onlyActive: z.boolean().optional().describe('Only return active probes. Default: true'),
      includeDeleted: z.boolean().optional().describe('Include deleted probes')
    })
  )
  .output(
    z.object({
      probes: z
        .array(
          z.object({
            probeId: z.number().describe('Probe server ID'),
            name: z.string().optional().describe('Probe name'),
            country: z.string().optional().describe('Country name'),
            countryIso: z.string().optional().describe('Country ISO code'),
            city: z.string().optional().describe('City name'),
            region: z.string().optional().describe('Geographic region'),
            hostname: z.string().optional().describe('Probe hostname'),
            ip: z.string().optional().describe('IPv4 address'),
            ipv6: z.string().optional().describe('IPv6 address'),
            active: z.boolean().optional().describe('Whether the probe is currently active')
          })
        )
        .describe('List of probe servers')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountEmail: ctx.auth.accountEmail
    });

    let result = await client.listProbes({
      onlyactive: ctx.input.onlyActive,
      includedeleted: ctx.input.includeDeleted
    });

    let probes = (result.probes || []).map((p: any) => ({
      probeId: p.id,
      name: p.name,
      country: p.country,
      countryIso: p.countryiso,
      city: p.city,
      region: p.region,
      hostname: p.hostname,
      ip: p.ip,
      ipv6: p.ipv6,
      active: p.active
    }));

    return {
      output: { probes },
      message: `Found **${probes.length}** probe server(s).`
    };
  })
  .build();
