import { SlateTool } from 'slates';
import { z } from 'zod';
import { ServerAvatarClient } from '../lib/client';
import { spec } from '../spec';

export let manageApplication = SlateTool.create(spec, {
  name: 'Manage Application',
  key: 'manage_application',
  description: `Perform management actions on an application: delete it, view logs, or get SFTP credentials.
Choose an action to execute against a specific application on a server.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      organizationId: z.string().describe('Organization ID'),
      serverId: z.string().describe('Server ID'),
      applicationId: z.string().describe('Application ID'),
      action: z.enum(['destroy', 'logs', 'sftpCredentials']).describe('Action to perform')
    })
  )
  .output(
    z.object({
      responseMessage: z.string().optional().describe('API response message'),
      logs: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Application logs (for logs action)'),
      sftpCredentials: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('SFTP credentials (for sftpCredentials action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ServerAvatarClient({ token: ctx.auth.token });
    let orgId = ctx.input.organizationId || ctx.config.organizationId;
    if (!orgId) throw new Error('organizationId is required either in input or config');

    let { serverId, applicationId, action } = ctx.input;

    if (action === 'destroy') {
      let result = await client.destroyApplication(orgId, serverId, applicationId);
      return {
        output: {
          responseMessage:
            ((result as Record<string, unknown>).message as string) || 'Application deleted',
          logs: undefined,
          sftpCredentials: undefined
        },
        message: `Application **${applicationId}** has been deleted.`
      };
    }

    if (action === 'logs') {
      let logs = await client.getApplicationLogs(orgId, serverId, applicationId);
      return {
        output: { logs, responseMessage: undefined, sftpCredentials: undefined },
        message: `Retrieved logs for application **${applicationId}**.`
      };
    }

    if (action === 'sftpCredentials') {
      let sftpCredentials = await client.getSftpCredentials(orgId, serverId, applicationId);
      return {
        output: { sftpCredentials, responseMessage: undefined, logs: undefined },
        message: `Retrieved SFTP credentials for application **${applicationId}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
