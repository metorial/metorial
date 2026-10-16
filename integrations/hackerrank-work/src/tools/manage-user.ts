import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageUser = SlateTool.create(spec, {
  name: 'Manage User',
  key: 'manage_user',
  description: `Create, update, or lock a user in your HackerRank for Work account. Use this to provision new user accounts, update user details like name and role, or lock (deactivate) users. To look up an existing user, provide a userId; to create a new user, provide an email without a userId.`,
  instructions: [
    'To create a new user, omit the userId and provide email, firstname, role, and teamIds.',
    'To update a user, provide the userId and any fields to change.',
    'To lock (deactivate) a user, set the "lock" field to true.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      userId: z
        .string()
        .optional()
        .describe('ID of an existing user to update or lock. Omit to create a new user.'),
      email: z
        .string()
        .optional()
        .describe('Email address of the user (required for creating a new user)'),
      firstname: z.string().optional().describe('First name of the user'),
      lastname: z.string().optional().describe('Last name of the user'),
      role: z
        .string()
        .optional()
        .describe('Role of the user (e.g., "admin", "recruiter", "interviewer")'),
      country: z.string().optional().describe('Country code of the user'),
      phone: z.string().optional().describe('Phone number of the user'),
      timezone: z.string().optional().describe('Timezone of the user'),
      teamIds: z
        .array(z.string())
        .optional()
        .describe(
          'Team IDs for a new user; required when creating. Call list_teams to discover IDs.'
        ),
      sendEmail: z
        .boolean()
        .optional()
        .describe(
          'Whether to send an activation email when creating a user; disable only for SSO users'
        ),
      lock: z.boolean().optional().describe('Set to true to lock (deactivate) the user')
    })
  )
  .output(
    z.object({
      user: z
        .record(z.string(), z.any())
        .optional()
        .describe('User object (absent if locked)'),
      locked: z.boolean().optional().describe('Whether the user was locked')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.lock && !ctx.input.userId)
      throw createApiServiceError('Provide userId to lock an existing user.');
    if (
      ctx.input.role !== undefined &&
      !['admin', 'recruiter', 'developer', 'interviewer'].includes(ctx.input.role)
    )
      throw createApiServiceError('role must be admin, recruiter, developer, or interviewer.');
    if (ctx.input.userId && ctx.input.teamIds !== undefined)
      throw createApiServiceError(
        'Use add_team_member or remove_team_member to change team membership.'
      );
    if (ctx.input.userId && ctx.input.sendEmail !== undefined)
      throw createApiServiceError('sendEmail applies only to user creation.');
    let fields = [
      ctx.input.email,
      ctx.input.firstname,
      ctx.input.lastname,
      ctx.input.role,
      ctx.input.country,
      ctx.input.phone,
      ctx.input.timezone,
      ctx.input.teamIds,
      ctx.input.sendEmail
    ];
    if (ctx.input.lock && fields.some(value => value !== undefined))
      throw createApiServiceError(
        'Locking a user cannot be combined with updating user fields.'
      );
    if (ctx.input.userId && ctx.input.lock) {
      await client.deleteUser(ctx.input.userId);
      return {
        output: {
          locked: true
        },
        message: `Locked user **${ctx.input.userId}**.`
      };
    }

    if (ctx.input.userId) {
      let updateData: Record<string, any> = {};
      if (ctx.input.email !== undefined) updateData.email = ctx.input.email;
      if (ctx.input.firstname !== undefined) updateData.firstname = ctx.input.firstname;
      if (ctx.input.lastname !== undefined) updateData.lastname = ctx.input.lastname;
      if (ctx.input.role !== undefined) updateData.role = ctx.input.role;
      if (ctx.input.country !== undefined) updateData.country = ctx.input.country;
      if (ctx.input.phone !== undefined) updateData.phone = ctx.input.phone;
      if (ctx.input.timezone !== undefined) updateData.timezone = ctx.input.timezone;

      if (Object.keys(updateData).length === 0)
        throw createApiServiceError('Provide at least one user field to update.');
      let result = await client.updateUser(ctx.input.userId, updateData);
      let user = result.data ?? result;

      return {
        output: {
          user
        },
        message: `Updated user **${user.email ?? ctx.input.userId}**.`
      };
    }

    if (!ctx.input.email) {
      throw createApiServiceError('Email is required when creating a new user.');
    }

    if (!ctx.input.firstname?.trim() || !ctx.input.role || ctx.input.teamIds === undefined)
      throw createApiServiceError(
        'HackerRank requires firstname, role, and teamIds when creating a user. Call list_teams to discover team IDs.'
      );
    let result = await client.createUser({
      email: ctx.input.email,
      teams: ctx.input.teamIds.map(id => ({ id })),
      send_email: ctx.input.sendEmail,
      firstname: ctx.input.firstname,
      lastname: ctx.input.lastname,
      role: ctx.input.role,
      country: ctx.input.country,
      phone: ctx.input.phone,
      timezone: ctx.input.timezone
    });

    let user = result.data ?? result;

    return {
      output: {
        user
      },
      message: `Created user **${user.email ?? ctx.input.email}**.`
    };
  });
