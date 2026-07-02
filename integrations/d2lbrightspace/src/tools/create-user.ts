import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let createUser = SlateTool.create(spec, {
  name: 'Create User',
  key: 'create_user',
  description: `Create a new user account in Brightspace. Requires first name, last name, username, and a role ID. Use the **List Roles** tool to find valid role IDs.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      firstName: z.string().describe('First name of the user'),
      lastName: z.string().describe('Last name of the user'),
      userName: z.string().describe('Login username for the user'),
      roleId: z.number().describe('Role ID to assign (use List Roles to find valid IDs)'),
      isActive: z.boolean().default(true).describe('Whether the account should be active'),
      externalEmail: z.string().optional().describe('External email address'),
      orgDefinedId: z.string().optional().describe('Organization-defined ID'),
      middleName: z.string().optional().describe('Middle name of the user'),
      sendCreationEmail: z
        .boolean()
        .optional()
        .describe('Send account creation email to the user')
    })
  )
  .output(
    z.object({
      userId: z.string().describe('ID of the newly created user'),
      userName: z.string().describe('Username of the created user'),
      firstName: z.string().describe('First name'),
      lastName: z.string().describe('Last name')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);

    let user = await client.createUser({
      FirstName: ctx.input.firstName,
      LastName: ctx.input.lastName,
      UserName: ctx.input.userName,
      RoleId: ctx.input.roleId,
      IsActive: ctx.input.isActive,
      ExternalEmail: ctx.input.externalEmail,
      OrgDefinedId: ctx.input.orgDefinedId,
      MiddleName: ctx.input.middleName,
      SendCreationEmail: ctx.input.sendCreationEmail
    });

    return {
      output: {
        userId: String(user.UserId),
        userName: user.UserName,
        firstName: user.FirstName,
        lastName: user.LastName
      },
      message: `Created user **${user.FirstName} ${user.LastName}** (ID: ${user.UserId}).`
    };
  })
  .build();
