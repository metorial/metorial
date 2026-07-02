import { SlateTool } from 'slates';
import { z } from 'zod';
import { coinbaseOAuthAuthMethods } from '../lib/auth-methods';
import { CoinbaseClient } from '../lib/client';
import { spec } from '../spec';

export let manageAddresses = SlateTool.create(spec, {
  name: 'Manage Addresses',
  key: 'manage_addresses',
  description: `List existing receive addresses or create a new one for a Coinbase account. Each address can receive cryptocurrency for the account's currency.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .authMethods(coinbaseOAuthAuthMethods)
  .input(
    z.object({
      action: z.enum(['list', 'create']).describe('Operation to perform'),
      accountId: z.string().describe('Account ID to manage addresses for'),
      name: z.string().optional().describe('Label for the new address (for create)')
    })
  )
  .output(
    z.object({
      address: z
        .object({
          addressId: z.string(),
          addressValue: z.string().optional().describe('The cryptocurrency address string'),
          name: z.string().optional().nullable(),
          network: z.string().optional(),
          createdAt: z.string().optional()
        })
        .optional()
        .describe('Newly created address'),
      addresses: z
        .array(
          z.object({
            addressId: z.string(),
            addressValue: z.string().optional(),
            name: z.string().optional().nullable(),
            network: z.string().optional(),
            createdAt: z.string().optional()
          })
        )
        .optional()
        .describe('List of addresses')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CoinbaseClient({ token: ctx.auth.token });

    if (ctx.input.action === 'create') {
      let addr = await client.createAddress(ctx.input.accountId, ctx.input.name);
      return {
        output: {
          address: {
            addressId: addr.id,
            addressValue: addr.address,
            name: addr.name || null,
            network: addr.network,
            createdAt: addr.created_at
          }
        },
        message: `Created address **${addr.address}**${addr.name ? ` (${addr.name})` : ''}`
      };
    }

    // list
    let result = await client.listAddresses(ctx.input.accountId);
    let addresses = result.data || [];
    return {
      output: {
        addresses: addresses.map((a: any) => ({
          addressId: a.id,
          addressValue: a.address,
          name: a.name || null,
          network: a.network,
          createdAt: a.created_at
        }))
      },
      message: `Found **${addresses.length}** address(es)`
    };
  })
  .build();
