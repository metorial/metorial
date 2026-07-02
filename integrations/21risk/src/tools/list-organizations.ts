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
      filter: z
        .string()
        .optional()
        .describe('OData $filter expression to filter organizations'),
      select: z
        .string()
        .optional()
        .describe('Comma-separated list of fields to return (OData $select)'),
      top: z.number().optional().describe('Maximum number of records to return')
    })
  )
  .output(
    z.object({
      organizations: z.array(organizationSchema).describe('List of organizations'),
      count: z.number().describe('Number of organizations returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let organizations = await client.getOrganizations({
      filter: ctx.input.filter,
      select: ctx.input.select,
      top: ctx.input.top
    });

    let results = Array.isArray(organizations) ? organizations : [organizations];

    return {
      output: {
        organizations: results,
        count: results.length
      },
      message: `Retrieved **${results.length}** organization(s).`
    };
  })
  .build();
