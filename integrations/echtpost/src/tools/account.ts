import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, record, resourceId, text } from '../lib/client';
import { spec } from '../spec';

export let whoAmI = SlateTool.create(spec, {
  name: 'Current Account',
  key: 'who_am_i',
  description:
    'Identify the connected EchtPost account and user, with API-key metadata and the current prepaid balance.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({}))
  .output(
    z.object({
      accountId: z.string().describe('Connected account ID'),
      accountName: z.string().optional().describe('Connected account name'),
      userId: z.string().describe('Connected user ID'),
      email: z.string().optional().describe('Connected user email'),
      response: z
        .unknown()
        .describe('Complete account, user, API-key metadata, and balance response')
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client({ token: ctx.auth.token }).get('/me');
    let account = record(result.account);
    let user = record(result.user);
    return {
      output: {
        accountId: resourceId(account.id, 'account ID'),
        accountName: text(account.name, 'account name'),
        userId: resourceId(user.id, 'user ID'),
        email: text(user.email, 'user email'),
        response: result
      },
      message: 'Retrieved the connected EchtPost account.'
    };
  })
  .build();

export let getCredits = SlateTool.create(spec, {
  name: 'Get Balance and Pricing',
  key: 'get_credits',
  description:
    'Read your prepaid balance, available domestic and foreign postcard counts, and current per-card prices.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({}))
  .output(
    z.object({
      creditsEur: z
        .string()
        .optional()
        .describe('Prepaid balance in euros, as returned by EchtPost'),
      currency: z.string().optional().describe('Balance currency'),
      pricePerCardEur: z.string().optional().describe('Domestic postcard price in euros'),
      pricePerForeignCardEur: z
        .string()
        .optional()
        .describe('Foreign postcard price in euros'),
      response: z
        .unknown()
        .describe('Complete balance, available postcard counts, and price response')
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client({ token: ctx.auth.token }).get('/credits');
    return {
      output: {
        creditsEur: text(result.credits_eur, 'credit balance'),
        currency: text(result.currency, 'balance currency'),
        pricePerCardEur: text(result.price_per_card_eur, 'domestic postcard price'),
        pricePerForeignCardEur: text(
          result.price_per_foreign_card_eur,
          'foreign postcard price'
        ),
        response: result
      },
      message: 'Retrieved EchtPost balance and pricing.'
    };
  })
  .build();
