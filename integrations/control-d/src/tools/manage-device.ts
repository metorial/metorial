import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageDevice = SlateTool.create(spec, {
  name: 'Manage Device',
  key: 'manage_device',
  description: `Create, update, or delete a device (endpoint). Devices are unique DNS resolvers that enforce profiles on physical devices. When created, resolver addresses (DoH, DoT, IPv4, IPv6) are automatically provisioned. You can assign profiles, configure IP learning, enable legacy resolvers, set analytics levels, and more.`,
  instructions: [
    'To create: provide name, profileId, and icon (e.g., "desktop-windows", "mobile-ios", "router-asus").',
    'To update: provide deviceId and any fields you want to change.',
    'To delete: provide deviceId. Warning: this will break DNS on any physical device using this resolver.'
  ]
})
  .input(
    z.object({
      operation: z.enum(['create', 'update', 'delete']).describe('Operation to perform'),
      deviceId: z.string().optional().describe('Device ID (required for update and delete)'),
      name: z.string().optional().describe('Device name (required for create)'),
      profileId: z.string().optional().describe('Profile ID to enforce (required for create)'),
      icon: z
        .string()
        .optional()
        .describe(
          'Device icon type (required for create, e.g., "desktop-windows", "mobile-ios")'
        ),
      profileId2: z
        .string()
        .optional()
        .describe('Secondary profile ID for scheduled swapping (-1 to remove)'),
      stats: z.number().optional().describe('Analytics level: 0=off, 1=basic, 2=full'),
      learnIp: z.boolean().optional().describe('Enable/disable IP learning'),
      restricted: z.boolean().optional().describe('Restrict to authorized IPs only'),
      legacyIpv4: z.boolean().optional().describe('Generate legacy IPv4/IPv6 resolver'),
      description: z.string().optional().describe('Device description/comment'),
      status: z
        .number()
        .optional()
        .describe('Device status: 0=pending, 1=active, 2=soft disabled, 3=hard disabled'),
      clientCount: z
        .string()
        .optional()
        .describe('Number of physical devices using this endpoint')
    })
  )
  .output(
    z.object({
      deviceId: z.string().describe('Device primary key'),
      name: z.string().describe('Device name'),
      profileId: z.string().describe('Assigned profile ID'),
      profileName: z.string().describe('Assigned profile name'),
      dohUrl: z.string().describe('DNS over HTTPS URL'),
      dotHostname: z.string().describe('DNS over TLS hostname'),
      ipv4Resolvers: z.array(z.string()).describe('IPv4 resolver addresses'),
      ipv6Resolvers: z.array(z.string()).describe('IPv6 resolver addresses')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let {
      operation,
      deviceId,
      name,
      profileId,
      icon,
      profileId2,
      stats,
      learnIp,
      restricted,
      legacyIpv4,
      description,
      status,
      clientCount
    } = ctx.input;

    if (operation === 'create') {
      if (!name) throw new Error('name is required for create');
      if (!profileId) throw new Error('profileId is required for create');
      if (!icon) throw new Error('icon is required for create');

      let device = await client.createDevice({
        name,
        profileId,
        icon,
        profileId2,
        stats,
        learnIp: learnIp !== undefined ? (learnIp ? 1 : 0) : undefined,
        restricted: restricted !== undefined ? (restricted ? 1 : 0) : undefined,
        legacyIpv4Status: legacyIpv4 !== undefined ? (legacyIpv4 ? 1 : 0) : undefined,
        desc: description,
        clientCount
      });

      return {
        output: {
          deviceId: device.PK,
          name: device.name,
          profileId: device.profile?.PK || '',
          profileName: device.profile?.name || '',
          dohUrl: device.resolvers?.doh || '',
          dotHostname: device.resolvers?.dot || '',
          ipv4Resolvers: device.resolvers?.v4 || [],
          ipv6Resolvers: device.resolvers?.v6 || []
        },
        message: `Created device **${device.name}** with DoH URL: \`${device.resolvers?.doh}\``
      };
    }

    if (!deviceId) throw new Error('deviceId is required for update and delete');

    if (operation === 'delete') {
      await client.deleteDevice(deviceId);
      return {
        output: {
          deviceId,
          name: '',
          profileId: '',
          profileName: '',
          dohUrl: '',
          dotHostname: '',
          ipv4Resolvers: [],
          ipv6Resolvers: []
        },
        message: `Deleted device **${deviceId}**.`
      };
    }

    // update
    let device = await client.modifyDevice(deviceId, {
      name,
      profileId,
      icon,
      profileId2,
      stats,
      learnIp: learnIp !== undefined ? (learnIp ? 1 : 0) : undefined,
      restricted: restricted !== undefined ? (restricted ? 1 : 0) : undefined,
      legacyIpv4Status: legacyIpv4 !== undefined ? (legacyIpv4 ? 1 : 0) : undefined,
      desc: description,
      status,
      clientCount
    });

    return {
      output: {
        deviceId: device.PK,
        name: device.name,
        profileId: device.profile?.PK || '',
        profileName: device.profile?.name || '',
        dohUrl: device.resolvers?.doh || '',
        dotHostname: device.resolvers?.dot || '',
        ipv4Resolvers: device.resolvers?.v4 || [],
        ipv6Resolvers: device.resolvers?.v6 || []
      },
      message: `Updated device **${device.name}** (${device.PK}).`
    };
  })
  .build();
