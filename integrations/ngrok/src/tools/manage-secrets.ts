import { SlateTool } from 'slates';
import { z } from 'zod';
import { NgrokClient } from '../lib/client';
import { spec } from '../spec';

let refSchema = z
  .object({
    id: z.string(),
    uri: z.string()
  })
  .optional()
  .nullable();

let secretOutputSchema = z.object({
  secretId: z.string().describe('Secret ID'),
  uri: z.string().describe('API resource URI'),
  createdAt: z.string().describe('Creation timestamp'),
  updatedAt: z.string().describe('Last update timestamp'),
  name: z.string().describe('Secret name'),
  description: z.string().describe('Description'),
  metadata: z.string().describe('Metadata'),
  vault: refSchema.describe('Parent vault reference'),
  vaultName: z.string().describe('Vault name')
});

let mapSecret = (s: any) => ({
  secretId: s.id,
  uri: s.uri || '',
  createdAt: s.created_at || '',
  updatedAt: s.updated_at || '',
  name: s.name || '',
  description: s.description || '',
  metadata: s.metadata || '',
  vault: s.vault?.id ? { id: s.vault.id, uri: s.vault.uri } : null,
  vaultName: s.vault_name || ''
});

let vaultOutputSchema = z.object({
  vaultId: z.string().describe('Vault ID'),
  uri: z.string().describe('API resource URI'),
  createdAt: z.string().describe('Creation timestamp'),
  updatedAt: z.string().describe('Last update timestamp'),
  name: z.string().describe('Vault name'),
  description: z.string().describe('Description'),
  metadata: z.string().describe('Metadata')
});

let mapVault = (v: any) => ({
  vaultId: v.id,
  uri: v.uri || '',
  createdAt: v.created_at || '',
  updatedAt: v.updated_at || '',
  name: v.name || '',
  description: v.description || '',
  metadata: v.metadata || ''
});

export let listVaults = SlateTool.create(spec, {
  name: 'List Vaults',
  key: 'list_vaults',
  description: `List all vaults. Vaults organize secrets used across your ngrok resources.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      beforeId: z.string().optional().describe('Pagination cursor'),
      limit: z.number().optional().describe('Max results per page')
    })
  )
  .output(
    z.object({
      vaults: z.array(vaultOutputSchema),
      nextPageUri: z.string().optional().nullable()
    })
  )
  .handleInvocation(async ctx => {
    let client = new NgrokClient(ctx.auth.token);
    let result = await client.listVaults({
      beforeId: ctx.input.beforeId,
      limit: ctx.input.limit
    });
    let vaults = (result.vaults || []).map(mapVault);
    return {
      output: { vaults, nextPageUri: result.next_page_uri || null },
      message: `Found **${vaults.length}** vault(s).`
    };
  })
  .build();

export let createVault = SlateTool.create(spec, {
  name: 'Create Vault',
  key: 'create_vault',
  description: `Create a new vault to organize secrets. Secrets can then be stored within the vault.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      name: z.string().describe('Vault name'),
      description: z.string().optional().describe('Description'),
      metadata: z.string().optional().describe('Metadata')
    })
  )
  .output(vaultOutputSchema)
  .handleInvocation(async ctx => {
    let client = new NgrokClient(ctx.auth.token);
    let v = await client.createVault({
      name: ctx.input.name,
      description: ctx.input.description,
      metadata: ctx.input.metadata
    });
    return {
      output: mapVault(v),
      message: `Created vault **${v.name}** (${v.id}).`
    };
  })
  .build();

