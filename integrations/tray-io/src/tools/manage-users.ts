import { SlateTool } from 'slates';
import { z } from 'zod';
import { TrayGraphqlClient } from '../lib/client';
import { spec } from '../spec';

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `List external end users managed through the Tray.io Embedded API. Optionally filter by external user ID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      externalUserId: z
        .string()
        .optional()
        .describe("Filter users by your application's external user ID")
    })
  )
  .output(
    z.object({
      users: z.array(
        z.object({
          userId: z.string().describe('Tray.io internal user ID'),
          name: z.string().describe('User display name'),
          externalUserId: z.string().describe('External user ID from your application')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new TrayGraphqlClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let criteria = ctx.input.externalUserId
      ? { externalUserId: ctx.input.externalUserId }
      : undefined;
    let users = await client.listUsers(criteria);

    return {
      output: {
        users: users.map(u => ({
          userId: u.id,
          name: u.name,
          externalUserId: u.externalUserId
        }))
      },
      message: `Found **${users.length}** user(s).`
    };
  })
  .build();

export let createUser = SlateTool.create(spec, {
  name: 'Create User',
  key: 'create_user',
  description: `Create a new external end user in Tray.io and optionally generate an access token. The user can then be associated with solution instances and authentications. Requires a master token.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Display name for the new user'),
      externalUserId: z
        .string()
        .describe("Your application's unique identifier for this user"),
      generateAccessToken: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether to also generate a user access token (valid for 2 days)')
    })
  )
  .output(
    z.object({
      userId: z.string().describe('Tray.io internal user ID'),
      accessToken: z
        .string()
        .optional()
        .describe('User access token if requested (valid for 2 days)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TrayGraphqlClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let result = await client.createExternalUser({
      name: ctx.input.name,
      externalUserId: ctx.input.externalUserId
    });

    let accessToken: string | undefined;
    if (ctx.input.generateAccessToken) {
      let authResult = await client.authorize(result.userId);
      accessToken = authResult.accessToken;
    }

    return {
      output: {
        userId: result.userId,
        ...(accessToken ? { accessToken } : {})
      },
      message: `Created user **${ctx.input.name}** (ID: ${result.userId}).${accessToken ? ' Access token generated.' : ''}`
    };
  })
  .build();

export let deleteUser = SlateTool.create(spec, {
  name: 'Delete User',
  key: 'delete_user',
  description: `Delete an external end user from Tray.io. This removes the user and all associated solution instances. Requires a master token.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      userId: z.string().describe('Tray.io internal user ID to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the user was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TrayGraphqlClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    await client.deleteExternalUser(ctx.input.userId);

    return {
      output: { deleted: true },
      message: `Deleted user **${ctx.input.userId}**.`
    };
  })
  .build();

export let generateUserToken = SlateTool.create(spec, {
  name: 'Generate User Token',
  key: 'generate_user_token',
  description: `Generate an access token for an existing Tray.io end user. The token is valid for 2 days and can be used for user-scoped operations like creating solution instances and calling connectors. Requires a master token.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      userId: z.string().describe('Tray.io internal user ID')
    })
  )
  .output(
    z.object({
      accessToken: z.string().describe('User access token (valid for 2 days)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TrayGraphqlClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let result = await client.authorize(ctx.input.userId);

    return {
      output: { accessToken: result.accessToken },
      message: `Generated access token for user **${ctx.input.userId}** (valid for 2 days).`
    };
  })
  .build();
