import { SlateTool } from 'slates';
import { z } from 'zod';
import { Auth0Client } from '../lib/client';
import { requireNonEmptyArray } from '../lib/errors';
import { spec } from '../spec';
import { dispatchAuth0Action } from './shared';

let mapRole = (role: any) => ({
  roleId: role.id,
  name: role.name,
  description: role.description
});

export let manageOrganizationMemberRolesTool = SlateTool.create(spec, {
  name: 'Manage Organization Member Roles',
  key: 'manage_organization_member_roles',
  description:
    'List, assign, or remove roles for a user inside a specific Auth0 Organization membership.',
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      organizationId: z.string().describe('The Auth0 organization ID'),
      userId: z.string().describe('The Auth0 user ID of the organization member'),
      action: z.enum(['list', 'assign', 'remove']).describe('Action to perform'),
      roleIds: z
        .array(z.string())
        .optional()
        .describe('Role IDs to assign or remove; required for assign/remove'),
      page: z.number().optional().describe('Page number for list action'),
      perPage: z.number().optional().describe('Results per page for list action')
    })
  )
  .output(
    z.object({
      roles: z
        .array(
          z.object({
            roleId: z.string(),
            name: z.string(),
            description: z.string().optional()
          })
        )
        .optional()
        .describe('Organization member roles for list action'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Auth0Client({
      token: ctx.auth.token,
      domain: ctx.auth.domain
    });

    return dispatchAuth0Action(ctx.input.action, {
      list: async () => {
        let result = await client.getOrganizationMemberRoles(
          ctx.input.organizationId,
          ctx.input.userId,
          {
            page: ctx.input.page,
            perPage: ctx.input.perPage
          }
        );
        let roles = (Array.isArray(result) ? result : (result.roles ?? [])).map(mapRole);
        return {
          output: { roles, success: true },
          message: `Organization member has **${roles.length}** role(s).`
        };
      },

      assign: async () => {
        let roleIds = requireNonEmptyArray(ctx.input.roleIds, 'roleIds', 'assign');
        await client.assignOrganizationMemberRoles(
          ctx.input.organizationId,
          ctx.input.userId,
          roleIds
        );
        return {
          output: { success: true },
          message: `Assigned **${roleIds.length}** organization member role(s).`
        };
      },

      remove: async () => {
        let roleIds = requireNonEmptyArray(ctx.input.roleIds, 'roleIds', 'remove');
        await client.removeOrganizationMemberRoles(
          ctx.input.organizationId,
          ctx.input.userId,
          roleIds
        );
        return {
          output: { success: true },
          message: `Removed **${roleIds.length}** organization member role(s).`
        };
      }
    });
  })
  .build();
