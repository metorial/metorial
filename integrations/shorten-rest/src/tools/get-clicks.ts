import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getClicks = SlateTool.create(spec, {
  name: 'Get Click Analytics',
  key: 'get_clicks',
  description: `Retrieves click tracking data for a specific shortened URL. Includes details about each click such as browser, OS, country, referrer, and user agent. Results are paginated; use the returned cursor to fetch more.`,
  instructions: [
    'To paginate through all clicks, pass the nextCursor from the previous response as the cursor for the next request.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      aliasName: z.string().describe('The alias to get click data for.'),
      domainName: z
        .string()
        .optional()
        .describe('The domain the alias belongs to. Defaults to "short.fyi" if omitted.'),
      cursor: z
        .string()
        .optional()
        .describe(
          'Pagination cursor from a previous response to fetch the next page of clicks.'
        ),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of click records to return per page.')
    })
  )
  .output(
    z.object({
      clicks: z
        .array(
          z.object({
            aliasName: z.string().describe('The alias that was clicked.'),
            aliasId: z.string().describe('Internal ID of the alias.'),
            browser: z.string().describe('Browser used by the visitor.'),
            os: z.string().describe('Operating system of the visitor.'),
            country: z.string().describe('Country of the visitor.'),
            destination: z
              .string()
              .describe('The destination URL the visitor was redirected to.'),
            domain: z.string().describe('The domain of the short URL.'),
            referrer: z.string().describe('The referring URL.'),
            userAgent: z.string().describe('Full user agent string.'),
            clickedAt: z.string().describe('ISO timestamp of when the click occurred.')
          })
        )
        .describe('List of click records.'),
      nextCursor: z
        .string()
        .optional()
        .describe('Pagination cursor for fetching the next page. Absent if no more results.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let result = await client.getClicks({
      aliasName: ctx.input.aliasName,
      domainName: ctx.input.domainName,
      lastId: ctx.input.cursor,
      limit: ctx.input.limit
    });

    let clicks = result.clicks.map(c => ({
      aliasName: c.alias,
      aliasId: c.aliasId,
      browser: c.browser,
      os: c.os,
      country: c.country,
      destination: c.destination,
      domain: c.domain,
      referrer: c.referrer,
      userAgent: c.userAgent,
      clickedAt: new Date(c.createdAt).toISOString()
    }));

    return {
      output: {
        clicks,
        nextCursor: result.lastId || undefined
      },
      message: `Retrieved **${clicks.length}** click(s) for alias \`${ctx.input.aliasName}\`.${result.lastId ? ' More results available with pagination.' : ''}`
    };
  })
  .build();
