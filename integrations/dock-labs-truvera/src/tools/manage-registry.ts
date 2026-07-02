import { SlateTool } from 'slates';
import { z } from 'zod';
import { DockClient } from '../lib/client';
import { spec } from '../spec';

export let manageRegistry = SlateTool.create(spec, {
  name: 'Manage Revocation Registry',
  key: 'manage_registry',
  description: `Create, retrieve, list, or delete revocation registries. Registries are used to manage credential revocation status on the blockchain.
Also supports revoking and unrevoking credentials within a registry.`,
  instructions: [
    'To create a registry, set action to "create" and provide policy DIDs. Use type "DockVBAccumulator2022" for BBS+ credentials, or "StatusList2021Entry"/"CredentialStatusList2017" for others.',
    'To revoke credentials, set action to "revoke" and provide the registryId and credentialIds.',
    'To unrevoke credentials, set action to "unrevoke" and provide the registryId and credentialIds.',
    'It is recommended to create one registry per credential type.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'get', 'list', 'delete', 'revoke', 'unrevoke'])
        .describe('Operation to perform'),
      registryId: z
        .string()
        .optional()
        .describe('Registry ID (required for get, delete, revoke, unrevoke)'),
      policyDids: z
        .array(z.string())
        .optional()
        .describe('DIDs that control this registry (required for create)'),
      registryType: z
        .enum(['StatusList2021Entry', 'CredentialStatusList2017', 'DockVBAccumulator2022'])
        .optional()
        .describe('Type of revocation registry'),
      addOnly: z.boolean().optional().describe('If true, revocations cannot be undone'),
      credentialIds: z
        .array(z.string())
        .optional()
        .describe('Credential IDs to revoke or unrevoke'),
      offset: z.number().optional().describe('Pagination offset for list'),
      limit: z.number().optional().describe('Maximum number of results for list')
    })
  )
  .output(
    z.object({
      registry: z.record(z.string(), z.unknown()).optional().describe('The registry document'),
      registries: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('List of registries'),
      jobId: z.string().optional().describe('Job ID for tracking blockchain transaction')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DockClient({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    switch (ctx.input.action) {
      case 'create': {
        if (!ctx.input.policyDids || ctx.input.policyDids.length === 0) {
          throw new Error('policyDids is required for create action');
        }
        let result = await client.createRegistry({
          addOnly: ctx.input.addOnly,
          policy: ctx.input.policyDids,
          type: ctx.input.registryType
        });
        return {
          output: {
            registry: result,
            jobId: result.id as string | undefined
          },
          message: `Created revocation registry${result.id ? ` **${result.id}**` : ''}`
        };
      }
      case 'get': {
        if (!ctx.input.registryId) throw new Error('registryId is required for get action');
        let result = await client.getRegistry(ctx.input.registryId);
        return {
          output: { registry: result },
          message: `Retrieved registry **${ctx.input.registryId}**`
        };
      }
      case 'list': {
        let results = await client.listRegistries({
          offset: ctx.input.offset,
          limit: ctx.input.limit
        });
        return {
          output: { registries: results },
          message: `Found **${results.length}** registry(ies)`
        };
      }
      case 'delete': {
        if (!ctx.input.registryId) throw new Error('registryId is required for delete action');
        let result = await client.deleteRegistry(ctx.input.registryId);
        return {
          output: {
            registry: result,
            jobId: result.id as string | undefined
          },
          message: `Deleted registry **${ctx.input.registryId}**`
        };
      }
      case 'revoke': {
        if (!ctx.input.registryId) throw new Error('registryId is required for revoke action');
        if (!ctx.input.credentialIds || ctx.input.credentialIds.length === 0) {
          throw new Error('credentialIds is required for revoke action');
        }
        let result = await client.revokeCredential(
          ctx.input.registryId,
          ctx.input.credentialIds
        );
        return {
          output: {
            registry: result,
            jobId: result.id as string | undefined
          },
          message: `Revoked **${ctx.input.credentialIds.length}** credential(s) in registry **${ctx.input.registryId}**`
        };
      }
      case 'unrevoke': {
        if (!ctx.input.registryId)
          throw new Error('registryId is required for unrevoke action');
        if (!ctx.input.credentialIds || ctx.input.credentialIds.length === 0) {
          throw new Error('credentialIds is required for unrevoke action');
        }
        let result = await client.unrevokeCredential(
          ctx.input.registryId,
          ctx.input.credentialIds
        );
        return {
          output: {
            registry: result,
            jobId: result.id as string | undefined
          },
          message: `Unrevoked **${ctx.input.credentialIds.length}** credential(s) in registry **${ctx.input.registryId}**`
        };
      }
    }
  })
  .build();
