import { SlateTool } from 'slates';
import { z } from 'zod';
import * as dns from '../lib/dns';
import { spec } from '../spec';

export let listDnsZones = SlateTool.create(spec, {
  name: 'List DNS Zones',
  key: 'list_dns_zones',
  description: `List DNS zones in a Yandex Cloud folder. Returns both public and private DNS zones with their domain names and visibility settings.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      folderId: z.string().optional().describe('Folder ID to list DNS zones from'),
      pageSize: z.number().optional().describe('Maximum number of results'),
      pageToken: z.string().optional().describe('Pagination token')
    })
  )
  .output(
    z.object({
      dnsZones: z
        .array(
          z.object({
            dnsZoneId: z.string().describe('DNS zone ID'),
            name: z.string().optional().describe('Zone name'),
            description: z.string().optional().describe('Zone description'),
            zone: z.string().optional().describe('DNS zone domain (e.g. example.com.)'),
            folderId: z.string().optional().describe('Folder ID'),
            createdAt: z.string().optional().describe('Creation timestamp'),
            publicVisibility: z.any().optional().describe('Public visibility settings'),
            privateVisibility: z.any().optional().describe('Private visibility settings'),
            labels: z.record(z.string(), z.string()).optional().describe('Labels')
          })
        )
        .describe('List of DNS zones'),
      nextPageToken: z.string().optional().describe('Next page token')
    })
  )
  .handleInvocation(async ctx => {
    let folderId = ctx.input.folderId || ctx.config.folderId;
    if (!folderId) throw new Error('folderId is required either in input or config');

    let result = await dns.listDnsZones(
      ctx.auth,
      folderId,
      ctx.input.pageSize,
      ctx.input.pageToken
    );
    let zones = (result.dnsZones || []).map((z: any) => ({
      dnsZoneId: z.id,
      name: z.name,
      description: z.description,
      zone: z.zone,
      folderId: z.folderId,
      createdAt: z.createdAt,
      publicVisibility: z.publicVisibility,
      privateVisibility: z.privateVisibility,
      labels: z.labels
    }));

    return {
      output: {
        dnsZones: zones,
        nextPageToken: result.nextPageToken
      },
      message: `Found ${zones.length} DNS zone(s) in folder ${folderId}.`
    };
  })
  .build();

export let manageDnsZone = SlateTool.create(spec, {
  name: 'Manage DNS Zone',
  key: 'manage_dns_zone',
  description: `Create or delete a DNS zone in Yandex Cloud DNS. Supports both public (internet-accessible) and private (VPC-internal) zones.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      action: z.enum(['create', 'delete']).describe('Action to perform'),
      dnsZoneId: z.string().optional().describe('DNS zone ID (required for delete)'),
      folderId: z.string().optional().describe('Folder ID (required for create)'),
      name: z.string().optional().describe('Zone name (required for create)'),
      description: z.string().optional().describe('Zone description'),
      zone: z
        .string()
        .optional()
        .describe('DNS zone domain (required for create, e.g. example.com.)'),
      isPublic: z.boolean().optional().describe('Whether the zone is publicly visible'),
      privateNetworkIds: z
        .array(z.string())
        .optional()
        .describe('Network IDs for private zone visibility'),
      labels: z.record(z.string(), z.string()).optional().describe('Labels')
    })
  )
  .output(
    z.object({
      operationId: z.string().describe('Operation ID'),
      dnsZoneId: z.string().optional().describe('DNS zone ID'),
      done: z.boolean().describe('Whether the operation completed')
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.action === 'create') {
      let folderId = ctx.input.folderId || ctx.config.folderId;
      if (!folderId) throw new Error('folderId is required for DNS zone creation');
      if (!ctx.input.name) throw new Error('name is required for DNS zone creation');
      if (!ctx.input.zone) throw new Error('zone is required for DNS zone creation');

      let result = await dns.createDnsZone(ctx.auth, {
        folderId,
        name: ctx.input.name,
        description: ctx.input.description,
        zone: ctx.input.zone,
        publicVisibility: ctx.input.isPublic ? {} : undefined,
        privateVisibility: ctx.input.privateNetworkIds
          ? {
              networkIds: ctx.input.privateNetworkIds
            }
          : undefined,
        labels: ctx.input.labels
      });

      return {
        output: {
          operationId: result.id,
          dnsZoneId: result.metadata?.dnsZoneId,
          done: result.done || false
        },
        message: `DNS zone **${ctx.input.name}** (${ctx.input.zone}) creation initiated.`
      };
    } else {
      if (!ctx.input.dnsZoneId) throw new Error('dnsZoneId is required for deletion');

      let result = await dns.deleteDnsZone(ctx.auth, ctx.input.dnsZoneId);

      return {
        output: {
          operationId: result.id,
          done: result.done || false
        },
        message: `DNS zone **${ctx.input.dnsZoneId}** deletion initiated.`
      };
    }
  })
  .build();

