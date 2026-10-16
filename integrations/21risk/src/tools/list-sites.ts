import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let siteSchema = z
  .object({
    siteId: z.string().optional().describe('Unique identifier of the site'),
    name: z.string().optional().describe('Name of the site'),
    address: z.string().optional().describe('Address of the site'),
    city: z.string().optional().describe('City of the site'),
    country: z.string().optional().describe('Country of the site')
  })
  .passthrough();

export let listSites = SlateTool.create(spec, {
  name: 'List Sites',
  key: 'list_sites',
  description: `Retrieve sites (locations) from 21RISK, such as production facilities, warehouses, or offices where audits and compliance activities take place. Supports OData filtering, field selection, and sorting.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      nextLink: z
        .string()
        .optional()
        .describe(
          'Continuation URL returned by this tool. Supply it alone to retrieve the next page.'
        ),
      filter: z
        .string()
        .optional()
        .describe('OData $filter expression (e.g., "Country eq \'US\'")'),
      select: z
        .string()
        .optional()
        .describe('Comma-separated list of fields to return (OData $select)'),
      expand: z.string().optional().describe('Related entities to expand (OData $expand)'),
      orderby: z.string().optional().describe('Sort order (OData $orderby, e.g., "Name asc")'),
      top: z.number().optional().describe('Maximum number of records to return'),
      skip: z.number().optional().describe('Number of records to skip for pagination')
    })
  )
  .output(
    z.object({
      sites: z.array(siteSchema).describe('List of sites'),
      nextLink: z
        .string()
        .optional()
        .describe('Provider continuation URL for the next page, when supplied'),
      totalCount: z
        .number()
        .optional()
        .describe('Provider total matching count, when supplied'),
      count: z.number().describe('Number of sites returned in this page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let sites = await client.getSites({
      nextLink: ctx.input.nextLink,
      filter: ctx.input.filter,
      select: ctx.input.select,
      expand: ctx.input.expand,
      orderby: ctx.input.orderby,
      top: ctx.input.top,
      skip: ctx.input.skip
    });

    let results = sites.records;

    return {
      output: {
        sites: results,
        count: results.length,
        nextLink: sites.nextLink,
        totalCount: sites.totalCount
      },
      message: `Retrieved **${results.length}** site(s).`
    };
  })
  .build();
