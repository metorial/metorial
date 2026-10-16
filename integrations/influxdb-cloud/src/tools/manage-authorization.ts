import { SlateTool } from 'slates';
import { z } from 'zod';
import { optionalString, requireArray, resource } from '../lib/client';
import { createClient, orgIdInput } from '../lib/helpers';
import { spec } from '../spec';

const mapPermissions = (value: unknown) =>
  Array.isArray(value)
    ? value.map(item => {
        const permission = resource(item, ['action']);
        const target = resource(permission.resource, ['type']);
        return {
          ...permission,
          action: permission.action,
          resource: {
            ...target,
            type: target.type,
            resourceId: optionalString(target.id),
            orgId: optionalString(target.orgID)
          }
        };
      })
    : undefined;

export let authorizationSchema = z.object({
  raw: z.any().optional().describe('Complete provider resource'),
  authorizationId: z.string().describe('Authorization ID'),
  token: z
    .string()
    .optional()
    .describe('API token value (only available immediately after creation)'),
  description: z.string().optional().describe('Authorization description'),
  status: z.string().optional().describe('Authorization status (active or inactive)'),
  orgId: z.string().optional().describe('Organization ID'),
  userId: z.string().optional().describe('User ID'),
  permissions: z
    .array(
      z
        .object({
          action: z.string(),
          resource: z
            .object({
              type: z.string(),
              resourceId: z.string().optional(),
              orgId: z.string().optional()
            })
            .passthrough()
        })
        .passthrough()
    )
    .optional()
    .describe('List of permissions'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp')
});

export let listAuthorizations = SlateTool.create(spec, {
  name: 'List Authorizations',
  key: 'list_authorizations',
  description: `List all API token authorizations in the organization. Each authorization contains permissions that define what the token can access.`,
  instructions: [
    'Call list_organizations to discover orgId when organization scope is needed.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      orgId: orgIdInput,
      userId: z.string().optional().describe('Filter authorizations by user ID')
    })
  )
  .output(
    z.object({
      raw: z.any().optional().describe('Complete provider response'),
      authorizations: z.array(authorizationSchema).describe('List of authorizations')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.listAuthorizations({
      userID: ctx.input.userId
    });

    let authorizations = requireArray(result, 'authorizations').map((a: any) => ({
      raw: a,
      authorizationId: resource(a, ['id']).id,
      token: optionalString(a.token),
      description: optionalString(a.description),
      status: optionalString(a.status),
      orgId: optionalString(a.orgID),
      userId: optionalString(a.userID),
      permissions: mapPermissions(a.permissions),
      createdAt: optionalString(a.createdAt),
      updatedAt: optionalString(a.updatedAt)
    }));

    return {
      output: { authorizations, raw: result },
      message: `Found **${authorizations.length}** authorization(s).`
    };
  })
  .build();

export let createAuthorization = SlateTool.create(spec, {
  name: 'Create Authorization',
  key: 'create_authorization',
  description: `Create a new API token with specific permissions. The token value is only available in the response immediately after creation.
Permissions cannot be modified after creation.`,
  constraints: [
    'Token value is only returned once at creation time and cannot be retrieved later.',
    'Permissions cannot be changed after creation - delete and recreate if needed.'
  ],
  instructions: [
    'Call list_organizations to discover orgId when organization scope is needed.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      orgId: orgIdInput,
      description: z.string().optional().describe('Description for the authorization'),
      permissions: z
        .array(
          z.object({
            action: z.enum(['read', 'write']).describe('Permission action'),
            resource: z.object({
              type: z.string().describe('Resource type (e.g. buckets, tasks, dashboards)'),
              resourceId: z.string().optional().describe('Specific resource ID'),
              orgId: z.string().optional().describe('Organization ID')
            })
          })
        )
        .describe('List of permissions for the token'),
      status: z
        .enum(['active', 'inactive'])
        .optional()
        .describe('Initial status (default: active)')
    })
  )
  .output(authorizationSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let permissions = ctx.input.permissions.map(p => ({
      action: p.action as 'read' | 'write',
      resource: {
        type: p.resource.type,
        id: p.resource.resourceId,
        orgID: p.resource.orgId
      }
    }));

    let a = await client.createAuthorization({
      description: ctx.input.description,
      permissions,
      status: ctx.input.status
    });

    return {
      output: {
        raw: a,
        authorizationId: resource(a, ['id']).id,
        token: optionalString(a.token),
        description: optionalString(a.description),
        status: optionalString(a.status),
        orgId: optionalString(a.orgID),
        userId: optionalString(a.userID),
        permissions: mapPermissions(a.permissions),
        createdAt: optionalString(a.createdAt),
        updatedAt: optionalString(a.updatedAt)
      },
      message: `Created authorization **${a.id}**. Save the token value - it won't be available again.`
    };
  })
  .build();

export let updateAuthorization = SlateTool.create(spec, {
  name: 'Update Authorization',
  key: 'update_authorization',
  description: `Update an authorization's description or toggle its status between active and inactive.
Permissions cannot be changed after creation.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      authorizationId: z.string().describe('ID of the authorization to update'),
      description: z.string().optional().describe('New description'),
      status: z.enum(['active', 'inactive']).optional().describe('New status')
    })
  )
  .output(authorizationSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let a = await client.updateAuthorization(ctx.input.authorizationId, {
      description: ctx.input.description,
      status: ctx.input.status
    });

    return {
      output: {
        raw: a,
        authorizationId: resource(a, ['id']).id,
        token: optionalString(a.token),
        description: optionalString(a.description),
        status: optionalString(a.status),
        orgId: optionalString(a.orgID),
        userId: optionalString(a.userID),
        permissions: mapPermissions(a.permissions),
        createdAt: optionalString(a.createdAt),
        updatedAt: optionalString(a.updatedAt)
      },
      message: `Updated authorization **${a.id}** (status: ${a.status}).`
    };
  })
  .build();

export let deleteAuthorization = SlateTool.create(spec, {
  name: 'Delete Authorization',
  key: 'delete_authorization',
  description: `Permanently delete an API token authorization. Any applications using this token will lose access.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      authorizationId: z.string().describe('ID of the authorization to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the authorization was deleted successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    await client.deleteAuthorization(ctx.input.authorizationId);

    return {
      output: { success: true },
      message: `Deleted authorization ${ctx.input.authorizationId}.`
    };
  })
  .build();
