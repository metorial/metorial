import { SlateTool } from 'slates';
import { z } from 'zod';
import { Auth0Client } from '../lib/client';
import { auth0ServiceError, requireField, requireNonEmptyArray } from '../lib/errors';
import { spec } from '../spec';

export let manageClientGrantsTool = SlateTool.create(spec, {
  name: 'Manage Client Grants',
  key: 'manage_client_grants',
  description: `Create, update, delete, or list client grants. Client grants authorize applications to request access tokens for specific APIs with defined scopes.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'update', 'delete']).describe('Action to perform'),
      grantId: z.string().optional().describe('Grant ID (required for update, delete)'),
      clientId: z
        .string()
        .optional()
        .describe('Application client ID (required for create, optional filter for list)'),
      audience: z
        .string()
        .optional()
        .describe('API identifier/audience (required for create, optional filter for list)'),
      scope: z
        .array(z.string())
        .optional()
        .describe('Scopes to grant (required for create and update)'),
      page: z.number().optional().describe('Page number (for list action)'),
      perPage: z.number().optional().describe('Results per page (for list action)')
    })
  )
  .output(
    z.object({
      grant: z
        .object({
          grantId: z.string(),
          clientId: z.string(),
          audience: z.string(),
          scope: z.array(z.string())
        })
        .optional()
        .describe('Grant details'),
      grants: z
        .array(
          z.object({
            grantId: z.string(),
            clientId: z.string(),
            audience: z.string(),
            scope: z.array(z.string())
          })
        )
        .optional()
        .describe('List of grants'),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Auth0Client({
      token: ctx.auth.token,
      domain: ctx.auth.domain
    });

    let mapGrant = (g: any) => ({
      grantId: g.id,
      clientId: g.client_id,
      audience: g.audience,
      scope: g.scope
    });

    if (ctx.input.action === 'list') {
      let result = await client.listClientGrants({
        clientId: ctx.input.clientId,
        audience: ctx.input.audience,
        page: ctx.input.page,
        perPage: ctx.input.perPage
      });
      let grants = (Array.isArray(result) ? result : (result.client_grants ?? [])).map(
        mapGrant
      );
      return {
        output: { grants },
        message: `Found **${grants.length}** client grant(s).`
      };
    }

    if (ctx.input.action === 'create') {
      let clientId = requireField(ctx.input.clientId, 'clientId', 'create');
      let audience = requireField(ctx.input.audience, 'audience', 'create');
      let scope = requireNonEmptyArray(ctx.input.scope, 'scope', 'create');
      let grant = await client.createClientGrant({
        clientId,
        audience,
        scope
      });
      return {
        output: { grant: mapGrant(grant) },
        message: `Created client grant for audience **${ctx.input.audience}**.`
      };
    }

    if (ctx.input.action === 'update') {
      let grantId = requireField(ctx.input.grantId, 'grantId', 'update');
      let scope = requireNonEmptyArray(ctx.input.scope, 'scope', 'update');
      let grant = await client.updateClientGrant(grantId, {
        scope
      });
      return {
        output: { grant: mapGrant(grant) },
        message: `Updated client grant scopes.`
      };
    }

    if (ctx.input.action === 'delete') {
      let grantId = requireField(ctx.input.grantId, 'grantId', 'delete');
      await client.deleteClientGrant(grantId);
      return {
        output: { deleted: true },
        message: `Deleted client grant **${grantId}**.`
      };
    }

    throw auth0ServiceError(`Unknown action: ${ctx.input.action}`);
  })
  .build();
