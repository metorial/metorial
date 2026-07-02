import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageUser = SlateTool.create(spec, {
  name: 'Manage User',
  key: 'manage_user',
  description: `Create or update a user in ServiceNow. Handles user account details including name, email, roles, department, and active status. If a user ID is provided, the user is updated; otherwise a new user is created.`
})
  .input(
    z.object({
      userId: z
        .string()
        .optional()
        .describe('sys_id of an existing user to update. If omitted, a new user is created.'),
      userName: z.string().optional().describe('Login username for the user'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      email: z.string().optional().describe('Email address'),
      phone: z.string().optional().describe('Phone number'),
      mobilePhone: z.string().optional().describe('Mobile phone number'),
      department: z.string().optional().describe('sys_id of the department'),
      manager: z.string().optional().describe('sys_id of the manager'),
      title: z.string().optional().describe('Job title'),
      active: z.boolean().optional().describe('Whether the user account is active'),
      locked: z.boolean().optional().describe('Whether the user account is locked out')
    })
  )
  .output(
    z.object({
      record: z.record(z.string(), z.any()).describe('The created or updated user record'),
      userId: z.string().describe('The sys_id of the user')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);

    let fields: Record<string, any> = {};
    if (ctx.input.userName) fields.user_name = ctx.input.userName;
    if (ctx.input.firstName) fields.first_name = ctx.input.firstName;
    if (ctx.input.lastName) fields.last_name = ctx.input.lastName;
    if (ctx.input.email) fields.email = ctx.input.email;
    if (ctx.input.phone) fields.phone = ctx.input.phone;
    if (ctx.input.mobilePhone) fields.mobile_phone = ctx.input.mobilePhone;
    if (ctx.input.department) fields.department = ctx.input.department;
    if (ctx.input.manager) fields.manager = ctx.input.manager;
    if (ctx.input.title) fields.title = ctx.input.title;
    if (ctx.input.active !== undefined) fields.active = ctx.input.active.toString();
    if (ctx.input.locked !== undefined) fields.locked_out = ctx.input.locked.toString();

    let record: any;
    let action: string;

    if (ctx.input.userId) {
      record = await client.updateUser(ctx.input.userId, fields);
      action = 'Updated';
    } else {
      record = await client.createUser(fields);
      action = 'Created';
    }

    return {
      output: {
        record,
        userId: record.sys_id
      },
      message: `${action} user **${record.name || record.user_name || record.sys_id}**.`
    };
  })
  .build();
