import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let copeRecordSchema = z
  .object({
    copeId: z.string().optional().describe('Unique identifier of the COPE record'),
    siteId: z.string().optional().describe('Associated site ID'),
    construction: z.string().optional().describe('Construction data'),
    occupancy: z.string().optional().describe('Occupancy data'),
    protection: z.string().optional().describe('Protection data'),
    exposure: z.string().optional().describe('Exposure data')
  })
  .passthrough();

export let getCopeData = SlateTool.create(spec, {
  name: 'Get COPE Data',
  key: 'get_cope_data',
  description: `Retrieve COPE (Construction, Occupancy, Protection, and Exposure) data from 21RISK for property insurance risk assessment. COPE data models help evaluate risk factors at specific sites and are commonly used in property insurance underwriting.`,
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
        .describe('OData $filter expression (e.g., "SiteId eq 123")'),
      select: z.string().optional().describe('Comma-separated list of fields to return'),
      expand: z.string().optional().describe('Related entities to expand'),
      orderby: z.string().optional().describe('Sort order'),
      top: z.number().optional().describe('Maximum number of records to return'),
      skip: z.number().optional().describe('Number of records to skip for pagination')
    })
  )
  .output(
    z.object({
      copeRecords: z.array(copeRecordSchema).describe('List of COPE records'),
      nextLink: z
        .string()
        .optional()
        .describe('Provider continuation URL for the next page, when supplied'),
      totalCount: z
        .number()
        .optional()
        .describe('Provider total matching count, when supplied'),
      count: z.number().describe('Number of COPE records returned in this page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let cope = await client.getCope({
      nextLink: ctx.input.nextLink,
      filter: ctx.input.filter,
      select: ctx.input.select,
      expand: ctx.input.expand,
      orderby: ctx.input.orderby,
      top: ctx.input.top,
      skip: ctx.input.skip
    });

    let results = cope.records;

    return {
      output: {
        copeRecords: results,
        count: results.length,
        nextLink: cope.nextLink,
        totalCount: cope.totalCount
      },
      message: `Retrieved **${results.length}** COPE record(s).`
    };
  })
  .build();
