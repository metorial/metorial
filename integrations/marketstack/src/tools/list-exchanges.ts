import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listExchanges = SlateTool.create(spec, {
  name: 'List Exchanges',
  key: 'list_exchanges',
  description: `List and search supported stock exchanges worldwide. Returns exchange name, MIC code, country, city, timezone, and currency information. Use this to discover available exchanges and their MIC codes for filtering other queries.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      search: z
        .string()
        .optional()
        .describe('Search query to filter exchanges by name or country'),
      limit: z.number().optional().describe('Number of results to return (max 1000)'),
      offset: z.number().optional().describe('Pagination offset')
    })
  )
  .output(
    z.object({
      pagination: z.object({
        limit: z.number(),
        offset: z.number(),
        count: z.number(),
        total: z.number()
      }),
      exchanges: z.array(
        z.object({
          name: z.string(),
          acronym: z.string(),
          mic: z.string(),
          country: z.string(),
          countryCode: z.string(),
          city: z.string(),
          website: z.string(),
          timezone: z.string(),
          currencyCode: z.string(),
          currencyName: z.string()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getExchanges({
      search: ctx.input.search,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let exchanges = result.data.map(e => ({
      name: e.name,
      acronym: e.acronym,
      mic: e.mic,
      country: e.country,
      countryCode: e.country_code,
      city: e.city,
      website: e.website,
      timezone: e.timezone?.timezone ?? '',
      currencyCode: e.currency?.code ?? '',
      currencyName: e.currency?.name ?? ''
    }));

    return {
      output: {
        pagination: result.pagination,
        exchanges
      },
      message: `Found ${exchanges.length} exchanges${ctx.input.search ? ` matching "${ctx.input.search}"` : ''}. Total available: ${result.pagination.total}.`
    };
  })
  .build();
