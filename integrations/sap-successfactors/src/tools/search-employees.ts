import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchEmployees = SlateTool.create(spec, {
  name: 'Search Employees',
  key: 'search_employees',
  description: `Search and list employees in SAP SuccessFactors. Supports OData filtering, pagination, and field selection. Use this to find employees by name, department, status, hire date, or any other employee attribute.`,
  instructions: [
    'Use OData v2 filter syntax (e.g., "firstName eq \'John\'" or "status eq \'active\'")',
    'Combine filters with "and"/"or" operators',
    'Use $top and $skip for pagination'
  ],
  constraints: ['Maximum 1000 records per request by default'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      filter: z
        .string()
        .optional()
        .describe(
          "OData $filter expression (e.g., \"department eq 'HR' and status eq 'active'\")"
        ),
      select: z
        .string()
        .optional()
        .describe(
          'Comma-separated fields to return (e.g., "userId,firstName,lastName,email,department")'
        ),
      expand: z.string().optional().describe('Navigation properties to expand'),
      orderBy: z.string().optional().describe('Field to sort by (e.g., "lastName asc")'),
      top: z.number().optional().describe('Maximum number of records to return').default(100),
      skip: z.number().optional().describe('Number of records to skip for pagination'),
      includeCount: z
        .boolean()
        .optional()
        .describe('Whether to include total count in results')
        .default(false)
    })
  )
  .output(
    z.object({
      employees: z
        .array(z.record(z.string(), z.unknown()))
        .describe('List of matching employee records'),
      totalCount: z
        .number()
        .optional()
        .describe('Total number of matching records (if includeCount was true)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiServerUrl: ctx.auth.apiServerUrl
    });

    let result = await client.queryEmployees({
      filter: ctx.input.filter,
      select: ctx.input.select,
      expand: ctx.input.expand,
      orderBy: ctx.input.orderBy,
      top: ctx.input.top,
      skip: ctx.input.skip,
      inlineCount: ctx.input.includeCount
    });

    return {
      output: {
        employees: result.results,
        totalCount: result.count
      },
      message: `Found **${result.results.length}** employees${result.count !== undefined ? ` (${result.count} total)` : ''}`
    };
  })
  .build();
