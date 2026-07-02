import { SlateTool } from 'slates';
import { z } from 'zod';
import { MailtrapClient } from '../lib/client';
import { spec } from '../spec';

export let manageSendingDomain = SlateTool.create(spec, {
  name: 'Manage Sending Domain',
  key: 'manage_sending_domain',
  description: `List, create, retrieve, or delete sending domains. Domains must be verified via DNS before you can send emails. Each domain requires a compliance check after DNS verification.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'get', 'delete']).describe('Action to perform'),
      domainId: z
        .number()
        .optional()
        .describe('Sending domain ID. Required for get and delete.'),
      domainName: z
        .string()
        .optional()
        .describe('Domain name to add (e.g., example.com). Required for create.')
    })
  )
  .output(
    z.object({
      domains: z
        .array(
          z.object({
            domainId: z.number().describe('Domain ID'),
            domainName: z.string().describe('Domain name'),
            status: z.string().optional().describe('Verification status')
          })
        )
        .optional()
        .describe('List of sending domains'),
      domainId: z.number().optional().describe('ID of the affected domain'),
      domainName: z.string().optional().describe('Domain name'),
      status: z.string().optional().describe('Domain verification status'),
      dnsRecords: z.any().optional().describe('DNS records required for verification'),
      deleted: z.boolean().optional().describe('Whether the domain was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MailtrapClient({
      token: ctx.auth.token,
      accountId: ctx.config.accountId
    });

    let { action, domainId, domainName } = ctx.input;

    if (action === 'list') {
      let result = await client.listSendingDomains();
      let domains = (Array.isArray(result) ? result : []).map((d: any) => ({
        domainId: d.id,
        domainName: d.name || d.domain_name || '',
        status: d.status
      }));
      return {
        output: { domains },
        message: `Found **${domains.length}** sending domain(s).`
      };
    }

    if (action === 'create') {
      if (!domainName) throw new Error('domainName is required for creating a sending domain');
      let result = await client.createSendingDomain(domainName);
      return {
        output: {
          domainId: result.id,
          domainName: result.name || result.domain_name || domainName,
          status: result.status,
          dnsRecords: result.dns
        },
        message: `Sending domain **${domainName}** created (ID: ${result.id}). Complete DNS verification to start sending.`
      };
    }

    if (action === 'get') {
      if (!domainId) throw new Error('domainId is required for getting a sending domain');
      let result = await client.getSendingDomain(domainId);
      return {
        output: {
          domainId: result.id,
          domainName: result.name || result.domain_name || '',
          status: result.status,
          dnsRecords: result.dns
        },
        message: `Domain **${result.name || result.domain_name}** — Status: ${result.status}.`
      };
    }

    if (action === 'delete') {
      if (!domainId) throw new Error('domainId is required for deleting a sending domain');
      await client.deleteSendingDomain(domainId);
      return {
        output: { domainId, deleted: true },
        message: `Sending domain **${domainId}** deleted.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
