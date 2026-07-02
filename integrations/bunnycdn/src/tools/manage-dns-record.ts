import { SlateTool } from 'slates';
import { z } from 'zod';
import { CoreClient } from '../lib/client';
import { spec } from '../spec';

let DNS_RECORD_TYPES: Record<string, number> = {
  A: 0,
  AAAA: 1,
  CNAME: 2,
  TXT: 3,
  MX: 4,
  Redirect: 5,
  Flatten: 6,
  PullZone: 7,
  SRV: 8,
  CAA: 9,
  PTR: 10,
  Script: 11,
  NS: 12
};

export let manageDnsRecord = SlateTool.create(spec, {
  name: 'Manage DNS Record',
  key: 'manage_dns_record',
  description: `Add, update, or delete DNS records within a DNS zone. Supports A, AAAA, CNAME, TXT, MX, SRV, CAA, NS, PTR, and other record types.`,
  instructions: [
    'Record types can be specified by name (e.g. "A", "CNAME", "MX") or numeric code.',
    'The dnsZoneId is the parent zone; recordId is the specific record for update/delete.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['add', 'update', 'delete']).describe('The record operation to perform'),
      dnsZoneId: z.number().describe('DNS zone ID containing the record'),
      recordId: z
        .number()
        .optional()
        .describe('DNS record ID. Required for update and delete.'),
      recordType: z
        .string()
        .optional()
        .describe(
          'Record type name: A, AAAA, CNAME, TXT, MX, SRV, CAA, NS, PTR, Redirect, Flatten, PullZone, Script. Required for add.'
        ),
      name: z.string().optional().describe('Record name / subdomain (add/update)'),
      value: z.string().optional().describe('Record value (add/update)'),
      ttl: z
        .number()
        .optional()
        .describe('TTL in seconds (add/update). Default is usually 300.'),
      priority: z.number().optional().describe('Priority for MX and SRV records (add/update)'),
      weight: z.number().optional().describe('Weight for SRV records (add/update)'),
      port: z.number().optional().describe('Port for SRV records (add/update)'),
      disabled: z
        .boolean()
        .optional()
        .describe('Whether the record should be disabled (add/update)'),
      comment: z.string().optional().describe('Comment for the record (add/update)')
    })
  )
  .output(
    z.object({
      recordId: z.number().optional().describe('ID of the created or updated record'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CoreClient({ token: ctx.auth.token });

    switch (ctx.input.action) {
      case 'add': {
        let typeCode = ctx.input.recordType
          ? (DNS_RECORD_TYPES[ctx.input.recordType] ??
            Number.parseInt(ctx.input.recordType, 10))
          : 0;
        let data: Record<string, any> = {
          Type: typeCode,
          Name: ctx.input.name || '',
          Value: ctx.input.value || ''
        };
        if (ctx.input.ttl !== undefined) data.Ttl = ctx.input.ttl;
        if (ctx.input.priority !== undefined) data.Priority = ctx.input.priority;
        if (ctx.input.weight !== undefined) data.Weight = ctx.input.weight;
        if (ctx.input.port !== undefined) data.Port = ctx.input.port;
        if (ctx.input.disabled !== undefined) data.Disabled = ctx.input.disabled;
        if (ctx.input.comment !== undefined) data.Comment = ctx.input.comment;

        let result = await client.addDnsRecord(ctx.input.dnsZoneId, data);
        return {
          output: { recordId: result?.Id, success: true },
          message: `Added **${ctx.input.recordType}** record for **${ctx.input.name || '@'}** → **${ctx.input.value}** in zone ${ctx.input.dnsZoneId}.`
        };
      }
      case 'update': {
        let data: Record<string, any> = {};
        if (ctx.input.name !== undefined) data.Name = ctx.input.name;
        if (ctx.input.value !== undefined) data.Value = ctx.input.value;
        if (ctx.input.ttl !== undefined) data.Ttl = ctx.input.ttl;
        if (ctx.input.priority !== undefined) data.Priority = ctx.input.priority;
        if (ctx.input.weight !== undefined) data.Weight = ctx.input.weight;
        if (ctx.input.port !== undefined) data.Port = ctx.input.port;
        if (ctx.input.disabled !== undefined) data.Disabled = ctx.input.disabled;
        if (ctx.input.comment !== undefined) data.Comment = ctx.input.comment;

        await client.updateDnsRecord(ctx.input.dnsZoneId, ctx.input.recordId!, data);
        return {
          output: { recordId: ctx.input.recordId, success: true },
          message: `Updated DNS record **${ctx.input.recordId}** in zone ${ctx.input.dnsZoneId}.`
        };
      }
      case 'delete': {
        await client.deleteDnsRecord(ctx.input.dnsZoneId, ctx.input.recordId!);
        return {
          output: { success: true },
          message: `Deleted DNS record **${ctx.input.recordId}** from zone ${ctx.input.dnsZoneId}.`
        };
      }
    }
  })
  .build();
