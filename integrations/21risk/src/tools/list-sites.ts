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
      count: z.number().describe('Number of sites returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let sites = await client.getSites({
      filter: ctx.input.filter,
      select: ctx.input.select,
      expand: ctx.input.expand,
      orderby: ctx.input.orderby,
      top: ctx.input.top,
      skip: ctx.input.skip
    });

    let results = Array.isArray(sites) ? sites : [sites];

    return {
      output: {
        sites: results,
        count: results.length
      },
      message: `Retrieved **${results.length}** site(s).`
    };
  })
  .build();
