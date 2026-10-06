import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, nextCursorFrom } from '../lib/client';
import { combinatorSchema, filterSchema } from '../lib/schemas';
import { spec } from '../spec';

export let listCompanies = SlateTool.create(spec, {
  name: 'List Companies',
  key: 'list_companies',
  description: `Lists companies in your Folk workspace with optional pagination. Returns company details, group memberships, and contact information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Number of results per page (1-100, default 20)'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response'),
      filter: filterSchema,
      combinator: combinatorSchema
    })
  )
  .output(
    z.object({
      companies: z
        .array(
          z.object({
            companyId: z.string(),
            name: z.string(),
            industry: z.string().nullable(),
            employeeRange: z.string().nullable(),
            emails: z.array(z.string()),
            phones: z.array(z.string()),
            groups: z.array(
              z.object({
                groupId: z.string(),
                groupName: z.string()
              })
            )
          })
        )
        .describe('List of companies'),
      nextCursor: z
        .string()
        .nullable()
        .describe('Cursor for next page, null if no more results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listCompanies({
      limit: ctx.input.limit,
      cursor: ctx.input.cursor,
      filter: ctx.input.filter,
      combinator: ctx.input.combinator
    });

    const nextCursor = nextCursorFrom(result.pagination.nextLink);

    return {
      output: {
        companies: result.items.map(c => ({
          companyId: c.id,
          name: c.name,
          industry: c.industry,
          employeeRange: c.employeeRange,
          emails: c.emails,
          phones: c.phones,
          groups: c.groups.map(g => ({ groupId: g.id, groupName: g.name }))
        })),
        nextCursor
      },
      message: `Found **${result.items.length}** companies${nextCursor ? ' (more available)' : ''}`
    };
  })
  .build();
