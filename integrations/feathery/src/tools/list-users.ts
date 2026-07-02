import { SlateTool } from 'slates';
import { z } from 'zod';
import { FeatheryClient } from '../lib/client';
import { spec } from '../spec';

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `List form submitter users. Filter by creation date or field values. Returns user IDs and metadata.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      createdAfter: z
        .string()
        .optional()
        .describe('Filter users created after this datetime (ISO 8601)'),
      createdBefore: z
        .string()
        .optional()
        .describe('Filter users created before this datetime (ISO 8601)'),
      filterFieldId: z.string().optional().describe('Field ID to filter users by'),
      filterFieldValue: z.string().optional().describe('Value to match for the filter field')
    })
  )
  .output(
    z.object({
      users: z
        .array(
          z.object({
            userId: z.string().describe('Unique user identifier'),
            createdAt: z.string().optional().describe('When the user was created')
          })
        )
        .describe('List of users')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FeatheryClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let result = await client.listUsers({
      createdAfter: ctx.input.createdAfter,
      createdBefore: ctx.input.createdBefore,
      filterFieldId: ctx.input.filterFieldId,
      filterFieldValue: ctx.input.filterFieldValue
    });

    let users = Array.isArray(result) ? result : result.results || result.data || [];

    let mapped = users.map((u: any) => ({
      userId: u.id || u.user_id,
      createdAt: u.created_at
    }));

    return {
      output: { users: mapped },
      message: `Found **${mapped.length}** user(s).`
    };
  })
  .build();
