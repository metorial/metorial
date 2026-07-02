import { SlateTool } from 'slates';
import { z } from 'zod';
import { HarvestClient } from '../lib/client';
import { spec } from '../spec';

export let manageUser = SlateTool.create(spec, {
  name: 'Manage User',
  key: 'manage_user',
  description: `Create, update, or delete a user in Harvest. Users can be administrators, managers, or regular members. Supports setting roles, rates, and project access.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      userId: z.number().optional().describe('User ID (required for update/delete)'),
      firstName: z.string().optional().describe('First name (required for create)'),
      lastName: z.string().optional().describe('Last name (required for create)'),
      email: z.string().optional().describe('Email address (required for create)'),
      timezone: z.string().optional().describe('Timezone name (e.g. "America/New_York")'),
      hasAccessToAllFutureProjects: z
        .boolean()
        .optional()
        .describe('Automatically add to future projects'),
      isContractor: z.boolean().optional().describe('Whether the user is a contractor'),
      isActive: z.boolean().optional().describe('Whether the user is active'),
      weeklyCapacity: z.number().optional().describe('Weekly capacity in seconds'),
      defaultHourlyRate: z.number().optional().describe('Default hourly rate'),
      costRate: z.number().optional().describe('Cost rate'),
      roles: z.array(z.string()).optional().describe('Role names to assign'),
      accessRoles: z
        .array(z.string())
        .optional()
        .describe('Access roles: "administrator", "manager", or "member"')
    })
  )
  .output(
    z.object({
      userId: z.number().optional().describe('ID of the user'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      email: z.string().optional().describe('Email'),
      isActive: z.boolean().optional().describe('Whether active'),
      isAdmin: z.boolean().optional().describe('Whether administrator'),
      timezone: z.string().optional().describe('Timezone'),
      deleted: z.boolean().optional().describe('Whether the user was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HarvestClient({
      token: ctx.auth.token,
      accountId: ctx.config.accountId
    });

    if (ctx.input.action === 'delete') {
      if (!ctx.input.userId) throw new Error('userId is required for delete');
      await client.deleteUser(ctx.input.userId);
      return {
        output: { userId: ctx.input.userId, deleted: true },
        message: `Deleted user **#${ctx.input.userId}**.`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.firstName || !ctx.input.lastName || !ctx.input.email) {
        throw new Error('firstName, lastName, and email are required for create');
      }
      let u = await client.createUser({
        firstName: ctx.input.firstName,
        lastName: ctx.input.lastName,
        email: ctx.input.email,
        timezone: ctx.input.timezone,
        hasAccessToAllFutureProjects: ctx.input.hasAccessToAllFutureProjects,
        isContractor: ctx.input.isContractor,
        isActive: ctx.input.isActive,
        weeklyCapacity: ctx.input.weeklyCapacity,
        defaultHourlyRate: ctx.input.defaultHourlyRate,
        costRate: ctx.input.costRate,
        roles: ctx.input.roles,
        accessRoles: ctx.input.accessRoles
      });
      return {
        output: {
          userId: u.id,
          firstName: u.first_name,
          lastName: u.last_name,
          email: u.email,
          isActive: u.is_active,
          isAdmin: u.is_admin,
          timezone: u.timezone
        },
        message: `Created user **${u.first_name} ${u.last_name}** (#${u.id}).`
      };
    }

    // update
    if (!ctx.input.userId) throw new Error('userId is required for update');
    let u = await client.updateUser(ctx.input.userId, {
      firstName: ctx.input.firstName,
      lastName: ctx.input.lastName,
      email: ctx.input.email,
      timezone: ctx.input.timezone,
      hasAccessToAllFutureProjects: ctx.input.hasAccessToAllFutureProjects,
      isContractor: ctx.input.isContractor,
      isActive: ctx.input.isActive,
      weeklyCapacity: ctx.input.weeklyCapacity,
      defaultHourlyRate: ctx.input.defaultHourlyRate,
      costRate: ctx.input.costRate,
      roles: ctx.input.roles,
      accessRoles: ctx.input.accessRoles
    });
    return {
      output: {
        userId: u.id,
        firstName: u.first_name,
        lastName: u.last_name,
        email: u.email,
        isActive: u.is_active,
        isAdmin: u.is_admin,
        timezone: u.timezone
      },
      message: `Updated user **${u.first_name} ${u.last_name}** (#${u.id}).`
    };
  })
  .build();
