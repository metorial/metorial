import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { RenderClient } from '../lib/client';
import { spec } from '../spec';

export let manageCustomDomains = SlateTool.create(spec, {
  name: 'Manage Custom Domains',
  key: 'manage_custom_domains',
  description: `Add, list, verify, or delete custom domains on a Render service. Use **list** to see configured domains, **add** to attach a new domain, **verify** to check DNS configuration, or **delete** to remove a domain.`
})
  .input(
    z.object({
      action: z.enum(['list', 'add', 'verify', 'delete']).describe('Action to perform'),
      serviceId: z.string().optional().describe('Service ID (required for list and add)'),
      domainId: z
        .string()
        .optional()
        .describe('Custom domain ID or domain name (required for verify and delete)'),
      domainName: z
        .string()
        .optional()
        .describe('Domain name to add (required for add action)')
    })
  )
  .output(
    z.object({
      domains: z
        .array(
          z.object({
            domainId: z.string().describe('Custom domain ID'),
            name: z.string().describe('Domain name'),
            verificationStatus: z.string().optional().describe('DNS verification status'),
            createdAt: z.string().optional().describe('Creation timestamp')
          })
        )
        .optional()
        .describe('List of custom domains (for list action)'),
      domain: z
        .object({
          domainId: z.string().describe('Custom domain ID'),
          name: z.string().describe('Domain name'),
          verificationStatus: z.string().optional().describe('DNS verification status')
        })
        .optional()
        .describe('Domain details (for add/verify actions)'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RenderClient(ctx.auth.token);
    let { action } = ctx.input;

    if (action === 'list') {
      if (!ctx.input.serviceId)
        throw createApiServiceError('serviceId is required for list action');
      let data = await client.listCustomDomains(ctx.input.serviceId);
      let domains = (data as any[]).map((item: any) => {
        let d = item.customDomain || item;
        return {
          domainId: d.id,
          name: d.name,
          verificationStatus: d.verificationStatus,
          createdAt: d.createdAt
        };
      });

      return {
        output: { domains, success: true },
        message: `Found **${domains.length}** custom domain(s).${domains.map(d => `\n- **${d.name}** (${d.verificationStatus || 'unknown'})`).join('')}`
      };
    }

    if (action === 'add') {
      if (!ctx.input.serviceId)
        throw createApiServiceError('serviceId is required for add action');
      if (!ctx.input.domainName)
        throw createApiServiceError('domainName is required for add action');
      let d = await client.addCustomDomain(ctx.input.serviceId, ctx.input.domainName);
      return {
        output: {
          domain: { domainId: d.id, name: d.name, verificationStatus: d.verificationStatus },
          success: true
        },
        message: `Added custom domain **${d.name}** to service \`${ctx.input.serviceId}\`. Verification status: **${d.verificationStatus || 'pending'}**.`
      };
    }

    if (action === 'verify') {
      if (!ctx.input.serviceId)
        throw createApiServiceError('serviceId is required for verify action');
      if (!ctx.input.domainId)
        throw createApiServiceError('domainId is required for verify action');
      let d = await client.verifyCustomDomain(ctx.input.serviceId, ctx.input.domainId);
      return {
        output: {
          domain: { domainId: d.id, name: d.name, verificationStatus: d.verificationStatus },
          success: true
        },
        message: `DNS verification for **${d.name}**: **${d.verificationStatus || 'unknown'}**.`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.serviceId)
        throw createApiServiceError('serviceId is required for delete action');
      if (!ctx.input.domainId)
        throw createApiServiceError('domainId is required for delete action');
      await client.deleteCustomDomain(ctx.input.serviceId, ctx.input.domainId);
      return {
        output: { success: true },
        message: `Deleted custom domain \`${ctx.input.domainId}\`.`
      };
    }

    return { output: { success: false }, message: 'Unknown action.' };
  })
  .build();
