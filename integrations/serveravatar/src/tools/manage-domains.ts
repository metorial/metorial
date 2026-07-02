import { SlateTool } from 'slates';
import { z } from 'zod';
import { ServerAvatarClient } from '../lib/client';
import { spec } from '../spec';

export let manageDomains = SlateTool.create(spec, {
  name: 'Manage Domains',
  key: 'manage_domains',
  description: `List, add, or remove custom domains for an application. After adding a new domain, you may need to update the SSL certificate using the Manage SSL tool.`,
  instructions: [
    'After adding a domain, use the Manage SSL tool with action "update" to refresh the SSL certificate.'
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
      applicationId: z.string().describe('Application ID'),
      action: z.enum(['list', 'add', 'remove']).describe('Action to perform'),
      domain: z.string().optional().describe('Domain name to add (for add action)'),
      domainId: z.string().optional().describe('Domain ID to remove (for remove action)')
    })
  )
  .output(
    z.object({
      domains: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('List of domains'),
      responseMessage: z.string().optional().describe('API response message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ServerAvatarClient({ token: ctx.auth.token });
    let orgId = ctx.input.organizationId || ctx.config.organizationId;
    if (!orgId) throw new Error('organizationId is required either in input or config');

    let { serverId, applicationId, action } = ctx.input;

    if (action === 'list') {
      let domains = await client.listDomains(orgId, serverId, applicationId);
      return {
        output: { domains, responseMessage: undefined },
        message: `Found **${domains.length}** domain(s) for application **${applicationId}**.`
      };
    }

    if (action === 'add') {
      if (!ctx.input.domain) throw new Error('domain is required for add action');
      let result = await client.addDomain(orgId, serverId, applicationId, ctx.input.domain);
      return {
        output: {
          responseMessage:
            ((result as Record<string, unknown>).message as string) || 'Domain added',
          domains: undefined
        },
        message: `Domain **${ctx.input.domain}** added to application **${applicationId}**. Remember to update the SSL certificate.`
      };
    }

    if (action === 'remove') {
      if (!ctx.input.domainId) throw new Error('domainId is required for remove action');
      let result = await client.removeDomain(
        orgId,
        serverId,
        applicationId,
        ctx.input.domainId
      );
      return {
        output: {
          responseMessage:
            ((result as Record<string, unknown>).message as string) || 'Domain removed',
          domains: undefined
        },
        message: `Domain **${ctx.input.domainId}** removed from application **${applicationId}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
