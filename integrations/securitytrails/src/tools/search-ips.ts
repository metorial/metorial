import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchIps = SlateTool.create(spec, {
  name: 'Search IPs',
  key: 'search_ips',
  description: `Search for IP addresses using a DSL query. Filter by IP ranges, PTR patterns, open ports, and more. Optionally retrieve statistics (reverse DNS patterns, open ports, total results) instead of records.`,
  instructions: [
    'DSL query fields for IPs: ip (with optional network mask like "1.2.3.0/24"), ptr (full PTR record), ptr_part (partial PTR match), port (numeric).',
    'Operators: =, !=, >, <, >=, <=, IN, between ... and ..., AND, OR.',
    'Example: `ip = "1.2.3.0/24" AND port = 443`'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .string()
        .describe('DSL query string for IP search (e.g., "ip = \'1.2.3.0/24\'")'),
      page: z.number().optional().describe('Page number for pagination'),
      statsOnly: z.boolean().optional().describe('Return statistics instead of records')
    })
  )
  .output(
    z
      .object({
        records: z.array(z.any()).optional().describe('Matching IP records'),
        recordCount: z.number().optional().describe('Total number of matching records'),
        meta: z.any().optional().describe('Pagination and query metadata'),
        stats: z.any().optional().describe('IP search statistics when statsOnly is enabled')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.statsOnly) {
      let result = await client.getIpStats(ctx.input.query);
      return {
        output: {
          stats: result,
          ...result
        },
        message: `Retrieved IP search statistics for query.`
      };
    }

    let result = await client.searchIps(ctx.input.query, {
      page: ctx.input.page
    });

    let records = result.records ?? [];

    return {
      output: {
        records,
        recordCount: result.record_count ?? records.length,
        meta: result.meta,
        ...result
      },
      message: `Found **${result.record_count ?? records.length}** IPs matching the search criteria.`
    };
  })
  .build();
