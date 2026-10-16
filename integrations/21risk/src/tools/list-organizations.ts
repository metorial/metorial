import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let organizationSchema = z
  .object({
    organizationId: z.string().optional().describe('Unique identifier of the organization'),
    name: z.string().optional().describe('Name of the organization')
  })
  .passthrough();

export let listOrganizations = SlateTool.create(spec, {
  name: 'List Organizations',
  key: 'list_organizations',
  description: `Retrieve organizations (tenants) from your 21RISK account. Use this to discover available organizations and their identifiers before querying site or audit data.`,
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
        .describe('OData $filter expression to filter organizations'),
      select: z
        .string()
        .optional()
        .describe('Comma-separated list of fields to return (OData $select)'),
      top: z.number().optional().describe('Maximum number of records to return'),
      skip: z.number().optional().describe('Number of records to skip for pagination')
    })
  )
  .output(
    z.object({
      organizations: z.array(organizationSchema).describe('List of organizations'),
      nextLink: z
        .string()
        .optional()
        .describe('Provider continuation URL for the next page, when supplied'),
      totalCount: z
        .number()
        .optional()
        .describe('Provider total matching count, when supplied'),
      count: z.number().describe('Number of organizations returned in this page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let organizations = await client.getOrganizations({
      nextLink: ctx.input.nextLink,
      filter: ctx.input.filter,
      select: ctx.input.select,
      top: ctx.input.top,
      skip: ctx.input.skip
    });

    let results = organizations.records;

    return {
      output: {
        organizations: results,
        count: results.length,
        nextLink: organizations.nextLink,
        totalCount: organizations.totalCount
      },
      message: `Retrieved **${results.length}** organization(s).`
    };
  })
  .build();
