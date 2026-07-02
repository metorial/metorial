import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let historyRecordSchema = z
  .object({
    firstSeen: z.string().optional().describe('Date this record was first observed'),
    lastSeen: z.string().optional().describe('Date this record was last observed'),
    organizations: z.array(z.string()).optional().describe('Associated organizations'),
    values: z.array(z.any()).optional().describe('Record values')
  })
  .passthrough();

export let getDnsHistory = SlateTool.create(spec, {
  name: 'Get DNS History',
  key: 'get_dns_history',
  description: `Retrieve historical DNS records for a domain by record type. Tracks DNS changes over time, useful for uncovering original IPs behind proxying services like Cloudflare, tracking infrastructure changes, and security investigations.`,
  instructions: ['Supported record types: a, aaaa, mx, txt, ns, soa.'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      hostname: z.string().describe('Domain to look up DNS history for (e.g., "example.com")'),
      recordType: z
        .enum(['a', 'aaaa', 'mx', 'txt', 'ns', 'soa'])
        .describe('DNS record type to retrieve history for'),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z
      .object({
        hostname: z.string().describe('The queried domain'),
        recordType: z.string().describe('The DNS record type queried'),
        records: z.array(historyRecordSchema).describe('Historical DNS records'),
        pages: z.number().optional().describe('Total number of pages available')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getDnsHistory(ctx.input.hostname, ctx.input.recordType, {
      page: ctx.input.page
    });

    let records = result.records ?? [];

    return {
      output: {
        hostname: ctx.input.hostname,
        recordType: result.type ?? ctx.input.recordType,
        records,
        pages: result.pages,
        ...result
      },
      message: `Retrieved **${records.length}** historical ${ctx.input.recordType.toUpperCase()} records for **${ctx.input.hostname}**.`
    };
  })
  .build();
