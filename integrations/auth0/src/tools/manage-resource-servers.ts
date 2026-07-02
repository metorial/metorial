import { SlateTool } from 'slates';
import { z } from 'zod';
import { Auth0Client } from '../lib/client';
import { spec } from '../spec';

export let manageResourceServersTool = SlateTool.create(spec, {
  name: 'Manage Resource Servers',
  key: 'manage_resource_servers',
  description: `Create, update, delete, or list API resource servers. Resource servers represent APIs protected by Auth0, with defined scopes/permissions and token settings.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Action to perform'),
      resourceServerId: z
        .string()
        .optional()
        .describe('Resource server ID (required for get, update, delete)'),
      name: z.string().optional().describe('API name (required for create)'),
      identifier: z
        .string()
        .optional()
        .describe('API identifier/audience URL (required for create, must be unique)'),
      scopes: z
        .array(
          z.object({
            value: z.string().describe('Scope name'),
            description: z.string().optional().describe('Scope description')
          })
        )
        .optional()
        .describe('API scopes/permissions'),
      signingAlg: z.enum(['HS256', 'RS256']).optional().describe('Token signing algorithm'),
      tokenLifetime: z.number().optional().describe('Access token lifetime in seconds'),
      skipConsentForVerifiableFirstPartyClients: z
        .boolean()
        .optional()
        .describe('Skip consent for first-party clients'),
      page: z.number().optional().describe('Page number (for list action)'),
      perPage: z.number().optional().describe('Results per page (for list action)')
    })
  )
  .output(
    z.object({
      resourceServer: z
        .object({
          resourceServerId: z.string(),
          name: z.string(),
          identifier: z.string(),
          scopes: z
            .array(
              z.object({
                value: z.string(),
                description: z.string().optional()
              })
            )
            .optional()
        })
        .optional()
        .describe('Resource server details'),
      resourceServers: z
        .array(
          z.object({
            resourceServerId: z.string(),
            name: z.string(),
            identifier: z.string()
          })
        )
        .optional()
        .describe('List of resource servers'),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Auth0Client({
      token: ctx.auth.token,
      domain: ctx.auth.domain
    });

    let mapRS = (rs: any) => ({
      resourceServerId: rs.id,
      name: rs.name,
      identifier: rs.identifier,
      scopes: rs.scopes
    });

    if (ctx.input.action === 'list') {
      let result = await client.listResourceServers({
        page: ctx.input.page,
        perPage: ctx.input.perPage
      });
      let servers = (Array.isArray(result) ? result : (result.resource_servers ?? [])).map(
        (rs: any) => ({
          resourceServerId: rs.id,
          name: rs.name,
          identifier: rs.identifier
        })
      );
      return {
        output: { resourceServers: servers },
        message: `Found **${servers.length}** resource server(s).`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.resourceServerId)
        throw new Error('resourceServerId is required for get action');
      let rs = await client.getResourceServer(ctx.input.resourceServerId);
      return {
        output: { resourceServer: mapRS(rs) },
        message: `Retrieved resource server **${rs.name}**.`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.name) throw new Error('name is required for create action');
      if (!ctx.input.identifier) throw new Error('identifier is required for create action');
      let rs = await client.createResourceServer({
        name: ctx.input.name,
        identifier: ctx.input.identifier,
        scopes: ctx.input.scopes,
        signingAlg: ctx.input.signingAlg,
        tokenLifetime: ctx.input.tokenLifetime,
        skipConsentForVerifiableFirstPartyClients:
          ctx.input.skipConsentForVerifiableFirstPartyClients
      });
      return {
        output: { resourceServer: mapRS(rs) },
        message: `Created resource server **${rs.name}**.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.resourceServerId)
        throw new Error('resourceServerId is required for update action');
      let rs = await client.updateResourceServer(ctx.input.resourceServerId, {
        name: ctx.input.name,
        scopes: ctx.input.scopes,
        signingAlg: ctx.input.signingAlg,
        tokenLifetime: ctx.input.tokenLifetime,
        skipConsentForVerifiableFirstPartyClients:
          ctx.input.skipConsentForVerifiableFirstPartyClients
      });
      return {
        output: { resourceServer: mapRS(rs) },
        message: `Updated resource server **${rs.name}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.resourceServerId)
        throw new Error('resourceServerId is required for delete action');
      await client.deleteResourceServer(ctx.input.resourceServerId);
      return {
        output: { deleted: true },
        message: `Deleted resource server **${ctx.input.resourceServerId}**.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
