import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getMember = SlateTool.create(spec, {
  name: 'Get Member',
  key: 'get_member',
  description: `Retrieve a member (user) from the directory by their user ID or by querying a specific property such as email.
Returns member profile data including contact information, subscription details, and custom fields.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z.string().optional().describe('The user ID to look up directly.'),
      property: z
        .string()
        .optional()
        .describe(
          'The column/field name to search by (e.g., "email"). Used when userId is not provided.'
        ),
      propertyValue: z
        .string()
        .optional()
        .describe(
          'The value to match for the given property. Required when property is specified.'
        ),
      limit: z
        .number()
        .optional()
        .describe('Number of results per page (20-100). Defaults to 100.'),
      page: z
        .string()
        .optional()
        .describe('Pagination token from a previous response (next_page or last_page value).')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Response status from the API.'),
      member: z.any().describe('The member record(s) returned by the API.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      websiteDomain: ctx.config.websiteDomain
    });

    let result: any;
    if (ctx.input.userId) {
      result = await client.getUser(ctx.input.userId);
    } else if (ctx.input.property && ctx.input.propertyValue) {
      result = await client.getUserByProperty(ctx.input.property, ctx.input.propertyValue, {
        limit: ctx.input.limit,
        page: ctx.input.page
      });
    } else {
      throw new Error('Either userId or both property and propertyValue must be provided.');
    }

    return {
      output: {
        status: result.status,
        member: result.message
      },
      message: `Retrieved member data successfully.`
    };
  })
  .build();
