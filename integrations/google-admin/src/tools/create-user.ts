import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { googleAdminActionScopes } from '../scopes';
import { spec } from '../spec';

export let createUser = SlateTool.create(spec, {
  name: 'Create User',
  key: 'create_user',
  description: `Create a new user account in the Google Workspace domain. Requires a primary email, first name, last name, and password. Optionally configure organizational unit, contact info, and account settings.`,
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .scopes(googleAdminActionScopes.createUser)
  .input(
    z.object({
      primaryEmail: z
        .string()
        .describe('Primary email address for the new user (e.g. john@example.com)'),
      givenName: z.string().describe('First name of the user'),
      familyName: z.string().describe('Last name of the user'),
      password: z
        .string()
        .optional()
        .describe(
          'Password for the new user. Must meet complexity requirements. If omitted, a random password is generated.'
        ),
      orgUnitPath: z
        .string()
        .optional()
        .describe('Organizational unit path (e.g. /Engineering). Defaults to root (/).'),
      suspended: z.boolean().optional().describe('Create the user in a suspended state'),
      changePasswordAtNextLogin: z
        .boolean()
        .optional()
        .describe('Require password change on first login'),
      recoveryEmail: z.string().optional().describe('Recovery email address for the user'),
      recoveryPhone: z
        .string()
        .optional()
        .describe('Recovery phone number (must start with + and include country code)'),
      phones: z
        .array(
          z.object({
            value: z.string().describe('Phone number'),
            type: z.string().describe('Phone type (e.g. work, home, mobile)')
          })
        )
        .optional()
        .describe('Phone numbers for the user'),
      organizations: z
        .array(
          z.object({
            name: z.string().optional().describe('Organization name'),
            title: z.string().optional().describe('Job title'),
            department: z.string().optional().describe('Department name'),
            primary: z
              .boolean()
              .optional()
              .describe('Whether this is the primary organization')
          })
        )
        .optional()
        .describe('Organization details for the user')
    })
  )
  .output(
    z.object({
      userId: z.string().describe('Unique ID of the created user'),
      primaryEmail: z.string().describe('Primary email of the created user'),
      name: z
        .object({
          givenName: z.string().optional(),
          familyName: z.string().optional(),
          fullName: z.string().optional()
        })
        .optional(),
      orgUnitPath: z.string().optional(),
      creationTime: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      customerId: ctx.config.customerId,
      domain: ctx.config.domain
    });

    let userData: any = {
      primaryEmail: ctx.input.primaryEmail,
      name: {
        givenName: ctx.input.givenName,
        familyName: ctx.input.familyName
      },
      password: ctx.input.password || crypto.randomUUID(),
      orgUnitPath: ctx.input.orgUnitPath,
      suspended: ctx.input.suspended,
      changePasswordAtNextLogin: ctx.input.changePasswordAtNextLogin ?? true,
      recoveryEmail: ctx.input.recoveryEmail,
      recoveryPhone: ctx.input.recoveryPhone,
      phones: ctx.input.phones,
      organizations: ctx.input.organizations
    };

    let user = await client.createUser(userData);

    return {
      output: {
        userId: user.id,
        primaryEmail: user.primaryEmail,
        name: user.name
          ? {
              givenName: user.name.givenName,
              familyName: user.name.familyName,
              fullName: user.name.fullName
            }
          : undefined,
        orgUnitPath: user.orgUnitPath,
        creationTime: user.creationTime
      },
      message: `Created user **${user.primaryEmail}** (${user.name?.fullName || 'N/A'}) in org unit "${user.orgUnitPath || '/'}".`
    };
  })
  .build();