export let listRecordSets = SlateTool.create(spec, {
  name: 'List DNS Records',
  key: 'list_dns_records',
  description: `List DNS record sets in a Yandex Cloud DNS zone. Returns all records with their types, TTL, and data.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      dnsZoneId: z.string().describe('DNS zone ID'),
      pageSize: z.number().optional().describe('Maximum number of results'),
      pageToken: z.string().optional().describe('Pagination token')
    })
  )
  .output(
    z.object({
      recordSets: z
        .array(
          z.object({
            name: z.string().describe('Domain name'),
            type: z.string().describe('Record type (A, AAAA, CNAME, MX, TXT, etc.)'),
            ttl: z.number().optional().describe('Time to live in seconds'),
            data: z.array(z.string()).optional().describe('Record data values')
          })
        )
        .describe('DNS record sets'),
      nextPageToken: z.string().optional().describe('Next page token')
    })
  )
  .handleInvocation(async ctx => {
    let result = await dns.listRecordSets(
      ctx.auth,
      ctx.input.dnsZoneId,
      ctx.input.pageSize,
      ctx.input.pageToken
    );
    let records = (result.recordSets || []).map((r: any) => ({
      name: r.name,
      type: r.type,
      ttl: r.ttl ? Number(r.ttl) : undefined,
      data: r.data
    }));

    return {
      output: {
        recordSets: records,
        nextPageToken: result.nextPageToken
      },
      message: `Found ${records.length} record set(s) in DNS zone ${ctx.input.dnsZoneId}.`
    };
  })
  .build();

export let upsertDnsRecords = SlateTool.create(spec, {
  name: 'Upsert DNS Records',
  key: 'upsert_dns_records',
  description: `Create or update DNS record sets in a Yandex Cloud DNS zone. Uses upsert semantics — existing records with the same name and type are replaced.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      dnsZoneId: z.string().describe('DNS zone ID'),
      records: z
        .array(
          z.object({
            name: z.string().describe('Domain name (e.g. www.example.com.)'),
            type: z.string().describe('Record type (A, AAAA, CNAME, MX, TXT, etc.)'),
            ttl: z.number().describe('Time to live in seconds'),
            data: z.array(z.string()).describe('Record data values')
          })
        )
        .describe('Record sets to upsert')
    })
  )
  .output(
    z.object({
      operationId: z.string().describe('Operation ID'),
      done: z.boolean().describe('Whether the operation completed')
    })
  )
  .handleInvocation(async ctx => {
    let result = await dns.upsertRecordSets(ctx.auth, ctx.input.dnsZoneId, {
      merges: ctx.input.records
    });

    return {
      output: {
        operationId: result.id,
        done: result.done || false
      },
      message: `Upserted ${ctx.input.records.length} record set(s) in DNS zone ${ctx.input.dnsZoneId}.`
    };
  })
  .build();
