import { SlateTool } from 'slates';
import { z } from 'zod';
import { BackendlessClient } from '../lib/client';
import { spec } from '../spec';

export let findUsers = SlateTool.create(spec, {
  name: 'Find Users',
  key: 'find_users',
  description: `Searches for users in the Backendless Users table. Supports filtering by SQL where clause, sorting, pagination, and fetching a single user by ID. Can also return just the user count.`,
  instructions: [
    "Use the `where` parameter for SQL-like filtering on user properties, e.g. `email LIKE '%@example.com'`.",
    'Set `countOnly` to true to get just the total number of matching users.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z.string().optional().describe('Fetch a specific user by their objectId'),
      where: z.string().optional().describe('SQL-like where clause to filter users'),
      sortBy: z
        .array(z.string())
        .optional()
        .describe('Properties to sort by. Prefix with "-" for descending.'),
      props: z.array(z.string()).optional().describe('Specific user properties to return'),
      pageSize: z.number().optional().describe('Number of users per page'),
      offset: z.number().optional().describe('Starting index for pagination'),
      loadRelations: z
        .array(z.string())
        .optional()
        .describe('Related object properties to load'),
      relationsDepth: z.number().optional().describe('Depth of nested relations to load'),
      countOnly: z
        .boolean()
        .optional()
        .describe('If true, returns only the count of matching users')
    })
  )
  .output(
    z.object({
      users: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Array of matching user objects'),
      singleUser: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Single user when queried by ID'),
      count: z
        .number()
        .describe('Number of users returned or total count if countOnly is true')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BackendlessClient({
      applicationId: ctx.auth.applicationId,
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain,
      region: ctx.config.region
    });

    if (ctx.input.userId) {
      let user = await client.getUserById(ctx.input.userId);
      return {
        output: {
          singleUser: user,
          count: 1
        },
        message: `Retrieved user **${ctx.input.userId}**.`
      };
    }

    if (ctx.input.countOnly) {
      let count = await client.getUserCount(ctx.input.where);
      return {
        output: {
          count
        },
        message: `Found **${count}** users${ctx.input.where ? ` matching \`${ctx.input.where}\`` : ''}.`
      };
    }

    let users = await client.getUsers({
      where: ctx.input.where,
      sortBy: ctx.input.sortBy,
      props: ctx.input.props,
      pageSize: ctx.input.pageSize,
      offset: ctx.input.offset,
      loadRelations: ctx.input.loadRelations,
      relationsDepth: ctx.input.relationsDepth
    });

    return {
      output: {
        users,
        count: users.length
      },
      message: `Retrieved **${users.length}** users${ctx.input.where ? ` matching \`${ctx.input.where}\`` : ''}.`
    };
  })
  .build();
