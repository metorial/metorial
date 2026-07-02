import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageUser = SlateTool.create(spec, {
  name: 'Manage User',
  key: 'manage_user',
  description: `Create, update, or delete a JumpCloud directory user. When creating, provide username and email at minimum. When updating, provide the user ID and any fields to change. Supports managing user state (activate, suspend, stage), contact info, employment details, custom attributes, and security settings like MFA and password policies.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      userId: z.string().optional().describe('User ID (required for update and delete)'),
      username: z.string().optional().describe('Username (required for create)'),
      email: z.string().optional().describe('Email address (required for create)'),
      firstname: z.string().optional().describe('First name'),
      lastname: z.string().optional().describe('Last name'),
      displayname: z.string().optional().describe('Display name'),
      password: z.string().optional().describe('User password (only for create)'),
      state: z.enum(['ACTIVATED', 'STAGED', 'SUSPENDED']).optional().describe('Account state'),
      company: z.string().optional().describe('Company name'),
      department: z.string().optional().describe('Department'),
      jobTitle: z.string().optional().describe('Job title'),
      employeeIdentifier: z.string().optional().describe('Employee ID'),
      employeeType: z
        .string()
        .optional()
        .describe('Employee type, e.g. "Full-Time", "Contractor"'),
      location: z.string().optional().describe('Location description'),
      alternateEmail: z.string().optional().describe('Alternate email address'),
      description: z.string().optional().describe('User description'),
      ldapBindingUser: z.boolean().optional().describe('Whether this is an LDAP binding user'),
      enableMfa: z
        .boolean()
        .optional()
        .describe('Enable user portal multi-factor authentication'),
      passwordNeverExpires: z
        .boolean()
        .optional()
        .describe('Whether the password never expires'),
      passwordlessSudo: z.boolean().optional().describe('Whether to allow passwordless sudo'),
      attributes: z
        .array(
          z.object({
            name: z.string().describe('Attribute name'),
            value: z.string().describe('Attribute value')
          })
        )
        .optional()
        .describe('Custom attributes to set on the user'),
      phoneNumbers: z
        .array(
          z.object({
            number: z.string().describe('Phone number'),
            type: z
              .string()
              .optional()
              .describe('Phone type: mobile, home, work, work_mobile, work_fax, other')
          })
        )
        .optional()
        .describe('Phone numbers')
    })
  )
  .output(
    z.object({
      userId: z.string().describe('User ID'),
      username: z.string().describe('Username'),
      email: z.string().describe('Email address'),
      firstname: z.string().optional().describe('First name'),
      lastname: z.string().optional().describe('Last name'),
      displayname: z.string().optional().describe('Display name'),
      state: z.string().optional().describe('Account state'),
      activated: z.boolean().optional().describe('Whether the account is activated'),
      company: z.string().optional().describe('Company'),
      department: z.string().optional().describe('Department'),
      jobTitle: z.string().optional().describe('Job title')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      orgId: ctx.config.orgId
    });

    let buildUserData = () => {
      let data: Record<string, any> = {};
      if (ctx.input.username !== undefined) data.username = ctx.input.username;
      if (ctx.input.email !== undefined) data.email = ctx.input.email;
      if (ctx.input.firstname !== undefined) data.firstname = ctx.input.firstname;
      if (ctx.input.lastname !== undefined) data.lastname = ctx.input.lastname;
      if (ctx.input.displayname !== undefined) data.displayname = ctx.input.displayname;
      if (ctx.input.password !== undefined) data.password = ctx.input.password;
      if (ctx.input.state !== undefined) data.state = ctx.input.state;
      if (ctx.input.company !== undefined) data.company = ctx.input.company;
      if (ctx.input.department !== undefined) data.department = ctx.input.department;
      if (ctx.input.jobTitle !== undefined) data.jobTitle = ctx.input.jobTitle;
      if (ctx.input.employeeIdentifier !== undefined)
        data.employeeIdentifier = ctx.input.employeeIdentifier;
      if (ctx.input.employeeType !== undefined) data.employeeType = ctx.input.employeeType;
      if (ctx.input.location !== undefined) data.location = ctx.input.location;
      if (ctx.input.alternateEmail !== undefined)
        data.alternateEmail = ctx.input.alternateEmail;
      if (ctx.input.description !== undefined) data.description = ctx.input.description;
      if (ctx.input.ldapBindingUser !== undefined)
        data.ldap_binding_user = ctx.input.ldapBindingUser;
      if (ctx.input.enableMfa !== undefined)
        data.enable_user_portal_multifactor = ctx.input.enableMfa;
      if (ctx.input.passwordNeverExpires !== undefined)
        data.password_never_expires = ctx.input.passwordNeverExpires;
      if (ctx.input.passwordlessSudo !== undefined)
        data.passwordless_sudo = ctx.input.passwordlessSudo;
      if (ctx.input.attributes !== undefined) data.attributes = ctx.input.attributes;
      if (ctx.input.phoneNumbers !== undefined) data.phoneNumbers = ctx.input.phoneNumbers;
      return data;
    };

    let user: any;
    let actionMessage: string;

    if (ctx.input.action === 'create') {
      let data = buildUserData();
      user = await client.createUser(data as any);
      actionMessage = `Created user **${user.username}** (${user.email})`;
    } else if (ctx.input.action === 'update') {
      if (!ctx.input.userId) throw new Error('userId is required for update action');
      let data = buildUserData();
      user = await client.updateUser(ctx.input.userId, data);
      actionMessage = `Updated user **${user.username}** (${user.email})`;
    } else {
      if (!ctx.input.userId) throw new Error('userId is required for delete action');
      user = await client.deleteUser(ctx.input.userId);
      actionMessage = `Deleted user **${user.username}** (${user.email})`;
    }

    return {
      output: {
        userId: user._id,
        username: user.username,
        email: user.email,
        firstname: user.firstname,
        lastname: user.lastname,
        displayname: user.displayname,
        state: user.state,
        activated: user.activated,
        company: user.company,
        department: user.department,
        jobTitle: user.jobTitle
      },
      message: actionMessage
    };
  })
  .build();
