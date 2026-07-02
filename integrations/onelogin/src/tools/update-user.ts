import { SlateTool } from 'slates';
import { z } from 'zod';
import { OneLoginClient } from '../lib/client';
import { spec } from '../spec';

export let updateUser = SlateTool.create(spec, {
  name: 'Update User',
  key: 'update_user',
  description: `Update an existing user's profile in OneLogin. Supports updating name, email, username, department, title, phone, status, state, group, roles, manager, and custom attributes. Only provided fields will be updated.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      userId: z.number().describe('ID of the user to update'),
      email: z.string().optional().describe('New email address'),
      username: z.string().optional().describe('New username'),
      firstname: z.string().optional().describe('New first name'),
      lastname: z.string().optional().describe('New last name'),
      company: z.string().optional().describe('New company name'),
      department: z.string().optional().describe('New department'),
      title: z.string().optional().describe('New job title'),
      phone: z.string().optional().describe('New phone number'),
      password: z.string().optional().describe('New password'),
      passwordConfirmation: z
        .string()
        .optional()
        .describe('Password confirmation (required with password)'),
      status: z
        .number()
        .optional()
        .describe('New status (0=Unactivated, 1=Active, 2=Suspended, 3=Locked)'),
      state: z
        .number()
        .optional()
        .describe('New state (0=Unapproved, 1=Approved, 2=Rejected, 3=Unlicensed)'),
      groupId: z.number().optional().describe('New group ID'),
      roleIds: z
        .array(z.number())
        .optional()
        .describe('New role IDs to assign (replaces existing roles)'),
      managerUserId: z.number().optional().describe('Manager user ID'),
      directoryId: z.number().optional().describe('Directory ID'),
      externalId: z.string().optional().describe('External ID'),
      customAttributes: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom attribute key-value pairs to update')
    })
  )
  .output(
    z.object({
      userId: z.number().describe('ID of the updated user'),
      username: z.string().nullable().optional().describe('Username'),
      email: z.string().nullable().optional().describe('Email'),
      firstname: z.string().nullable().optional().describe('First name'),
      lastname: z.string().nullable().optional().describe('Last name'),
      status: z.number().nullable().optional().describe('User status'),
      updatedAt: z.string().nullable().optional().describe('ISO8601 last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new OneLoginClient({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });

    let body: Record<string, any> = {};
    if (ctx.input.email !== undefined) body.email = ctx.input.email;
    if (ctx.input.username !== undefined) body.username = ctx.input.username;
    if (ctx.input.firstname !== undefined) body.firstname = ctx.input.firstname;
    if (ctx.input.lastname !== undefined) body.lastname = ctx.input.lastname;
    if (ctx.input.company !== undefined) body.company = ctx.input.company;
    if (ctx.input.department !== undefined) body.department = ctx.input.department;
    if (ctx.input.title !== undefined) body.title = ctx.input.title;
    if (ctx.input.phone !== undefined) body.phone = ctx.input.phone;
    if (ctx.input.password !== undefined) body.password = ctx.input.password;
    if (ctx.input.passwordConfirmation !== undefined)
      body.password_confirmation = ctx.input.passwordConfirmation;
    if (ctx.input.status !== undefined) body.status = ctx.input.status;
    if (ctx.input.state !== undefined) body.state = ctx.input.state;
    if (ctx.input.groupId !== undefined) body.group_id = ctx.input.groupId;
    if (ctx.input.roleIds !== undefined) body.role_ids = ctx.input.roleIds;
    if (ctx.input.managerUserId !== undefined) body.manager_user_id = ctx.input.managerUserId;
    if (ctx.input.directoryId !== undefined) body.directory_id = ctx.input.directoryId;
    if (ctx.input.externalId !== undefined) body.external_id = ctx.input.externalId;
    if (ctx.input.customAttributes !== undefined)
      body.custom_attributes = ctx.input.customAttributes;

    let u = await client.updateUser(ctx.input.userId, body);

    return {
      output: {
        userId: u.id,
        username: u.username,
        email: u.email,
        firstname: u.firstname,
        lastname: u.lastname,
        status: u.status,
        updatedAt: u.updated_at
      },
      message: `Updated user **${u.firstname || ''} ${u.lastname || ''}** (ID: ${u.id}).`
    };
  });
