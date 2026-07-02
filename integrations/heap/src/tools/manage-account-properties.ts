import { SlateTool } from 'slates';
import { z } from 'zod';
import { HeapClient } from '../lib/client';
import { spec } from '../spec';

let accountPropertiesItemSchema = z.object({
  accountId: z.string().describe('Unique identifier for the account.'),
  properties: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
    .describe(
      'Key-value pairs to attach to the account. Keys and values must be under 1024 characters.'
    )
});

export let manageAccountProperties = SlateTool.create(spec, {
  name: 'Manage Account Properties',
  key: 'manage_account_properties',
  description: `Attach custom properties to accounts in Heap for B2B analytics. Supports both single account and bulk updates (up to 1000 accounts per request).
Use this to associate attributes like company name, plan tier, industry, or revenue potential with groups of users.
Requires Account ID to be configured in your Heap project settings before use.`,
  instructions: [
    'For a single account, provide **accountId** and **properties** at the top level.',
    'For bulk updates, use the **accounts** array.'
  ],
  constraints: [
    'Max 1000 accounts per bulk request.',
    'Account ID must be configured in Heap project settings before using this API.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      accountId: z.string().optional().describe('Account identifier for a single update.'),
      properties: z
        .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
        .optional()
        .describe('Properties for a single account update.'),
      accounts: z
        .array(accountPropertiesItemSchema)
        .optional()
        .describe(
          'Array of accounts for bulk property updates. Max 1000 accounts per request.'
        )
    })
  )
  .output(
    z.object({
      updated: z.number().describe('Number of accounts whose properties were updated.'),
      mode: z
        .enum(['single', 'bulk'])
        .describe('Whether the request was processed as a single or bulk update.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HeapClient({
      appId: ctx.auth.appId,
      apiKey: ctx.auth.token,
      datacenter: ctx.config.datacenter
    });

    if (ctx.input.accounts && ctx.input.accounts.length > 0) {
      ctx.info(`Bulk updating properties for ${ctx.input.accounts.length} accounts`);
      await client.bulkAddAccountProperties(ctx.input.accounts);

      return {
        output: {
          updated: ctx.input.accounts.length,
          mode: 'bulk' as const
        },
        message: `Successfully updated properties for **${ctx.input.accounts.length}** accounts in Heap.`
      };
    }

    if (!ctx.input.accountId || !ctx.input.properties) {
      throw new Error(
        'Either provide "accountId" and "properties" for a single update, or "accounts" array for bulk updates.'
      );
    }

    ctx.info(`Updating properties for account: ${ctx.input.accountId}`);
    await client.addAccountProperties({
      accountId: ctx.input.accountId,
      properties: ctx.input.properties
    });

    return {
      output: {
        updated: 1,
        mode: 'single' as const
      },
      message: `Successfully updated properties for account **"${ctx.input.accountId}"**.`
    };
  })
  .build();
