import { SlateTool } from 'slates';
import { z } from 'zod';
import { StartonClient } from '../lib/client';
import { spec } from '../spec';

export let manageWallets = SlateTool.create(spec, {
  name: 'Manage Wallets',
  key: 'manage_wallets',
  description: `Create or list wallets managed by Starton's KMS (Key Management System). Wallets are used to sign blockchain transactions for deploying and interacting with smart contracts.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'list'])
        .describe('Whether to create a new wallet or list existing wallets'),
      name: z.string().optional().describe('Name for the new wallet (when creating)'),
      description: z
        .string()
        .optional()
        .describe('Description for the new wallet (when creating)'),
      kmsId: z
        .string()
        .optional()
        .describe('KMS identifier to use (when creating, defaults to Starton KMS)'),
      limit: z.number().default(20).describe('Number of wallets to return (when listing)'),
      page: z.number().default(0).describe('Page number for pagination (when listing)')
    })
  )
  .output(
    z.object({
      wallets: z
        .array(
          z.object({
            walletAddress: z.string().describe('Wallet address'),
            name: z.string().optional().describe('Wallet name'),
            description: z.string().optional().describe('Wallet description'),
            createdAt: z.string().optional().describe('Creation timestamp')
          })
        )
        .describe('List of wallets or newly created wallet'),
      totalCount: z.number().optional().describe('Total number of wallets when listing')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StartonClient({ token: ctx.auth.token });

    if (ctx.input.action === 'create') {
      let result = await client.createWallet({
        name: ctx.input.name,
        description: ctx.input.description,
        kmsId: ctx.input.kmsId
      });

      return {
        output: {
          wallets: [
            {
              walletAddress: result.address || '',
              name: result.name,
              description: result.description,
              createdAt: result.createdAt
            }
          ],
          totalCount: 1
        },
        message: `Created wallet \`${result.address}\`${ctx.input.name ? ` (${ctx.input.name})` : ''}.`
      };
    }

    let result = await client.listWallets({
      limit: ctx.input.limit,
      page: ctx.input.page
    });

    let items = result.items || result || [];

    return {
      output: {
        wallets: items.map((w: any) => ({
          walletAddress: w.address || '',
          name: w.name,
          description: w.description,
          createdAt: w.createdAt
        })),
        totalCount: result.meta?.totalCount || items.length
      },
      message: `Found **${items.length}** wallets.`
    };
  })
  .build();
