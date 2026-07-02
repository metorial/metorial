import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { vercelServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageDnsTool = SlateTool.create(spec, {
  name: 'Manage DNS Records',
  key: 'manage_dns',
  description: `List, create, update, or delete DNS records for a domain managed in Vercel. Supports A, AAAA, CNAME, MX, TXT, SRV, CAA, and other record types.`,
  instructions: [
    'Use action "list" to list all DNS records for a domain.',
    'Use action "create" to add a new DNS record.',
    'Use action "update" to modify an existing record by its ID.',
    'Use action "delete" to remove a DNS record.'
  ]
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'update', 'delete']).describe('Action to perform'),
      domain: z.string().describe('Domain name (e.g., example.com)'),
      recordId: z
        .string()
        .optional()
        .describe('DNS record ID (required for update and delete)'),
      name: z.string().optional().describe('Record name/subdomain (required for create)'),
      type: z
        .enum(['A', 'AAAA', 'ALIAS', 'CAA', 'CNAME', 'HTTPS', 'MX', 'NS', 'SRV', 'TXT'])
        .optional()
        .describe('Record type (required for create)'),
      value: z.string().optional().describe('Record value (required for create)'),
      ttl: z.number().optional().describe('TTL in seconds'),
      mxPriority: z.number().optional().describe('MX priority (for MX records)')
    })
  )
  .output(
    z.object({
      records: z
        .array(
          z.object({
            recordId: z.string().describe('DNS record ID'),
            name: z.string().describe('Record name'),
            type: z.string().describe('Record type'),
            value: z.string().describe('Record value'),
            ttl: z.number().optional().describe('TTL in seconds'),
            priority: z.number().optional().nullable().describe('Priority (for MX records)')
          })
        )
        .optional()
        .describe('List of DNS records (for list action)'),
      record: z
        .object({
          recordId: z.string().describe('DNS record ID')
        })
        .optional()
        .describe('Created/updated record'),
      success: z.boolean().describe('Whether the action succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      teamId: ctx.config.teamId
    });

    let { action, domain } = ctx.input;

    if (action === 'list') {
      let result = await client.listDnsRecords(domain);
      let records = (result.records || []).map((r: any) => ({
        recordId: r.id,
        name: r.name,
        type: r.type,
        value: r.value,
        ttl: r.ttl,
        priority: r.mxPriority || r.priority || null
      }));
      return {
        output: { records, success: true },
        message: `Found **${records.length}** DNS record(s) for **${domain}**.`
      };
    }

    if (action === 'create') {
      if (!ctx.input.name || !ctx.input.type || !ctx.input.value) {
        throw vercelServiceError('name, type, and value are required for create');
      }
      let result = await client.createDnsRecord(domain, {
        name: ctx.input.name,
        type: ctx.input.type,
        value: ctx.input.value,
        ttl: ctx.input.ttl,
        mxPriority: ctx.input.mxPriority
      });
      return {
        output: {
          record: { recordId: result.uid || result.id },
          success: true
        },
        message: `Created ${ctx.input.type} record for **${ctx.input.name}.${domain}**.`
      };
    }

    if (action === 'update') {
      if (!ctx.input.recordId) throw vercelServiceError('recordId is required for update');
      let data: Record<string, any> = {};
      if (ctx.input.name) data.name = ctx.input.name;
      if (ctx.input.type) data.type = ctx.input.type;
      if (ctx.input.value) data.value = ctx.input.value;
      if (ctx.input.ttl) data.ttl = ctx.input.ttl;
      if (ctx.input.mxPriority) data.mxPriority = ctx.input.mxPriority;

      await client.updateDnsRecord(ctx.input.recordId, data);
      return {
        output: {
          record: { recordId: ctx.input.recordId },
          success: true
        },
        message: `Updated DNS record **${ctx.input.recordId}**.`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.recordId) throw vercelServiceError('recordId is required for delete');
      await client.deleteDnsRecord(domain, ctx.input.recordId);
      return {
        output: { success: true },
        message: `Deleted DNS record **${ctx.input.recordId}** from **${domain}**.`
      };
    }

    throw vercelServiceError(`Unknown action: ${action}`);
  })
  .build();
