import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listProfiles = SlateTool.create(spec, {
  name: 'List Profiles',
  key: 'list_profiles',
  description: `Retrieve legacy customer profiles from a Squarespace merchant site. Profiles are in maintenance mode in Squarespace's current API docs; use the Contacts tools for new contact workflows.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      cursor: z.string().optional().describe('Pagination cursor from a previous response'),
      filter: z
        .string()
        .optional()
        .describe('Semicolon-separated profile filters such as isCustomer or hasAccount'),
      email: z.string().optional().describe('Email address filter'),
      sortField: z
        .enum(['createdOn', 'id', 'email', 'lastName'])
        .optional()
        .describe('Profile field to sort by'),
      sortDirection: z.enum(['asc', 'dsc']).optional().describe('Sort direction: asc or dsc')
    })
  )
  .output(
    z.object({
      profiles: z.array(z.any()).describe('Array of customer profile objects'),
      hasNextPage: z.boolean().describe('Whether more results are available'),
      nextPageCursor: z.string().optional().describe('Cursor for the next page of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listProfiles({
      cursor: ctx.input.cursor,
      filter: ctx.input.filter,
      email: ctx.input.email,
      sortField: ctx.input.sortField,
      sortDirection: ctx.input.sortDirection
    });

    return {
      output: {
        profiles: result.profiles,
        hasNextPage: result.pagination.hasNextPage,
        nextPageCursor: result.pagination.nextPageCursor
      },
      message: `Retrieved **${result.profiles.length}** profile(s).${result.pagination.hasNextPage ? ' More results available via pagination.' : ''}`
    };
  })
  .build();
