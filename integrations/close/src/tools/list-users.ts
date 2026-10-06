import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let userSchema = z.object({
  userId: z.string().describe('Unique identifier for the user'),
  email: z.string().describe('User email address'),
  firstName: z.string().optional().describe('User first name'),
  lastName: z.string().optional().describe('User last name'),
  image: z.string().optional().describe('URL to the user avatar image'),
  dateCreated: z.string().optional().describe('ISO 8601 timestamp when the user was created')
});

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `List users in the Close organization. Useful for looking up user IDs for lead/opportunity assignment, understanding team membership, and finding who is responsible for specific records.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Maximum number of users to return'),
      skip: z.number().optional().describe('Number of users to skip for pagination')
    })
  )
  .output(
    z.object({
      nextSkip: z.number().optional().describe('Offset for the next page, when available.'),
      hasMore: z.boolean().optional().describe('Whether more users are available.'),
      users: z.array(userSchema).describe('List of users in the organization'),
      totalResults: z.number().optional().describe('Total number of users in the organization')
    })
  )
  .handleInvocation(async ctx => {
    const result = await new Client(ctx.auth).listUsers(ctx.input);
    const users = result.data.map(u => ({
      userId: u.id,
      email: u.email,
      firstName: u.first_name ?? undefined,
      lastName: u.last_name ?? undefined,
      image: u.image ?? undefined,
      dateCreated: u.date_created ?? undefined
    }));
    return {
      output: {
        users,
        totalResults: result.total_results ?? undefined,
        hasMore: result.has_more,
        nextSkip: result.has_more ? (ctx.input.skip ?? 0) + users.length : undefined
      },
      message: `Returned ${users.length} organization user(s)${result.has_more ? '; more available' : ''}.`
    };
  })
  .build();
