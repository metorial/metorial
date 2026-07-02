import { SlateTool } from 'slates';
import { z } from 'zod';
import { createConnectClient } from '../lib/connect-tool';
import { spec } from '../spec';

export let getVault = SlateTool.create(spec, {
  name: 'Get Vault',
  key: 'get_vault',
  description: `Retrieve metadata for a specific 1Password vault accessible to the Connect token, including item count, vault type, and content versions.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      vaultId: z.string().describe('ID of the vault to retrieve')
    })
  )
  .output(
    z.object({
      vaultId: z.string().describe('Unique identifier of the vault'),
      name: z.string().describe('Name of the vault'),
      description: z.string().describe('Description of the vault'),
      itemCount: z.number().describe('Number of active items in the vault'),
      type: z.string().describe('Type of vault'),
      attributeVersion: z.number().describe('Version of the vault metadata'),
      contentVersion: z.number().describe('Version of the vault contents'),
      createdAt: z.string().describe('When the vault was created'),
      updatedAt: z.string().describe('When the vault was last updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = createConnectClient(ctx);

    ctx.progress('Fetching vault...');
    let vault = await client.getVault(ctx.input.vaultId);

    return {
      output: {
        vaultId: vault.id,
        name: vault.name,
        description: vault.description || '',
        itemCount: vault.items,
        type: vault.type,
        attributeVersion: vault.attributeVersion,
        contentVersion: vault.contentVersion,
        createdAt: vault.createdAt,
        updatedAt: vault.updatedAt
      },
      message: `Retrieved vault **${vault.name}** (${vault.items} item(s)).`
    };
  })
  .build();
