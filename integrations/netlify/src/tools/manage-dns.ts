import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { netlifyServiceError } from '../lib/errors';
import { spec } from '../spec';

export let listDnsZones = SlateTool.create(spec, {
  name: 'List DNS Zones',
  key: 'list_dns_zones',
  description: `List all DNS zones managed by Netlify DNS. Optionally filter by account slug.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      accountSlug: z.string().optional().describe('Filter by account/team slug')
    })
  )
  .output(
    z.object({
      zones: z.array(
        z.object({
          zoneId: z.string().describe('DNS zone identifier'),
          name: z.string().describe('Zone domain name'),
          accountId: z.string().optional().describe('Account ID'),
          accountSlug: z.string().optional().describe('Account slug'),
          siteId: z.string().optional().describe('Associated site ID'),
          domain: z.string().optional().describe('Zone domain'),
          recordCount: z.number().optional().describe('Number of DNS records'),
          dnsServers: z.array(z.string()).optional().describe('Assigned DNS servers'),
          createdAt: z.string().optional().describe('Zone creation timestamp'),
          updatedAt: z.string().optional().describe('Zone update timestamp')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let zones = await client.listDnsZones({
      accountSlug: ctx.input.accountSlug
    });

    let mapped = zones.map((zone: any) => ({
      zoneId: zone.id,
      name: zone.name || '',
      accountId: zone.account_id ?? undefined,
      accountSlug: zone.account_slug ?? undefined,
      siteId: zone.site_id ?? undefined,
      domain: zone.domain ?? undefined,
      recordCount: zone.records_count ?? undefined,
      dnsServers: zone.dns_servers ?? undefined,
      createdAt: zone.created_at ?? undefined,
      updatedAt: zone.updated_at ?? undefined
    }));

    return {
      output: { zones: mapped },
      message: `Found **${mapped.length}** DNS zone(s).`
    };
  })
  .build();

export let manageDnsRecords = SlateTool.create(spec, {
  name: 'Manage DNS Records',
  key: 'manage_dns_records',
  description: `List, create, or delete DNS records within a Netlify DNS zone. Supports A, AAAA, CNAME, MX, TXT, NS, and other record types.`,
  instructions: [
    'Use action "list" to view all records in a zone.',
    'Use action "create" to add a new DNS record.',
    'Use action "delete" to remove a DNS record by its ID.'
  ]
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'delete']).describe('Action to perform'),
      zoneId: z.string().describe('DNS zone ID'),
      recordId: z.string().optional().describe('DNS record ID (required for delete)'),
      recordType: z
        .string()
        .optional()
        .describe('DNS record type, e.g., A, AAAA, CNAME, MX, TXT (required for create)'),
      hostname: z.string().optional().describe('Record hostname (required for create)'),
      value: z.string().optional().describe('Record value (required for create)'),
      ttl: z.number().optional().describe('Time to live in seconds'),
      priority: z.number().optional().describe('Priority for MX records'),
      weight: z.number().optional().describe('Weight for SRV records'),
      port: z.number().optional().describe('Port for SRV records'),
      flag: z.number().optional().describe('Flag for CAA records'),
      tag: z.string().optional().describe('Tag for CAA records')
    })
  )
  .output(
    z.object({
      records: z
        .array(
          z.object({
            recordId: z.string().describe('DNS record identifier'),
            hostname: z.string().describe('Record hostname'),
            recordType: z.string().describe('Record type (A, CNAME, etc.)'),
            value: z.string().describe('Record value'),
            ttl: z.number().optional().describe('TTL in seconds'),
            priority: z.number().optional().describe('MX priority'),
            dnsZoneId: z.string().optional().describe('DNS zone ID'),
            siteId: z.string().optional().describe('Associated site ID'),
            weight: z.number().optional().describe('SRV record weight'),
            port: z.number().optional().describe('SRV record port'),
            flag: z.number().optional().describe('CAA record flag'),
            tag: z.string().optional().describe('CAA record tag'),
            managed: z.boolean().optional().describe('Whether Netlify manages the record')
          })
        )
        .optional()
        .describe('DNS records (returned for list action)'),
      createdRecord: z
        .object({
          recordId: z.string().describe('Created record ID'),
          hostname: z.string().describe('Record hostname'),
          recordType: z.string().describe('Record type'),
          value: z.string().describe('Record value'),
          ttl: z.number().optional().describe('TTL in seconds'),
          priority: z.number().optional().describe('MX priority'),
          dnsZoneId: z.string().optional().describe('DNS zone ID'),
          siteId: z.string().optional().describe('Associated site ID'),
          weight: z.number().optional().describe('SRV record weight'),
          port: z.number().optional().describe('SRV record port'),
          flag: z.number().optional().describe('CAA record flag'),
          tag: z.string().optional().describe('CAA record tag'),
          managed: z.boolean().optional().describe('Whether Netlify manages the record')
        })
        .optional()
        .describe('Created DNS record (returned for create action)'),
      deleted: z
        .boolean()
        .optional()
        .describe('Whether the record was deleted (returned for delete action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    switch (ctx.input.action) {
      case 'list': {
        let records = await client.listDnsRecords(ctx.input.zoneId);
        let mapped = records.map((r: any) => ({
          recordId: r.id,
          hostname: r.hostname || '',
          recordType: r.type || '',
          value: r.value || '',
          ttl: r.ttl ?? undefined,
          priority: r.priority ?? undefined,
          dnsZoneId: r.dns_zone_id ?? undefined,
          siteId: r.site_id ?? undefined,
          weight: r.weight ?? undefined,
          port: r.port ?? undefined,
          flag: r.flag ?? undefined,
          tag: r.tag ?? undefined,
          managed: r.managed ?? undefined
        }));
        return {
          output: { records: mapped },
          message: `Found **${mapped.length}** DNS record(s) in zone **${ctx.input.zoneId}**.`
        };
      }
      case 'create': {
        if (!ctx.input.recordType || !ctx.input.hostname || !ctx.input.value) {
          throw netlifyServiceError(
            'recordType, hostname, and value are required for creating a DNS record'
          );
        }
        let record = await client.createDnsRecord(ctx.input.zoneId, {
          type: ctx.input.recordType,
          hostname: ctx.input.hostname,
          value: ctx.input.value,
          ttl: ctx.input.ttl,
          priority: ctx.input.priority,
          weight: ctx.input.weight,
          port: ctx.input.port,
          flag: ctx.input.flag,
          tag: ctx.input.tag
        });
        return {
          output: {
            createdRecord: {
              recordId: record.id,
              hostname: record.hostname || '',
              recordType: record.type || '',
              value: record.value || '',
              ttl: record.ttl ?? undefined,
              priority: record.priority ?? undefined,
              dnsZoneId: record.dns_zone_id ?? undefined,
              siteId: record.site_id ?? undefined,
              weight: record.weight ?? undefined,
              port: record.port ?? undefined,
              flag: record.flag ?? undefined,
              tag: record.tag ?? undefined,
              managed: record.managed ?? undefined
            }
          },
          message: `Created **${ctx.input.recordType}** record for **${ctx.input.hostname}**.`
        };
      }
      case 'delete': {
        if (!ctx.input.recordId) {
          throw netlifyServiceError('recordId is required for deleting a DNS record');
        }
        await client.deleteDnsRecord(ctx.input.zoneId, ctx.input.recordId);
        return {
          output: { deleted: true },
          message: `Deleted DNS record **${ctx.input.recordId}**.`
        };
      }
    }
  })
  .build();

export let manageDnsZone = SlateTool.create(spec, {
  name: 'Manage DNS Zone',
  key: 'manage_dns_zone',
  description: `Create or delete a Netlify DNS zone. Use this to set up DNS management for a domain.`
})
  .input(
    z.object({
      action: z.enum(['create', 'delete']).describe('Action to perform'),
      zoneId: z.string().optional().describe('DNS zone ID (required for delete)'),
      name: z.string().optional().describe('Domain name for the zone (required for create)'),
      accountSlug: z.string().optional().describe('Account/team slug for the created zone'),
      siteId: z.string().optional().describe('Site ID to associate with the created zone')
    })
  )
  .output(
    z.object({
      zone: z
        .object({
          zoneId: z.string().describe('DNS zone identifier'),
          name: z.string().describe('Zone domain name'),
          accountId: z.string().optional().describe('Account ID'),
          accountSlug: z.string().optional().describe('Account slug'),
          siteId: z.string().optional().describe('Associated site ID'),
          domain: z.string().optional().describe('Zone domain'),
          dnsServers: z.array(z.string()).optional().describe('Assigned DNS servers')
        })
        .optional()
        .describe('Created zone (returned for create action)'),
      deleted: z.boolean().optional().describe('Whether the zone was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    switch (ctx.input.action) {
      case 'create': {
        if (!ctx.input.name || (!ctx.input.accountSlug && !ctx.input.siteId)) {
          throw netlifyServiceError(
            'name and either accountSlug or siteId are required for creating a DNS zone'
          );
        }
        let zone = await client.createDnsZone({
          name: ctx.input.name,
          account_slug: ctx.input.accountSlug,
          site_id: ctx.input.siteId
        });
        return {
          output: {
            zone: {
              zoneId: zone.id,
              name: zone.name || '',
              accountId: zone.account_id ?? undefined,
              accountSlug: zone.account_slug ?? undefined,
              siteId: zone.site_id ?? undefined,
              domain: zone.domain ?? undefined,
              dnsServers: zone.dns_servers ?? undefined
            }
          },
          message: `Created DNS zone for **${ctx.input.name}**.`
        };
      }
      case 'delete': {
        if (!ctx.input.zoneId) {
          throw netlifyServiceError('zoneId is required for deleting a DNS zone');
        }
        await client.deleteDnsZone(ctx.input.zoneId);
        return {
          output: { deleted: true },
          message: `Deleted DNS zone **${ctx.input.zoneId}**.`
        };
      }
    }
  })
  .build();