export let updateVault = SlateTool.create(spec, {
  name: 'Update Vault',
  key: 'update_vault',
  description: `Update a vault's name, description, or metadata.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      vaultId: z.string().describe('Vault ID to update'),
      name: z.string().optional().describe('New name'),
      description: z.string().optional().describe('New description'),
      metadata: z.string().optional().describe('New metadata')
    })
  )
  .output(vaultOutputSchema)
  .handleInvocation(async ctx => {
    let client = new NgrokClient(ctx.auth.token);
    let v = await client.updateVault(ctx.input.vaultId, {
      name: ctx.input.name,
      description: ctx.input.description,
      metadata: ctx.input.metadata
    });
    return {
      output: mapVault(v),
      message: `Updated vault **${v.name}** (${v.id}).`
    };
  })
  .build();

export let deleteVault = SlateTool.create(spec, {
  name: 'Delete Vault',
  key: 'delete_vault',
  description: `Delete a vault and all secrets it contains.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      vaultId: z.string().describe('Vault ID to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new NgrokClient(ctx.auth.token);
    await client.deleteVault(ctx.input.vaultId);
    return {
      output: { success: true },
      message: `Deleted vault **${ctx.input.vaultId}**.`
    };
  })
  .build();

export let listSecrets = SlateTool.create(spec, {
  name: 'List Secrets',
  key: 'list_secrets',
  description: `List all secrets across all vaults. Secret values are not returned in the listing.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      beforeId: z.string().optional().describe('Pagination cursor'),
      limit: z.number().optional().describe('Max results per page')
    })
  )
  .output(
    z.object({
      secrets: z.array(secretOutputSchema),
      nextPageUri: z.string().optional().nullable()
    })
  )
  .handleInvocation(async ctx => {
    let client = new NgrokClient(ctx.auth.token);
    let result = await client.listSecrets({
      beforeId: ctx.input.beforeId,
      limit: ctx.input.limit
    });
    let secrets = (result.secrets || []).map(mapSecret);
    return {
      output: { secrets, nextPageUri: result.next_page_uri || null },
      message: `Found **${secrets.length}** secret(s).`
    };
  })
  .build();

export let createSecret = SlateTool.create(spec, {
  name: 'Create Secret',
  key: 'create_secret',
  description: `Create a new secret in a vault. Secrets store sensitive values used across your ngrok resources.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      name: z.string().describe('Secret name'),
      secretValue: z.string().describe('Secret value'),
      vaultId: z.string().optional().describe('Vault ID to store the secret in'),
      description: z.string().optional().describe('Description'),
      metadata: z.string().optional().describe('Metadata')
    })
  )
  .output(secretOutputSchema)
  .handleInvocation(async ctx => {
    let client = new NgrokClient(ctx.auth.token);
    let s = await client.createSecret({
      name: ctx.input.name,
      value: ctx.input.secretValue,
      vaultId: ctx.input.vaultId,
      description: ctx.input.description,
      metadata: ctx.input.metadata
    });
    return {
      output: mapSecret(s),
      message: `Created secret **${s.name}** (${s.id}).`
    };
  })
  .build();

export let updateSecret = SlateTool.create(spec, {
  name: 'Update Secret',
  key: 'update_secret',
  description: `Update a secret's name, value, description, or metadata.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      secretId: z.string().describe('Secret ID to update'),
      name: z.string().optional().describe('New name'),
      secretValue: z.string().optional().describe('New secret value'),
      description: z.string().optional().describe('New description'),
      metadata: z.string().optional().describe('New metadata')
    })
  )
  .output(secretOutputSchema)
  .handleInvocation(async ctx => {
    let client = new NgrokClient(ctx.auth.token);
    let s = await client.updateSecret(ctx.input.secretId, {
      name: ctx.input.name,
      value: ctx.input.secretValue,
      description: ctx.input.description,
      metadata: ctx.input.metadata
    });
    return {
      output: mapSecret(s),
      message: `Updated secret **${s.name}** (${s.id}).`
    };
  })
  .build();

export let deleteSecret = SlateTool.create(spec, {
  name: 'Delete Secret',
  key: 'delete_secret',
  description: `Delete a secret from its vault.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      secretId: z.string().describe('Secret ID to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new NgrokClient(ctx.auth.token);
    await client.deleteSecret(ctx.input.secretId);
    return {
      output: { success: true },
      message: `Deleted secret **${ctx.input.secretId}**.`
    };
  })
  .build();
