import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { googleAdminActionScopes } from '../scopes';
import { spec } from '../spec';

export let manageDomains = SlateTool.create(spec, {
  name: 'Manage Domains',
  key: 'manage_domains',
  description: `List, get, add, or delete domains associated with the Google Workspace account. Allows viewing domain verification status and managing secondary domains.`,
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .scopes(googleAdminActionScopes.manageDomains)
  .input(
    z.object({
      action: z.enum(['list', 'get', 'add', 'delete']).describe('Action to perform'),
      domainName: z.string().optional().describe('Domain name (required for get, add, delete)')
    })
  )
  .output(
    z.object({
      domains: z
        .array(
          z.object({
            domainName: z.string().optional(),
            isPrimary: z.boolean().optional(),
            verified: z.boolean().optional(),
            creationTime: z.string().optional()
          })
        )
        .optional(),
      domain: z
        .object({
          domainName: z.string().optional(),
          isPrimary: z.boolean().optional(),
          verified: z.boolean().optional(),
          creationTime: z.string().optional(),
          domainAliases: z.array(z.any()).optional()
        })
        .optional(),
      deleted: z.boolean().optional(),
      action: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      customerId: ctx.config.customerId,
      domain: ctx.config.domain
    });

    if (ctx.input.action === 'list') {
      let result = await client.listDomains();
      let domains = (result.domains || []).map((d: any) => ({
        domainName: d.domainName,
        isPrimary: d.isPrimary,
        verified: d.verified,
        creationTime: d.creationTime ? String(d.creationTime) : undefined
      }));
      return {
        output: { domains, action: 'list' },
        message: `Found **${domains.length}** domains.`
      };
    }

    if (!ctx.input.domainName) throw new Error('domainName is required');

    if (ctx.input.action === 'get') {
      let d = await client.getDomain(ctx.input.domainName);
      return {
        output: {
          domain: {
            domainName: d.domainName,
            isPrimary: d.isPrimary,
            verified: d.verified,
            creationTime: d.creationTime ? String(d.creationTime) : undefined,
            domainAliases: d.domainAliases
          },
          action: 'get'
        },
        message: `Retrieved domain **${d.domainName}** (${d.verified ? 'verified' : 'unverified'}).`
      };
    }

    if (ctx.input.action === 'add') {
      let d = await client.addDomain(ctx.input.domainName);
      return {
        output: {
          domain: {
            domainName: d.domainName,
            isPrimary: d.isPrimary,
            verified: d.verified,
            creationTime: d.creationTime ? String(d.creationTime) : undefined
          },
          action: 'add'
        },
        message: `Added domain **${d.domainName}**. Domain verification may be required.`
      };
    }

    // delete
    await client.deleteDomain(ctx.input.domainName);
    return {
      output: { deleted: true, action: 'delete' },
      message: `Deleted domain **${ctx.input.domainName}**.`
    };
  })
  .build();
