import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listPeople = SlateTool.create(spec, {
  name: 'List People',
  key: 'list_people',
  description: `Search and retrieve people records from ChMeetings. Can search across all organizations or filter by a specific organization. Supports searching by name, email, or mobile number.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      searchText: z.string().optional().describe('Search by full name, mobile, or email'),
      organizationId: z.string().optional().describe('Filter people by organization ID'),
      name: z
        .string()
        .optional()
        .describe('Filter by name (when searching within an organization)'),
      mobile: z
        .string()
        .optional()
        .describe('Filter by mobile number (when searching within an organization)'),
      email: z
        .string()
        .optional()
        .describe('Filter by email (when searching within an organization)'),
      includeFamilyMembers: z
        .boolean()
        .optional()
        .describe('Include family members in the results (organization search only)'),
      includeAdditionalFields: z
        .boolean()
        .optional()
        .describe('Include additional profile fields (organization search only)'),
      page: z.number().optional().describe('Page number (default: 1)'),
      pageSize: z.number().optional().describe('Number of results per page (default: 100)')
    })
  )
  .output(
    z.object({
      people: z.array(z.record(z.string(), z.unknown())).describe('List of people records'),
      page: z.number().describe('Current page number'),
      pageSize: z.number().describe('Page size'),
      total: z.number().describe('Total number of people')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result: any;
    if (ctx.input.organizationId) {
      result = await client.listPeopleByOrganization(ctx.input.organizationId, {
        page: ctx.input.page,
        pageSize: ctx.input.pageSize,
        name: ctx.input.name,
        mobile: ctx.input.mobile,
        email: ctx.input.email,
        includeFamilyMembers: ctx.input.includeFamilyMembers,
        includeAdditionalFields: ctx.input.includeAdditionalFields
      });
    } else {
      result = await client.listPeople({
        page: ctx.input.page,
        pageSize: ctx.input.pageSize,
        searchText: ctx.input.searchText
      });
    }

    return {
      output: {
        people: result.data as Record<string, unknown>[],
        page: result.page,
        pageSize: result.page_size,
        total: result.total
      },
      message: `Found **${result.total}** people. Showing page ${result.page}.`
    };
  })
  .build();
