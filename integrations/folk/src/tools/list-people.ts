import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listPeople = SlateTool.create(spec, {
  name: 'List People',
  key: 'list_people',
  description: `Lists people in your Folk workspace with optional pagination. Returns contact details, group memberships, and company associations for each person.`,
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
      cursor: z.string().optional().describe('Pagination cursor from a previous response')
    })
  )
  .output(
    z.object({
      people: z
        .array(
          z.object({
            personId: z.string(),
            firstName: z.string(),
            lastName: z.string(),
            fullName: z.string(),
            jobTitle: z.string(),
            emails: z.array(z.string()),
            phones: z.array(z.string()),
            groups: z.array(
              z.object({
                groupId: z.string(),
                groupName: z.string()
              })
            ),
            companies: z.array(
              z.object({
                companyId: z.string(),
                companyName: z.string()
              })
            )
          })
        )
        .describe('List of people'),
      nextCursor: z
        .string()
        .nullable()
        .describe('Cursor for next page, null if no more results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listPeople({
      limit: ctx.input.limit,
      cursor: ctx.input.cursor
    });

    let nextCursor: string | null = null;
    if (result.pagination.nextLink) {
      let url = new URL(result.pagination.nextLink);
      nextCursor = url.searchParams.get('cursor');
    }

    return {
      output: {
        people: result.items.map(p => ({
          personId: p.id,
          firstName: p.firstName,
          lastName: p.lastName,
          fullName: p.fullName,
          jobTitle: p.jobTitle,
          emails: p.emails,
          phones: p.phones,
          groups: p.groups.map(g => ({ groupId: g.id, groupName: g.name })),
          companies: p.companies.map(c => ({ companyId: c.id, companyName: c.name }))
        })),
        nextCursor
      },
      message: `Found **${result.items.length}** people${nextCursor ? ' (more available)' : ''}`
    };
  })
  .build();
