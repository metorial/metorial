import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { LookerClient } from '../lib/client';
import { spec } from '../spec';

type LookerRoleResponse = {
  id?: string | null;
  name?: string | null;
  permission_set?: {
    id?: string | null;
    name?: string | null;
  } | null;
  model_set?: {
    id?: string | null;
    name?: string | null;
  } | null;
  user_count?: number | null;
};

let mapRole = (role: unknown) => {
  if (!role || typeof role !== 'object' || Array.isArray(role)) {
    throw createApiServiceError('Looker returned an invalid role response.', {
      reason: 'looker_list_roles_invalid_response'
    });
  }

  let roleResponse = role as LookerRoleResponse;
  if (
    roleResponse.id === undefined ||
    roleResponse.id === null ||
    String(roleResponse.id).length === 0
  ) {
    throw createApiServiceError('Looker returned a role without an ID.', {
      reason: 'looker_list_roles_invalid_response'
    });
  }

  return {
    roleId: String(roleResponse.id),
    name: roleResponse.name ?? undefined,
    permissionSetName: roleResponse.permission_set?.name ?? undefined,
    permissionSetId:
      roleResponse.permission_set?.id === undefined || roleResponse.permission_set.id === null
        ? undefined
        : String(roleResponse.permission_set.id),
    modelSetName: roleResponse.model_set?.name ?? undefined,
    modelSetId:
      roleResponse.model_set?.id === undefined || roleResponse.model_set.id === null
        ? undefined
        : String(roleResponse.model_set.id),
    userCount: roleResponse.user_count ?? undefined
  };
};

export let listRoles = SlateTool.create(spec, {
  name: 'List Roles',
  key: 'list_roles',
  description: `List all available roles in the Looker instance, or get details for a specific role. Roles define permission sets and model access that can be assigned to users and groups.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      roleId: z
        .string()
        .min(1)
        .optional()
        .describe('Role ID to get details for a specific role. Omit to list all roles.')
    })
  )
  .output(
    z.object({
      roles: z
        .array(
          z.object({
            roleId: z.string().describe('Role ID'),
            name: z.string().optional().describe('Role name'),
            permissionSetName: z.string().optional().describe('Permission set name'),
            permissionSetId: z.string().optional().describe('Permission set ID'),
            modelSetName: z.string().optional().describe('Model set name'),
            modelSetId: z.string().optional().describe('Model set ID'),
            userCount: z.number().optional().describe('Number of users assigned this role')
          })
        )
        .describe('List of roles')
    })
  )
  .handleInvocation(async ctx => {
    let client = new LookerClient({
      instanceUrl: ctx.config.instanceUrl,
      token: ctx.auth.token
    });

    if (ctx.input.roleId !== undefined) {
      let role = await client.getRole(ctx.input.roleId);
      let mapped = mapRole(role);
      return {
        output: { roles: [mapped] },
        message: `Retrieved role **${mapped.name ?? mapped.roleId}**.`
      };
    }

    let roles: unknown = await client.listRoles();
    if (!Array.isArray(roles)) {
      throw createApiServiceError('Looker returned an invalid role list response.', {
        reason: 'looker_list_roles_invalid_response'
      });
    }
    let mapped = roles.map(mapRole);

    return {
      output: { roles: mapped },
      message: `Found **${mapped.length}** role(s).`
    };
  })
  .build();
