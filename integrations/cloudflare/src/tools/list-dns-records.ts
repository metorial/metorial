import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listDnsRecordsTool = SlateTool.create(spec, {
  name: 'List DNS Records',
  key: 'list_dns_records',
  description: `Retrieve DNS records for a Cloudflare zone. Filter by record type, name, or content to find specific records. Returns all record types including A, AAAA, CNAME, MX, TXT, NS, and more.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      zoneId: z.string().describe('Zone ID to list DNS records for'),
      recordType: z
        .string()
        .optional()
        .describe('Filter by DNS record type (e.g. A, AAAA, CNAME, MX, TXT)'),
      name: z.string().optional().describe('Filter by DNS record name (e.g. example.com)'),
      content: z.string().optional().describe('Filter by DNS record content/value'),
      page: z.number().optional().describe('Page number for pagination'),
      perPage: z.number().optional().describe('Number of records per page (max 100)')
    })
  )
  .output(
    z.object({
      records: z.array(
        z.object({
          recordId: z.string(),
          type: z.string(),
          name: z.string(),
          content: z.string(),
          ttl: z.number(),
          proxied: z.boolean().optional(),
          priority: z.number().optional(),
          comment: z.string().optional().nullable(),
          createdOn: z.string().optional(),
          modifiedOn: z.string().optional()
        })
      ),
      totalCount: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);

    let response = await client.listDnsRecords(ctx.input.zoneId, {
      type: ctx.input.recordType,
      name: ctx.input.name,
      content: ctx.input.content,
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let records = response.result.map((r: any) => ({
      recordId: r.id,
      type: r.type,
      name: r.name,
      content: r.content,
      ttl: r.ttl,
      proxied: r.proxied,
      priority: r.priority,
      comment: r.comment,
      createdOn: r.created_on,
      modifiedOn: r.modified_on
    }));

    return {
      output: {
        records,
        totalCount: response.result_info?.total_count ?? records.length
      },
      message: `Found **${records.length}** DNS record(s) for zone \`${ctx.input.zoneId}\`.`
    };
  })
  .build();
