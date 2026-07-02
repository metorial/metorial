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
      users: z.array(userSchema).describe('List of users in the organization'),
      totalResults: z.number().describe('Total number of users in the organization')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, authType: ctx.auth.authType });

    let result = await client.listUsers({
      limit: ctx.input.limit,
      skip: ctx.input.skip
    });

    let users = (result.data ?? []).map((u: any) => ({
      userId: u.id,
      email: u.email,
      firstName: u.first_name,
      lastName: u.last_name,
      image: u.image,
      dateCreated: u.date_created
    }));

    let totalResults = result.total_results ?? users.length;

    return {
      output: {
        users,
        totalResults
      },
      message: `Found **${totalResults}** user(s) in the organization (returning ${users.length}).`
    };
  })
  .build();
