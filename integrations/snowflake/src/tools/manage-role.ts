import { SlateTool } from 'slates';
import { z } from 'zod';
import { SnowflakeClient } from '../lib/client';
import { spec } from '../spec';

export let manageRole = SlateTool.create(spec, {
  name: 'Manage Role',
  key: 'manage_role',
  description: `Create, retrieve, list, or delete Snowflake roles. Roles control access privileges to objects and operations. Use roles in conjunction with grants to manage fine-grained permissions.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'get', 'create', 'delete']).describe('Operation to perform'),
      roleName: z.string().optional().describe('Role name (required for get, create, delete)'),
      like: z.string().optional().describe('SQL LIKE pattern to filter roles when listing'),
      showLimit: z
        .number()
        .optional()
        .describe('Maximum number of roles to return when listing'),
      createMode: z
        .enum(['errorIfExists', 'orReplace', 'ifNotExists'])
        .optional()
        .describe('Creation behavior'),
      comment: z.string().optional().describe('Role comment'),
      ifExists: z
        .boolean()
        .optional()
        .describe('When true, delete succeeds even if the role does not exist')
    })
  )
  .output(
    z.object({
      roles: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('List of roles (for list action)'),
      role: z
        .record(z.string(), z.any())
        .optional()
        .describe('Role details (for get/create actions)'),
      deleted: z.boolean().optional().describe('Whether the role was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SnowflakeClient({
      accountIdentifier: ctx.config.accountIdentifier,
      token: ctx.auth.token,
      tokenType: ctx.auth.tokenType
    });

    let { action, roleName } = ctx.input;

    if (action === 'list') {
      let roles = await client.listRoles({
        like: ctx.input.like,
        showLimit: ctx.input.showLimit
      });
      return {
        output: { roles },
        message: `Found **${roles.length}** role(s)`
      };
    }

    if (!roleName) {
      throw new Error('roleName is required for get, create, and delete actions');
    }

    if (action === 'get') {
      let role = await client.getRole(roleName);
      return {
        output: { role },
        message: `Retrieved role **${roleName}**`
      };
    }

    if (action === 'create') {
      let body: Record<string, any> = { name: roleName };
      if (ctx.input.comment) body.comment = ctx.input.comment;

      let role = await client.createRole(body, ctx.input.createMode);
      return {
        output: { role },
        message: `Created role **${roleName}**`
      };
    }

    if (action === 'delete') {
      await client.deleteRole(roleName, ctx.input.ifExists);
      return {
        output: { deleted: true },
        message: `Deleted role **${roleName}**`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
