import { SlateTool } from 'slates';
import { z } from 'zod';
import { ServerAvatarClient } from '../lib/client';
import { spec } from '../spec';

export let createServer = SlateTool.create(spec, {
  name: 'Create Server',
  key: 'create_server',
  description: `Provision a new cloud server through a connected cloud provider (DigitalOcean, Vultr, Linode, AWS Lightsail, Hetzner). Requires a connected cloud provider account.
Use **List Server Providers** to find your connected provider account ID, and review available regions and instance sizes before creating.`,
  instructions: [
    'The cloudServerProviderId must be the ID of a connected cloud provider account, not the provider name.',
    'Use the List Server Providers tool first to get available provider IDs, regions, and sizes.'
  ],
  constraints: [
    'Server provisioning is asynchronous - the server will begin installation after creation.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      organizationId: z.string().describe('Organization ID'),
      name: z.string().describe('Server name'),
      provider: z
        .enum(['digitalocean', 'vultr', 'linode', 'lightsail', 'hetzner'])
        .describe('Cloud provider'),
      cloudServerProviderId: z.number().describe('Connected cloud provider account ID'),
      version: z.enum(['20', '22', '24']).describe('Ubuntu version (20, 22, or 24)'),
      region: z.string().describe('Cloud region slug'),
      sizeSlug: z.string().describe('Instance size slug'),
      webServer: z
        .enum(['apache2', 'nginx', 'openlitespeed', 'mern'])
        .describe('Web server type'),
      databaseType: z.enum(['mysql', 'mariadb', 'mongodb']).describe('Database type'),
      nodejs: z.boolean().default(false).describe('Install Node.js'),
      sshKey: z.boolean().optional().describe('Use custom SSH key'),
      publicKey: z.string().optional().describe('SSH public key (required if sshKey is true)'),
      availabilityZone: z
        .string()
        .optional()
        .describe('Availability zone (required for AWS Lightsail)'),
      yarn: z.boolean().optional().describe('Install Yarn (for MERN stack)'),
      linodeRootPassword: z.string().optional().describe('Root password (required for Linode)')
    })
  )
  .output(
    z.object({
      server: z.record(z.string(), z.unknown()).describe('Created server details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ServerAvatarClient({ token: ctx.auth.token });
    let orgId = ctx.input.organizationId || ctx.config.organizationId;
    if (!orgId) throw new Error('organizationId is required either in input or config');

    let server = await client.createServer(orgId, {
      name: ctx.input.name,
      provider: ctx.input.provider,
      cloudServerProviderId: ctx.input.cloudServerProviderId,
      version: ctx.input.version,
      region: ctx.input.region,
      sizeSlug: ctx.input.sizeSlug,
      webServer: ctx.input.webServer,
      databaseType: ctx.input.databaseType,
      nodejs: ctx.input.nodejs,
      sshKey: ctx.input.sshKey,
      publicKey: ctx.input.publicKey,
      availabilityZone: ctx.input.availabilityZone,
      yarn: ctx.input.yarn,
      linodeRootPassword: ctx.input.linodeRootPassword
    });

    return {
      output: { server },
      message: `Server **${ctx.input.name}** is being provisioned on ${ctx.input.provider} with ${ctx.input.webServer} and ${ctx.input.databaseType}.`
    };
  })
  .build();
