import { SlateTool } from 'slates';
import { z } from 'zod';
import { TwelveDataClient } from '../lib/client';
import { spec } from '../spec';

export let listExchanges = SlateTool.create(spec, {
  name: 'List Exchanges',
  key: 'list_exchanges',
  description: `Retrieve a list of available exchanges, optionally filtered by type, name, code, or country.
Useful for discovering which exchanges are supported and finding exchange codes to use in other requests.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      type: z
        .string()
        .optional()
        .describe('Filter by instrument type (e.g., "stock", "etf", "index")'),
      name: z.string().optional().describe('Filter by exchange name'),
      code: z.string().optional().describe('Filter by exchange code'),
      country: z.string().optional().describe('Filter by country')
    })
  )
  .output(
    z.object({
      exchanges: z
        .array(
          z.object({
            name: z.string().optional().describe('Exchange name'),
            code: z.string().optional().describe('Exchange code'),
            country: z.string().optional().describe('Country'),
            timezone: z.string().optional().describe('Exchange timezone')
          })
        )
        .describe('Array of exchanges'),
      totalCount: z.number().describe('Number of exchanges returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TwelveDataClient(ctx.auth.token);

    let result = await client.getExchanges({
      type: ctx.input.type,
      name: ctx.input.name,
      code: ctx.input.code,
      country: ctx.input.country
    });

    let exchanges = result.data || result || [];
    if (!Array.isArray(exchanges)) {
      exchanges = [];
    }

    let mapped = exchanges.map((ex: any) => ({
      name: ex.name,
      code: ex.code,
      country: ex.country,
      timezone: ex.timezone
    }));

    return {
      output: {
        exchanges: mapped,
        totalCount: mapped.length
      },
      message: `Found **${mapped.length}** exchanges${ctx.input.country ? ` in ${ctx.input.country}` : ''}${ctx.input.type ? ` for type "${ctx.input.type}"` : ''}.`
    };
  })
  .build();
