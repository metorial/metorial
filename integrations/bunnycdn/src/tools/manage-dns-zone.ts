import { SlateTool } from 'slates';
import { z } from 'zod';
import { CoreClient } from '../lib/client';
import { spec } from '../spec';

let dnsRecordSchema = z
  .object({
    recordId: z.number().optional().describe('Unique ID of the DNS record'),
    type: z
      .number()
      .optional()
      .describe(
        'Record type code (0=A, 1=AAAA, 2=CNAME, 3=TXT, 4=MX, 5=Redirect, 6=Flatten, 7=PullZone, 8=SRV, 9=CAA, 10=PTR, 12=NS)'
      ),
    name: z.string().optional().describe('Record name/subdomain'),
    value: z.string().optional().describe('Record value'),
    ttl: z.number().optional().describe('TTL in seconds'),
    priority: z.number().optional().describe('Priority (for MX, SRV)'),
    weight: z.number().optional().describe('Weight (for SRV)'),
    port: z.number().optional().describe('Port (for SRV)'),
    disabled: z.boolean().optional().describe('Whether the record is disabled'),
    comment: z.string().optional().describe('Record comment')
  })
  .passthrough();

let dnsZoneSchema = z
  .object({
    dnsZoneId: z.number().describe('Unique ID of the DNS zone'),
    domain: z.string().describe('Domain name'),
    nameserversNextCheck: z.string().optional().describe('Next nameserver check date'),
    customNameserversEnabled: z
      .boolean()
      .optional()
      .describe('Whether custom nameservers are enabled'),
    nameserver1: z.string().optional().describe('Primary nameserver'),
    nameserver2: z.string().optional().describe('Secondary nameserver'),
    soaEmail: z.string().optional().describe('SOA email address'),
    records: z.array(dnsRecordSchema).optional().describe('DNS records in the zone'),
    dateModified: z.string().optional().describe('Last modification date'),
    dateCreated: z.string().optional().describe('Creation date'),
    loggingEnabled: z.boolean().optional().describe('Whether logging is enabled')
  })
  .passthrough();

export let manageDnsZone = SlateTool.create(spec, {
  name: 'Manage DNS Zone',
  key: 'manage_dns_zone',
  description: `Create, list, retrieve, update, or delete DNS zones. DNS zones manage domain name resolution. This tool handles the zone-level operations; use the Manage DNS Records tool for individual record operations.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('The operation to perform'),
      dnsZoneId: z
        .number()
        .optional()
        .describe('DNS zone ID. Required for get, update, and delete actions.'),
      domain: z.string().optional().describe('Domain name (create action)'),
      search: z.string().optional().describe('Search term (list action)'),
      page: z.number().optional().describe('Page number (list action)'),
      perPage: z.number().optional().describe('Results per page (list action)'),
      customNameserversEnabled: z
        .boolean()
        .optional()
        .describe('Enable custom nameservers (update)'),
      nameserver1: z.string().optional().describe('Primary nameserver (update)'),
      nameserver2: z.string().optional().describe('Secondary nameserver (update)'),
      soaEmail: z.string().optional().describe('SOA email address (update)'),
      loggingEnabled: z.boolean().optional().describe('Enable DNS query logging (update)')
    })
  )
  .output(
    z.object({
      dnsZone: dnsZoneSchema.optional().describe('DNS zone details'),
      dnsZones: z.array(dnsZoneSchema).optional().describe('List of DNS zones'),
      totalItems: z.number().optional().describe('Total number of DNS zones'),
      currentPage: z.number().optional().describe('Current page number'),
      deleted: z.boolean().optional().describe('Whether the DNS zone was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CoreClient({ token: ctx.auth.token });

    switch (ctx.input.action) {
      case 'list': {
        let result = await client.listDnsZones({
          page: ctx.input.page,
          perPage: ctx.input.perPage,
          search: ctx.input.search
        });
        return {
          output: {
            dnsZones: result.Items || [],
            totalItems: result.TotalItems,
            currentPage: result.CurrentPage
          },
          message: `Found **${result.TotalItems}** DNS zones.`
        };
      }
      case 'get': {
        let zone = await client.getDnsZone(ctx.input.dnsZoneId!);
        return {
          output: { dnsZone: zone },
          message: `Retrieved DNS zone **${zone.Domain}** with **${zone.Records?.length || 0}** records.`
        };
      }
      case 'create': {
        let zone = await client.createDnsZone(ctx.input.domain!);
        return {
          output: { dnsZone: zone },
          message: `Created DNS zone for **${ctx.input.domain}** (ID: ${zone.Id}).`
        };
      }
      case 'update': {
        let data: Record<string, any> = {};
        if (ctx.input.customNameserversEnabled !== undefined)
          data.CustomNameserversEnabled = ctx.input.customNameserversEnabled;
        if (ctx.input.nameserver1 !== undefined) data.Nameserver1 = ctx.input.nameserver1;
        if (ctx.input.nameserver2 !== undefined) data.Nameserver2 = ctx.input.nameserver2;
        if (ctx.input.soaEmail !== undefined) data.SoaEmail = ctx.input.soaEmail;
        if (ctx.input.loggingEnabled !== undefined)
          data.LoggingEnabled = ctx.input.loggingEnabled;

        let zone = await client.updateDnsZone(ctx.input.dnsZoneId!, data);
        return {
          output: { dnsZone: zone },
          message: `Updated DNS zone **${ctx.input.dnsZoneId}**.`
        };
      }
      case 'delete': {
        await client.deleteDnsZone(ctx.input.dnsZoneId!);
        return {
          output: { deleted: true },
          message: `Deleted DNS zone **${ctx.input.dnsZoneId}**.`
        };
      }
    }
  })
  .build();
