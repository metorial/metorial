import { SlateTool } from 'slates';
import { z } from 'zod';
import { GreenhouseClient } from '../lib/client';
import { mapUser } from '../lib/mappers';
import { spec } from '../spec';

export let listUsersTool = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `List users in Greenhouse. Supports filtering by email and date ranges. Returns paginated results with user details and permissions info.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination (starts at 1)'),
      perPage: z
        .number()
        .optional()
        .describe('Number of results per page (max 500, default 50)'),
      email: z.string().optional().describe('Filter users by email address'),
      createdAfter: z
        .string()
        .optional()
        .describe('Only return users created after this ISO 8601 timestamp'),
      createdBefore: z
        .string()
        .optional()
        .describe('Only return users created before this ISO 8601 timestamp'),
      updatedAfter: z
        .string()
        .optional()
        .describe('Only return users updated after this ISO 8601 timestamp'),
      updatedBefore: z
        .string()
        .optional()
        .describe('Only return users updated before this ISO 8601 timestamp')
    })
  )
  .output(
    z.object({
      users: z.array(
        z.object({
          userId: z.string(),
          name: z.string(),
          firstName: z.string(),
          lastName: z.string(),
          primaryEmail: z.string().nullable(),
          emails: z.array(z.string()),
          disabled: z.boolean(),
          siteAdmin: z.boolean(),
          createdAt: z.string().nullable(),
          updatedAt: z.string().nullable()
        })
      ),
      hasMore: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new GreenhouseClient({
      token: ctx.auth.token,
      onBehalfOf: ctx.config.onBehalfOf
    });
    let perPage = ctx.input.perPage || 50;

    let results = await client.listUsers({
      page: ctx.input.page,
      perPage,
      email: ctx.input.email,
      createdAfter: ctx.input.createdAfter,
      createdBefore: ctx.input.createdBefore,
      updatedAfter: ctx.input.updatedAfter,
      updatedBefore: ctx.input.updatedBefore
    });

    let users = results.map(mapUser);

    return {
      output: {
        users,
        hasMore: results.length >= perPage
      },
      message: `Found ${users.length} user(s)${ctx.input.email ? ` matching email "${ctx.input.email}"` : ''}.`
    };
  })
  .build();
