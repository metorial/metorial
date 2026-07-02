import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, extractUserSummary } from '../lib/helpers';
import { spec } from '../spec';

let userOutputSchema = z.object({
  userId: z.string().describe('Unique identifier of the user'),
  username: z.string().describe('Login username or slug'),
  name: z.string().describe('Display name'),
  email: z.string().describe('Email address'),
  avatarUrl: z.string().describe('URL to the user avatar'),
  roles: z
    .array(z.string())
    .describe('User roles (administrator, editor, author, contributor, subscriber)'),
  profileUrl: z.string().describe('URL to the user profile')
});

export let listUsersTool = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `Retrieve a list of users on the WordPress site. Filter by search term or role. Results are paginated.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      search: z.string().optional().describe('Search users by name, username, or email'),
      roles: z
        .string()
        .optional()
        .describe('Filter by role (administrator, editor, author, contributor, subscriber)'),
      perPage: z.number().optional().describe('Number of users per page (default: 20)'),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      users: z.array(userOutputSchema),
      count: z.number().describe('Number of users returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let users = await client.listUsers(ctx.input);
    let results = users.map((u: any) => extractUserSummary(u, ctx.config.apiType));
    return {
      output: {
        users: results,
        count: results.length
      },
      message: `Found **${results.length}** user(s).`
    };
  })
  .build();

export let getCurrentUserTool = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description: `Retrieve the profile of the currently authenticated user, including display name, email, avatar, and roles.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.string().describe('Unique identifier'),
      username: z.string().describe('Login username'),
      name: z.string().describe('Display name'),
      email: z.string().describe('Email address'),
      avatarUrl: z.string().describe('Avatar URL')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let user = await client.getCurrentUser();

    let result: any;
    if (ctx.config.apiType === 'wpcom') {
      result = {
        userId: String(user.ID),
        username: user.username || '',
        name: user.display_name || '',
        email: user.email || '',
        avatarUrl: user.avatar_URL || ''
      };
    } else {
      result = {
        userId: String(user.id),
        username: user.slug || '',
        name: user.name || '',
        email: user.email || '',
        avatarUrl: user.avatar_urls?.['96'] || ''
      };
    }

    return {
      output: result,
      message: `Authenticated as **${result.name}** (${result.username}).`
    };
  })
  .build();
