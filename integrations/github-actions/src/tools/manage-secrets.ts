import { SlateTool } from 'slates';
import { z } from 'zod';
import { GitHubActionsClient } from '../lib/client';
import { spec } from '../spec';

let secretSchema = z.object({
  secretName: z.string().describe('Secret name'),
  createdAt: z.string().describe('Creation timestamp'),
  updatedAt: z.string().describe('Last update timestamp'),
  visibility: z
    .string()
    .optional()
    .describe('Visibility for org secrets (all, private, selected)')
});

export let manageSecrets = SlateTool.create(spec, {
  name: 'Manage Secrets',
  key: 'manage_secrets',
  description: `List, get, create/update, or delete Actions secrets at the repository, organization, or environment level. Secret values must be encrypted with the public key before being sent. Use "get_public_key" to retrieve the encryption key needed for creating/updating secrets.`,
  instructions: [
    'To create or update a secret, first use action "get_public_key" to get the encryption key.',
    'The secret value must be encrypted with libsodium sealed box using the public key before sending.',
    'Pass the base64-encoded encrypted value as "encryptedValue" and the key ID as "keyId".',
    'Secret values are never returned by the API — only metadata (name, timestamps) is available.'
  ],
  constraints: ['Secret values cannot be read through the API, only metadata is returned.'],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      owner: z
        .string()
        .optional()
        .describe('Repository owner, required for repo and environment scopes'),
      repo: z
        .string()
        .optional()
        .describe('Repository name, required for repo and environment scopes'),
      org: z.string().optional().describe('Organization name, required for org scope'),
      scope: z.enum(['repo', 'org', 'environment']).describe('Secret scope level'),
      environmentName: z
        .string()
        .optional()
        .describe('Environment name, required for environment scope'),
      action: z
        .enum(['list', 'get', 'create_or_update', 'delete', 'get_public_key'])
        .describe('Action to perform'),
      secretName: z
        .string()
        .optional()
        .describe('Secret name, required for get/create_or_update/delete'),
      encryptedValue: z
        .string()
        .optional()
        .describe('Base64-encoded encrypted secret value, for create_or_update'),
      keyId: z.string().optional().describe('Public key ID, for create_or_update'),
      visibility: z
        .enum(['all', 'private', 'selected'])
        .optional()
        .describe('Visibility for org secrets'),
      selectedRepositoryIds: z
        .array(z.number())
        .optional()
        .describe('Repository IDs for "selected" visibility org secrets'),
      perPage: z.number().optional().describe('Results per page'),
      page: z.number().optional().describe('Page number')
    })
  )
  .output(
    z.object({
      secrets: z.array(secretSchema).optional().describe('List of secrets'),
      totalCount: z.number().optional().describe('Total number of secrets'),
      secret: secretSchema.optional().describe('Single secret metadata'),
      publicKey: z
        .string()
        .optional()
        .describe('Base64-encoded public key for encrypting secrets'),
      publicKeyId: z.string().optional().describe('Public key ID'),
      deleted: z.boolean().optional().describe('Whether the secret was deleted'),
      created: z.boolean().optional().describe('Whether the secret was created/updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GitHubActionsClient(ctx.auth.token);
    let { scope, action, owner, repo, org, environmentName, secretName, perPage, page } =
      ctx.input;

    if (action === 'get_public_key') {
      let key: any;
      if (scope === 'org') {
        if (!org) throw new Error('org is required for org scope.');
        key = await client.getOrgPublicKey(org);
      } else if (scope === 'environment') {
        if (!owner || !repo || !environmentName)
          throw new Error(
            'owner, repo, and environmentName are required for environment scope.'
          );
        key = await client.getEnvironmentPublicKey(owner, repo, environmentName);
      } else {
        if (!owner || !repo) throw new Error('owner and repo are required for repo scope.');
        key = await client.getRepoPublicKey(owner, repo);
      }
      return {
        output: { publicKey: key.key, publicKeyId: key.key_id },
        message: `Retrieved public key for encrypting ${scope}-level secrets.`
      };
    }

    if (action === 'list') {
      let data: any;
      if (scope === 'org') {
        if (!org) throw new Error('org is required for org scope.');
        data = await client.listOrgSecrets(org, { perPage, page });
      } else if (scope === 'environment') {
        if (!owner || !repo || !environmentName)
          throw new Error('owner, repo, and environmentName are required.');
        data = await client.listEnvironmentSecrets(owner, repo, environmentName, {
          perPage,
          page
        });
      } else {
        if (!owner || !repo) throw new Error('owner and repo are required for repo scope.');
        data = await client.listRepoSecrets(owner, repo, { perPage, page });
      }
      let secrets = (data.secrets ?? []).map((s: any) => ({
        secretName: s.name,
        createdAt: s.created_at,
        updatedAt: s.updated_at,
        visibility: s.visibility
      }));
      return {
        output: { secrets, totalCount: data.total_count },
        message: `Found **${data.total_count}** ${scope}-level secrets.`
      };
    }

    if (action === 'get') {
      if (!secretName) throw new Error('secretName is required.');
      let secret: any;
      if (scope === 'org') {
        if (!org) throw new Error('org is required.');
        secret = await client.getOrgSecret(org, secretName);
      } else {
        if (!owner || !repo) throw new Error('owner and repo are required.');
        secret = await client.getRepoSecret(owner, repo, secretName);
      }
      return {
        output: {
          secret: {
            secretName: secret.name,
            createdAt: secret.created_at,
            updatedAt: secret.updated_at,
            visibility: secret.visibility
          }
        },
        message: `Retrieved metadata for secret **${secretName}**.`
      };
    }

    if (action === 'create_or_update') {
      if (!secretName || !ctx.input.encryptedValue || !ctx.input.keyId) {
        throw new Error(
          'secretName, encryptedValue, and keyId are required for create_or_update.'
        );
      }
      if (scope === 'org') {
        if (!org) throw new Error('org is required.');
        await client.createOrUpdateOrgSecret(org, secretName, {
          encryptedValue: ctx.input.encryptedValue,
          keyId: ctx.input.keyId,
          visibility: ctx.input.visibility ?? 'private',
          selectedRepositoryIds: ctx.input.selectedRepositoryIds
        });
      } else if (scope === 'environment') {
        if (!owner || !repo || !environmentName)
          throw new Error('owner, repo, and environmentName are required.');
        await client.createOrUpdateEnvironmentSecret(
          owner,
          repo,
          environmentName,
          secretName,
          ctx.input.encryptedValue,
          ctx.input.keyId
        );
      } else {
        if (!owner || !repo) throw new Error('owner and repo are required.');
        await client.createOrUpdateRepoSecret(
          owner,
          repo,
          secretName,
          ctx.input.encryptedValue,
          ctx.input.keyId
        );
      }
      return {
        output: { created: true },
        message: `Created/updated ${scope}-level secret **${secretName}**.`
      };
    }

    if (action === 'delete') {
      if (!secretName) throw new Error('secretName is required.');
      if (scope === 'org') {
        if (!org) throw new Error('org is required.');
        await client.deleteOrgSecret(org, secretName);
      } else if (scope === 'environment') {
        if (!owner || !repo || !environmentName)
          throw new Error('owner, repo, and environmentName are required.');
        await client.deleteEnvironmentSecret(owner, repo, environmentName, secretName);
      } else {
        if (!owner || !repo) throw new Error('owner and repo are required.');
        await client.deleteRepoSecret(owner, repo, secretName);
      }
      return {
        output: { deleted: true },
        message: `Deleted ${scope}-level secret **${secretName}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
