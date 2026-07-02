import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listPeople = SlateTool.create(spec, {
  name: 'List Organization Members',
  key: 'list_people',
  description: `List members of the configured Codacy organization. Supports filtering by name/email and pagination. Returns member details including name, email, and role.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      search: z.string().optional().describe('Search members by name or email.'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response.'),
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Maximum number of members to return (1-100).')
    })
  )
  .output(
    z.object({
      members: z.array(z.any()).describe('List of organization members.'),
      cursor: z.string().optional().describe('Pagination cursor for the next page.'),
      total: z.number().optional().describe('Total number of members.')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let response = await client.listPeople({
      search: ctx.input.search,
      cursor: ctx.input.cursor,
      limit: ctx.input.limit
    });

    let members = response.data ?? [];

    return {
      output: {
        members,
        cursor: response.pagination?.cursor,
        total: response.pagination?.total
      },
      message: `Found **${members.length}** member(s) in the organization.${response.pagination?.total ? ` Total: ${response.pagination.total}.` : ''}`
    };
  })
  .build();
