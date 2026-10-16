import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { listMetadata, readList } from '../lib/responses';
import { spec } from '../spec';

export let manageDomain = SlateTool.create(spec, {
  name: 'Manage Domain',
  key: 'manage_domain',
  description: `Create, retrieve, list, update, or delete domains with configurable polling frequencies. Domains represent connected systems or applications with automatic polling capabilities.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      organisationId: z
        .number()
        .optional()
        .describe('Organisation ID from get_current_user. Omit to use the token default.'),
      action: z
        .enum(['create', 'get', 'list', 'update', 'delete'])
        .describe('Action to perform'),
      domainId: z.string().optional().describe('Domain ID (required for get, update, delete)'),
      name: z.string().optional().describe('Domain name; required for create and update'),
      frequency: z
        .enum(['6h', '12h', '1d', '1w', '30d', 'manual'])
        .optional()
        .describe('Polling frequency; required for create and update'),
      nextToken: z
        .string()
        .optional()
        .describe(
          'Continuation token returned by the previous list response. Omit page when using this token.'
        ),
      page: z
        .number()
        .optional()
        .describe(
          'Zero-based page number. Later pages follow provider continuation tokens; prefer nextToken for efficient paging.'
        ),
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
      baseUrl: ctx.auth.baseUrl ?? ctx.config.baseUrl,
      organisationId: ctx.input.organisationId
    });

    let { action, domainId } = ctx.input;

    switch (action) {
      case 'create': {
        if (!ctx.input.name || !ctx.input.frequency) {
          throw createApiServiceError('name and frequency are required for creating a domain');
        }
        let result = await client.createDomain({
          name: ctx.input.name,
          frequency: ctx.input.frequency
        });
        let data = result;
        return {
          output: { domain: data, success: true },
          message: `Domain **${ctx.input.name}** created with polling frequency **${ctx.input.frequency}**.`
        };
      }
      case 'get': {
        if (!domainId) throw createApiServiceError('domainId is required for get action');
        let data = await client.getDomain(domainId);
        return {
          output: { domain: data, success: true },
          message: `Retrieved domain **${domainId}**.`
        };
      }
      case 'list': {
        let result = await client.listDomains({
          page: ctx.input.page,
          nextToken: ctx.input.nextToken,
          size: ctx.input.size,
          sortBy: ctx.input.sortBy,
          sortOrder: ctx.input.sortOrder
        });
        let data = result;
        let domains = readList(data, 'domains');
        return {
          output: { domains, success: true, ...listMetadata(data) },
          message: `Found **${domains.length}** domain(s).`
        };
      }
      case 'update': {
        if (!domainId) throw createApiServiceError('domainId is required for update action');
        let updatePayload: Record<string, any> = {};
        if (ctx.input.name !== undefined) updatePayload.name = ctx.input.name;
        if (ctx.input.frequency !== undefined) updatePayload.frequency = ctx.input.frequency;

        let result = await client.updateDomain(domainId, updatePayload);
        let data = result;
        return {
          output: { domain: data, success: true },
          message: `Domain **${domainId}** updated.`
        };
      }
      case 'delete': {
        if (!domainId) throw createApiServiceError('domainId is required for delete action');
        await client.deleteDomain(domainId);
        return {
          output: { success: true },
          message: `Domain **${domainId}** deleted.`
        };
      }
    }
  })
  .build();
