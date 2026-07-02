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
    'Use the offset parameter for pagination through large result sets.'
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
        .describe('Pagination offset for retrieving additional results'),
      since: z
        .string()
        .optional()
        .describe('Only return sites detected since this date (Unix timestamp in ms)')
    })
  )
  .output(
    z.object({
      technology: z.string().optional().describe('Technology name queried'),
      sites: z.array(siteSchema).describe('List of websites using the technology'),
      nextOffset: z
        .number()
        .optional()
        .describe('Offset value for retrieving the next page of results'),
      total: z.number().optional().describe('Total number of sites found')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data = await client.lists({
      technology: ctx.input.technology,
      includeMetaData: ctx.input.includeMetaData,
      offset: ctx.input.offset,
      since: ctx.input.since
    });

    let sites = data?.Results ?? [];
    let nextOffset = data?.NextOffset ?? undefined;
    let total = data?.Total ?? undefined;

    return {
      output: {
        technology: ctx.input.technology,
        sites,
        nextOffset,
        total
      },
      message: `Found **${sites.length}** sites using **${ctx.input.technology}**${total ? ` (${total} total)` : ''}.`
    };
  });
