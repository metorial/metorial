import { SlateTool } from 'slates';
import { z } from 'zod';
import { ElasticsearchClient } from '../lib/client';
import { elasticsearchServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageSecurityTool = SlateTool.create(spec, {
  name: 'Manage Security',
  key: 'manage_security',
  description: `Manage Elasticsearch security resources including users, roles, and API keys. Create, update, delete, and list users and roles for role-based access control. Create and invalidate API keys.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      resourceType: z
        .enum(['user', 'role', 'api_key'])
        .describe('The type of security resource to manage'),
      action: z
        .enum(['get', 'list', 'create', 'delete', 'invalidate'])
        .describe('The action to perform'),
      username: z.string().optional().describe('Username (for user operations)'),
      roleName: z.string().optional().describe('Role name (for role operations)'),
      password: z.string().optional().describe('Password (for user create)'),
      roles: z.array(z.string()).optional().describe('Roles to assign (for user create)'),
      fullName: z.string().optional().describe('Full name (for user create)'),
      email: z.string().optional().describe('Email address (for user create)'),
      clusterPrivileges: z
        .array(z.string())
        .optional()
        .describe('Cluster-level privileges (for role create)'),
      indexPrivileges: z
        .array(
          z.object({
            names: z.array(z.string()).describe('Index patterns'),
            privileges: z.array(z.string()).describe('Index-level privileges')
          })
        )
        .optional()
        .describe('Index-level privileges (for role create)'),
      apiKeyName: z.string().optional().describe('Name for the API key (for api_key create)'),
      apiKeyId: z.string().optional().describe('API key ID (for api_key invalidate)'),
      apiKeyExpiration: z
        .string()
        .optional()
        .describe('Expiration time for the API key (e.g., "30d", "1h")'),
      apiKeyRoleDescriptors: z
        .record(z.string(), z.any())
        .optional()
        .describe('Role descriptors to limit API key permissions')
    })
  )
  .output(
    z.object({
      acknowledged: z.boolean().optional().describe('Whether the request was acknowledged'),
      users: z.record(z.string(), z.any()).optional().describe('User details'),
      securityRoles: z.record(z.string(), z.any()).optional().describe('Role details'),
      apiKeyId: z.string().optional().describe('Created API key ID'),
      apiKeyEncoded: z
        .string()
        .optional()
        .describe('Base64-encoded API key for use in Authorization header'),
      apiKeys: z.any().optional().describe('API key details'),
      invalidatedKeys: z.number().optional().describe('Number of API keys invalidated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ElasticsearchClient({
      baseUrl: ctx.auth.baseUrl,
      authHeader: ctx.auth.authHeader
    });

    switch (ctx.input.resourceType) {
      case 'user': {
        switch (ctx.input.action) {
          case 'get':
          case 'list': {
            let result = await client.getUser(ctx.input.username);
            return {
              output: { users: result },
              message: ctx.input.username
                ? `Retrieved user **${ctx.input.username}**.`
                : `Retrieved all users.`
            };
          }
          case 'create': {
            if (!ctx.input.username) throw elasticsearchServiceError('username is required');
            let body: Record<string, any> = {};
            if (ctx.input.password) body.password = ctx.input.password;
            if (ctx.input.roles) body.roles = ctx.input.roles;
            if (ctx.input.fullName) body.full_name = ctx.input.fullName;
            if (ctx.input.email) body.email = ctx.input.email;
            let result = await client.putUser(ctx.input.username, body);
            return {
              output: { acknowledged: true, users: result },
              message: `User **${ctx.input.username}** created/updated.`
            };
          }
          case 'delete': {
            if (!ctx.input.username) throw elasticsearchServiceError('username is required');
            let result = await client.deleteUser(ctx.input.username);
            return {
              output: { acknowledged: result.found ?? true },
              message: `User **${ctx.input.username}** deleted.`
            };
          }
          default:
            throw elasticsearchServiceError(
              `Action "${ctx.input.action}" is not supported for users`
            );
        }
      }
      case 'role': {
        switch (ctx.input.action) {
          case 'get':
          case 'list': {
            let result = await client.getRole(ctx.input.roleName);
            return {
              output: { securityRoles: result },
              message: ctx.input.roleName
                ? `Retrieved role **${ctx.input.roleName}**.`
                : `Retrieved all roles.`
            };
          }
          case 'create': {
            if (!ctx.input.roleName) throw elasticsearchServiceError('roleName is required');
            let body: Record<string, any> = {};
            if (ctx.input.clusterPrivileges) body.cluster = ctx.input.clusterPrivileges;
            if (ctx.input.indexPrivileges) {
              body.indices = ctx.input.indexPrivileges.map(p => ({
                names: p.names,
                privileges: p.privileges
              }));
            }
            let result = await client.putRole(ctx.input.roleName, body);
            return {
              output: { acknowledged: true, securityRoles: result },
              message: `Role **${ctx.input.roleName}** created/updated.`
            };
          }
          case 'delete': {
            if (!ctx.input.roleName) throw elasticsearchServiceError('roleName is required');
            let result = await client.deleteRole(ctx.input.roleName);
            return {
              output: { acknowledged: result.found ?? true },
              message: `Role **${ctx.input.roleName}** deleted.`
            };
          }
          default:
            throw elasticsearchServiceError(
              `Action "${ctx.input.action}" is not supported for roles`
            );
        }
      }
      case 'api_key': {
        switch (ctx.input.action) {
          case 'get':
          case 'list': {
            let params: Record<string, any> = {};
            if (ctx.input.apiKeyId) params.id = ctx.input.apiKeyId;
            if (ctx.input.apiKeyName) params.name = ctx.input.apiKeyName;
            let result = await client.getApiKey(params);
            return {
              output: { apiKeys: result },
              message: `Retrieved API keys.`
            };
          }
          case 'create': {
            if (!ctx.input.apiKeyName)
              throw elasticsearchServiceError('apiKeyName is required');
            let body: Record<string, any> = { name: ctx.input.apiKeyName };
            if (ctx.input.apiKeyExpiration) body.expiration = ctx.input.apiKeyExpiration;
            if (ctx.input.apiKeyRoleDescriptors)
              body.role_descriptors = ctx.input.apiKeyRoleDescriptors;
            let result = await client.createApiKey(body);
            return {
              output: {
                apiKeyId: result.id,
                apiKeyEncoded: result.encoded,
                acknowledged: true
              },
              message: `API key **${ctx.input.apiKeyName}** created (ID: ${result.id}).`
            };
          }
          case 'invalidate': {
            if (!ctx.input.apiKeyId && !ctx.input.apiKeyName) {
              throw elasticsearchServiceError(
                'apiKeyId or apiKeyName is required for invalidate action'
              );
            }
            let body: Record<string, any> = {};
            if (ctx.input.apiKeyId) body.ids = [ctx.input.apiKeyId];
            if (ctx.input.apiKeyName) body.name = ctx.input.apiKeyName;
            let result = await client.invalidateApiKey(body);
            return {
              output: {
                invalidatedKeys: result.invalidated_api_keys?.length || 0,
                acknowledged: true
              },
              message: `Invalidated **${result.invalidated_api_keys?.length || 0}** API keys.`
            };
          }
          default:
            throw elasticsearchServiceError(
              `Action "${ctx.input.action}" is not supported for API keys`
            );
        }
      }
    }
  })
  .build();
