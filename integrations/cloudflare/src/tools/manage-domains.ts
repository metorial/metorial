import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { cloudflareServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageDomainsTool = SlateTool.create(spec, {
  name: 'Manage Domain Registrations',
  key: 'manage_domains',
  description: `List, get details, or update domain registrations managed through Cloudflare Registrar. View registration status, update auto-renew, lock, and privacy settings.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'get', 'update']).describe('Operation to perform'),
      accountId: z.string().optional().describe('Account ID (uses config if not provided)'),
      domainName: z.string().optional().describe('Domain name (required for get and update)'),
      autoRenew: z.boolean().optional().describe('Enable or disable auto-renewal'),
      locked: z.boolean().optional().describe('Lock or unlock the domain'),
      privacy: z.boolean().optional().describe('Enable or disable WHOIS privacy')
    })
  )
  .output(
    z.object({
      domains: z
        .array(
          z.object({
            domainName: z.string(),
            registrant: z.string().optional(),
            status: z.string().optional(),
            expiresAt: z.string().optional(),
            autoRenew: z.boolean().optional(),
            locked: z.boolean().optional()
          })
        )
        .optional(),
      domain: z
        .object({
          domainName: z.string(),
          registrant: z.string().optional(),
          status: z.string().optional(),
          expiresAt: z.string().optional(),
          autoRenew: z.boolean().optional(),
          locked: z.boolean().optional(),
          privacy: z.boolean().optional()
        })
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let accountId = ctx.input.accountId || ctx.config.accountId;
    if (!accountId) throw cloudflareServiceError('accountId is required');

    let client = new Client(ctx.auth);
    let { action } = ctx.input;

    if (action === 'list') {
      let response = await client.listDomains(accountId);
      let domains = response.result.map((d: any) => ({
        domainName: d.domain_name || d.name,
        registrant: d.registrant_contact?.email,
        status: d.status,
        expiresAt: d.expires_at,
        autoRenew: d.auto_renew,
        locked: d.locked
      }));
      return {
        output: { domains },
        message: `Found **${domains.length}** registered domain(s).`
      };
    }

    if (action === 'get') {
      if (!ctx.input.domainName) throw cloudflareServiceError('domainName is required');
      let response = await client.getDomain(accountId, ctx.input.domainName);
      let d = response.result;
      return {
        output: {
          domain: {
            domainName: d.domain_name || d.name,
            registrant: d.registrant_contact?.email,
            status: d.status,
            expiresAt: d.expires_at,
            autoRenew: d.auto_renew,
            locked: d.locked,
            privacy: d.privacy
          }
        },
        message: `Domain **${d.domain_name || d.name}** — Status: ${d.status}, Expires: ${d.expires_at || 'N/A'}`
      };
    }

    if (action === 'update') {
      if (!ctx.input.domainName) throw cloudflareServiceError('domainName is required');
      let response = await client.updateDomain(accountId, ctx.input.domainName, {
        autoRenew: ctx.input.autoRenew,
        locked: ctx.input.locked,
        privacy: ctx.input.privacy
      });
      let d = response.result;
      return {
        output: {
          domain: {
            domainName: d.domain_name || d.name || ctx.input.domainName,
            autoRenew: d.auto_renew ?? ctx.input.autoRenew,
            locked: d.locked ?? ctx.input.locked,
            privacy: d.privacy ?? ctx.input.privacy
          }
        },
        message: `Updated domain **${ctx.input.domainName}** settings.`
      };
    }

    throw cloudflareServiceError(`Unknown action: ${action}`);
  })
  .build();
