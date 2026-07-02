import { SlateTool } from 'slates';
import { z } from 'zod';
import { ServerAvatarClient } from '../lib/client';
import { spec } from '../spec';

export let manageSsl = SlateTool.create(spec, {
  name: 'Manage SSL',
  key: 'manage_ssl',
  description: `Manage SSL certificates for an application: view current SSL status, install automatic (Let's Encrypt) or custom certificates, update/renew SSL after adding a domain, uninstall SSL, or toggle force HTTPS redirection.`,
  instructions: [
    'After adding a new domain to an application, use the "update" action to renew the SSL certificate.',
    'For automatic SSL, set sslType to "automatic". For custom SSL, provide the certificate and private key.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      organizationId: z.string().describe('Organization ID'),
      serverId: z.string().describe('Server ID'),
      applicationId: z.string().describe('Application ID'),
      action: z
        .enum(['show', 'install', 'update', 'uninstall', 'forceHttps', 'stopForceHttps'])
        .describe('SSL action to perform'),
      sslType: z
        .enum(['automatic', 'custom'])
        .optional()
        .describe('SSL type (for install action)'),
      forceHttps: z
        .boolean()
        .optional()
        .describe('Enable force HTTPS redirection (for install action)'),
      sslCertificate: z
        .string()
        .optional()
        .describe('SSL certificate content (for custom install)'),
      privateKey: z.string().optional().describe('Private key content (for custom install)'),
      chainFile: z.string().optional().describe('Chain file content (for custom install)')
    })
  )
  .output(
    z.object({
      ssl: z.record(z.string(), z.unknown()).optional().describe('SSL certificate details'),
      responseMessage: z.string().optional().describe('API response message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ServerAvatarClient({ token: ctx.auth.token });
    let orgId = ctx.input.organizationId || ctx.config.organizationId;
    if (!orgId) throw new Error('organizationId is required either in input or config');

    let { serverId, applicationId, action } = ctx.input;

    if (action === 'show') {
      let ssl = await client.getSSL(orgId, serverId, applicationId);
      return {
        output: { ssl, responseMessage: undefined },
        message: `Retrieved SSL details for application **${applicationId}**.`
      };
    }

    if (action === 'install') {
      if (!ctx.input.sslType) throw new Error('sslType is required for install action');

      let result = await client.installSSL(orgId, serverId, applicationId, {
        sslType: ctx.input.sslType,
        forceHttps: ctx.input.forceHttps ?? false,
        sslCertificate: ctx.input.sslCertificate,
        privateKey: ctx.input.privateKey,
        chainFile: ctx.input.chainFile
      });
      return {
        output: {
          responseMessage:
            ((result as Record<string, unknown>).message as string) || 'SSL installed',
          ssl: undefined
        },
        message: `SSL certificate (${ctx.input.sslType}) installed on application **${applicationId}**.`
      };
    }

    if (action === 'update') {
      let result = await client.updateSSL(orgId, serverId, applicationId);
      return {
        output: {
          responseMessage:
            ((result as Record<string, unknown>).message as string) || 'SSL updated',
          ssl: undefined
        },
        message: `SSL certificate updated for application **${applicationId}**.`
      };
    }

    if (action === 'uninstall') {
      let result = await client.uninstallSSL(orgId, serverId, applicationId);
      return {
        output: {
          responseMessage:
            ((result as Record<string, unknown>).message as string) || 'SSL uninstalled',
          ssl: undefined
        },
        message: `SSL certificate uninstalled from application **${applicationId}**.`
      };
    }

    if (action === 'forceHttps') {
      let result = await client.forceHttps(orgId, serverId, applicationId);
      return {
        output: {
          responseMessage:
            ((result as Record<string, unknown>).message as string) || 'Force HTTPS enabled',
          ssl: undefined
        },
        message: `Force HTTPS enabled for application **${applicationId}**.`
      };
    }

    if (action === 'stopForceHttps') {
      let result = await client.stopForceHttps(orgId, serverId, applicationId);
      return {
        output: {
          responseMessage:
            ((result as Record<string, unknown>).message as string) || 'Force HTTPS disabled',
          ssl: undefined
        },
        message: `Force HTTPS disabled for application **${applicationId}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
