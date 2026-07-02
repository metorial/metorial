import { SlateTool } from 'slates';
import { z } from 'zod';
import { cognitoServiceError } from '../lib/errors';
import { createCognitoClient } from '../lib/helpers';
import { spec } from '../spec';

let resourceServerScopeSchema = z.object({
  scopeName: z
    .string()
    .describe('Custom scope name, without the resource-server identifier prefix'),
  scopeDescription: z.string().describe('Human-readable description for the custom scope')
});

export let manageResourceServer = SlateTool.create(spec, {
  name: 'Manage Resource Server',
  key: 'manage_resource_server',
  description: `Create, get, update, delete, or list Cognito resource servers for a user pool. Resource servers define custom OAuth scopes for external APIs and machine-to-machine authorization.`,
  instructions: [
    'Resource server identifiers appear in access-token scopes as "identifier/scopeName".',
    'For update, provide the full desired name and scope list; omitted optional fields may reset to defaults.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['create', 'get', 'update', 'delete', 'list'])
        .describe('Operation to perform'),
      userPoolId: z.string().describe('User pool ID'),
      identifier: z
        .string()
        .optional()
        .describe('Resource server identifier (required for create, get, update, delete)'),
      name: z
        .string()
        .optional()
        .describe('Friendly resource server name (required for create and update)'),
      scopes: z
        .array(resourceServerScopeSchema)
        .max(100)
        .optional()
        .describe('Custom OAuth scopes to define on the resource server'),
      maxResults: z.number().min(1).max(50).optional().describe('Max results for list'),
      nextToken: z.string().optional().describe('Pagination token for list')
    })
  )
  .output(
    z.object({
      identifier: z.string().optional(),
      name: z.string().optional(),
      userPoolId: z.string().optional(),
      scopes: z
        .array(
          z.object({
            scopeName: z.string(),
            scopeDescription: z.string()
          })
        )
        .optional(),
      resourceServers: z
        .array(
          z.object({
            identifier: z.string(),
            name: z.string(),
            userPoolId: z.string(),
            scopes: z.array(
              z.object({
                scopeName: z.string(),
                scopeDescription: z.string()
              })
            )
          })
        )
        .optional(),
      deleted: z.boolean().optional(),
      nextToken: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createCognitoClient(ctx);
    let { action, userPoolId } = ctx.input;

    let mapResourceServer = (server: any) => ({
      identifier: server.Identifier,
      name: server.Name,
      userPoolId: server.UserPoolId,
      scopes: (server.Scopes || []).map((scope: any) => ({
        scopeName: scope.ScopeName,
        scopeDescription: scope.ScopeDescription
      }))
    });

    let buildParams = () => {
      if (!ctx.input.identifier) {
        throw cognitoServiceError(`identifier is required for ${action}`);
      }
      if (!ctx.input.name) {
        throw cognitoServiceError(`name is required for ${action}`);
      }

      return {
        UserPoolId: userPoolId,
        Identifier: ctx.input.identifier,
        Name: ctx.input.name,
        Scopes: ctx.input.scopes?.map(scope => ({
          ScopeName: scope.scopeName,
          ScopeDescription: scope.scopeDescription
        }))
      };
    };

    if (action === 'list') {
      let result = await client.listResourceServers(
        userPoolId,
        ctx.input.maxResults,
        ctx.input.nextToken
      );
      let resourceServers = (result.ResourceServers || []).map(mapResourceServer);

      return {
        output: { resourceServers, nextToken: result.NextToken },
        message: `Found **${resourceServers.length}** resource server(s).`
      };
    }

    if (action === 'create') {
      let result = await client.createResourceServer(buildParams());
      let resourceServer = mapResourceServer(result.ResourceServer);
      return {
        output: resourceServer,
        message: `Created resource server **${resourceServer.identifier}**.`
      };
    }

    if (action === 'get') {
      if (!ctx.input.identifier) {
        throw cognitoServiceError('identifier is required for get');
      }
      let result = await client.describeResourceServer(userPoolId, ctx.input.identifier);
      let resourceServer = mapResourceServer(result.ResourceServer);
      return {
        output: resourceServer,
        message: `Resource server **${resourceServer.identifier}** details retrieved.`
      };
    }

    if (action === 'update') {
      let result = await client.updateResourceServer(buildParams());
      let resourceServer = mapResourceServer(result.ResourceServer);
      return {
        output: resourceServer,
        message: `Updated resource server **${resourceServer.identifier}**.`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.identifier) {
        throw cognitoServiceError('identifier is required for delete');
      }
      await client.deleteResourceServer(userPoolId, ctx.input.identifier);
      return {
        output: { identifier: ctx.input.identifier, userPoolId, deleted: true },
        message: `Deleted resource server **${ctx.input.identifier}**.`
      };
    }

    throw cognitoServiceError(`Unknown action: ${action}`);
  })
  .build();
