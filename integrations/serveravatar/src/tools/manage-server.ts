import { SlateTool } from 'slates';
import { z } from 'zod';
import { ServerAvatarClient } from '../lib/client';
import { spec } from '../spec';

export let manageServer = SlateTool.create(spec, {
  name: 'Manage Server',
  key: 'manage_server',
  description: `Perform management actions on a server: restart, destroy, update general settings, or update security settings.
Choose an action and provide the required parameters for that action.`,
  instructions: [
    'For "updateGeneral": name, hostname, and timezone are required.',
    'For "updateSecurity": redisPassword, sshPort, permitRootLogin, and rootPasswordAuthentication are required.',
    'For "destroy": optionally set deleteFromProvider to also remove the server from the cloud provider.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      organizationId: z.string().describe('Organization ID'),
      serverId: z.string().describe('Server ID'),
      action: z
        .enum(['restart', 'destroy', 'updateGeneral', 'updateSecurity'])
        .describe('Action to perform'),
      deleteFromProvider: z
        .boolean()
        .optional()
        .describe('Also delete server from cloud provider (only for destroy action)'),
      generalSettings: z
        .object({
          name: z.string().describe('Server name'),
          hostname: z.string().describe('Server hostname'),
          timezone: z.string().describe('Server timezone (e.g. UTC, Asia/Kolkata)'),
          phpCliVersion: z.number().optional().describe('PHP CLI version (7.0-8.5)'),
          olsAutomaticallyRestart: z
            .boolean()
            .optional()
            .describe('Auto-restart OpenLiteSpeed')
        })
        .optional()
        .describe('General settings (required for updateGeneral action)'),
      securitySettings: z
        .object({
          redisPassword: z.string().describe('Redis password'),
          sshPort: z.number().describe('SSH port number'),
          permitRootLogin: z.enum(['yes', 'no']).describe('Allow root login'),
          rootPasswordAuthentication: z
            .enum(['yes', 'no'])
            .describe('Allow password authentication'),
          redisMaxmemory: z.string().optional().describe('Redis max memory (e.g. 256mb, 1gb)'),
          maxmemoryPolicy: z.string().optional().describe('Redis eviction policy'),
          isEnabledSecurityUpdates: z
            .boolean()
            .optional()
            .describe('Enable automatic security updates')
        })
        .optional()
        .describe('Security settings (required for updateSecurity action)')
    })
  )
  .output(
    z.object({
      message: z.string().describe('Result message from the API'),
      result: z.record(z.string(), z.unknown()).optional().describe('Additional response data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ServerAvatarClient({ token: ctx.auth.token });
    let orgId = ctx.input.organizationId || ctx.config.organizationId;
    if (!orgId) throw new Error('organizationId is required either in input or config');

    let { serverId, action } = ctx.input;

    if (action === 'restart') {
      let result = await client.restartServer(orgId, serverId);
      return {
        output: {
          message:
            ((result as Record<string, unknown>).message as string) ||
            'Server restart initiated',
          result
        },
        message: `Server **${serverId}** restart initiated.`
      };
    }

    if (action === 'destroy') {
      let result = await client.destroyServer(orgId, serverId, ctx.input.deleteFromProvider);
      return {
        output: {
          message:
            ((result as Record<string, unknown>).message as string) || 'Server destroyed',
          result
        },
        message: `Server **${serverId}** has been disconnected${ctx.input.deleteFromProvider ? ' and deleted from provider' : ''}.`
      };
    }

    if (action === 'updateGeneral') {
      if (!ctx.input.generalSettings)
        throw new Error('generalSettings is required for updateGeneral action');
      let settings = ctx.input.generalSettings;
      let result = await client.updateServerGeneralSettings(orgId, serverId, {
        name: settings.name,
        hostname: settings.hostname,
        timezone: settings.timezone,
        phpCliVersion: settings.phpCliVersion,
        olsAutomaticallyRestart: settings.olsAutomaticallyRestart
      });
      return {
        output: {
          message:
            ((result as Record<string, unknown>).message as string) ||
            'General settings updated',
          result
        },
        message: `Server **${serverId}** general settings updated.`
      };
    }

    if (action === 'updateSecurity') {
      if (!ctx.input.securitySettings)
        throw new Error('securitySettings is required for updateSecurity action');
      let settings = ctx.input.securitySettings;
      let result = await client.updateServerSecuritySettings(orgId, serverId, {
        redisPassword: settings.redisPassword,
        sshPort: settings.sshPort,
        permitRootLogin: settings.permitRootLogin,
        rootPasswordAuthentication: settings.rootPasswordAuthentication,
        redisMaxmemory: settings.redisMaxmemory,
        maxmemoryPolicy: settings.maxmemoryPolicy,
        isEnabledSecurityUpdates: settings.isEnabledSecurityUpdates
      });
      return {
        output: {
          message:
            ((result as Record<string, unknown>).message as string) ||
            'Security settings updated',
          result
        },
        message: `Server **${serverId}** security settings updated.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
