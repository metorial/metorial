import { SlateTool } from 'slates';
import { z } from 'zod';
import { UserManagementClient } from '../lib/users';
import { spec } from '../spec';

export let manageUsers = SlateTool.create(spec, {
  name: 'Manage Users',
  key: 'manage_users',
  description: `Manage Adobe user accounts within an organization. List users, get user details, create new users, remove users, and manage product profile assignments. Requires System Admin role.`,
  constraints: [
    'Requires System Administrator or Developer role in Adobe Admin Console.',
    'Organization ID is required for all operations.'
  ]
})
  .input(
    z.object({
      operation: z
        .enum([
          'listUsers',
          'getUser',
          'createUser',
          'removeUser',
          'addToProfile',
          'removeFromProfile'
        ])
        .describe('Operation to perform'),
      orgId: z.string().describe('Adobe Organization ID'),
      email: z
        .string()
        .optional()
        .describe(
          'User email (required for getUser, createUser, removeUser, addToProfile, removeFromProfile)'
        ),
      firstName: z.string().optional().describe('First name (required for createUser)'),
      lastName: z.string().optional().describe('Last name (required for createUser)'),
      country: z.string().optional().describe('Country code (for createUser, default: US)'),
      idType: z
        .enum(['adobeID', 'enterpriseID', 'federatedID'])
        .optional()
        .describe('Identity type for createUser (default: adobeID)'),
      productProfiles: z
        .array(z.string())
        .optional()
        .describe('Product profile names to assign/remove'),
      page: z.number().optional().describe('Page number for listUsers (0-based)')
    })
  )
  .output(
    z.object({
      users: z
        .array(
          z.object({
            email: z.string().optional().describe('User email'),
            firstName: z.string().optional().describe('First name'),
            lastName: z.string().optional().describe('Last name'),
            status: z.string().optional().describe('User status'),
            type: z.string().optional().describe('Identity type'),
            groups: z.array(z.string()).optional().describe('Group memberships')
          })
        )
        .optional()
        .describe('List of users (for listUsers, getUser)'),
      success: z.boolean().describe('Whether the operation succeeded'),
      actionResult: z
        .any()
        .optional()
        .describe('Result details for create/remove/profile operations')
    })
  )
  .handleInvocation(async ctx => {
    let client = new UserManagementClient({
      token: ctx.auth.token,
      clientId: ctx.auth.clientId,
      orgId: ctx.auth.orgId
    });

    switch (ctx.input.operation) {
      case 'listUsers': {
        let result = await client.listUsers(ctx.input.orgId, ctx.input.page);
        let users = (result.users || []).map((u: any) => ({
          email: u.email,
          firstName: u.firstname,
          lastName: u.lastname,
          status: u.status,
          type: u.type,
          groups: u.groups
        }));
        return {
          output: { users, success: true },
          message: `Found **${users.length}** users in organization.`
        };
      }
      case 'getUser': {
        if (!ctx.input.email) throw new Error('email is required for getUser');
        let result = await client.getUser(ctx.input.orgId, ctx.input.email);
        let user = result.user || result;
        return {
          output: {
            users: [
              {
                email: user.email,
                firstName: user.firstname,
                lastName: user.lastname,
                status: user.status,
                type: user.type,
                groups: user.groups
              }
            ],
            success: true
          },
          message: `Retrieved user details for **${ctx.input.email}**.`
        };
      }
      case 'createUser': {
        if (!ctx.input.email) throw new Error('email is required for createUser');
        if (!ctx.input.firstName) throw new Error('firstName is required for createUser');
        if (!ctx.input.lastName) throw new Error('lastName is required for createUser');
        let result = await client.createUser(ctx.input.orgId, {
          email: ctx.input.email,
          firstName: ctx.input.firstName,
          lastName: ctx.input.lastName,
          country: ctx.input.country,
          idType: ctx.input.idType,
          productProfiles: ctx.input.productProfiles
        });
        return {
          output: {
            success: result.result === 'success' || !result.errors,
            actionResult: result
          },
          message: `Created user **${ctx.input.email}** in organization.`
        };
      }
      case 'removeUser': {
        if (!ctx.input.email) throw new Error('email is required for removeUser');
        let result = await client.removeUser(ctx.input.orgId, ctx.input.email);
        return {
          output: {
            success: result.result === 'success' || !result.errors,
            actionResult: result
          },
          message: `Removed user **${ctx.input.email}** from organization.`
        };
      }
      case 'addToProfile': {
        if (!ctx.input.email) throw new Error('email is required for addToProfile');
        if (!ctx.input.productProfiles?.length)
          throw new Error('productProfiles is required for addToProfile');
        let result = await client.addToProductProfile(
          ctx.input.orgId,
          ctx.input.email,
          ctx.input.productProfiles
        );
        return {
          output: {
            success: result.result === 'success' || !result.errors,
            actionResult: result
          },
          message: `Added **${ctx.input.email}** to profiles: ${ctx.input.productProfiles.join(', ')}.`
        };
      }
      case 'removeFromProfile': {
        if (!ctx.input.email) throw new Error('email is required for removeFromProfile');
        if (!ctx.input.productProfiles?.length)
          throw new Error('productProfiles is required for removeFromProfile');
        let result = await client.removeFromProductProfile(
          ctx.input.orgId,
          ctx.input.email,
          ctx.input.productProfiles
        );
        return {
          output: {
            success: result.result === 'success' || !result.errors,
            actionResult: result
          },
          message: `Removed **${ctx.input.email}** from profiles: ${ctx.input.productProfiles.join(', ')}.`
        };
      }
    }
  })
  .build();
