import { SlateTool } from 'slates';
import { z } from 'zod';
import { OneLoginClient } from '../lib/client';
import { spec } from '../spec';

export let getUser = SlateTool.create(spec, {
  name: 'Get User',
  key: 'get_user',
  description: `Retrieve detailed information about a specific OneLogin user by their ID. Returns the full user profile including name, email, status, roles, group, custom attributes, and activity timestamps.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z.number().describe('The ID of the user to retrieve')
    })
  )
  .output(
    z.object({
      userId: z.number().describe('Unique user ID'),
      username: z.string().nullable().optional().describe('Username'),
      email: z.string().nullable().optional().describe('Email address'),
      firstname: z.string().nullable().optional().describe('First name'),
      lastname: z.string().nullable().optional().describe('Last name'),
      company: z.string().nullable().optional().describe('Company name'),
      department: z.string().nullable().optional().describe('Department'),
      title: z.string().nullable().optional().describe('Job title'),
      phone: z.string().nullable().optional().describe('Phone number'),
      status: z.number().nullable().optional().describe('User status code'),
      state: z.number().nullable().optional().describe('User state code'),
      groupId: z.number().nullable().optional().describe('Group ID'),
      roleIds: z.array(z.number()).nullable().optional().describe('Assigned role IDs'),
      externalId: z.string().nullable().optional().describe('External ID'),
      directoryId: z.number().nullable().optional().describe('Directory ID'),
      managerUserId: z.number().nullable().optional().describe('Manager user ID'),
      customAttributes: z
        .record(z.string(), z.any())
        .nullable()
        .optional()
        .describe('Custom attribute key-value pairs'),
      createdAt: z.string().nullable().optional().describe('ISO8601 creation timestamp'),
      updatedAt: z.string().nullable().optional().describe('ISO8601 last update timestamp'),
      lastLogin: z.string().nullable().optional().describe('ISO8601 last login timestamp'),
      activatedAt: z.string().nullable().optional().describe('ISO8601 activation timestamp'),
      passwordChangedAt: z
        .string()
        .nullable()
        .optional()
        .describe('ISO8601 password change timestamp'),
      lockedUntil: z.string().nullable().optional().describe('ISO8601 locked until timestamp'),
      invalidLoginAttempts: z
        .number()
        .nullable()
        .optional()
        .describe('Number of invalid login attempts')
    })
  )
  .handleInvocation(async ctx => {
    let client = new OneLoginClient({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });

    let u = await client.getUser(ctx.input.userId);

    return {
      output: {
        userId: u.id,
        username: u.username,
        email: u.email,
        firstname: u.firstname,
        lastname: u.lastname,
        company: u.company,
        department: u.department,
        title: u.title,
        phone: u.phone,
        status: u.status,
        state: u.state,
        groupId: u.group_id,
        roleIds: u.role_ids,
        externalId: u.external_id,
        directoryId: u.directory_id,
        managerUserId: u.manager_user_id,
        customAttributes: u.custom_attributes,
        createdAt: u.created_at,
        updatedAt: u.updated_at,
        lastLogin: u.last_login,
        activatedAt: u.activated_at,
        passwordChangedAt: u.password_changed_at,
        lockedUntil: u.locked_until,
        invalidLoginAttempts: u.invalid_login_attempts
      },
      message: `Retrieved user **${u.firstname || ''} ${u.lastname || ''}** (${u.email || u.username || u.id}).`
    };
  });
