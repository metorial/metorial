import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let siteSchema = z
  .object({
    domain: z.string().optional().describe('Website domain'),
    firstDetected: z.string().optional().describe('When the technology was first detected'),
    lastDetected: z.string().optional().describe('When the technology was last detected'),
    companyName: z.string().optional().describe('Company name'),
    city: z.string().optional().describe('City'),
    state: z.string().optional().describe('State/region'),
    country: z.string().optional().describe('Country'),
    telephones: z.array(z.string()).optional().describe('Phone numbers'),
    emails: z.array(z.string()).optional().describe('Email addresses'),
    socialProfiles: z.array(z.string()).optional().describe('Social media profile URLs')
  })
  .passthrough();

export let listTechnologySites = SlateTool.create(spec, {
  name: 'List Sites Using Technology',
  key: 'list_technology_sites',
  description: `Retrieve a list of websites using a specific web technology across the entire internet. Ideal for lead generation — returns domains with associated company names, social links, addresses, emails, and phone numbers.

Supports pagination with offset and date filtering to find sites detected since a specific date.`,
  instructions: [
    'Use the exact technology name as it appears on BuiltWith (e.g., "Shopify", "WordPress", "Google Analytics").',
    'Enable includeMetaData to get company contact information alongside domains.',
    'Pass nextOffsetToken as offsetToken for the next page. END means there are no more results.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      technology: z
        .string()
        .describe('Technology name to search for (e.g., "Shopify", "WordPress")'),
      includeMetaData: z
        .boolean()
        .optional()
        .describe(
          'Include metadata like company names, emails, addresses, and social profiles'
        ),
      offset: z
        .number()
        .optional()
        .describe(
          'Legacy numeric pagination offset; use offsetToken for current cursor pagination'
        ),
      offsetToken: z
        .string()
        .optional()
        .describe(
          'Exact nextOffsetToken returned by the previous page; do not combine with offset'
        ),
      since: z
        .string()
        .optional()
        .describe('Only return sites detected since a date such as YYYY-MM-DD or 30 Days Ago')
    })
  )
  .output(
    z.object({
      technology: z.string().optional().describe('Technology name queried'),
      sites: z.array(siteSchema).describe('List of websites using the technology'),
      nextOffset: z
        .number()
        .optional()
        .describe('Legacy numeric offset when the provider returns a number'),
      nextOffsetToken: z
        .string()
        .optional()
        .describe('Exact pagination cursor; END means there are no more results'),
      hasMore: z.boolean().describe('Whether another page is available'),
      total: z.number().optional().describe('Total number of sites found')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data = await client.lists({
      technology: ctx.input.technology,
      includeMetaData: ctx.input.includeMetaData,
      offset: ctx.input.offset,
      offsetToken: ctx.input.offsetToken,
      since: ctx.input.since
    });

    let sites = (data?.Results ?? []).map((site: Record<string, unknown>) => ({
      ...site,
      domain: typeof site.D === 'string' ? site.D : site.domain,
      firstDetected: typeof site.FD === 'number' ? String(site.FD) : site.firstDetected,
      lastDetected: typeof site.LD === 'number' ? String(site.LD) : site.lastDetected
    }));
    let nextOffset = typeof data?.NextOffset === 'number' ? data.NextOffset : undefined;
    let nextOffsetToken = typeof data?.NextOffset === 'string' ? data.NextOffset : undefined;
    let total = data?.Total ?? undefined;

    return {
      output: {
        technology: ctx.input.technology,
        sites,
        nextOffset,
        nextOffsetToken,
        hasMore:
          nextOffsetToken !== undefined ? nextOffsetToken !== 'END' : nextOffset !== undefined,
        total
      },
      message: `Found **${sites.length}** sites using **${ctx.input.technology}**${total ? ` (${total} total)` : ''}.`
    };
  });
