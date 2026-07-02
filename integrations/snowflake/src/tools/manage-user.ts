import { SlateTool } from 'slates';
import { z } from 'zod';
import { SnowflakeClient } from '../lib/client';
import { spec } from '../spec';

export let manageUser = SlateTool.create(spec, {
  name: 'Manage User',
  key: 'manage_user',
  description: `Create, retrieve, list, or delete Snowflake users. Users represent individual accounts that can connect to and interact with Snowflake. When creating a user, optionally assign a default role, warehouse, and namespace.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'get', 'create', 'delete']).describe('Operation to perform'),
      userName: z
        .string()
        .optional()
        .describe('User login name (required for get, create, delete)'),
      like: z.string().optional().describe('SQL LIKE pattern to filter users when listing'),
      showLimit: z
        .number()
        .optional()
        .describe('Maximum number of users to return when listing'),
      createMode: z
        .enum(['errorIfExists', 'orReplace', 'ifNotExists'])
        .optional()
        .describe('Creation behavior'),
      displayName: z.string().optional().describe('Display name for the user'),
      email: z.string().optional().describe('Email address for the user'),
      defaultRole: z.string().optional().describe('Default role assigned to the user'),
      defaultWarehouse: z
        .string()
        .optional()
        .describe('Default warehouse assigned to the user'),
      defaultNamespace: z
        .string()
        .optional()
        .describe('Default database.schema namespace for the user'),
      comment: z.string().optional().describe('User comment'),
      disabled: z.boolean().optional().describe('Whether the user account is disabled'),
      ifExists: z
        .boolean()
        .optional()
        .describe('When true, delete succeeds even if the user does not exist')
    })
  )
  .output(
    z.object({
      users: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('List of users (for list action)'),
      user: z
        .record(z.string(), z.any())
        .optional()
        .describe('User details (for get/create actions)'),
      deleted: z.boolean().optional().describe('Whether the user was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SnowflakeClient({
      accountIdentifier: ctx.config.accountIdentifier,
      token: ctx.auth.token,
      tokenType: ctx.auth.tokenType
    });

    let { action, userName } = ctx.input;

    if (action === 'list') {
      let users = await client.listUsers({
        like: ctx.input.like,
        showLimit: ctx.input.showLimit
      });
      return {
        output: { users },
        message: `Found **${users.length}** user(s)`
      };
    }

    if (!userName) {
      throw new Error('userName is required for get, create, and delete actions');
    }

    if (action === 'get') {
      let user = await client.getUser(userName);
      return {
        output: { user },
        message: `Retrieved user **${userName}**`
      };
    }

    if (action === 'create') {
      let body: Record<string, any> = { name: userName };
      if (ctx.input.displayName) body.display_name = ctx.input.displayName;
      if (ctx.input.email) body.email = ctx.input.email;
      if (ctx.input.defaultRole) body.default_role = ctx.input.defaultRole;
      if (ctx.input.defaultWarehouse) body.default_warehouse = ctx.input.defaultWarehouse;
      if (ctx.input.defaultNamespace) body.default_namespace = ctx.input.defaultNamespace;
      if (ctx.input.comment) body.comment = ctx.input.comment;
      if (ctx.input.disabled !== undefined) body.disabled = ctx.input.disabled;

      let user = await client.createUser(body, ctx.input.createMode);
      return {
        output: { user },
        message: `Created user **${userName}**`
      };
    }

    if (action === 'delete') {
      await client.deleteUser(userName, ctx.input.ifExists);
      return {
        output: { deleted: true },
        message: `Deleted user **${userName}**`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
