import { SlateTool } from 'slates';
import { z } from 'zod';
import { ConnectClient } from '../lib/client';
import { spec } from '../spec';

export let listVaults = SlateTool.create(spec, {
  name: 'List Vaults',
  key: 'list_vaults',
  description: `List all vaults accessible with the current credentials. Returns vault names, IDs, item counts, and metadata. Use this to discover available vaults before listing or managing items within them.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      filter: z
        .string()
        .optional()
        .describe('Optional filter query to narrow results (e.g., filter by vault name).')
    })
  )
  .output(
    z.object({
      vaults: z.array(
        z.object({
          vaultId: z.string().describe('Unique identifier of the vault'),
          name: z.string().describe('Name of the vault'),
          description: z.string().describe('Description of the vault'),
          itemCount: z.number().describe('Number of items in the vault'),
          type: z.string().describe('Type of vault'),
          createdAt: z.string().describe('When the vault was created'),
          updatedAt: z.string().describe('When the vault was last updated')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.config.connectServerUrl) {
      throw new Error('Connect server URL is required. Set it in the configuration.');
    }

    let client = new ConnectClient({
      token: ctx.auth.token,
      serverUrl: ctx.config.connectServerUrl
    });

    ctx.progress('Fetching vaults...');
    let vaults = await client.listVaults(ctx.input.filter);

    let mapped = vaults.map(v => ({
      vaultId: v.id,
      name: v.name,
      description: v.description || '',
      itemCount: v.items,
      type: v.type,
      createdAt: v.createdAt,
      updatedAt: v.updatedAt
    }));

    return {
      output: { vaults: mapped },
      message: `Found **${mapped.length}** vault(s).${mapped.length > 0 ? `\n${mapped.map(v => `- **${v.name}** (${v.itemCount} items)`).join('\n')}` : ''}`
    };
  })
  .build();
