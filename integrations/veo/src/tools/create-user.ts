import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createUser = SlateTool.create(spec, {
  name: 'Create User',
  key: 'create_user',
  description: `Create a new user directly in your VEO organisation without sending invitation emails. Useful for API-driven user provisioning.`,
  instructions: [
    'Role IDs: 4 = standard User, 2 = Organisation Admin. All users should have role 4 at minimum.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      organisationId: z.string().describe('ID of the organisation to add the user to'),
      firstName: z.string().describe('First name of the user'),
      lastName: z.string().describe('Last name of the user'),
      email: z.string().describe('Email address for the user'),
      password: z.string().describe('Initial password for the user'),
      roles: z
        .array(z.number())
        .optional()
        .default([4])
        .describe('Role IDs (4 = User, 2 = Org Admin). Default: [4]'),
      regionId: z.number().optional().describe('Region ID for the user')
    })
  )
  .output(
    z.object({
      userId: z.string().describe('ID of the newly created user')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, environment: ctx.auth.environment });

    let result = await client.createUser({
      organisationId: ctx.input.organisationId,
      firstName: ctx.input.firstName,
      lastName: ctx.input.lastName,
      email: ctx.input.email,
      password: ctx.input.password,
      roles: ctx.input.roles,
      regionId: ctx.input.regionId
    });

    let userId = String(result.id ?? result.Id ?? result);

    return {
      output: { userId },
      message: `Created user **${ctx.input.firstName} ${ctx.input.lastName}** (${ctx.input.email}) with ID \`${userId}\`.`
    };
  })
  .build();
