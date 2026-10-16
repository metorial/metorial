import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { getMemberspotList, getMemberspotNextPage } from '../lib/responses';
import { spec } from '../spec';

export let listUsersTool = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `List members on your Memberspot platform. Supports pagination and filtering by offer, course, or active status. Returns user profiles with their associated metadata.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      offerId: z
        .string()
        .optional()
        .describe('Filter by offer ID. Call list_offers to discover offer IDs.'),
      courseId: z
        .string()
        .optional()
        .describe(
          'Filter by course ID and include that course progress. Call list_courses to discover course IDs.'
        ),
      active: z.boolean().optional().describe('Filter by active status'),
      pageLength: z
        .number()
        .optional()
        .describe('Number of users per page, from 1 to 100; defaults to 10'),
      lastLoadedId: z.string().optional().describe('ID of the last loaded user for pagination')
    })
  )
  .output(
    z.object({
      users: z.array(z.record(z.string(), z.any())).describe('List of user objects'),
      nextPage: z
        .string()
        .optional()
        .describe('Pass this cursor as lastLoadedId for the next page'),
      raw: z.any().optional().describe('Unmodified provider response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listUsers({
      offerId: ctx.input.offerId,
      courseId: ctx.input.courseId,
      active: ctx.input.active,
      pageLength: ctx.input.pageLength,
      lastLoadedId: ctx.input.lastLoadedId
    });

    let users = getMemberspotList(result, ['data', 'users']);

    return {
      output: { users, nextPage: getMemberspotNextPage(result), raw: result },
      message: `Retrieved **${users.length}** user(s) from Memberspot.`
    };
  })
  .build();
