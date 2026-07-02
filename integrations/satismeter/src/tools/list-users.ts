import { SlateTool } from 'slates';
import { z } from 'zod';
import { SatisMeterClient } from '../lib/client';
import { spec } from '../spec';

export let listUsersTool = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `Retrieve users from the project. Optionally filter by a specific userId to look up a single user. Returns user details including traits, last seen timestamp, and subscription status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z
        .string()
        .optional()
        .describe(
          'Filter by a specific userId to look up one user. If omitted, returns all users.'
        )
    })
  )
  .output(
    z.object({
      users: z
        .array(
          z.object({
            userInternalId: z
              .string()
              .optional()
              .describe('SatisMeter internal user ID (use this for delete operations)'),
            userId: z
              .string()
              .optional()
              .describe('External user ID as provided during creation'),
            traits: z
              .record(z.string(), z.unknown())
              .optional()
              .describe('User custom traits/properties'),
            lastSeen: z.string().optional().describe('Timestamp when the user was last seen'),
            created: z.string().optional().describe('Timestamp when the user was created'),
            unsubscribed: z
              .boolean()
              .optional()
              .describe('Whether the user is unsubscribed from surveys')
          })
        )
        .describe('List of users')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SatisMeterClient(ctx.auth.token, ctx.auth.writeKey);
    let result = await client.listUsers({
      projectId: ctx.config.projectId,
      userId: ctx.input.userId
    });

    let users = (Array.isArray(result) ? result : []).map((u: any) => ({
      userInternalId: u.id,
      userId: u.userId,
      traits: u.traits,
      lastSeen: u.lastSeen,
      created: u.created,
      unsubscribed: u.unsubscribed
    }));

    return {
      output: { users },
      message: `Found **${users.length}** user(s).`
    };
  })
  .build();
