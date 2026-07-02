import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createUser = SlateTool.create(spec, {
  name: 'Create User',
  key: 'create_user',
  description: `Creates a new user or customer in OneDesk.
Users can be internal team members (agents) or external customers.
Specify the user type and optionally assign them to teams.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      email: z.string().describe('Email address of the new user.'),
      firstName: z.string().optional().describe('First name of the new user.'),
      lastName: z.string().optional().describe('Last name of the new user.'),
      type: z
        .string()
        .optional()
        .describe(
          'User type identifier. Use "Get Organization Info" to list available user types.'
        ),
      teams: z.array(z.string()).optional().describe('Team IDs to assign the user to.'),
      isAdmin: z.boolean().optional().describe('Set to true to grant admin privileges.')
    })
  )
  .output(
    z.object({
      userId: z.string().describe('ID of the newly created user.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authMethod: ctx.auth.authMethod
    });

    let result = await client.createUser({
      email: ctx.input.email,
      firstName: ctx.input.firstName,
      lastName: ctx.input.lastName,
      type: ctx.input.type,
      teams: ctx.input.teams,
      isAdmin: ctx.input.isAdmin
    });

    let userId =
      typeof result === 'string' ? result : result?.id || result?.externalId || String(result);

    return {
      output: {
        userId
      },
      message: `Created user **${ctx.input.email}** with ID \`${userId}\`.`
    };
  })
  .build();
