import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlaidClient } from '../lib/client';
import { spec } from '../spec';

export let getItemTool = SlateTool.create(spec, {
  name: 'Get Item',
  key: 'get_item',
  description: `Retrieve status and metadata for a Plaid Item (bank connection). Returns the institution, available and billed products, webhook URL, error state, and data update timestamps.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      accessToken: z.string().describe('Access token for the Plaid Item')
    })
  )
  .output(
    z.object({
      itemId: z.string().describe('The Item ID'),
      institutionId: z.string().nullable().optional().describe('Institution ID'),
      institutionName: z.string().nullable().optional().describe('Institution name'),
      webhook: z.string().nullable().optional().describe('Configured webhook URL'),
      error: z.any().nullable().optional().describe('Current error state, if any'),
      availableProducts: z
        .array(z.string())
        .optional()
        .describe('Products available to activate'),
      billedProducts: z.array(z.string()).optional().describe('Products currently billed'),
      consentedProducts: z.array(z.string()).optional().describe('Products user consented to'),
      lastSuccessfulTransactionsUpdate: z.string().nullable().optional(),
      lastSuccessfulInvestmentsUpdate: z.string().nullable().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new PlaidClient({
      clientId: ctx.auth.clientId,
      secret: ctx.auth.secret,
      environment: ctx.config.environment
    });

    let result = await client.getItem(ctx.input.accessToken);
    let item = result.item;
    let status = result.status;

    return {
      output: {
        itemId: item.item_id,
        institutionId: item.institution_id ?? null,
        institutionName: item.institution_name ?? null,
        webhook: item.webhook ?? null,
        error: item.error ?? null,
        availableProducts: item.available_products,
        billedProducts: item.billed_products,
        consentedProducts: item.consented_products,
        lastSuccessfulTransactionsUpdate: status?.transactions?.last_successful_update ?? null,
        lastSuccessfulInvestmentsUpdate: status?.investments?.last_successful_update ?? null
      },
      message: `Item \`${item.item_id}\` at **${item.institution_name || item.institution_id}** — ${item.error ? '**has error**' : 'healthy'}.`
    };
  })
  .build();

export let removeItemTool = SlateTool.create(spec, {
  name: 'Remove Item',
  key: 'remove_item',
  description: `Remove a Plaid Item and permanently invalidate its access token. This disconnects the user's bank account and all associated data will no longer be accessible. This action **cannot be undone**.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      accessToken: z.string().describe('Access token for the Plaid Item to remove')
    })
  )
  .output(
    z.object({
      removed: z.boolean().describe('Whether the Item was successfully removed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PlaidClient({
      clientId: ctx.auth.clientId,
      secret: ctx.auth.secret,
      environment: ctx.config.environment
    });

    await client.removeItem(ctx.input.accessToken);

    return {
      output: { removed: true },
      message: `Item removed and access token invalidated.`
    };
  })
  .build();
