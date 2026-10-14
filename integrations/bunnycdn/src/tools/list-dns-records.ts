import { SlateTool } from 'slates';
import { z } from 'zod';
import { CoreClient } from '../lib/client';
import { spec } from '../spec';
import { dnsRecordSchema } from './manage-dns-zone';

export let listDnsRecords = SlateTool.create(spec, {
  name: 'List DNS Records',
  key: 'list_dns_records',
  description:
    'List DNS records in a zone, with pagination, record type filtering, and search. Returns record IDs for updating or deleting records.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      dnsZoneId: z.number().int().positive().describe('DNS zone ID'),
      page: z.number().int().positive().optional().describe('Page number, starting at 1'),
      perPage: z
        .number()
        .int()
        .min(5)
        .max(1000)
        .optional()
        .describe('Records per page, from 5 to 1000'),
      recordType: z
        .number()
        .int()
        .min(0)
        .max(15)
        .optional()
        .describe('Numeric DNS record type code, from 0 (A) to 15 (TLSA)'),
      search: z.string().optional().describe('Search term for filtering records')
    })
  )
  .output(
    z.object({
      records: z.array(dnsRecordSchema).describe('DNS records on this page'),
      totalItems: z.number().optional().describe('Total number of matching records'),
      currentPage: z.number().optional().describe('Current page number'),
      hasMoreItems: z.boolean().optional().describe('Whether additional pages are available')
    })
  )
  .handleInvocation(async ctx => {
    let result = await new CoreClient({ token: ctx.auth.token }).listDnsRecords(
      ctx.input.dnsZoneId,
      {
        page: ctx.input.page ?? 1,
        perPage: ctx.input.perPage,
        type: ctx.input.recordType,
        search: ctx.input.search
      }
    );
    return {
      output: {
        records: result.Items,
        totalItems: result.TotalItems,
        currentPage: result.CurrentPage,
        hasMoreItems: result.HasMoreItems
      },
      message: `Retrieved **${result.Items.length}** DNS records from zone **${ctx.input.dnsZoneId}**.`
    };
  })
  .build();
