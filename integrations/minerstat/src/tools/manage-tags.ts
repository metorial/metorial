import { SlateTool } from 'slates';
import { z } from 'zod';
import { ManagementClient } from '../lib/client';
import { spec } from '../spec';

export let manageTagsTool = SlateTool.create(spec, {
  name: 'Manage Tags',
  key: 'manage_tags',
  description: `List, create, update, or delete pool and wallet address tags. Tags store pool/wallet addresses that can be referenced from worker configurations. Tag names must be prefixed with "POOL:" or "WALLET:" (e.g. "POOL:ethermine", "WALLET:myBtcWallet").`,
  instructions: [
    'For listing: optionally filter by tagType ("pools" or "wallets") and/or customerId.',
    'For creating/updating: provide the full tag name with prefix and the address.',
    'For deleting: provide the tag name.'
  ],
  constraints: ['Requires a Bearer token (private API)'],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'update', 'delete']).describe('Action to perform'),
      tagName: z
        .string()
        .optional()
        .describe(
          'Tag name with prefix, e.g. "POOL:ethermine" or "WALLET:myBtc" (required for create/update/delete)'
        ),
      address: z
        .string()
        .optional()
        .describe('Address for the tag (required for create/update)'),
      tagType: z
        .enum(['pools', 'wallets'])
        .optional()
        .describe('Filter by tag type (for list action)'),
      customerId: z
        .number()
        .optional()
        .describe('Customer ID. If omitted, the main account is used.')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation succeeded'),
      response: z.any().describe('API response data')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.auth.token) {
      throw new Error(
        'Bearer token is required for tag management. Use the "API Credentials" authentication method.'
      );
    }

    let client = new ManagementClient({ token: ctx.auth.token });
    let result: any;

    switch (ctx.input.action) {
      case 'list': {
        ctx.progress('Fetching tags...');
        result = await client.getTags({
          user: ctx.input.customerId,
          type: ctx.input.tagType
        });
        break;
      }
      case 'create': {
        if (!ctx.input.tagName || !ctx.input.address) {
          throw new Error('tagName and address are required to create a tag.');
        }
        ctx.progress(`Creating tag ${ctx.input.tagName}...`);
        result = await client.createTag({
          tag: ctx.input.tagName,
          address: ctx.input.address,
          user: ctx.input.customerId
        });
        break;
      }
      case 'update': {
        if (!ctx.input.tagName || !ctx.input.address) {
          throw new Error('tagName and address are required to update a tag.');
        }
        ctx.progress(`Updating tag ${ctx.input.tagName}...`);
        result = await client.updateTag({
          tag: ctx.input.tagName,
          address: ctx.input.address,
          user: ctx.input.customerId
        });
        break;
      }
      case 'delete': {
        if (!ctx.input.tagName) {
          throw new Error('tagName is required to delete a tag.');
        }
        ctx.progress(`Deleting tag ${ctx.input.tagName}...`);
        result = await client.deleteTag({
          tag: ctx.input.tagName,
          user: ctx.input.customerId
        });
        break;
      }
    }

    return {
      output: {
        success: true,
        response: result
      },
      message: `Tag operation **${ctx.input.action}** completed successfully${ctx.input.tagName ? ` for **${ctx.input.tagName}**` : ''}.`
    };
  })
  .build();
