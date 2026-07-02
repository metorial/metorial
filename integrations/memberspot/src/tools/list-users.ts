import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
      offerId: z.string().optional().describe('Filter users by offer ID'),
      courseId: z.string().optional().describe('Filter users by course ID'),
      active: z.boolean().optional().describe('Filter by active status'),
      pageLength: z.number().optional().describe('Number of users to return per page'),
      lastLoadedId: z.string().optional().describe('ID of the last loaded user for pagination')
    })
  )
  .output(
    z.object({
      users: z.array(z.record(z.string(), z.any())).describe('List of user objects')
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

    let users = Array.isArray(result) ? result : (result?.users ?? [result]);

    return {
      output: { users },
      message: `Retrieved **${users.length}** user(s) from Memberspot.`
    };
  })
  .build();
