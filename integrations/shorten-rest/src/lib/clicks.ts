import { z } from 'zod';
import type { GetClicksResponse } from './client';

export let clicksOutputSchema = z.object({
  clicks: z
    .array(
      z.object({
        aliasName: z.string().describe('The alias that was clicked.'),
        aliasId: z.string().describe('Internal ID of the alias.'),
        browser: z.string().describe('Browser used by the visitor.'),
        os: z.string().describe('Operating system of the visitor.'),
        country: z.string().describe('Country of the visitor.'),
        destination: z.string().describe('The destination URL the visitor was redirected to.'),
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
});

export let formatClickPage = (result: GetClicksResponse) => ({
  clicks: result.clicks.map(click => ({
    aliasName: click.alias,
    aliasId: click.aliasId,
    browser: click.browser,
    os: click.os,
    country: click.country,
    destination: click.destination,
    domain: click.domain,
    referrer: click.referrer,
    userAgent: click.userAgent,
    clickedAt: new Date(click.createdAt).toISOString()
  })),
  nextCursor: result.lastId || undefined
});
