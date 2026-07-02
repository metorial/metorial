import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { googleAdminActionScopes } from '../scopes';
import { spec } from '../spec';

export let manageRoles = SlateTool.create(spec, {
  name: 'Manage Roles',
  key: 'manage_roles',
  description: `List, create, or delete admin roles, and manage role assignments. Roles define sets of admin privileges that can be assigned to users for delegated administration.`,
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .scopes(googleAdminActionScopes.manageRoles)
  .input(
    z.object({
      action: z
        .enum([
          'list_roles',
          'get_role',
          'create_role',
          'delete_role',
          'list_assignments',
          'assign_role',
          'unassign_role'
        ])
        .describe('Action to perform'),
      roleId: z
        .string()
        .optional()
        .describe('Role ID (for get_role, delete_role, list_assignments, assign_role)'),
      roleName: z.string().optional().describe('Name for the new role (for create_role)'),
      roleDescription: z.string().optional().describe('Description for the new role'),
      rolePrivileges: z
        .array(
          z.object({
            privilegeName: z.string().describe('Name of the privilege'),
            serviceId: z.string().describe('Service ID the privilege belongs to')
          })
        )
        .optional()
        .describe('Privileges for the new role (for create_role)'),
      assignedTo: z
        .string()
        .optional()
        .describe('User ID to assign/unassign the role to (for assign_role/unassign_role)'),
      roleAssignmentId: z
        .string()
        .optional()
        .describe('Role assignment ID (for unassign_role)'),
      scopeType: z
        .enum(['CUSTOMER', 'ORG_UNIT'])
        .optional()
        .describe('Scope of the role assignment'),
      orgUnitId: z.string().optional().describe('Org unit ID if scope is ORG_UNIT'),
      maxResults: z.number().optional(),
      pageToken: z.string().optional()
    })
  )
  .output(
    z.object({
      roles: z
        .array(
          z.object({
            roleId: z.string().optional(),
            roleName: z.string().optional(),
            roleDescription: z.string().optional(),
            isSystemRole: z.boolean().optional(),
            isSuperAdminRole: z.boolean().optional()
          })
        )
        .optional(),
      role: z
        .object({
          roleId: z.string().optional(),
          roleName: z.string().optional(),
          roleDescription: z.string().optional(),
          rolePrivileges: z.array(z.any()).optional()
        })
        .optional(),
      assignments: z
        .array(
          z.object({
            roleAssignmentId: z.string().optional(),
            roleId: z.string().optional(),
            assignedTo: z.string().optional(),
            scopeType: z.string().optional(),
            orgUnitId: z.string().optional()
          })
        )
        .optional(),
      assignment: z
        .object({
          roleAssignmentId: z.string().optional(),
          roleId: z.string().optional(),
          assignedTo: z.string().optional()
        })
        .optional(),
      deleted: z.boolean().optional(),
      nextPageToken: z.string().optional(),
      action: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      customerId: ctx.config.customerId,
      domain: ctx.config.domain
    });

    if (ctx.input.action === 'list_roles') {
      let result = await client.listRoles({
        maxResults: ctx.input.maxResults,
        pageToken: ctx.input.pageToken
      });
      let roles = (result.items || []).map((r: any) => ({
        roleId: r.roleId,
        roleName: r.roleName,
        roleDescription: r.roleDescription,
        isSystemRole: r.isSystemRole,
        isSuperAdminRole: r.isSuperAdminRole
      }));
      return {
        output: { roles, nextPageToken: result.nextPageToken, action: 'list_roles' },
        message: `Found **${roles.length}** admin roles.`
      };
    }

    if (ctx.input.action === 'get_role') {
      if (!ctx.input.roleId) throw new Error('roleId is required');
      let role = await client.getRole(ctx.input.roleId);
      return {
        output: {
          role: {
            roleId: role.roleId,
            roleName: role.roleName,
            roleDescription: role.roleDescription,
            rolePrivileges: role.rolePrivileges
          },
          action: 'get_role'
        },
        message: `Retrieved role **${role.roleName}**.`
      };
    }

    if (ctx.input.action === 'create_role') {
      if (!ctx.input.roleName || !ctx.input.rolePrivileges) {
        throw new Error('roleName and rolePrivileges are required to create a role');
      }
      let role = await client.createRole({
        roleName: ctx.input.roleName,
        roleDescription: ctx.input.roleDescription,
        rolePrivileges: ctx.input.rolePrivileges
      });
      return {
        output: {
          role: {
            roleId: role.roleId,
            roleName: role.roleName,
            roleDescription: role.roleDescription,
            rolePrivileges: role.rolePrivileges
          },
          action: 'create_role'
        },
        message: `Created role **${role.roleName}**.`
      };
    }

    if (ctx.input.action === 'delete_role') {
      if (!ctx.input.roleId) throw new Error('roleId is required');
      await client.deleteRole(ctx.input.roleId);
      return {
        output: { deleted: true, action: 'delete_role' },
        message: `Deleted role **${ctx.input.roleId}**.`
      };
    }

    if (ctx.input.action === 'list_assignments') {
      let result = await client.listRoleAssignments({
        userKey: ctx.input.assignedTo,
        roleId: ctx.input.roleId,
        maxResults: ctx.input.maxResults,
        pageToken: ctx.input.pageToken
      });
      let assignments = (result.items || []).map((a: any) => ({
        roleAssignmentId: a.roleAssignmentId,
        roleId: a.roleId,
        assignedTo: a.assignedTo,
        scopeType: a.scopeType,
        orgUnitId: a.orgUnitId
      }));
      return {
        output: {
          assignments,
          nextPageToken: result.nextPageToken,
          action: 'list_assignments'
        },
        message: `Found **${assignments.length}** role assignments.`
      };
    }

    if (ctx.input.action === 'assign_role') {
      if (!ctx.input.roleId || !ctx.input.assignedTo) {
        throw new Error('roleId and assignedTo are required');
      }
      let assignment = await client.createRoleAssignment({
        roleId: ctx.input.roleId,
        assignedTo: ctx.input.assignedTo,
        scopeType: ctx.input.scopeType,
        orgUnitId: ctx.input.orgUnitId
      });
      return {
        output: {
          assignment: {
            roleAssignmentId: assignment.roleAssignmentId,
            roleId: assignment.roleId,
            assignedTo: assignment.assignedTo
          },
          action: 'assign_role'
        },
        message: `Assigned role **${ctx.input.roleId}** to user **${ctx.input.assignedTo}**.`
      };
    }

    // unassign_role
    if (!ctx.input.roleAssignmentId) throw new Error('roleAssignmentId is required');
    await client.deleteRoleAssignment(ctx.input.roleAssignmentId);
    return {
      output: { deleted: true, action: 'unassign_role' },
      message: `Removed role assignment **${ctx.input.roleAssignmentId}**.`
    };
  })
  .build();
