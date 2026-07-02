import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { cloudflareServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageDnsRecordTool = SlateTool.create(spec, {
  name: 'Manage DNS Record',
  key: 'manage_dns_record',
  description: `Create, retrieve, update, or delete a DNS record in a Cloudflare zone. Supports all record types including A, AAAA, CNAME, MX, TXT, NS, SRV, and more. Use **action** to specify the operation.`,
  instructions: [
    'For creating a record, provide type, name, and content. TTL of 1 means automatic.',
    'For retrieving a record, provide recordId.',
    'For updating, provide the recordId and only the fields you want to change.',
    'For MX records, also set the priority field.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'get', 'update', 'delete']).describe('Operation to perform'),
      zoneId: z.string().describe('Zone ID containing the DNS record'),
      recordId: z.string().optional().describe('Record ID (required for update and delete)'),
      type: z.string().optional().describe('DNS record type (e.g. A, AAAA, CNAME, MX, TXT)'),
      name: z
        .string()
        .optional()
        .describe('DNS record name (e.g. example.com or subdomain.example.com)'),
      content: z
        .string()
        .optional()
        .describe('DNS record content/value (e.g. IP address, hostname)'),
      ttl: z.number().optional().describe('Time to live in seconds. 1 = automatic.'),
      proxied: z
        .boolean()
        .optional()
        .describe('Whether the record is proxied through Cloudflare'),
      priority: z.number().optional().describe('Priority for MX or SRV records'),
      comment: z.string().optional().describe('Optional comment for the record')
    })
  )
  .output(
    z.object({
      recordId: z.string(),
      type: z.string().optional(),
      name: z.string().optional(),
      content: z.string().optional(),
      ttl: z.number().optional(),
      proxied: z.boolean().optional(),
      comment: z.string().optional().nullable(),
      createdOn: z.string().optional(),
      modifiedOn: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let { action, zoneId, recordId } = ctx.input;

    if (action === 'create') {
      if (!ctx.input.type || !ctx.input.name || !ctx.input.content) {
        throw cloudflareServiceError(
          'type, name, and content are required for creating a DNS record'
        );
      }

      let response = await client.createDnsRecord(zoneId, {
        type: ctx.input.type,
        name: ctx.input.name,
        content: ctx.input.content,
        ttl: ctx.input.ttl,
        proxied: ctx.input.proxied,
        priority: ctx.input.priority,
        comment: ctx.input.comment
      });

      let r = response.result;
      return {
        output: {
          recordId: r.id,
          type: r.type,
          name: r.name,
          content: r.content,
          ttl: r.ttl,
          proxied: r.proxied
        },
        message: `Created **${r.type}** record \`${r.name}\` → \`${r.content}\`.`
      };
    }

    if (action === 'get') {
      if (!recordId)
        throw cloudflareServiceError('recordId is required for retrieving a DNS record');

      let response = await client.getDnsRecord(zoneId, recordId);
      let r = response.result;
      return {
        output: {
          recordId: r.id,
          type: r.type,
          name: r.name,
          content: r.content,
          ttl: r.ttl,
          proxied: r.proxied,
          comment: r.comment,
          createdOn: r.created_on,
          modifiedOn: r.modified_on
        },
        message: `DNS record \`${r.name}\` (${r.type}) → \`${r.content}\`.`
      };
    }

    if (action === 'update') {
      if (!recordId)
        throw cloudflareServiceError('recordId is required for updating a DNS record');

      let response = await client.updateDnsRecord(zoneId, recordId, {
        type: ctx.input.type,
        name: ctx.input.name,
        content: ctx.input.content,
        ttl: ctx.input.ttl,
        proxied: ctx.input.proxied,
        priority: ctx.input.priority,
        comment: ctx.input.comment
      });

      let r = response.result;
      return {
        output: {
          recordId: r.id,
          type: r.type,
          name: r.name,
          content: r.content,
          ttl: r.ttl,
          proxied: r.proxied
        },
        message: `Updated DNS record \`${r.name}\` (${r.type}) → \`${r.content}\`.`
      };
    }

    if (action === 'delete') {
      if (!recordId)
        throw cloudflareServiceError('recordId is required for deleting a DNS record');

      let response = await client.deleteDnsRecord(zoneId, recordId);
      return {
        output: {
          recordId: response.result.id
        },
        message: `Deleted DNS record \`${recordId}\`.`
      };
    }

    throw cloudflareServiceError(`Unknown action: ${action}`);
  })
  .build();
