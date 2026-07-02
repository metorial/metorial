import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageIdentity = SlateTool.create(spec, {
  name: 'Manage Identities',
  key: 'manage_identity',
  description: `Create, list, retrieve, update, or delete identities. Identities store user credentials (username/password, authenticator secrets, custom fields) for automated login flows on target applications.`,
  constraints: [
    'Credentials are stored securely and not returned in standard get/list responses. Use the getCredentials option to retrieve them explicitly.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['create', 'list', 'get', 'update', 'delete', 'get_credentials'])
        .describe('Operation to perform'),
      identityId: z
        .string()
        .optional()
        .describe('Identity ID (required for get, update, delete, get_credentials)'),
      name: z.string().optional().describe('Identity name'),
      source: z
        .string()
        .optional()
        .describe('Source URL for the identity (required for create)'),
      credentials: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Array of credential objects (for create/update)'),
      metadata: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Custom metadata for the identity'),
      applicationName: z
        .string()
        .optional()
        .describe('Associated application name (for create)'),
      applicationDescription: z
        .string()
        .optional()
        .describe('Associated application description (for create)'),
      page: z.number().optional().describe('Page number for listing'),
      limit: z.number().optional().describe('Items per page for listing')
    })
  )
  .output(
    z.object({
      identity: z
        .object({
          identityId: z.string(),
          name: z.string().optional(),
          status: z.string().optional(),
          metadata: z.record(z.string(), z.unknown()).optional(),
          createdAt: z.string().optional()
        })
        .optional(),
      identities: z
        .array(
          z.object({
            identityId: z.string(),
            name: z.string().optional(),
            status: z.string().optional(),
            createdAt: z.string().optional()
          })
        )
        .optional(),
      credentials: z.array(z.record(z.string(), z.unknown())).optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let input = ctx.input;

    if (input.action === 'create') {
      if (!input.source) throw new Error('source is required for create.');
      let result = await client.createIdentity({
        name: input.name,
        source: input.source,
        credentials: input.credentials,
        metadata: input.metadata,
        applicationName: input.applicationName,
        applicationDescription: input.applicationDescription
      });
      return {
        output: {
          identity: {
            identityId: result.id,
            name: result.name,
            status: result.status,
            metadata: result.metadata,
            createdAt: result.created_at
          }
        },
        message: `Identity **${result.name ?? result.id}** created (status: ${result.status}).`
      };
    }

    if (input.action === 'list') {
      let result = await client.listIdentities({ page: input.page, limit: input.limit });
      let items = result.identities ?? result.data ?? [];
      return {
        output: {
          identities: items.map((i: any) => ({
            identityId: i.id,
            name: i.name,
            status: i.status,
            createdAt: i.created_at
          }))
        },
        message: `Found **${items.length}** identities.`
      };
    }

    if (input.action === 'get') {
      if (!input.identityId) throw new Error('identityId is required for get.');
      let result = await client.getIdentity(input.identityId);
      return {
        output: {
          identity: {
            identityId: result.id,
            name: result.name,
            status: result.status,
            metadata: result.metadata,
            createdAt: result.created_at
          }
        },
        message: `Identity **${result.name ?? result.id}** retrieved.`
      };
    }

    if (input.action === 'update') {
      if (!input.identityId) throw new Error('identityId is required for update.');
      let result = await client.updateIdentity(input.identityId, {
        name: input.name,
        metadata: input.metadata,
        credentials: input.credentials
      });
      return {
        output: {
          identity: {
            identityId: result.id ?? input.identityId,
            name: result.name ?? input.name,
            status: result.status
          }
        },
        message: `Identity **${input.identityId}** updated.`
      };
    }

    if (input.action === 'delete') {
      if (!input.identityId) throw new Error('identityId is required for delete.');
      await client.deleteIdentity(input.identityId);
      return {
        output: { deleted: true },
        message: `Identity **${input.identityId}** deleted.`
      };
    }

    if (input.action === 'get_credentials') {
      if (!input.identityId) throw new Error('identityId is required for get_credentials.');
      let result = await client.getIdentityCredentials(input.identityId);
      return {
        output: {
          credentials: result.credentials ?? result
        },
        message: `Retrieved credentials for identity **${input.identityId}**.`
      };
    }

    throw new Error(`Unknown action: ${input.action}`);
  })
  .build();
