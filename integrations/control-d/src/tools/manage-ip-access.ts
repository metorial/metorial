import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageIpAccess = SlateTool.create(spec, {
  name: 'Manage IP Access',
  key: 'manage_ip_access',
  description: `List, authorize, or deauthorize IP addresses for a device's DNS resolver. Useful for Legacy DNS enforcement where IP-based identification is required. Lists up to the latest 50 known IPs that have queried against a device.`,
  instructions: [
    'Use "list" to see IPs that have queried against the device.',
    'Use "authorize" to add new IPs to the authorized list.',
    'Use "deauthorize" to remove IPs from the authorized list.'
  ]
})
  .input(
    z.object({
      operation: z.enum(['list', 'authorize', 'deauthorize']).describe('Operation to perform'),
      deviceId: z.string().describe('Device ID to manage IPs for'),
      ips: z
        .array(z.string())
        .optional()
        .describe(
          'IP addresses to authorize or deauthorize (required for authorize/deauthorize)'
        )
    })
  )
  .output(
    z.object({
      ips: z.array(
        z.object({
          ip: z.string().describe('IP address'),
          timestamp: z.number().optional().describe('When the IP was last seen'),
          type: z.string().optional().describe('IP type (v4 or v6)'),
          country: z.string().optional().describe('Country code')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { operation, deviceId, ips } = ctx.input;

    if (operation === 'authorize') {
      if (!ips || ips.length === 0) throw new Error('ips is required for authorize');
      await client.authorizeIps(deviceId, ips);
      return {
        output: { ips: ips.map(ip => ({ ip })) },
        message: `Authorized **${ips.length}** IP(s) for device ${deviceId}: ${ips.join(', ')}.`
      };
    }

    if (operation === 'deauthorize') {
      if (!ips || ips.length === 0) throw new Error('ips is required for deauthorize');
      await client.deauthorizeIps(deviceId, ips);
      return {
        output: { ips: ips.map(ip => ({ ip })) },
        message: `Deauthorized **${ips.length}** IP(s) from device ${deviceId}: ${ips.join(', ')}.`
      };
    }

    // list
    let knownIps = await client.listKnownIps(deviceId);
    return {
      output: {
        ips: knownIps.map(ip => ({
          ip: ip.ip,
          timestamp: ip.ts,
          type: ip.type,
          country: ip.country
        }))
      },
      message: `Found **${knownIps.length}** known IP(s) for device ${deviceId}.`
    };
  })
  .build();
