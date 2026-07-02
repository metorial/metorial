import { SlateTool } from 'slates';
import { z } from 'zod';
import { SuperchatClient } from '../lib/client';
import { spec } from '../spec';

let userSchema = z.object({
  userId: z.string().describe('Unique user identifier'),
  userUrl: z.string().optional().describe('Resource URL'),
  name: z.string().optional().describe('User display name'),
  email: z.string().optional().describe('User email address')
});

let mapUser = (user: any) => ({
  userId: user.id,
  userUrl: user.url,
  name: user.name,
  email: user.email
});

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `List all workspace users. Useful for finding user IDs to assign to conversations.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Maximum number of users to return'),
      after: z.string().optional().describe('Cursor for forward pagination'),
      before: z.string().optional().describe('Cursor for backward pagination')
    })
  )
  .output(
    z.object({
      users: z.array(userSchema).describe('List of workspace users'),
      pagination: z
        .object({
          next: z.string().optional().nullable().describe('Next page cursor'),
          previous: z.string().optional().nullable().describe('Previous page cursor')
        })
        .optional()
        .describe('Pagination cursors')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SuperchatClient({ token: ctx.auth.token });

    let result = await client.listUsers({
      limit: ctx.input.limit,
      after: ctx.input.after,
      before: ctx.input.before
    });

    let users = (result.results || []).map(mapUser);

    return {
      output: {
        users,
        pagination: result.pagination
      },
      message: `Retrieved **${users.length}** user(s).`
    };
  })
  .build();

export let getUser = SlateTool.create(spec, {
  name: 'Get User',
  key: 'get_user',
  description: `Retrieve details of a specific workspace user by their ID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z.string().describe('ID of the user to retrieve')
    })
  )
  .output(userSchema)
  .handleInvocation(async ctx => {
    let client = new SuperchatClient({ token: ctx.auth.token });
    let result = await client.getUser(ctx.input.userId);

    return {
      output: mapUser(result),
      message: `Retrieved user **${result.name || result.email}** (\`${result.id}\`).`
    };
  })
  .build();

export let getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description: `Retrieve information about the currently authenticated user (the API key owner).`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(userSchema)
  .handleInvocation(async ctx => {
    let client = new SuperchatClient({ token: ctx.auth.token });
    let result = await client.getMe();

    return {
      output: mapUser(result),
      message: `Authenticated as **${result.name || result.email}** (\`${result.id}\`).`
    };
  })
  .build();
