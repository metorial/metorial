import { SlateTool } from 'slates';
import { z } from 'zod';
import { Auth0Client } from '../lib/client';
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
      if (!ctx.input.clientId) throw new Error('clientId is required for create action');
      if (!ctx.input.audience) throw new Error('audience is required for create action');
      if (!ctx.input.scope) throw new Error('scope is required for create action');
      let grant = await client.createClientGrant({
        clientId: ctx.input.clientId,
        audience: ctx.input.audience,
        scope: ctx.input.scope
      });
      return {
        output: { grant: mapGrant(grant) },
        message: `Created client grant for audience **${ctx.input.audience}**.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.grantId) throw new Error('grantId is required for update action');
      if (!ctx.input.scope) throw new Error('scope is required for update action');
      let grant = await client.updateClientGrant(ctx.input.grantId, {
        scope: ctx.input.scope
      });
      return {
        output: { grant: mapGrant(grant) },
        message: `Updated client grant scopes.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.grantId) throw new Error('grantId is required for delete action');
      await client.deleteClientGrant(ctx.input.grantId);
      return {
        output: { deleted: true },
        message: `Deleted client grant **${ctx.input.grantId}**.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
