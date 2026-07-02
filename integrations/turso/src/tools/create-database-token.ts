import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createDatabaseToken = SlateTool.create(spec, {
  name: 'Create Database Token',
  key: 'create_database_token',
  description: `Generate an authentication token for a specific database. The token can be used by SDKs to connect to the database. Supports read-only access and custom expiration.`,
  instructions: [
    'Expiration format examples: "2w1d30m" for 2 weeks, 1 day, 30 minutes. Use "never" for no expiration.',
    'Set authorization to "read-only" to create a read-only token.'
  ]
})
  .input(
    z.object({
      databaseName: z.string().describe('Name of the database to generate a token for'),
      expiration: z
        .string()
        .optional()
        .describe('Token expiration (e.g., "2w1d30m", "never")'),
      authorization: z
        .enum(['full-access', 'read-only'])
        .optional()
        .describe('Token authorization level')
    })
  )
  .output(
    z.object({
      jwt: z.string().describe('The generated JWT token for database access')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organizationSlug: ctx.config.organizationSlug
    });

    let result = await client.createDatabaseToken(ctx.input.databaseName, {
      expiration: ctx.input.expiration,
      authorization: ctx.input.authorization
    });

    return {
      output: {
        jwt: result.jwt
      },
      message: `Generated ${ctx.input.authorization ?? 'full-access'} token for database **${ctx.input.databaseName}**.`
    };
  })
  .build();
