import { SlateTool } from 'slates';
import { z } from 'zod';
import { WhoisFreaksClient } from '../lib/client';
import { spec } from '../spec';

export let ipGeolocation = SlateTool.create(spec, {
  name: 'IP Geolocation',
  key: 'ip_geolocation',
  description: `Get geolocation and network intelligence data for one or more IP addresses. Returns country, region, city, ZIP code, coordinates, timezone, ISP, ASN, and organization info. Also detects VPN/proxy usage and threat indicators. Supports bulk lookups of up to 100 IPs.`,
  constraints: ['Bulk lookups support up to 100 IPs per request.'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      ip: z.string().optional().describe('Single IPv4 or IPv6 address to geolocate'),
      ips: z
        .array(z.string())
        .optional()
        .describe('Array of IP addresses for bulk geolocation lookup (max 100)')
    })
  )
  .output(
    z.object({
      geolocation: z
        .any()
        .describe('Geolocation and network intelligence data for the queried IP(s)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WhoisFreaksClient({ token: ctx.auth.token });

    if (ctx.input.ips && ctx.input.ips.length > 0) {
      let result = await client.bulkIpGeolocation(ctx.input.ips);
      return {
        output: { geolocation: result },
        message: `Retrieved geolocation data for **${ctx.input.ips.length}** IP addresses.`
      };
    }

    if (ctx.input.ip) {
      let result = await client.ipGeolocation(ctx.input.ip);
      return {
        output: { geolocation: result },
        message: `Retrieved geolocation data for **${ctx.input.ip}**.`
      };
    }

    throw new Error('Either ip or ips must be provided.');
  })
  .build();
