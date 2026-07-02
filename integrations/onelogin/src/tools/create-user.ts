import { SlateTool } from 'slates';
import { z } from 'zod';
import { OneLoginClient } from '../lib/client';
import { spec } from '../spec';

export let createUser = SlateTool.create(spec, {
  name: 'Create User',
  key: 'create_user',
  description: `Create a new user in the OneLogin directory. At minimum, an email or username is required. Optionally set name, department, title, phone, status, group, roles, and custom attributes.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      email: z
        .string()
        .optional()
        .describe('Email address (required if username not provided)'),
      username: z
        .string()
        .optional()
        .describe('Username, must be unique (required if email not provided)'),
      firstname: z.string().optional().describe('First name'),
      lastname: z.string().optional().describe('Last name'),
      company: z.string().optional().describe('Company name'),
      department: z.string().optional().describe('Department'),
      title: z.string().optional().describe('Job title'),
      phone: z.string().optional().describe('Phone number in E.164 format'),
      password: z.string().optional().describe('Initial password for the user'),
      passwordConfirmation: z
        .string()
        .optional()
        .describe('Password confirmation (required if password is set)'),
      status: z
        .number()
        .optional()
        .describe('User status (0=Unactivated, 1=Active, 2=Suspended, 7=PendingActivation)'),
      groupId: z.number().optional().describe('Group ID to assign the user to'),
      roleIds: z.array(z.number()).optional().describe('Array of role IDs to assign'),
      customAttributes: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom attribute key-value pairs')
    })
  )
  .output(
    z.object({
      userId: z.number().describe('ID of the newly created user'),
      username: z.string().nullable().optional().describe('Username'),
      email: z.string().nullable().optional().describe('Email'),
      firstname: z.string().nullable().optional().describe('First name'),
      lastname: z.string().nullable().optional().describe('Last name'),
      status: z.number().nullable().optional().describe('User status'),
      createdAt: z.string().nullable().optional().describe('ISO8601 creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new OneLoginClient({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });

    let body: Record<string, any> = {};
    if (ctx.input.email) body.email = ctx.input.email;
    if (ctx.input.username) body.username = ctx.input.username;
    if (ctx.input.firstname) body.firstname = ctx.input.firstname;
    if (ctx.input.lastname) body.lastname = ctx.input.lastname;
    if (ctx.input.company) body.company = ctx.input.company;
    if (ctx.input.department) body.department = ctx.input.department;
    if (ctx.input.title) body.title = ctx.input.title;
    if (ctx.input.phone) body.phone = ctx.input.phone;
    if (ctx.input.password) body.password = ctx.input.password;
    if (ctx.input.passwordConfirmation)
      body.password_confirmation = ctx.input.passwordConfirmation;
    if (ctx.input.status !== undefined) body.status = ctx.input.status;
    if (ctx.input.groupId) body.group_id = ctx.input.groupId;
    if (ctx.input.roleIds) body.role_ids = ctx.input.roleIds;
    if (ctx.input.customAttributes) body.custom_attributes = ctx.input.customAttributes;

    let u = await client.createUser(body);

    return {
      output: {
        userId: u.id,
        username: u.username,
        email: u.email,
        firstname: u.firstname,
        lastname: u.lastname,
        status: u.status,
        createdAt: u.created_at
      },
      message: `Created user **${u.firstname || ''} ${u.lastname || ''}** (ID: ${u.id}).`
    };
  });
