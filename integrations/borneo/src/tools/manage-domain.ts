import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageDomain = SlateTool.create(spec, {
  name: 'Manage Domain',
  key: 'manage_domain',
  description: `Create, list, update, or delete domains with configurable polling frequencies. Domains represent connected systems or applications with automatic polling capabilities.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'list', 'update', 'delete']).describe('Action to perform'),
      domainId: z.string().optional().describe('Domain ID (required for update, delete)'),
      name: z.string().optional().describe('Domain name'),
      frequency: z
        .enum(['6h', '12h', '1d', '1w', '30d', 'manual'])
        .optional()
        .describe('Polling frequency'),
      page: z.number().optional().describe('Page number for listing'),
      size: z.number().optional().describe('Page size for listing'),
      sortBy: z.string().optional().describe('Field to sort by'),
      sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort direction')
    })
  )
  .output(
    z
      .object({
        domain: z.any().optional().describe('Domain record'),
        domains: z.array(z.any()).optional().describe('List of domains'),
        success: z.boolean().optional().describe('Whether the action succeeded')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let { action, domainId } = ctx.input;

    switch (action) {
      case 'create': {
        if (!ctx.input.name || !ctx.input.frequency) {
          throw new Error('name and frequency are required for creating a domain');
        }
        let result = await client.createDomain({
          name: ctx.input.name,
          frequency: ctx.input.frequency
        });
        let data = result?.data ?? result;
        return {
          output: { domain: data, success: true },
          message: `Domain **${ctx.input.name}** created with polling frequency **${ctx.input.frequency}**.`
        };
      }
      case 'list': {
        let result = await client.listDomains({
          page: ctx.input.page,
          size: ctx.input.size,
          sortBy: ctx.input.sortBy,
          sortOrder: ctx.input.sortOrder
        });
        let data = result?.data ?? result;
        let domains = Array.isArray(data) ? data : (data?.content ?? data?.items ?? []);
        return {
          output: { domains, success: true },
          message: `Found **${domains.length}** domain(s).`
        };
      }
      case 'update': {
        if (!domainId) throw new Error('domainId is required for update action');
        let updatePayload: Record<string, any> = {};
        if (ctx.input.name !== undefined) updatePayload.name = ctx.input.name;
        if (ctx.input.frequency !== undefined) updatePayload.frequency = ctx.input.frequency;

        let result = await client.updateDomain(domainId, updatePayload);
        let data = result?.data ?? result;
        return {
          output: { domain: data, success: true },
          message: `Domain **${domainId}** updated.`
        };
      }
      case 'delete': {
        if (!domainId) throw new Error('domainId is required for delete action');
        await client.deleteDomain(domainId);
        return {
          output: { success: true },
          message: `Domain **${domainId}** deleted.`
        };
      }
    }
  })
  .build();
