import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let teamSchema = z
  .object({
    teamUuid: z.string().describe('UUID of the team'),
    name: z.string().describe('Name of the team'),
    active: z.boolean().describe('Whether the team is active')
  })
  .nullable()
  .optional();

let userSchema = z.object({
  userUuid: z.string().describe('UUID of the user'),
  name: z.string().describe('Full name of the user'),
  email: z.string().describe('Email address of the user'),
  createdAt: z.string().describe('ISO 8601 timestamp when the user was created'),
  updatedAt: z.string().describe('ISO 8601 timestamp when the user was last updated'),
  team: teamSchema.describe('Team the user belongs to')
});

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `List all users in your Leexi workspace. Returns user UUIDs, names, emails, and team associations. Use this to find user UUIDs needed for creating calls and meeting events.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination (default: 1)'),
      items: z.number().optional().describe('Number of items per page (1-100, default: 10)')
    })
  )
  .output(
    z.object({
      users: z.array(userSchema).describe('List of users in the workspace'),
      pagination: z.object({
        page: z.number().describe('Current page number'),
        items: z.number().describe('Items per page'),
        count: z.number().describe('Total number of users')
      })
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let response = await client.listUsers({
      page: ctx.input.page,
      items: ctx.input.items
    });

    let users = (response.data || []).map((u: any) => ({
      userUuid: u.uuid,
      name: u.name,
      email: u.email,
      createdAt: u.created_at,
      updatedAt: u.updated_at,
      team: u.team
        ? {
            teamUuid: u.team.uuid,
            name: u.team.name,
            active: u.team.active
          }
        : null
    }));

    return {
      output: {
        users,
        pagination: response.pagination
      },
      message: `Found **${response.pagination.count}** users (page ${response.pagination.page}).`
    };
  })
  .build();
