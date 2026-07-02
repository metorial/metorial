import { SlateTool } from 'slates';
import { z } from 'zod';
import { tableauServiceError } from '../lib/errors';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageUsers = SlateTool.create(spec, {
  name: 'Manage Users',
  key: 'manage_users',
  description: `List, get, add, update, or remove users on the Tableau site. Use the **action** field to select the operation.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'add', 'update', 'remove'])
        .describe('Operation to perform'),
      userId: z.string().optional().describe('User LUID (required for get, update, remove)'),
      username: z.string().optional().describe('Username (required for add)'),
      siteRole: z
        .string()
        .optional()
        .describe(
          'Site role, e.g. "Viewer", "Explorer", "Creator", "SiteAdministratorExplorer", "SiteAdministratorCreator" (required for add)'
        ),
      fullName: z.string().optional().describe('Full display name (for update)'),
      email: z.string().optional().describe('Email address (for update)'),
      authSetting: z.string().optional().describe('Auth setting (for add/update)'),
      pageSize: z.number().optional().describe('Number of items per page'),
      pageNumber: z.number().optional().describe('Page number (1-based)'),
      filter: z.string().optional().describe('Filter expression for list'),
      sort: z.string().optional().describe('Sort expression for list')
    })
  )
  .output(
    z.object({
      users: z
        .array(
          z.object({
            userId: z.string(),
            name: z.string().optional(),
            fullName: z.string().optional(),
            email: z.string().optional(),
            siteRole: z.string().optional(),
            authSetting: z.string().optional(),
            lastLogin: z.string().optional()
          })
        )
        .optional(),
      user: z
        .object({
          userId: z.string(),
          name: z.string().optional(),
          fullName: z.string().optional(),
          email: z.string().optional(),
          siteRole: z.string().optional(),
          authSetting: z.string().optional(),
          lastLogin: z.string().optional()
        })
        .optional(),
      totalCount: z.number().optional(),
      removed: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let { action } = ctx.input;

    if (action === 'list') {
      let result = await client.queryUsers({
        pageSize: ctx.input.pageSize,
        pageNumber: ctx.input.pageNumber,
        filter: ctx.input.filter,
        sort: ctx.input.sort
      });

      let pagination = result.pagination || {};
      let users = (result.users?.user || []).map((u: any) => ({
        userId: u.id,
        name: u.name,
        fullName: u.fullName,
        email: u.email,
        siteRole: u.siteRole,
        authSetting: u.authSetting,
        lastLogin: u.lastLogin
      }));

      return {
        output: { users, totalCount: Number(pagination.totalAvailable || 0) },
        message: `Found **${users.length}** users (${pagination.totalAvailable || 0} total).`
      };
    }

    if (action === 'get') {
      if (!ctx.input.userId) throw tableauServiceError('userId is required for get action.');

      let u = await client.getUser(ctx.input.userId);
      return {
        output: {
          user: {
            userId: u.id,
            name: u.name,
            fullName: u.fullName,
            email: u.email,
            siteRole: u.siteRole,
            authSetting: u.authSetting,
            lastLogin: u.lastLogin
          }
        },
        message: `Retrieved user **${u.name}** (${u.siteRole}).`
      };
    }

    if (action === 'add') {
      if (!ctx.input.username)
        throw tableauServiceError('username is required for add action.');
      if (!ctx.input.siteRole)
        throw tableauServiceError('siteRole is required for add action.');

      let u = await client.addUser(
        ctx.input.username,
        ctx.input.siteRole,
        ctx.input.authSetting
      );
      return {
        output: {
          user: {
            userId: u.id,
            name: u.name,
            siteRole: u.siteRole,
            authSetting: u.authSetting
          }
        },
        message: `Added user **${u.name}** as ${u.siteRole}.`
      };
    }

    if (action === 'update') {
      if (!ctx.input.userId)
        throw tableauServiceError('userId is required for update action.');
      if (
        ctx.input.fullName === undefined &&
        ctx.input.email === undefined &&
        ctx.input.siteRole === undefined &&
        ctx.input.authSetting === undefined
      ) {
        throw tableauServiceError('Provide at least one field to update a user.');
      }

      let u = await client.updateUser(ctx.input.userId, {
        fullName: ctx.input.fullName,
        email: ctx.input.email,
        siteRole: ctx.input.siteRole,
        authSetting: ctx.input.authSetting
      });
      return {
        output: {
          user: {
            userId: u.id,
            name: u.name,
            fullName: u.fullName,
            email: u.email,
            siteRole: u.siteRole,
            authSetting: u.authSetting
          }
        },
        message: `Updated user **${u.name}**.`
      };
    }

    if (action === 'remove') {
      if (!ctx.input.userId)
        throw tableauServiceError('userId is required for remove action.');

      await client.removeUser(ctx.input.userId);
      return {
        output: { removed: true },
        message: `Removed user \`${ctx.input.userId}\` from the site.`
      };
    }

    throw tableauServiceError(`Unknown action: ${action}`);
  })
  .build();
