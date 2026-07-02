import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { digitalOceanValidationError } from '../lib/errors';
import { spec } from '../spec';

let domainRecordSchema = z.object({
  recordId: z.number().describe('Unique ID of the DNS record'),
  type: z.string().describe('Record type (A, AAAA, CNAME, MX, TXT, NS, SRV, CAA)'),
  name: z.string().describe('Record name/host'),
  recordData: z.string().describe('Record value/data'),
  priority: z.number().optional().describe('Priority (for MX and SRV records)'),
  port: z.number().optional().describe('Port (for SRV records)'),
  ttl: z.number().optional().describe('Time to live in seconds'),
  weight: z.number().optional().describe('Weight (for SRV records)')
});

export let listDomains = SlateTool.create(spec, {
  name: 'List Domains',
  key: 'list_domains',
  description: `List all domains managed in your DigitalOcean DNS. Returns the domain name and TTL for each domain.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      domains: z.array(
        z.object({
          name: z.string().describe('Domain name'),
          ttl: z.number().optional().describe('Default TTL in seconds'),
          zoneFile: z.string().optional().describe('Zone file contents')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let domains = await client.listDomains();

    return {
      output: {
        domains: domains.map((d: any) => ({
          name: d.name,
          ttl: d.ttl,
          zoneFile: d.zone_file
        }))
      },
      message: `Found **${domains.length}** domain(s).`
    };
  })
  .build();

export let manageDNSRecords = SlateTool.create(spec, {
  name: 'Manage DNS Records',
  key: 'manage_dns_records',
  description: `List, create, update, or delete DNS records for a domain. Supports A, AAAA, CNAME, MX, TXT, NS, SRV, and CAA record types.`,
  instructions: [
    'Use "@" as the record name to target the root domain',
    'CNAME records must point to a fully-qualified domain name ending with a dot',
    'MX records require a priority value'
  ]
})
  .input(
    z.object({
      domainName: z.string().describe('Domain name to manage records for'),
      action: z.enum(['list', 'create', 'update', 'delete']).describe('Action to perform'),
      recordId: z.number().optional().describe('Record ID (required for update/delete)'),
      type: z
        .string()
        .optional()
        .describe('Record type: A, AAAA, CNAME, MX, TXT, NS, SRV, CAA (required for create)'),
      name: z.string().optional().describe('Record name/host (required for create)'),
      recordData: z.string().optional().describe('Record value/data (required for create)'),
      priority: z.number().optional().describe('Priority (for MX, SRV)'),
      port: z.number().optional().describe('Port (for SRV)'),
      ttl: z.number().optional().describe('TTL in seconds'),
      weight: z.number().optional().describe('Weight (for SRV)'),
      filterType: z.string().optional().describe('Filter records by type when listing'),
      page: z.number().optional().describe('Page number for listing'),
      perPage: z.number().optional().describe('Results per page for listing')
    })
  )
  .output(
    z.object({
      records: z
        .array(domainRecordSchema)
        .optional()
        .describe('List of DNS records (for list action)'),
      record: domainRecordSchema.optional().describe('Created or updated record'),
      deleted: z.boolean().optional().describe('Whether the record was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'list') {
      let result = await client.listDomainRecords(ctx.input.domainName, {
        type: ctx.input.filterType,
        page: ctx.input.page,
        perPage: ctx.input.perPage
      });

      let records = result.records.map((r: any) => ({
        recordId: r.id,
        type: r.type,
        name: r.name,
        recordData: r.data,
        priority: r.priority,
        port: r.port,
        ttl: r.ttl,
        weight: r.weight
      }));

      return {
        output: { records },
        message: `Found **${records.length}** DNS record(s) for **${ctx.input.domainName}**.`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.type || !ctx.input.name || !ctx.input.recordData) {
        throw digitalOceanValidationError(
          'type, name, and recordData are required for create action'
        );
      }

      let record = await client.createDomainRecord(ctx.input.domainName, {
        type: ctx.input.type,
        name: ctx.input.name,
        data: ctx.input.recordData,
        priority: ctx.input.priority,
        port: ctx.input.port,
        ttl: ctx.input.ttl,
        weight: ctx.input.weight
      });

      return {
        output: {
          record: {
            recordId: record.id,
            type: record.type,
            name: record.name,
            recordData: record.data,
            priority: record.priority,
            port: record.port,
            ttl: record.ttl,
            weight: record.weight
          }
        },
        message: `Created **${record.type}** record for **${record.name}.${ctx.input.domainName}** -> **${record.data}**.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.recordId) {
        throw digitalOceanValidationError('recordId is required for update action');
      }

      let updateParams: any = {};
      if (ctx.input.type) updateParams.type = ctx.input.type;
      if (ctx.input.name) updateParams.name = ctx.input.name;
      if (ctx.input.recordData) updateParams.data = ctx.input.recordData;
      if (ctx.input.priority !== undefined) updateParams.priority = ctx.input.priority;
      if (ctx.input.port !== undefined) updateParams.port = ctx.input.port;
      if (ctx.input.ttl !== undefined) updateParams.ttl = ctx.input.ttl;
      if (ctx.input.weight !== undefined) updateParams.weight = ctx.input.weight;

      let record = await client.updateDomainRecord(
        ctx.input.domainName,
        ctx.input.recordId,
        updateParams
      );

      return {
        output: {
          record: {
            recordId: record.id,
            type: record.type,
            name: record.name,
            recordData: record.data,
            priority: record.priority,
            port: record.port,
            ttl: record.ttl,
            weight: record.weight
          }
        },
        message: `Updated DNS record **${ctx.input.recordId}** for **${ctx.input.domainName}**.`
      };
    }

    // delete
    if (!ctx.input.recordId) {
      throw digitalOceanValidationError('recordId is required for delete action');
    }
    await client.deleteDomainRecord(ctx.input.domainName, ctx.input.recordId);

    return {
      output: { deleted: true },
      message: `Deleted DNS record **${ctx.input.recordId}** from **${ctx.input.domainName}**.`
    };
  })
  .build();

export let createDomain = SlateTool.create(spec, {
  name: 'Create Domain',
  key: 'create_domain',
  description: `Add a new domain to DigitalOcean DNS management. Optionally set the IP address for an automatic A record.`
})
  .input(
    z.object({
      name: z.string().describe('Domain name (e.g., "example.com")'),
      ipAddress: z.string().optional().describe('IP address for an automatic A record')
    })
  )
  .output(
    z.object({
      name: z.string().describe('Domain name'),
      ttl: z.number().optional().describe('Default TTL')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let domain = await client.createDomain({
      name: ctx.input.name,
      ipAddress: ctx.input.ipAddress
    });

    return {
      output: {
        name: domain.name,
        ttl: domain.ttl
      },
      message: `Added domain **${domain.name}** to DNS management${ctx.input.ipAddress ? ` with A record pointing to ${ctx.input.ipAddress}` : ''}.`
    };
  })
  .build();
