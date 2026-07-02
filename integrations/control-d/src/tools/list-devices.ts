import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listDevices = SlateTool.create(spec, {
  name: 'List Devices',
  key: 'list_devices',
  description: `List all devices (endpoints) configured in your Control D account. Devices are unique DNS resolvers that enforce profiles. Optionally filter by device type (user devices or routers). Returns device names, resolver addresses, assigned profiles, and status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      deviceType: z
        .enum(['all', 'users', 'routers'])
        .optional()
        .describe('Filter by device type (default: all)')
    })
  )
  .output(
    z.object({
      devices: z.array(
        z.object({
          deviceId: z.string().describe('Device primary key'),
          resolverUid: z.string().describe('Resolver unique identifier'),
          name: z.string().describe('Device name'),
          description: z.string().describe('Device description'),
          icon: z.string().describe('Device icon type'),
          status: z
            .number()
            .describe('Device status: 0=pending, 1=active, 2=soft disabled, 3=hard disabled'),
          profileName: z.string().describe('Assigned profile name'),
          profileId: z.string().describe('Assigned profile ID'),
          dohUrl: z.string().describe('DNS over HTTPS resolver URL'),
          dotHostname: z.string().describe('DNS over TLS hostname'),
          ipv4Resolvers: z.array(z.string()).describe('IPv4 resolver addresses'),
          ipv6Resolvers: z.array(z.string()).describe('IPv6 resolver addresses'),
          learnIp: z.boolean().describe('Whether IP learning is enabled'),
          restricted: z.boolean().describe('Whether restricted to authorized IPs')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let filter =
      ctx.input.deviceType === 'users'
        ? ('users' as const)
        : ctx.input.deviceType === 'routers'
          ? ('routers' as const)
          : undefined;
    let devices = await client.listDevices(filter);

    let mapped = devices.map(d => ({
      deviceId: d.PK,
      resolverUid: d.resolvers?.uid || '',
      name: d.name,
      description: d.desc || '',
      icon: d.icon,
      status: d.status,
      profileName: d.profile?.name || '',
      profileId: d.profile?.PK || '',
      dohUrl: d.resolvers?.doh || '',
      dotHostname: d.resolvers?.dot || '',
      ipv4Resolvers: d.resolvers?.v4 || [],
      ipv6Resolvers: d.resolvers?.v6 || [],
      learnIp: d.learn_ip === 1,
      restricted: d.restricted === 1
    }));

    return {
      output: { devices: mapped },
      message: `Found **${mapped.length}** device(s)${filter ? ` (${filter})` : ''}.`
    };
  })
  .build();
